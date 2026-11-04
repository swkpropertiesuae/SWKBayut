import Fastify, { type FastifyRequest, type FastifyReply } from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyHelmet from '@fastify/helmet'
import fastifyCookie from '@fastify/cookie'
import fastifyRateLimit from '@fastify/rate-limit'
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
  listRentalWorkflows,
  listUsersPublic,
  mapUserRow,
  recordAuditLog,
  getMvpLaunchTelemetry,
} from './db'
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSessionToken,
  hashSessionToken,
} from './auth'
import {
  getOsApiStatus,
  updateOsApiConfig,
  syncInventoryFromOsApi,
  pushEventToOsApi,
  handleInboundOsWebhook,
} from './os-api-client'
import {
  type ChequeOption,
  type SupplyTier,
  type UserRole,
  type AuthUser,
  type RbacAction,
  ROLE_CAPABILITIES,
  UAE_RENTAL_WORKFLOW_STAGES,
  canRoleExecuteAction,
  canRoleAdvanceWorkflowStage,
  calculateTrueRentalCost,
  evaluateReraRenewal,
  validateUaeLegalPayment,
  classifyMaintenanceResponsibility,
  calculatePortalSavingsVsCompetitors,
} from '../shared/uae-rental-rules'

const SESSION_COOKIE_NAME = 'swkrent_session'
const SESSION_TTL_MS = 7 * 24 * 3600 * 1000 // 7 days

export function resolveRequestUser(req: FastifyRequest): AuthUser | null {
  const headerToken =
    (req.headers['x-swk-session'] as string | undefined) ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7).trim()
      : undefined)
  const cookieToken = (req.cookies as Record<string, string | undefined> | undefined)?.[SESSION_COOKIE_NAME]
  const rawToken = headerToken || cookieToken
  if (!rawToken) return null

  const tokenHash = hashSessionToken(rawToken)
  const sess = db
    .prepare('SELECT * FROM auth_sessions WHERE token_hash = ?')
    .get(tokenHash) as any
  if (!sess) return null

  if (new Date(sess.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash)
    return null
  }

  const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(sess.user_id) as any
  if (!userRow) return null
  return mapUserRow(userRow)
}

function checkRbacPermission(
  req: FastifyRequest,
  reply: FastifyReply,
  action: RbacAction,
): { allowed: boolean; user: AuthUser | null } {
  const user = resolveRequestUser(req)
  const explicitRoleHeader = req.headers['x-swk-role'] as UserRole | undefined
  const effectiveRole = user?.role ?? explicitRoleHeader

  if (effectiveRole && !canRoleExecuteAction(effectiveRole, action)) {
    reply.code(403).send({
      error: `RBAC Access Denied: Role "${effectiveRole}" (${ROLE_CAPABILITIES[effectiveRole]?.label ?? effectiveRole}) is not permitted to perform "${action}".`,
      requiredAction: action,
      currentRole: effectiveRole,
    })
    return { allowed: false, user }
  }
  return { allowed: true, user }
}

