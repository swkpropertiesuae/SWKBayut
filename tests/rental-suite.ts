import assert from 'node:assert/strict'
import { buildServer } from '../src/server/index'
import {
  calculateTrueRentalCost,
  evaluateReraRenewal,
  classifyMaintenanceResponsibility,
  calculatePortalSavingsVsCompetitors,
  calculateDeveloperBtrYieldProtection,
} from '../src/shared/uae-rental-rules'

async function runTests() {
  const app = buildServer()
  let passed = 0
  const check = (name: string, fn: () => void) => {
    fn()
    passed++
    console.log(`  ✓ [${passed}] ${name}`)
  }

  console.log('Running swk.rent UAE Rental Platform, OS REST API Bridge & Agent/Developer Super-Suite...')

  // 1. Health & OS REST API Bridge + Android/iOS Package ID
  const healthRes = await app.inject({ method: 'GET', url: '/api/health' })
  check('GET /api/health returns swk.rent domain, ORN 51517, OS REST API mode & ae.swk.rent package ID', () => {
    assert.equal(healthRes.statusCode, 200)
    const body = healthRes.json()
    assert.equal(body.ok, true)
    assert.equal(body.domain, 'https://swk.rent')
    assert.equal(body.reraOrn, '51517')
    assert.equal(body.androidPackage, 'ae.swk.rent')
    assert.equal(body.iosBundleId, 'ae.swk.rent')
  })

  // 2. Bootstrap Payload
  const bootRes = await app.inject({ method: 'GET', url: '/api/bootstrap' })
  const boot = bootRes.json()
  check('GET /api/bootstrap returns buildings, units, leases, PDCs, developer BTR pools, reverse briefs & CRM feeds', () => {
    assert.equal(bootRes.statusCode, 200)
    assert.ok(boot.buildings.length >= 6)
    assert.ok(boot.units.length >= 6)
    assert.ok(boot.developerPools.length >= 3)
    assert.ok(boot.reverseBriefs.length >= 3)
    assert.ok(boot.crmFeeds.length >= 2)
    assert.ok(boot.gatePasses.length >= 1)
  })

  // 3. Hybrid Supply Commission & True Monthly Cost Engine
  const sampleUnit = boot.units[0]
  check('Direct-to-Landlord tier charges flat AED 2,999 fee & saves tenant vs 5% broker fee', () => {
    const directCost = calculateTrueRentalCost(sampleUnit, 1, 'DIRECT_LANDLORD')
    assert.equal(directCost.agencyOrPlatformFeeAed, 2999)
    assert.ok(directCost.agencyFeeSavingVsTraditionalAed > 3000)
    assert.equal(directCost.commissionSplit.swkCompanyShareAed, 2999)
  })

  check('A2A Partner tier locks 50% Partner / 25% SWK Company / 25% SWK Advisor split', () => {
    const a2aCost = calculateTrueRentalCost(sampleUnit, 1, 'A2A_PARTNER')
    const gross = a2aCost.commissionSplit.grossFeeExclVat
    assert.equal(a2aCost.commissionSplit.a2aPartnerShareAed, Math.round(gross * 0.5))
    assert.equal(
      a2aCost.commissionSplit.swkCompanyShareAed +
        a2aCost.commissionSplit.swkAdvisorShareAed +
        a2aCost.commissionSplit.a2aPartnerShareAed,
      gross,
    )
  })

  // 4. Hard UAE Payment Guard blocks personal bank accounts
  const rogueOfferRes = await app.inject({
    method: 'POST',
    url: '/api/offers',
    payload: {
      unitId: 1,
      tenantName: 'Test Tenant',
      tenantPhone: '+971500000000',
      offeredAnnualRent: 125000,
      chequeOption: 4,
      paymentChannel: 'SWK Company Escrow / Corporate Account (AED)',
      destinationAccount: 'Please wire to agent personal bank account IBAN',
    },
  })
  check('POST /api/offers blocks rogue Sales Advisor personal bank account with HTTP 400', () => {
    assert.equal(rogueOfferRes.statusCode, 400)
    assert.match(rogueOfferRes.json().error, /UAE Compliance Block/i)
  })

  // 5. Valid 1-Click Digital Offer locks unit for 48 hours
  const validOfferRes = await app.inject({
    method: 'POST',
    url: '/api/offers',
    payload: {
      unitId: 1,
      tenantName: 'Rashid Al Falasi',
      tenantPhone: '+971501234567',
      offeredAnnualRent: 125000,
      chequeOption: 12,
      paymentChannel: 'UAEDDS Central Bank Monthly Direct Debit',
      lockUnitWithDeposit: true,
    },
  })
  check('POST /api/offers creates digital offer and locks unit availability for 48 hours', () => {
    assert.equal(validOfferRes.statusCode, 200)
    const body = validOfferRes.json()
    assert.equal(body.ok, true)
    assert.match(body.offer.status, /48h Unit Lock Active/)
  })

  // 6. RERA Decree 43 of 2013 & Law 33 of 2008 90-Day Notice Shield
  check('RERA Renewal Shield blocks late notice (< 90 days) and caps rent increase at 0%', () => {
    const lateEval = evaluateReraRenewal({
      currentRent: 100000,
      reraIndexRent: 130000,
      proposedRent: 115000,
      leaseEndDate: '2026-12-31',
      noticeServedDate: '2026-11-01',
    })
    assert.equal(lateEval.noticeGivenOnTime, false)
    assert.equal(lateEval.maxAllowedIncreasePct, 0)
    assert.equal(lateEval.maxLegalRenewalRent, 100000)
    assert.equal(lateEval.isLegalProposal, false)
  })

  // 7. UAE AED 500 Maintenance Classifier
  check('Maintenance classifier assigns < AED 500 to Tenant and >= AED 500 to Landlord', () => {
    const minor = classifyMaintenanceResponsibility({ category: 'Cosmetic / Bulbs', estimatedCostAed: 320 })
    const major = classifyMaintenanceResponsibility({ category: 'AC / Cooling', estimatedCostAed: 950 })
    assert.equal(minor.responsibleParty, 'Tenant')
    assert.equal(major.responsibleParty, 'Landlord')
  })

  // 8. PDC Bounce Shield conversion
  const pdcRes = await app.inject({
    method: 'POST',
    url: '/api/pdc/3/action',
    payload: { action: 'RNPL_Bounce_Shield' },
  })
  check('POST /api/pdc/:id/action converts upcoming PDC cheque to RNPL Monthly Bounce Shield', () => {
    assert.equal(pdcRes.statusCode, 200)
    assert.match(pdcRes.json().status, /Bounce Prevented/)
  })

  // 9. A2A Partner Registration
  const a2aRes = await app.inject({
    method: 'POST',
    url: '/api/a2a/register',
    payload: {
      partnerAgencyName: 'Haus & Haus Partner Desk',
      partnerOrn: 'ORN-29100',
      brokerName: 'Kareem Abbas',
      brokerBrn: 'BRN-44102',
      unitId: 2,
      clientName: 'Dr. Lukas Weber',
    },
  })
  check('POST /api/a2a/register locks 7-day lead protection and 50/50 split', () => {
    assert.equal(a2aRes.statusCode, 200)
    assert.equal(a2aRes.json().mandate.agreed_a2a_split_pct, 50)
  })

  // 10. Agency Portal Cost Savings Engine & Free XML CRM Feed Sync
  const crmRes = await app.inject({
    method: 'POST',
    url: '/api/crm-sync/import',
    payload: {
      agencyName: 'Espace / Allsopp Partner Desk',
      crmProvider: 'PropSpace / Propertybase XML',
      feedUrl: 'https://feeds.propspace.com/partner.xml',
      unitsCount: 60,
    },
  })
  check('POST /api/crm-sync/import imports XML feed at AED 0 cost & computes annual portal savings', () => {
    assert.equal(crmRes.statusCode, 200)
    const body = crmRes.json()
    assert.equal(body.savings.swkRentUpfrontListingCostAed, 0)
    assert.ok(body.savings.annualPortalSavingsAed >= 150000)
  })

  // 11. Developer BTR Anti-Cannibalization FIFO Queue Reservation
  const fifoRes = await app.inject({
    method: 'POST',
    url: '/api/developer-pools/1/reserve',
  })
  check('POST /api/developer-pools/:id/reserve locks FIFO unit and protects building yield floor', () => {
    assert.equal(fifoRes.statusCode, 200)
    assert.equal(fifoRes.json().ok, true)
    const yieldProt = calculateDeveloperBtrYieldProtection({ totalUnits: 180, protectedFloorRentAed: 135000 })
    assert.ok(yieldProt.assetValuationProtectedAed > 20000000)
  })

  // 12. Reverse Rental Auction (Landlord Bids on Verified Tenant Brief)
  const bidRes = await app.inject({
    method: 'POST',
    url: '/api/reverse-briefs/1/bid',
    payload: {
      bidRentAed: 162000,
      unitLabel: 'Downtown Views II · #4805',
    },
  })
  check('POST /api/reverse-briefs/:id/bid records landlord bid on UAE-PASS verified tenant brief', () => {
    assert.equal(bidRes.statusCode, 200)
    assert.equal(bidRes.json().bestBidRentAed, 162000)
  })

  // 13. Smart Building OA Move-In Gate Pass QR Generator
  const passRes = await app.inject({
    method: 'POST',
    url: '/api/gate-pass/generate',
    payload: {
      buildingName: 'Marina Gate I',
      unitNo: '3402',
      tenantName: 'Alexander Vance',
      moverCompany: 'TruKKer UAE',
      moveDate: '2026-11-20',
    },
  })
  check('POST /api/gate-pass/generate issues verified Building OA Security QR Move-In Pass', () => {
    assert.equal(passRes.statusCode, 200)
    assert.match(passRes.json().pass.qr_token, /^QR-OA-VERIFIED/)
  })

  // 14. User Signup, Signin, Session Token & 1,000-User MVP Cohort Onboarding
  const uniqueEmail = `mvp.broker.${Date.now()}@swk.rent`
  const signupRes = await app.inject({
    method: 'POST',
    url: '/api/auth/signup',
    payload: {
      fullName: 'Zayd Al Maktoum',
      email: uniqueEmail,
      phone: '+971 50 911 2233',
      password: 'SwkMvpUser2026!',
      role: 'AGENT',
      reraBrn: 'BRN-77812',
      reraOrn: 'ORN-51517',
      agencyOrCompanyName: 'SWK Properties L.L.C.',
    },
  })
  check('POST /api/auth/signup registers new RERA Agent in 1,000-user MVP cohort & issues session token', () => {
    assert.equal(signupRes.statusCode, 200)
    const body = signupRes.json()
    assert.equal(body.ok, true)
    assert.equal(body.user.role, 'AGENT')
    assert.ok(body.sessionToken.startsWith('swk_sess_'))
  })

  const loginRes = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: uniqueEmail,
      password: 'SwkMvpUser2026!',
    },
  })
  const agentToken = loginRes.json().sessionToken as string
  const meRes = await app.inject({
    method: 'GET',
    url: '/api/auth/me',
    headers: { 'x-swk-session': agentToken },
  })
  check('POST /api/auth/login & GET /api/auth/me authenticate scrypt password & resolve active session', () => {
    assert.equal(loginRes.statusCode, 200)
    assert.equal(meRes.statusCode, 200)
    assert.equal(meRes.json().authenticated, true)
    assert.equal(meRes.json().user.email, uniqueEmail)
  })

  // 15. Role-Based Access Control (RBAC) Enforcement
  const tenantCreatePoolRes = await app.inject({
    method: 'POST',
    url: '/api/developer-pools',
    headers: { 'x-swk-role': 'TENANT' },
    payload: {
      projectName: 'Unauthorized Tenant Pool',
      developerName: 'Test',
      community: 'Dubai',
      handoverDate: '2026-12-30',
      totalHandoverUnits: 50,
      protectedFloorRent1BrAed: 90000,
      protectedFloorRent2BrAed: 130000,
    },
  })
  check('RBAC blocks TENANT from creating a Developer BTR Pool with HTTP 403 Forbidden', () => {
    assert.equal(tenantCreatePoolRes.statusCode, 403)
    assert.match(tenantCreatePoolRes.json().error, /RBAC Access Denied/i)
  })

  // 16. 7-Stage End-to-End UAE Rental Deal Workflow & Role-Gated Sign-Offs
  const createWfRes = await app.inject({
    method: 'POST',
    url: '/api/workflows',
    headers: { 'x-swk-session': agentToken },
    payload: {
      unitId: 3,
      tenantName: 'Noura Al Suwaidi',
      annualRentAed: 78000,
      chequeOption: 2,
    },
  })
  const wfId = createWfRes.json().workflow.id as number
  check('POST /api/workflows initializes Stage 1 of 7-Stage UAE Rental Deal Pipeline', () => {
    assert.equal(createWfRes.statusCode, 200)
    assert.equal(createWfRes.json().workflow.currentStage, 1)
  })

  // Advance Stage 1 -> Stage 2 (Offer & Lock) as TENANT
  const wfStage2Res = await app.inject({
    method: 'POST',
    url: `/api/workflows/${wfId}/advance`,
    headers: { 'x-swk-role': 'TENANT' },
    payload: { note: 'Offer & AED 2,000 Escrow Lock submitted by Tenant' },
  })
  assert.equal(wfStage2Res.statusCode, 200)

  // Attempt Stage 2 -> Stage 3 (Landlord Approval) as TENANT -> MUST FAIL WITH 403!
  const wfTenantApproveFail = await app.inject({
    method: 'POST',
    url: `/api/workflows/${wfId}/advance`,
    headers: { 'x-swk-role': 'TENANT' },
  })
  check('7-Stage Workflow RBAC blocks TENANT from signing off Stage 3 (Landlord Approval) with HTTP 403', () => {
    assert.equal(wfTenantApproveFail.statusCode, 403)
    assert.equal(wfTenantApproveFail.json().targetStage, 3)
  })

  // Advance Stage 3 (LANDLORD), Stage 4 (TENANT), Stage 5 (AGENT -> issues Ejari), Stage 6 (TENANT), Stage 7 (AGENT -> issues Gate Pass & Active Lease)
  await app.inject({ method: 'POST', url: `/api/workflows/${wfId}/advance`, headers: { 'x-swk-role': 'LANDLORD' } })
  await app.inject({ method: 'POST', url: `/api/workflows/${wfId}/advance`, headers: { 'x-swk-role': 'TENANT' } })
  const stage5Res = await app.inject({ method: 'POST', url: `/api/workflows/${wfId}/advance`, headers: { 'x-swk-role': 'AGENT' } })
  await app.inject({ method: 'POST', url: `/api/workflows/${wfId}/advance`, headers: { 'x-swk-role': 'TENANT' } })
  const stage7Res = await app.inject({ method: 'POST', url: `/api/workflows/${wfId}/advance`, headers: { 'x-swk-role': 'AGENT' } })

  check('7-Stage Workflow completes Stages 3..7, auto-issues Official Ejari at Stage 5 & Move-In QR Gate Pass at Stage 7', () => {
    assert.equal(stage5Res.statusCode, 200)
    assert.match(stage5Res.json().workflow.ejariOrTawtheeqNo, /^EJARI-2026-/)
    assert.equal(stage7Res.statusCode, 200)
    const finalWf = stage7Res.json().workflow
    assert.equal(finalWf.currentStage, 7)
    assert.equal(finalWf.status, 'COMPLETED_ACTIVE_LEASE')
    assert.match(finalWf.gatePassCode, /^NOC-PASS-/)
  })

  // 17. External OS REST API & Webhook Integration Bridge
  const osStatusRes = await app.inject({ method: 'GET', url: '/api/os-api/status' })
  const osSyncRes = await app.inject({
    method: 'POST',
    url: '/api/os-api/sync-inventory',
    payload: {
      unitsPayload: [
        {
          unitCode: 'SWK-RENT-102',
          annualRent1Cheque: 185000,
          availabilityStatus: 'Available',
        },
      ],
    },
  })
  const osWebhookRes = await app.inject({
    method: 'POST',
    url: '/api/os-api/webhook',
    payload: {
      eventType: 'KEY_VAULT_VERIFIED',
      unitCode: 'SWK-RENT-102',
      keyVaultTag: 'SMARTLOCK-DV2-4805-VERIFIED',
    },
  })
  check('GET /api/os-api/status, POST /api/os-api/sync-inventory & POST /api/os-api/webhook sync external OS via REST API', () => {
    assert.equal(osStatusRes.statusCode, 200)
    assert.equal(osStatusRes.json().domain, 'https://swk.rent')
    assert.equal(osStatusRes.json().integrationMode, 'REST_API_AND_WEBHOOKS_ONLY')
    assert.equal(osSyncRes.statusCode, 200)
    assert.equal(osSyncRes.json().ok, true)
    assert.equal(osSyncRes.json().syncedUnitsCount, 1)
    assert.equal(osWebhookRes.statusCode, 200)
    assert.equal(osWebhookRes.json().affectedUnitCode, 'SWK-RENT-102')
  })

  await app.close()
  console.log(`\nALL ${passed}/${passed} SWK.RENT UAE RENTAL PLATFORM, OS REST API, RBAC & 7-STAGE WORKFLOW CHECKS PASSED!`)
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
