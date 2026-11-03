import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import path from 'node:path'
import fs from 'node:fs'
import {
  db,
  initSchemaAndSeed,
  listBuildings,
  listRentalUnits,
  getActiveLeasesWithReraShield,
  listDeveloperBtrPools,
  listTenantReverseBriefs,
} from './db'
import {
  type ChequeOption,
  type SupplyTier,
  calculateTrueRentalCost,
  evaluateReraRenewal,
  validateUaeLegalPayment,
  classifyMaintenanceResponsibility,
  calculatePortalSavingsVsCompetitors,
} from '../shared/uae-rental-rules'

export function buildServer() {
  initSchemaAndSeed()

  const app = Fastify({ logger: false })

  app.get('/api/health', async () => ({
    ok: true,
    service: 'SWKBayut UAE Dedicated Rental OS',
    reraOrn: '51517',
    linkedOs: 'https://github.com/swkpropertiesuae/swkpropertiesOS',
    androidPackage: 'ae.swkproperties.bayut',
    timestamp: new Date().toISOString(),
  }))

  app.get('/api/bootstrap', async () => {
    const buildings = listBuildings()
    const units = listRentalUnits()
    const leases = getActiveLeasesWithReraShield()
    const cheques = db.prepare('SELECT * FROM pdc_cheques ORDER BY due_date ASC').all()
    const maintenance = db.prepare('SELECT * FROM maintenance_tickets ORDER BY id DESC').all()
    const viewings = db.prepare('SELECT * FROM viewing_bookings ORDER BY id DESC').all()
    const offers = db.prepare('SELECT * FROM rental_offers ORDER BY id DESC').all()
    const a2aMandates = db.prepare('SELECT * FROM a2a_partner_mandates ORDER BY id DESC').all()
    const landlordMandates = db.prepare('SELECT * FROM direct_landlord_mandates ORDER BY id DESC').all()
    const developerPools = listDeveloperBtrPools()
    const reverseBriefs = listTenantReverseBriefs()
    const crmFeeds = db.prepare('SELECT * FROM crm_xml_feeds ORDER BY id DESC').all()
    const gatePasses = db.prepare('SELECT * FROM move_in_gate_passes ORDER BY id DESC').all()

    return {
      buildings,
      units,
      leases,
      cheques,
      maintenance,
      viewings,
      offers,
      a2aMandates,
      landlordMandates,
      developerPools,
      reverseBriefs,
      crmFeeds,
      gatePasses,
      portalSavingsSample: calculatePortalSavingsVsCompetitors({
        activeListingsCount: 45,
        agentsCount: 15,
      }),
      osBridge: {
        connected: true,
        sourceRepo: 'https://github.com/swkpropertiesuae/swkpropertiesOS',
        targetRepo: 'https://github.com/swkpropertiesuae/SWKBayut',
        androidAppId: 'ae.swkproperties.bayut',
        orn: '51517',
        lastSyncedAt: new Date().toISOString(),
      },
    }
  })

  app.post('/api/cost-calculator', async (req, reply) => {
    const body = (req.body ?? {}) as {
      unitId?: number
      chequeOption?: ChequeOption
      supplyTier?: SupplyTier
    }
    const units = listRentalUnits()
    const unit = units.find(u => u.id === Number(body.unitId)) ?? units[0]
    if (!unit) return reply.code(404).send({ error: 'Unit not found' })
    const breakdown = calculateTrueRentalCost(
      unit,
      (Number(body.chequeOption) as ChequeOption) || 1,
      body.supplyTier,
    )
    return { unitCode: unit.unitCode, breakdown }
  })

  app.post('/api/viewings', async (req, reply) => {
    const body = (req.body ?? {}) as {
      unitId: number
      tenantName: string
      tenantPhone: string
      tenantEmiratesIdStatus?: string
      viewingMode?: string
      slotDatetime?: string
    }
    if (!body.unitId || !body.tenantName || !body.tenantPhone) {
      return reply.code(400).send({ error: 'Unit, tenant name, and phone number are required.' })
    }
    const unit = listRentalUnits().find(u => u.id === Number(body.unitId))
    if (!unit) return reply.code(404).send({ error: 'Unit not found.' })

    const gpsStatus =
      unit.keyCustody === 'Smart Lock Instant'
        ? 'One-Time Smart Lock Passcode Issued (UAE PASS Biometric Matched)'
        : `SWK ONE Android Dispatched · Key Tag ${unit.keyVaultTag ?? 'SWK-VAULT'} Checked Out`

    const info = db
      .prepare(`
        INSERT INTO viewing_bookings (
          unit_id, tenant_name, tenant_phone, tenant_emirates_id_status,
          viewing_mode, slot_datetime, advisor_name, gps_status, key_vault_tag, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        unit.id,
        body.tenantName.trim(),
        body.tenantPhone.trim(),
        body.tenantEmiratesIdStatus || 'UAE PASS Verified',
        body.viewingMode || (unit.keyCustody === 'Smart Lock Instant' ? 'Smart Lock Self-Tour' : 'SWK Advisor GPS Escorted'),
        body.slotDatetime || 'Today · Within 60 Mins (Instant Key Dispatch)',
        unit.advisorName,
        gpsStatus,
        unit.keyVaultTag ?? 'SWK-VAULT',
        new Date().toISOString(),
      )

    const created = db.prepare('SELECT * FROM viewing_bookings WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, viewing: created }
  })

  app.post('/api/offers', async (req, reply) => {
    const body = (req.body ?? {}) as {
      unitId: number
      tenantName: string
      tenantEmail?: string
      tenantPhone: string
      kycStatus?: string
      offeredAnnualRent: number
      chequeOption: ChequeOption
      supplyTier?: SupplyTier
      moveInDate?: string
      paymentChannel: string
      destinationAccount?: string
      lockUnitWithDeposit?: boolean
    }

    if (!body.unitId || !body.tenantName || !body.offeredAnnualRent || !body.paymentChannel) {
      return reply.code(400).send({ error: 'Missing required digital offer fields.' })
    }

    const paymentCheck = validateUaeLegalPayment(body.paymentChannel, body.destinationAccount ?? '')
    if (!paymentCheck.ok) {
      return reply.code(400).send({ error: paymentCheck.error })
    }

    const unit = listRentalUnits().find(u => u.id === Number(body.unitId))
    if (!unit) return reply.code(404).send({ error: 'Unit not found.' })

    if (unit.availabilityStatus === 'Ejari Active / Rented') {
      return reply.code(409).send({
        error: 'OS Availability Lock: This unit already has an active Ejari lease and cannot accept duplicate offers.',
      })
    }

    const effectiveUnit = {
      ...unit,
      annualRent1Cheque: Number(body.offeredAnnualRent),
      annualRent2Cheques: Number(body.offeredAnnualRent),
      annualRent4Cheques: Number(body.offeredAnnualRent),
      annualRent12Monthly: Number(body.offeredAnnualRent),
    }

    const cost = calculateTrueRentalCost(
      effectiveUnit,
      (Number(body.chequeOption) as ChequeOption) || 1,
      body.supplyTier ?? unit.supplyTier,
    )

    const lockUnit = body.lockUnitWithDeposit !== false
    const offerStatus = lockUnit
      ? '48h Unit Lock Active — Pending Landlord 1-Click Sign'
      : 'Submitted — Pending Landlord Review'

    const info = db
      .prepare(`
        INSERT INTO rental_offers (
          unit_id, tenant_name, tenant_email, tenant_phone, kyc_status,
          offered_annual_rent, cheque_option, supply_tier, move_in_date,
          payment_channel, holding_deposit_aed, true_monthly_all_in_aed,
          swk_company_share_aed, swk_advisor_share_aed, a2a_partner_share_aed,
          status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        unit.id,
        body.tenantName.trim(),
        (body.tenantEmail || 'verified.tenant@uaepass.ae').trim(),
        body.tenantPhone.trim(),
        body.kycStatus || 'UAE PASS Verified (Emirates ID Matched)',
        Number(body.offeredAnnualRent),
        Number(body.chequeOption) || 1,
        cost.supplyTier,
        body.moveInDate || '2026-11-15',
        body.paymentChannel,
        lockUnit ? 2000 : 0,
        cost.trueMonthlyAllInOperatingCostAed,
        cost.commissionSplit.swkCompanyShareAed,
        cost.commissionSplit.swkAdvisorShareAed,
        cost.commissionSplit.a2aPartnerShareAed,
        offerStatus,
        new Date().toISOString(),
      )

    if (lockUnit) {
      db.prepare('UPDATE rental_units SET availability_status = ? WHERE id = ?').run(
        'Offer Locked (48h)',
        unit.id,
      )
    }

    const created = db.prepare('SELECT * FROM rental_offers WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, offer: created, costBreakdown: cost }
  })

  app.post('/api/offers/:id/decision', async (req, reply) => {
    const id = Number((req.params as any).id)
    const body = (req.body ?? {}) as { decision: 'Accepted — Ejari Issued' | 'Declined — Unit Unlocked' }
    const offer = db.prepare('SELECT * FROM rental_offers WHERE id = ?').get(id) as any
    if (!offer) return reply.code(404).send({ error: 'Offer not found' })

    db.prepare('UPDATE rental_offers SET status = ? WHERE id = ?').run(body.decision, id)
    if (body.decision === 'Accepted — Ejari Issued') {
      db.prepare('UPDATE rental_units SET availability_status = ? WHERE id = ?').run(
        'Ejari Active / Rented',
        offer.unit_id,
      )
    } else {
      db.prepare('UPDATE rental_units SET availability_status = ? WHERE id = ?').run(
        'Available',
        offer.unit_id,
      )
    }
    return { ok: true }
  })

  app.post('/api/pdc/:id/action', async (req, reply) => {
    const id = Number((req.params as any).id)
    const body = (req.body ?? {}) as { action: 'Cleared' | 'Deposited' | 'RNPL_Bounce_Shield' }
    const chq = db.prepare('SELECT * FROM pdc_cheques WHERE id = ?').get(id) as any
    if (!chq) return reply.code(404).send({ error: 'Cheque not found' })

    const nextStatus =
      body.action === 'RNPL_Bounce_Shield'
        ? 'Converted to UAEDDS / RNPL Monthly (Bounce Prevented)'
        : body.action

    db.prepare('UPDATE pdc_cheques SET status = ? WHERE id = ?').run(nextStatus, id)
    return { ok: true, id, status: nextStatus }
  })

  app.post('/api/maintenance', async (req, reply) => {
    const body = (req.body ?? {}) as {
      leaseCode?: string
      unitLabel: string
      category: 'AC / Cooling' | 'Plumbing Leak' | 'Electrical' | 'Appliances' | 'Structural / Roof / Water Heater' | 'Cosmetic / Bulbs'
      issueSummary: string
      estimatedCostAed: number
    }
    if (!body.unitLabel || !body.issueSummary || !body.estimatedCostAed) {
      return reply.code(400).send({ error: 'Unit, issue description, and estimated cost are required.' })
    }
    const classification = classifyMaintenanceResponsibility({
      category: body.category || 'AC / Cooling',
      estimatedCostAed: Number(body.estimatedCostAed),
    })
    const status =
      classification.responsibleParty === 'Landlord'
        ? 'Routed to Landlord in Owner360 (≥ AED 500 Major SLA)'
        : 'Auto-Dispatched — Tenant Minor Wear Tier (< AED 500)'

    const info = db
      .prepare(`
        INSERT INTO maintenance_tickets (
          lease_code, unit_label, category, issue_summary, estimated_cost_aed,
          responsible_party, rule_explanation, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        body.leaseCode || 'EJARI-2026-884120',
        body.unitLabel,
        body.category || 'AC / Cooling',
        body.issueSummary.trim(),
        Number(body.estimatedCostAed),
        classification.responsibleParty,
        classification.ruleExplanation,
        status,
        new Date().toISOString(),
      )

    const ticket = db.prepare('SELECT * FROM maintenance_tickets WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, ticket, classification }
  })

  app.post('/api/rera-calculator', async (req) => {
    const body = (req.body ?? {}) as {
      currentRent: number
      reraIndexRent: number
      proposedRent: number
      leaseEndDate: string
      noticeServedDate?: string | null
    }
    return evaluateReraRenewal({
      currentRent: Number(body.currentRent) || 100000,
      reraIndexRent: Number(body.reraIndexRent) || 120000,
      proposedRent: Number(body.proposedRent) || 115000,
      leaseEndDate: body.leaseEndDate || '2027-01-14',
      noticeServedDate: body.noticeServedDate || null,
    })
  })

  app.post('/api/a2a/register', async (req, reply) => {
    const body = (req.body ?? {}) as {
      partnerAgencyName: string
      partnerOrn: string
      brokerName: string
      brokerBrn: string
      unitId: number
      clientName: string
    }
    if (!body.partnerAgencyName || !body.partnerOrn || !body.brokerName || !body.clientName) {
      return reply.code(400).send({ error: 'Agency ORN, Broker BRN, and Client Name are required.' })
    }
    const expires = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
    const info = db
      .prepare(`
        INSERT INTO a2a_partner_mandates (
          partner_agency_name, partner_orn, broker_name, broker_brn, unit_id,
          client_name, protection_expires_at, agreed_a2a_split_pct, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 50, ?, ?)
      `)
      .run(
        body.partnerAgencyName.trim(),
        body.partnerOrn.trim(),
        body.brokerName.trim(),
        body.brokerBrn.trim() || 'BRN-VERIFIED',
        Number(body.unitId) || 1,
        body.clientName.trim(),
        expires,
        'Protected Lead — 50% Partner / 25% SWK / 25% Advisor Locked',
        new Date().toISOString(),
      )
    const mandate = db.prepare('SELECT * FROM a2a_partner_mandates WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, mandate }
  })

  app.post('/api/landlord/onboard', async (req, reply) => {
    const body = (req.body ?? {}) as {
      landlordName: string
      uaePassUuid?: string
      titleDeedNo: string
      makaniNo: string
      buildingName: string
      unitNo: string
      bedrooms: number
      askingRentAed: number
      selectedPlan: string
    }
    if (!body.landlordName || !body.titleDeedNo || !body.buildingName || !body.unitNo) {
      return reply.code(400).send({ error: 'Landlord name, Title Deed No., building, and unit number are required.' })
    }
    const info = db
      .prepare(`
        INSERT INTO direct_landlord_mandates (
          landlord_name, uae_pass_uuid, title_deed_no, makani_no, building_name,
          unit_no, bedrooms, asking_rent_aed, selected_plan, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        body.landlordName.trim(),
        body.uaePassUuid || `UAEPASS-${Math.floor(100000 + Math.random() * 900000)}`,
        body.titleDeedNo.trim(),
        body.makaniNo.trim() || '25194 74812',
        body.buildingName.trim(),
        body.unitNo.trim(),
        Number(body.bedrooms) || 1,
        Number(body.askingRentAed) || 110000,
        body.selectedPlan || 'Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)',
        'Title Deed & UAE PASS Verified — Live on SWKBayut & Owner360',
        new Date().toISOString(),
      )
    const mandate = db.prepare('SELECT * FROM direct_landlord_mandates WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, mandate }
  })

  // ------------------------------------------------------------------
  // NEW SUPER-ENDPOINTS: Developer BTR FIFO Queue, Reverse Tenant Auction,
  // Free XML CRM Importer & Smart Move-In Gate Pass Generator
  // ------------------------------------------------------------------
  app.post('/api/developer-pools', async (req, reply) => {
    const body = (req.body ?? {}) as {
      projectName: string
      developerName: string
      community: string
      handoverDate: string
      totalHandoverUnits: number
      activePublicQueueCap?: number
      protectedFloorRent1BrAed: number
      protectedFloorRent2BrAed: number
    }
    if (!body.projectName || !body.developerName || !body.totalHandoverUnits) {
      return reply.code(400).send({ error: 'Project name, developer, and unit count are required.' })
    }
    const code = `DEV-${Date.now().toString(36).toUpperCase()}`
    const info = db
      .prepare(`
        INSERT INTO developer_btr_pools (
          project_code, project_name, developer_name, community, handover_date,
          total_handover_units, leased_count, active_public_queue_cap,
          protected_floor_rent_1br_aed, protected_floor_rent_2br_aed,
          yield_protection_boost_pct, dlp_snagging_included, commission_to_partner_agents_pct, status
        ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 15.0, 1, 5.0, ?)
      `)
      .run(
        code,
        body.projectName.trim(),
        body.developerName.trim(),
        body.community || 'Dubai',
        body.handoverDate || '2026-12-30',
        Number(body.totalHandoverUnits),
        Number(body.activePublicQueueCap) || 3,
        Number(body.protectedFloorRent1BrAed) || 95000,
        Number(body.protectedFloorRent2BrAed) || 140000,
        'FIFO Anti-Cannibalization Active (Protected Yield Floor)',
      )
    return { ok: true, poolId: Number(info.lastInsertRowid), pools: listDeveloperBtrPools() }
  })

  app.post('/api/developer-pools/:id/reserve', async (req, reply) => {
    const id = Number((req.params as any).id)
    const pool = db.prepare('SELECT * FROM developer_btr_pools WHERE id = ?').get(id) as any
    if (!pool) return reply.code(404).send({ error: 'Developer pool not found' })

    const nextLeased = Math.min(pool.total_handover_units, Number(pool.leased_count) + 1)
    db.prepare('UPDATE developer_btr_pools SET leased_count = ?, status = ? WHERE id = ?').run(
      nextLeased,
      `FIFO Unit #${nextLeased} Locked — Next Queue Unit Auto-Released at AED ${pool.protected_floor_rent_1br_aed.toLocaleString('en-US')}`,
      id,
    )
    return { ok: true, leasedCount: nextLeased }
  })

  app.post('/api/reverse-briefs', async (req, reply) => {
    const body = (req.body ?? {}) as {
      tenantAlias: string
      corporateEmployer: string
      preferredCommunities: string
      bedroomsMin: number
      maxAnnualBudgetAed: number
      chequesReady: number
      targetMoveInDate?: string
      representingAgentName?: string
    }
    if (!body.tenantAlias || !body.preferredCommunities || !body.maxAnnualBudgetAed) {
      return reply.code(400).send({ error: 'Tenant alias, communities, and max budget are required.' })
    }
    const code = `TENANT-BRIEF-${Math.floor(100 + Math.random() * 900)}`
    const info = db
      .prepare(`
        INSERT INTO tenant_reverse_briefs (
          brief_code, tenant_alias, corporate_employer, uae_pass_verified,
          preferred_communities, bedrooms_min, max_annual_budget_aed, cheques_ready,
          target_move_in_date, representing_agent_name, representing_agency_orn,
          bids_count, status
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'ORN-51517', 0, 'UAE PASS & Cheques Verified — Open for Landlord Bids')
      `)
      .run(
        code,
        body.tenantAlias.trim(),
        body.corporateEmployer?.trim() || 'DIFC / Multinational Executive',
        body.preferredCommunities.trim(),
        Number(body.bedroomsMin) || 1,
        Number(body.maxAnnualBudgetAed),
        Number(body.chequesReady) || 1,
        body.targetMoveInDate || '2026-11-25',
        body.representingAgentName?.trim() || 'SWK Leasing Desk',
      )
    return { ok: true, briefId: Number(info.lastInsertRowid), briefs: listTenantReverseBriefs() }
  })

  app.post('/api/reverse-briefs/:id/bid', async (req, reply) => {
    const id = Number((req.params as any).id)
    const body = (req.body ?? {}) as { bidRentAed: number; unitLabel: string }
    const brief = db.prepare('SELECT * FROM tenant_reverse_briefs WHERE id = ?').get(id) as any
    if (!brief) return reply.code(404).send({ error: 'Brief not found' })

    const bidRent = Number(body.bidRentAed) || Math.round(brief.max_annual_budget_aed * 0.96)
    const unitLabel = body.unitLabel?.trim() || 'Marina Gate I · #3402 (Chiller Free)'
    const nextBids = Number(brief.bids_count) + 1
    const bestRent = brief.best_bid_rent_aed ? Math.min(brief.best_bid_rent_aed, bidRent) : bidRent

    db.prepare(`
      UPDATE tenant_reverse_briefs
      SET bids_count = ?, best_bid_rent_aed = ?, best_bid_unit_label = ?, status = ?
      WHERE id = ?
    `).run(
      nextBids,
      bestRent,
      unitLabel,
      `Matched! Best Bid AED ${bestRent.toLocaleString('en-US')} (${unitLabel})`,
      id,
    )
    return { ok: true, bidsCount: nextBids, bestBidRentAed: bestRent }
  })

  app.post('/api/crm-sync/import', async (req, reply) => {
    const body = (req.body ?? {}) as {
      agencyName: string
      crmProvider: string
      feedUrl: string
      unitsCount?: number
    }
    if (!body.agencyName || !body.crmProvider) {
      return reply.code(400).send({ error: 'Agency name and CRM provider are required.' })
    }
    const unitsCount = Number(body.unitsCount) || 35
    const savings = calculatePortalSavingsVsCompetitors({
      activeListingsCount: unitsCount,
      agentsCount: Math.max(5, Math.round(unitsCount / 3)),
    })

    const info = db
      .prepare(`
        INSERT INTO crm_xml_feeds (
          agency_name, crm_provider, feed_url, imported_units_count, annual_credit_burn_saved_aed, synced_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        body.agencyName.trim(),
        body.crmProvider.trim(),
        body.feedUrl?.trim() || 'https://os.swkpropertiesuae.com/api/syndication/feed.xml',
        unitsCount,
        savings.annualPortalSavingsAed,
        new Date().toISOString(),
      )
    const feed = db.prepare('SELECT * FROM crm_xml_feeds WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, feed, savings }
  })

  app.post('/api/gate-pass/generate', async (req, reply) => {
    const body = (req.body ?? {}) as {
      buildingName: string
      unitNo: string
      tenantName: string
      moverCompany: string
      moveDate: string
    }
    if (!body.buildingName || !body.unitNo || !body.tenantName) {
      return reply.code(400).send({ error: 'Building, unit number, and tenant name are required.' })
    }
    const passCode = `NOC-PASS-${Math.floor(1000 + Math.random() * 9000)}`
    const qrToken = `QR-OA-VERIFIED-${body.unitNo}-${Date.now().toString(36).toUpperCase()}`
    const info = db
      .prepare(`
        INSERT INTO move_in_gate_passes (
          pass_code, building_name, unit_no, tenant_name, ejari_verified, dewa_verified, chiller_verified,
          mover_company, move_date, qr_token, status
        ) VALUES (?, ?, ?, ?, 1, 1, 1, ?, ?, ?, 'Cleared by Building OA Security — Gate Barrier Auto-Approved')
      `)
      .run(
        passCode,
        body.buildingName.trim(),
        body.unitNo.trim(),
        body.tenantName.trim(),
        body.moverCompany?.trim() || 'Allied Pickfords / TruKKer UAE',
        body.moveDate || '2026-11-18',
        qrToken,
      )
    const pass = db.prepare('SELECT * FROM move_in_gate_passes WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, pass }
  })

  // Serve built frontend in production
  const webDist = path.resolve('dist/web')
  if (fs.existsSync(webDist)) {
    app.register(fastifyStatic, { root: webDist, wildcard: false })
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'API route not found' })
      return reply.sendFile('index.html')
    })
  }

  return app
}

const entryArg = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (
  entryArg === path.resolve('src/server/index.ts') ||
  entryArg === path.resolve('dist/server/index.mjs')
) {
  const port = Number(process.env.PORT ?? 8090)
  const app = buildServer()
  app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`SWKBayut Rental OS API & Web listening on http://localhost:${port}`)
  })
}