export function buildServer() {
  initSchemaAndSeed()

  const app = Fastify({ logger: false })

  app.register(fastifyHelmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
  app.register(fastifyCookie, {
    secret: process.env.SWK_COOKIE_SECRET || 'swk-rent-orn-51517-production-secret-2026',
  })
  app.register(fastifyRateLimit, {
    max: 600,
    timeWindow: '1 minute',
  })

  app.get('/api/health', async () => ({
    ok: true,
    service: 'swk.rent UAE Dedicated Rental Platform (MVP 1,000-User Production Engine)',
    domain: 'https://swk.rent',
    reraOrn: '51517',
    osApiIntegration: 'REST_API_AND_WEBHOOKS_ONLY',
    osApiUrl: getOsApiStatus().osApiUrl,
    androidPackage: 'ae.swk.rent',
    iosBundleId: 'ae.swk.rent',
    rbacRoles: Object.keys(ROLE_CAPABILITIES),
    workflowStagesCount: UAE_RENTAL_WORKFLOW_STAGES.length,
    timestamp: new Date().toISOString(),
  }))

  // ------------------------------------------------------------------
  // AUTHENTICATION, SIGNUP, SIGNIN & RBAC ENDPOINTS
  // ------------------------------------------------------------------
  app.post('/api/auth/signup', async (req, reply) => {
    const body = (req.body ?? {}) as {
      email: string
      password: string
      fullName: string
      phone: string
      role: UserRole
      emiratesIdOrPassport?: string
      reraBrn?: string
      reraOrn?: string
      agencyOrCompanyName?: string
      titleDeedRef?: string
    }

    if (!body.email || !body.password || !body.fullName || !body.phone) {
      return reply.code(400).send({
        error: 'Full name, email address, UAE phone number, and password are required.',
      })
    }

    const emailClean = body.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean)) {
      return reply.code(400).send({ error: 'Please provide a valid email address.' })
    }

    const pwCheck = validatePasswordStrength(body.password)
    if (!pwCheck.ok) {
      return reply.code(400).send({ error: pwCheck.error })
    }

    const role: UserRole =
      body.role && ROLE_CAPABILITIES[body.role] ? body.role : 'TENANT'

    // Role-specific UAE regulatory verification checks
    if (role === 'AGENT' && !body.reraBrn && !body.reraOrn) {
      return reply.code(400).send({
        error: 'RERA Broker Registration (BRN) or Agency ORN is required for Agent/Broker signup.',
      })
    }
    if (role === 'LANDLORD' && !body.titleDeedRef) {
      return reply.code(400).send({
        error: 'DLD Title Deed Reference or Mulkiya No. is required for Direct Landlord signup.',
      })
    }

    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ?').get(emailClean)
    if (existing) {
      return reply.code(409).send({
        error: 'An account with this email address is already registered. Please sign in.',
      })
    }

    const pwHash = hashPassword(body.password)
    const now = new Date().toISOString()
    const info = db
      .prepare(`
        INSERT INTO users (
          email, password_hash, full_name, phone, role, uae_pass_verified,
          emirates_id_or_passport, rera_brn, rera_orn, agency_or_company_name, title_deed_ref,
          last_login_at, created_at
        ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        emailClean,
        pwHash,
        body.fullName.trim(),
        body.phone.trim(),
        role,
        body.emiratesIdOrPassport?.trim() || 'UAE-PASS-VERIFIED',
        body.reraBrn?.trim() || null,
        body.reraOrn?.trim() || (role === 'AGENT' ? 'ORN-51517' : null),
        body.agencyOrCompanyName?.trim() || null,
        body.titleDeedRef?.trim() || null,
        now,
        now,
      )

    const userRow = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid)
    const user = mapUserRow(userRow)

    const { token, tokenHash } = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()
    db.prepare(`
      INSERT INTO auth_sessions (token_hash, user_id, role, ip_address, user_agent, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      tokenHash,
      user.id,
      user.role,
      req.ip,
      (req.headers['user-agent'] || '').slice(0, 200),
      now,
      expiresAt,
    )

    reply.setCookie(SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    })

    recordAuditLog({
      user,
      action: 'USER_SIGNUP',
      entityType: 'USER',
      entityRef: user.email,
      details: `New ${user.role} account registered (${user.fullName})`,
    })

    return {
      ok: true,
      user,
      sessionToken: token,
      capabilities: ROLE_CAPABILITIES[user.role],
    }
  })

  app.post('/api/auth/login', async (req, reply) => {
    const body = (req.body ?? {}) as {
      email?: string
      password?: string
      demoQuickRole?: UserRole
    }

    let userRow: any = null
    if (body.demoQuickRole && !body.password) {
      // 1-Tap Demo Role Switcher for rapid testing of all 5 personas
      userRow = db
        .prepare('SELECT * FROM users WHERE role = ? ORDER BY id ASC LIMIT 1')
        .get(body.demoQuickRole)
    } else {
      const emailClean = (body.email || '').trim().toLowerCase()
      if (!emailClean || !body.password) {
        return reply.code(400).send({ error: 'Email and password are required.' })
      }
      userRow = db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(emailClean)

      if (userRow?.locked_until && new Date(userRow.locked_until).getTime() > Date.now()) {
        return reply.code(423).send({
          error: 'Account temporarily locked due to repeated failed sign-in attempts. Please try again in 15 minutes.',
        })
      }

      const valid = verifyPassword(body.password, userRow?.password_hash)
      if (!userRow || !valid) {
        if (userRow) {
          const fails = Number(userRow.failed_logins || 0) + 1
          const lockedUntil =
            fails >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null
          db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?').run(
            fails,
            lockedUntil,
            userRow.id,
          )
        }
        return reply.code(401).send({ error: 'Invalid email address or password.' })
      }
    }

    if (!userRow) {
      return reply.code(404).send({ error: 'Account not found.' })
    }

    const now = new Date().toISOString()
    db.prepare(
      'UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = ? WHERE id = ?',
    ).run(now, userRow.id)

    const user = mapUserRow(userRow)
    const { token, tokenHash } = generateSessionToken()
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString()

    db.prepare(`
      INSERT INTO auth_sessions (token_hash, user_id, role, ip_address, user_agent, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      tokenHash,
      user.id,
      user.role,
      req.ip,
      (req.headers['user-agent'] || '').slice(0, 200),
      now,
      expiresAt,
    )

    reply.setCookie(SESSION_COOKIE_NAME, token, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: Math.floor(SESSION_TTL_MS / 1000),
    })

    recordAuditLog({
      user,
      action: 'USER_SIGNIN',
      entityType: 'SESSION',
      entityRef: user.email,
      details: `Signed in as ${user.role} (${user.fullName})`,
    })

    return {
      ok: true,
      user,
      sessionToken: token,
      capabilities: ROLE_CAPABILITIES[user.role],
    }
  })

  app.get('/api/auth/me', async (req) => {
    const user = resolveRequestUser(req)
    return {
      authenticated: Boolean(user),
      user,
      capabilities: user ? ROLE_CAPABILITIES[user.role] : null,
    }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    const headerToken =
      (req.headers['x-swk-session'] as string | undefined) ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7).trim()
        : undefined)
    const cookieToken = (req.cookies as Record<string, string | undefined> | undefined)?.[SESSION_COOKIE_NAME]
    const rawToken = headerToken || cookieToken
    if (rawToken) {
      db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashSessionToken(rawToken))
    }
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' })
    return { ok: true }
  })

  // ------------------------------------------------------------------
  // BOOTSTRAP & MVP TELEMETRY
  // ------------------------------------------------------------------
  app.get('/api/bootstrap', async (req) => {
    const currentUser = resolveRequestUser(req)
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
    const workflows = listRentalWorkflows()
    const demoUsers = listUsersPublic()
    const mvpTelemetry = getMvpLaunchTelemetry()

    return {
      currentUser,
      roleCapabilities: ROLE_CAPABILITIES,
      workflowStageDefinitions: UAE_RENTAL_WORKFLOW_STAGES,
      demoUsers,
      mvpTelemetry,
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
      workflows,
      portalSavingsSample: calculatePortalSavingsVsCompetitors({
        activeListingsCount: 45,
        agentsCount: 15,
      }),
      osBridge: getOsApiStatus(),
    }
  })

  // ------------------------------------------------------------------
  // EXTERNAL OS REST API & WEBHOOK INTEGRATION ENDPOINTS
  // ------------------------------------------------------------------
  app.get('/api/os-api/status', async () => getOsApiStatus())

  app.post('/api/os-api/config', async (req) => {
    const user = resolveRequestUser(req)
    const body = (req.body ?? {}) as {
      osApiUrl?: string
      osApiKey?: string
      webhookEndpoint?: string
      autoSyncEnabled?: boolean
    }
    const status = updateOsApiConfig(body)
    recordAuditLog({
      user,
      action: 'OS_API_CONFIG_UPDATED',
      entityType: 'OS_API',
      entityRef: status.osApiUrl,
      details: `Updated external OS REST API endpoint to ${status.osApiUrl}`,
    })
    return { ok: true, status }
  })

  app.post('/api/os-api/sync-inventory', async (req) => {
    const user = resolveRequestUser(req)
    const body = (req.body ?? {}) as {
      osApiUrlOverride?: string
      unitsPayload?: Array<{
        swkOsPropertyId?: number
        unitCode?: string
        annualRent1Cheque?: number
        availabilityStatus?: 'Available' | 'Offer Locked (48h)' | 'Ejari Active / Rented'
        keyVaultTag?: string
      }>
    }
    const result = await syncInventoryFromOsApi(body)
    recordAuditLog({
      user,
      action: 'OS_API_INVENTORY_SYNC',
      entityType: 'OS_API',
      entityRef: result.endpoint,
      details: `Synced ${result.syncedUnitsCount} units via OS REST API (${result.transportNote})`,
    })
    return result
  })

  app.post('/api/os-api/webhook', async (req) => {
    const body = (req.body ?? {}) as {
      eventType?: string
      unitCode?: string
      swkOsPropertyId?: number
      availabilityStatus?: 'Available' | 'Offer Locked (48h)' | 'Ejari Active / Rented'
      annualRent1Cheque?: number
      keyVaultTag?: string
      summary?: string
    }
    return handleInboundOsWebhook(body)
  })

  // ------------------------------------------------------------------
  // 7-STAGE END-TO-END RENTAL DEAL WORKFLOW ENGINE
  // ------------------------------------------------------------------
  app.get('/api/workflows', async () => ({
    stages: UAE_RENTAL_WORKFLOW_STAGES,
    workflows: listRentalWorkflows(),
  }))

  app.post('/api/workflows', async (req, reply) => {
    const { allowed, user } = checkRbacPermission(req, reply, 'SUBMIT_OFFER')
    if (!allowed) return

    const body = (req.body ?? {}) as {
      unitId: number
      tenantName: string
      tenantEmail?: string
      annualRentAed?: number
      chequeOption?: ChequeOption
    }
    const unit = listRentalUnits().find(u => u.id === Number(body.unitId))
    if (!unit) return reply.code(404).send({ error: 'Unit not found.' })

    const rent = Number(body.annualRentAed) || unit.annualRent1Cheque
    const cheques = (Number(body.chequeOption) as ChequeOption) || 1
    const cost = calculateTrueRentalCost(unit, cheques, unit.supplyTier)
    const wfCode = `WF-DXB-${Math.floor(1000 + Math.random() * 9000)}`
    const now = new Date().toISOString()

    const initialHistory = [
      {
        stage: 1,
        code: 'KYC_AND_VIEWING',
        completedByRole: user?.role ?? ('TENANT' as UserRole),
        completedByName: user?.fullName ?? body.tenantName.trim(),
        completedAt: now,
        note: 'UAE PASS KYC & Property Viewing verified.',
      },
    ]

    const info = db
      .prepare(`
        INSERT INTO rental_workflows (
          workflow_code, unit_id, unit_code, building_name, unit_no,
          tenant_name, tenant_email, landlord_name, advisor_name, supply_tier,
          annual_rent_aed, cheque_option, current_stage, status,
          ejari_or_tawtheeq_no, gate_pass_code, snagging_score,
          swk_company_share_aed, swk_advisor_share_aed, a2a_partner_share_aed,
          stage_history_json, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'IN_PROGRESS', 'PENDING-EJARI', 'PENDING-NOC', 98, ?, ?, ?, ?, ?)
      `)
      .run(
        wfCode,
        unit.id,
        unit.unitCode,
        unit.buildingName || 'Dubai Tower',
        unit.unitNo,
        body.tenantName.trim(),
        (body.tenantEmail || user?.email || 'tenant@uaepass.ae').trim(),
        unit.landlordName,
        unit.advisorName,
        unit.supplyTier,
        rent,
        cheques,
        cost.commissionSplit.swkCompanyShareAed,
        cost.commissionSplit.swkAdvisorShareAed,
        cost.commissionSplit.a2aPartnerShareAed,
        JSON.stringify(initialHistory),
        now,
      )

    recordAuditLog({
      user,
      action: 'WORKFLOW_CREATED',
      entityType: 'WORKFLOW',
      entityRef: wfCode,
      details: `Started 7-stage rental workflow ${wfCode} for ${unit.buildingName} #${unit.unitNo}`,
    })

    const created = listRentalWorkflows().find(w => w.id === Number(info.lastInsertRowid))
    return { ok: true, workflow: created }
  })

  app.post('/api/workflows/:id/advance', async (req, reply) => {
    const id = Number((req.params as any).id)
    const body = (req.body ?? {}) as {
      note?: string
      actorRole?: UserRole
      actorName?: string
    }
    const wfRow = db.prepare('SELECT * FROM rental_workflows WHERE id = ?').get(id) as any
    if (!wfRow) return reply.code(404).send({ error: 'Rental workflow not found.' })

    const currentStage = Number(wfRow.current_stage)
    if (currentStage >= 7) {
      return reply.code(400).send({ error: 'Workflow has already completed all 7 stages.' })
    }

    const nextStage = currentStage + 1
    const user = resolveRequestUser(req)
    const explicitRole = (req.headers['x-swk-role'] as UserRole | undefined) || body.actorRole
    const effectiveRole: UserRole = user?.role ?? explicitRole ?? 'ADMIN'
    const effectiveName = user?.fullName ?? body.actorName ?? `${effectiveRole} Verified Sign-Off`

    const stageCheck = canRoleAdvanceWorkflowStage(effectiveRole, nextStage)
    if (!stageCheck.allowed) {
      return reply.code(403).send({
        error: stageCheck.reason,
        currentRole: effectiveRole,
        targetStage: nextStage,
      })
    }

    const stageMeta = UAE_RENTAL_WORKFLOW_STAGES.find(s => s.stage === nextStage)!
    const now = new Date().toISOString()
    const history = JSON.parse(wfRow.stage_history_json || '[]')

    let ejariNo = wfRow.ejari_or_tawtheeq_no
    let gatePassCode = wfRow.gate_pass_code
    let status = wfRow.status

    if (nextStage === 5 && ejariNo === 'PENDING-EJARI') {
      ejariNo = `EJARI-2026-${Math.floor(100000 + Math.random() * 900000)}`
    }

    if (nextStage === 7) {
      status = 'COMPLETED_ACTIVE_LEASE'
      gatePassCode = `NOC-PASS-${Math.floor(1000 + Math.random() * 9000)}`
      const qrToken = `QR-OA-VERIFIED-${wfRow.unit_no}-${Date.now().toString(36).toUpperCase()}`
      db.prepare(`
        INSERT OR IGNORE INTO move_in_gate_passes (
          pass_code, building_name, unit_no, tenant_name, ejari_verified, dewa_verified, chiller_verified,
          mover_company, move_date, qr_token, status
        ) VALUES (?, ?, ?, ?, 1, 1, 1, 'SWK Concierge Verified Movers', ?, ?, 'Cleared by Building OA Security — Gate Barrier Auto-Approved')
      `).run(
        gatePassCode,
        wfRow.building_name,
        wfRow.unit_no,
        wfRow.tenant_name,
        now.slice(0, 10),
        qrToken,
      )
      db.prepare('UPDATE rental_units SET availability_status = ? WHERE id = ?').run(
        'Ejari Active / Rented',
        wfRow.unit_id,
      )
    }

    history.push({
      stage: nextStage,
      code: stageMeta.code,
      completedByRole: effectiveRole,
      completedByName: effectiveName,
      completedAt: now,
      note: body.note?.trim() || `${stageMeta.deliverableBadge} completed by ${effectiveName}`,
    })

    db.prepare(`
      UPDATE rental_workflows
      SET current_stage = ?, status = ?, ejari_or_tawtheeq_no = ?, gate_pass_code = ?,
          stage_history_json = ?, updated_at = ?
      WHERE id = ?
    `).run(nextStage, status, ejariNo, gatePassCode, JSON.stringify(history), now, id)

    recordAuditLog({
      user,
      action: `WORKFLOW_STAGE_${nextStage}`,
      entityType: 'WORKFLOW',
      entityRef: wfRow.workflow_code,
      details: `${wfRow.workflow_code} advanced to Stage ${nextStage} (${stageMeta.shortTitle}) by ${effectiveName} [${effectiveRole}]`,
    })

    pushEventToOsApi({
      eventType: `WORKFLOW_STAGE_${nextStage}`,
      endpointPath: '/api/webhooks/swk-rent',
      payloadSummary: `${wfRow.workflow_code} (${wfRow.unit_code}) advanced to Stage ${nextStage}: ${stageMeta.shortTitle}`,
      payload: {
        workflowCode: wfRow.workflow_code,
        unitCode: wfRow.unit_code,
        stage: nextStage,
        status,
        ejariNo,
        gatePassCode,
      },
    })

    const updated = listRentalWorkflows().find(w => w.id === id)
    return { ok: true, workflow: updated }
  })

  // ------------------------------------------------------------------
  // CORE MARKETPLACE, OFFERS, SHIELD & SUPER-HUB ENDPOINTS
  // ------------------------------------------------------------------
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
    const { allowed, user } = checkRbacPermission(req, reply, 'BOOK_VIEWING')
    if (!allowed) return

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

    recordAuditLog({
      user,
      action: 'VIEWING_BOOKED',
      entityType: 'UNIT',
      entityRef: unit.unitCode,
      details: `Viewing booked for ${unit.unitCode} by ${body.tenantName.trim()}`,
    })

    pushEventToOsApi({
      eventType: 'VIEWING_DISPATCHED',
      endpointPath: '/api/webhooks/swk-rent',
      payloadSummary: `Key-Vault / Smart-Lock viewing dispatched for ${unit.unitCode} (${body.tenantName.trim()})`,
      payload: { unitCode: unit.unitCode, tenantName: body.tenantName.trim(), gpsStatus },
    })

    const created = db.prepare('SELECT * FROM viewing_bookings WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, viewing: created }
  })

  app.post('/api/offers', async (req, reply) => {
    const { allowed, user } = checkRbacPermission(req, reply, 'SUBMIT_OFFER')
    if (!allowed) return

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

    const now = new Date().toISOString()
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
        (body.tenantEmail || user?.email || 'verified.tenant@uaepass.ae').trim(),
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
        now,
      )

    if (lockUnit) {
      db.prepare('UPDATE rental_units SET availability_status = ? WHERE id = ?').run(
        'Offer Locked (48h)',
        unit.id,
      )
    }

    // Also auto-create a 7-Stage Deal Workflow at Stage 2 for this offer!
    const wfCode = `WF-DXB-${Math.floor(1000 + Math.random() * 9000)}`
    db.prepare(`
      INSERT OR IGNORE INTO rental_workflows (
        workflow_code, unit_id, unit_code, building_name, unit_no,
        tenant_name, tenant_email, landlord_name, advisor_name, supply_tier,
        annual_rent_aed, cheque_option, current_stage, status,
        ejari_or_tawtheeq_no, gate_pass_code, snagging_score,
        swk_company_share_aed, swk_advisor_share_aed, a2a_partner_share_aed,
        stage_history_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, 'IN_PROGRESS', 'PENDING-EJARI', 'PENDING-NOC', 98, ?, ?, ?, ?, ?)
    `).run(
      wfCode,
      unit.id,
      unit.unitCode,
      unit.buildingName || 'Dubai Tower',
      unit.unitNo,
      body.tenantName.trim(),
      (body.tenantEmail || user?.email || 'verified.tenant@uaepass.ae').trim(),
      unit.landlordName,
      unit.advisorName,
      cost.supplyTier,
      Number(body.offeredAnnualRent),
      Number(body.chequeOption) || 1,
      cost.commissionSplit.swkCompanyShareAed,
      cost.commissionSplit.swkAdvisorShareAed,
      cost.commissionSplit.a2aPartnerShareAed,
      JSON.stringify([
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: user?.role ?? 'TENANT',
          completedByName: body.tenantName.trim(),
          completedAt: now,
          note: 'UAE PASS KYC verified.',
        },
        {
          stage: 2,
          code: 'OFFER_AND_DEPOSIT_LOCK',
          completedByRole: user?.role ?? 'TENANT',
          completedByName: body.tenantName.trim(),
          completedAt: now,
          note: `Offer AED ${Number(body.offeredAnnualRent).toLocaleString('en-US')} via ${body.paymentChannel}`,
        },
      ]),
      now,
    )

    recordAuditLog({
      user,
      action: 'OFFER_SUBMITTED',
      entityType: 'OFFER',
      entityRef: unit.unitCode,
      details: `Offer AED ${Number(body.offeredAnnualRent).toLocaleString('en-US')} submitted by ${body.tenantName.trim()}`,
    })

    pushEventToOsApi({
      eventType: 'OFFER_SUBMITTED',
      endpointPath: '/api/webhooks/swk-rent',
      payloadSummary: `Digital offer AED ${Number(body.offeredAnnualRent).toLocaleString('en-US')} (${body.chequeOption} chq) locked for ${unit.unitCode}`,
      payload: {
        unitCode: unit.unitCode,
        workflowCode: wfCode,
        offeredAnnualRent: Number(body.offeredAnnualRent),
        chequeOption: Number(body.chequeOption) || 1,
        commissionSplit: cost.commissionSplit,
      },
    })

    const created = db.prepare('SELECT * FROM rental_offers WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, offer: created, costBreakdown: cost, workflowCode: wfCode }
  })

  app.post('/api/offers/:id/decision', async (req, reply) => {
    const { allowed, user } = checkRbacPermission(req, reply, 'DECIDE_OFFER')
    if (!allowed) return

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

    recordAuditLog({
      user,
      action: 'OFFER_DECISION',
      entityType: 'OFFER',
      entityRef: String(id),
      details: `Offer #${id} decision: ${body.decision}`,
    })

    return { ok: true }
  })

  app.post('/api/pdc/:id/action', async (req, reply) => {
    const { allowed } = checkRbacPermission(req, reply, 'MANAGE_PDC_CHEQUES')
    if (!allowed) return

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
    const { allowed } = checkRbacPermission(req, reply, 'SUBMIT_MAINTENANCE')
    if (!allowed) return

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
    const { allowed, user } = checkRbacPermission(req, reply, 'REGISTER_A2A_MANDATE')
    if (!allowed) return

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
    recordAuditLog({
      user,
      action: 'A2A_MANDATE_REGISTERED',
      entityType: 'A2A_MANDATE',
      entityRef: body.partnerOrn.trim(),
      details: `Protected A2A mandate registered for client ${body.clientName.trim()} by ${body.brokerName.trim()}`,
    })
    const mandate = db.prepare('SELECT * FROM a2a_partner_mandates WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, mandate }
  })

  app.post('/api/landlord/onboard', async (req, reply) => {
    const { allowed, user } = checkRbacPermission(req, reply, 'ONBOARD_LANDLORD_UNIT')
    if (!allowed) return

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
        'Title Deed & UAE PASS Verified — Live on swk.rent & Owner360',
        new Date().toISOString(),
      )
    recordAuditLog({
      user,
      action: 'LANDLORD_UNIT_ONBOARDED',
      entityType: 'LANDLORD_MANDATE',
      entityRef: body.titleDeedNo.trim(),
      details: `Direct landlord unit ${body.buildingName.trim()} #${body.unitNo.trim()} onboarded`,
    })
    const mandate = db.prepare('SELECT * FROM direct_landlord_mandates WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, mandate }
  })

  app.post('/api/developer-pools', async (req, reply) => {
    const { allowed, user } = checkRbacPermission(req, reply, 'CREATE_DEVELOPER_POOL')
    if (!allowed) return

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
    recordAuditLog({
      user,
      action: 'DEVELOPER_POOL_CREATED',
      entityType: 'DEVELOPER_POOL',
      entityRef: code,
      details: `Developer BTR pool created: ${body.projectName.trim()} (${body.totalHandoverUnits} units)`,
    })
    return { ok: true, poolId: Number(info.lastInsertRowid), pools: listDeveloperBtrPools() }
  })

  app.post('/api/developer-pools/:id/reserve', async (req, reply) => {
    const { allowed } = checkRbacPermission(req, reply, 'RESERVE_DEVELOPER_FIFO')
    if (!allowed) return

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
    const { allowed } = checkRbacPermission(req, reply, 'POST_REVERSE_BRIEF')
    if (!allowed) return

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
    const { allowed } = checkRbacPermission(req, reply, 'BID_REVERSE_BRIEF')
    if (!allowed) return

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
    const { allowed } = checkRbacPermission(req, reply, 'IMPORT_CRM_XML')
    if (!allowed) return

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
        body.feedUrl?.trim() || 'https://api.os.swk.rent/v1/syndication/rentals.xml',
        unitsCount,
        savings.annualPortalSavingsAed,
        new Date().toISOString(),
      )
    const feed = db.prepare('SELECT * FROM crm_xml_feeds WHERE id = ?').get(info.lastInsertRowid)
    return { ok: true, feed, savings }
  })

  app.post('/api/gate-pass/generate', async (req, reply) => {
    const { allowed } = checkRbacPermission(req, reply, 'GENERATE_GATE_PASS')
    if (!allowed) return

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
    console.log(`swk.rent UAE Rental Platform & OS REST API Bridge listening on http://localhost:${port}`)
  })
}
