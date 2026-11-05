import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import {
  type BuildingProfile,
  type RentalUnit,
  type DeveloperLeaseUpPool,
  type VerifiedTenantBrief,
  type AuthUser,
  type UserRole,
  type ChequeOption,
  type UserCustomUsageProfile,
  type RentalDealWorkflow,
  type FieldDutySession,
  evaluateReraRenewal,
  classifyMaintenanceResponsibility,
  calculateDeveloperBtrYieldProtection,
} from '../shared/uae-rental-rules'
import { hashPassword } from './auth'

const dataDir = path.resolve('data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'swkrent.db'))
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('busy_timeout = 5000')
db.pragma('foreign_keys = ON')

export function initSchemaAndSeed() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS buildings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      emirate TEXT NOT NULL,
      community TEXT NOT NULL,
      sub_community TEXT NOT NULL,
      developer TEXT NOT NULL,
      completion_year INTEGER NOT NULL,
      total_floors INTEGER NOT NULL,
      chiller_provider TEXT NOT NULL,
      avg_monthly_chiller_aed INTEGER NOT NULL,
      avg_monthly_dewa_aed INTEGER NOT NULL,
      service_charge_sqft REAL NOT NULL,
      metro_station TEXT NOT NULL,
      metro_walk_mins_winter INTEGER NOT NULL,
      metro_walk_mins_summer_shade INTEGER NOT NULL,
      commute_difc_mins INTEGER NOT NULL,
      commute_media_city_mins INTEGER NOT NULL,
      commute_business_bay_mins INTEGER NOT NULL,
      commute_adgm_mins INTEGER NOT NULL,
      elevator_wait_score REAL NOT NULL,
      soundproofing_score REAL NOT NULL,
      maintenance_sla_hours INTEGER NOT NULL,
      tenant_rating REAL NOT NULL,
      reviews_count INTEGER NOT NULL,
      verified_no_partition INTEGER NOT NULL DEFAULT 1,
      amenities_json TEXT NOT NULL,
      hero_image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_units (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_code TEXT NOT NULL UNIQUE,
      building_id INTEGER NOT NULL,
      unit_no TEXT NOT NULL,
      floor INTEGER NOT NULL,
      bedrooms INTEGER NOT NULL,
      bathrooms INTEGER NOT NULL,
      area_sqft INTEGER NOT NULL,
      furnishing TEXT NOT NULL,
      view_type TEXT NOT NULL,
      supply_tier TEXT NOT NULL,
      annual_rent_1_cheque INTEGER NOT NULL,
      annual_rent_2_cheques INTEGER NOT NULL,
      annual_rent_4_cheques INTEGER NOT NULL,
      annual_rent_12_monthly INTEGER NOT NULL,
      bridge_monthly_aed INTEGER NOT NULL,
      rera_index_rent INTEGER NOT NULL,
      trakheesi_permit_no TEXT NOT NULL,
      madmoun_qr_code TEXT NOT NULL,
      title_deed_no TEXT NOT NULL,
      makani_no TEXT NOT NULL,
      key_custody TEXT NOT NULL,
      key_vault_tag TEXT,
      availability_status TEXT NOT NULL DEFAULT 'Available',
      chiller_provider TEXT NOT NULL,
      avg_monthly_chiller_aed INTEGER NOT NULL,
      avg_monthly_dewa_aed INTEGER NOT NULL,
      advisor_name TEXT NOT NULL,
      advisor_brn TEXT NOT NULL,
      a2a_agency_name TEXT,
      a2a_agency_orn TEXT,
      landlord_name TEXT NOT NULL,
      landlord_uae_pass_verified INTEGER NOT NULL DEFAULT 1,
      last_bi_annual_inspection_date TEXT NOT NULL,
      images_json TEXT NOT NULL,
      highlights_json TEXT NOT NULL,
      swk_os_property_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS viewing_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      tenant_name TEXT NOT NULL,
      tenant_phone TEXT NOT NULL,
      tenant_emirates_id_status TEXT NOT NULL,
      viewing_mode TEXT NOT NULL,
      slot_datetime TEXT NOT NULL,
      advisor_name TEXT NOT NULL,
      gps_status TEXT NOT NULL,
      key_vault_tag TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit_id INTEGER NOT NULL,
      tenant_name TEXT NOT NULL,
      tenant_email TEXT NOT NULL,
      tenant_phone TEXT NOT NULL,
      kyc_status TEXT NOT NULL,
      offered_annual_rent INTEGER NOT NULL,
      cheque_option INTEGER NOT NULL,
      supply_tier TEXT NOT NULL,
      move_in_date TEXT NOT NULL,
      payment_channel TEXT NOT NULL,
      holding_deposit_aed INTEGER NOT NULL,
      true_monthly_all_in_aed INTEGER NOT NULL,
      swk_company_share_aed INTEGER NOT NULL,
      swk_advisor_share_aed INTEGER NOT NULL,
      a2a_partner_share_aed INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending Landlord Review',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS active_leases_shield (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_code TEXT NOT NULL UNIQUE,
      unit_id INTEGER NOT NULL,
      unit_label TEXT NOT NULL,
      tenant_name TEXT NOT NULL,
      landlord_name TEXT NOT NULL,
      ejari_no TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      current_annual_rent INTEGER NOT NULL,
      rera_index_rent INTEGER NOT NULL,
      proposed_renewal_rent INTEGER NOT NULL,
      notice_served_date TEXT,
      security_deposit_aed INTEGER NOT NULL,
      autopilot_stage INTEGER NOT NULL DEFAULT 5,
      snagging_move_in_score INTEGER NOT NULL DEFAULT 98,
      snagging_photos_count INTEGER NOT NULL DEFAULT 52,
      eviction_watchdog_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS pdc_cheques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_code TEXT NOT NULL,
      cheque_no TEXT NOT NULL,
      bank_name TEXT NOT NULL,
      tenant_name TEXT NOT NULL,
      unit_label TEXT NOT NULL,
      due_date TEXT NOT NULL,
      amount_aed INTEGER NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lease_code TEXT NOT NULL,
      unit_label TEXT NOT NULL,
      category TEXT NOT NULL,
      issue_summary TEXT NOT NULL,
      estimated_cost_aed INTEGER NOT NULL,
      responsible_party TEXT NOT NULL,
      rule_explanation TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS a2a_partner_mandates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_agency_name TEXT NOT NULL,
      partner_orn TEXT NOT NULL,
      broker_name TEXT NOT NULL,
      broker_brn TEXT NOT NULL,
      unit_id INTEGER NOT NULL,
      client_name TEXT NOT NULL,
      protection_expires_at TEXT NOT NULL,
      agreed_a2a_split_pct INTEGER NOT NULL DEFAULT 50,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS direct_landlord_mandates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      landlord_name TEXT NOT NULL,
      uae_pass_uuid TEXT NOT NULL,
      title_deed_no TEXT NOT NULL,
      makani_no TEXT NOT NULL,
      building_name TEXT NOT NULL,
      unit_no TEXT NOT NULL,
      bedrooms INTEGER NOT NULL,
      asking_rent_aed INTEGER NOT NULL,
      selected_plan TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS developer_btr_pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_code TEXT NOT NULL UNIQUE,
      project_name TEXT NOT NULL,
      developer_name TEXT NOT NULL,
      community TEXT NOT NULL,
      handover_date TEXT NOT NULL,
      total_handover_units INTEGER NOT NULL,
      leased_count INTEGER NOT NULL,
      active_public_queue_cap INTEGER NOT NULL DEFAULT 3,
      protected_floor_rent_1br_aed INTEGER NOT NULL,
      protected_floor_rent_2br_aed INTEGER NOT NULL,
      yield_protection_boost_pct REAL NOT NULL,
      dlp_snagging_included INTEGER NOT NULL DEFAULT 1,
      commission_to_partner_agents_pct REAL NOT NULL DEFAULT 5.0,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tenant_reverse_briefs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brief_code TEXT NOT NULL UNIQUE,
      tenant_alias TEXT NOT NULL,
      corporate_employer TEXT NOT NULL,
      uae_pass_verified INTEGER NOT NULL DEFAULT 1,
      preferred_communities TEXT NOT NULL,
      bedrooms_min INTEGER NOT NULL,
      max_annual_budget_aed INTEGER NOT NULL,
      cheques_ready INTEGER NOT NULL,
      target_move_in_date TEXT NOT NULL,
      representing_agent_name TEXT NOT NULL,
      representing_agency_orn TEXT NOT NULL,
      bids_count INTEGER NOT NULL DEFAULT 0,
      best_bid_rent_aed INTEGER,
      best_bid_unit_label TEXT,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crm_xml_feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agency_name TEXT NOT NULL,
      crm_provider TEXT NOT NULL,
      feed_url TEXT NOT NULL,
      imported_units_count INTEGER NOT NULL,
      annual_credit_burn_saved_aed INTEGER NOT NULL,
      synced_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS move_in_gate_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pass_code TEXT NOT NULL UNIQUE,
      building_name TEXT NOT NULL,
      unit_no TEXT NOT NULL,
      tenant_name TEXT NOT NULL,
      ejari_verified INTEGER NOT NULL DEFAULT 1,
      dewa_verified INTEGER NOT NULL DEFAULT 1,
      chiller_verified INTEGER NOT NULL DEFAULT 1,
      mover_company TEXT NOT NULL,
      move_date TEXT NOT NULL,
      qr_token TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT NOT NULL,
      uae_pass_verified INTEGER NOT NULL DEFAULT 1,
      emirates_id_or_passport TEXT NOT NULL,
      rera_brn TEXT,
      rera_orn TEXT,
      agency_or_company_name TEXT,
      title_deed_ref TEXT,
      failed_logins INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      last_login_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rental_workflows (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_code TEXT NOT NULL UNIQUE,
      unit_id INTEGER NOT NULL,
      unit_code TEXT NOT NULL,
      building_name TEXT NOT NULL,
      unit_no TEXT NOT NULL,
      tenant_name TEXT NOT NULL,
      tenant_email TEXT NOT NULL,
      landlord_name TEXT NOT NULL,
      advisor_name TEXT NOT NULL,
      supply_tier TEXT NOT NULL,
      annual_rent_aed INTEGER NOT NULL,
      cheque_option INTEGER NOT NULL,
      current_stage INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      ejari_or_tawtheeq_no TEXT NOT NULL,
      gate_pass_code TEXT NOT NULL,
      snagging_score INTEGER NOT NULL DEFAULT 98,
      swk_company_share_aed INTEGER NOT NULL,
      swk_advisor_share_aed INTEGER NOT NULL,
      a2a_partner_share_aed INTEGER NOT NULL,
      stage_history_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_email TEXT,
      user_role TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_ref TEXT,
      details TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_api_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      os_api_url TEXT NOT NULL,
      os_api_key_masked TEXT NOT NULL,
      webhook_endpoint TEXT NOT NULL,
      auto_sync_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS os_api_sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      direction TEXT NOT NULL,
      event_type TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      status TEXT NOT NULL,
      payload_summary TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_custom_usage (
      user_id INTEGER PRIMARY KEY,
      user_email TEXT NOT NULL,
      persona_code TEXT NOT NULL,
      persona_badge TEXT NOT NULL,
      custom_plan_name TEXT NOT NULL,
      default_cheque_mode INTEGER NOT NULL DEFAULT 12,
      preferred_emirate TEXT NOT NULL DEFAULT 'All',
      chiller_free_preferred INTEGER NOT NULL DEFAULT 1,
      max_commute_difc_mins INTEGER NOT NULL DEFAULT 45,
      custom_commission_pct REAL NOT NULL DEFAULT 5.0,
      custom_flat_fee_aed INTEGER NOT NULL DEFAULT 2999,
      fifo_queue_cap_units INTEGER NOT NULL DEFAULT 3,
      personal_api_key_masked TEXT NOT NULL,
      custom_webhook_url TEXT NOT NULL,
      whatsapp_pitch_signature TEXT NOT NULL,
      listings_synced_count INTEGER NOT NULL DEFAULT 0,
      portal_credit_burn_aed INTEGER NOT NULL DEFAULT 0,
      estimated_competitor_spend_saved_aed INTEGER NOT NULL DEFAULT 0,
      viewings_booked_or_dispatched INTEGER NOT NULL DEFAULT 0,
      digital_offers_submitted_or_reviewed INTEGER NOT NULL DEFAULT 0,
      workflows_signed_off_count INTEGER NOT NULL DEFAULT 0,
      whatsapp_pitches_generated INTEGER NOT NULL DEFAULT 0,
      api_webhook_events_count INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_units_building ON rental_units(building_id);
    CREATE INDEX IF NOT EXISTS idx_workflows_stage ON rental_workflows(current_stage);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

    CREATE TABLE IF NOT EXISTS field_duty_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_code TEXT NOT NULL UNIQUE,
      agent_name TEXT NOT NULL,
      agent_email TEXT NOT NULL,
      agent_role TEXT NOT NULL,
      unit_id INTEGER NOT NULL,
      unit_code TEXT NOT NULL,
      assigned_location TEXT NOT NULL,
      key_vault_tag TEXT NOT NULL,
      device_id TEXT NOT NULL,
      battery_pct INTEGER NOT NULL DEFAULT 94,
      network_type TEXT NOT NULL DEFAULT '5G / Wi-Fi',
      last_lat REAL NOT NULL DEFAULT 25.0805,
      last_lng REAL NOT NULL DEFAULT 55.1403,
      accuracy_m REAL NOT NULL DEFAULT 4.2,
      points_count INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'ACTIVE_GPS_ESCORT',
      started_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)

  // Seed Android Field-Duty GPS Viewing Escort Sessions if empty
  const dutyCount = (db.prepare('SELECT COUNT(*) as c FROM field_duty_sessions').get() as { c: number }).c
  if (dutyCount === 0) {
    db.prepare(`
      INSERT INTO field_duty_sessions (
        session_code, agent_name, agent_email, agent_role, unit_id, unit_code,
        assigned_location, key_vault_tag, device_id, battery_pct, network_type,
        last_lat, last_lng, accuracy_m, points_count, status, started_at, updated_at
      ) VALUES
        ('DUTY-AND-401', 'Mohammad Haseeb', 'advisor@swk.rent', 'AGENT', 1, 'SWK-RENT-101', 'Marina Gate I · Unit #3402 (Dubai Marina)', 'SWK-KEY-MG1-3402', 'SWK-AND-S24ULTRA-58912', 94, '5G Standalone', 25.0889, 55.1462, 3.8, 12, 'ACTIVE_GPS_ESCORT', '2026-11-04T03:45:00Z', '2026-11-04T04:12:00Z'),
        ('DUTY-AND-402', 'Omar Farooq (A2A)', 'partner@apexcrest.ae', 'AGENT', 4, 'SWK-RENT-104', 'Park Heights I · Unit #1108 (Dubai Hills)', 'SWK-KEY-PH1-1108', 'SWK-AND-PIXEL9PRO-49182', 88, 'Wi-Fi 6E', 25.1045, 55.2418, 4.5, 19, 'COMPLETED_VERIFIED', '2026-11-03T11:30:00Z', '2026-11-03T12:25:00Z')
    `).run()
  }

  // Seed External OS REST API Configuration & Initial Sync Log
  const osCfgCount = (db.prepare('SELECT COUNT(*) as c FROM os_api_config').get() as { c: number }).c
  if (osCfgCount === 0) {
    const defaultOsApiUrl = process.env.SWK_OS_API_URL || 'https://api.os.swk.rent'
    db.prepare(`
      INSERT INTO os_api_config (id, os_api_url, os_api_key_masked, webhook_endpoint, auto_sync_enabled, updated_at)
      VALUES (1, ?, 'elv_live_****_orn51517', 'https://swk.rent/api/os-api/webhook', 1, '2026-11-04T04:00:00Z')
    `).run(defaultOsApiUrl)

    db.prepare(`
      INSERT INTO os_api_sync_logs (direction, event_type, endpoint, status, payload_summary, created_at)
      VALUES
        ('INVENTORY_PULL', 'OS_INVENTORY_SYNC', ?, '200 OK (6 Verified Units Synced)', 'Pulled Title-Deed & Key-Vault verified rental inventory via REST API', '2026-11-04T04:01:00Z'),
        ('OUTBOUND_REST', 'WORKFLOW_STAGE_SYNC', ?, '200 OK (Webhook Delivered)', 'Synced 7-stage rental deal pipeline & commission splits to external OS API', '2026-11-04T04:05:00Z')
    `).run(`${defaultOsApiUrl}/api/public/properties`, `${defaultOsApiUrl}/api/webhooks/swk-rent`)
  }

  // Seed 8 dedicated demo accounts across all 5 UAE Rental Roles & specialized personas if empty
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  if (userCount === 0) {
    const defaultPwHash = hashPassword('SwkRent2026!')
    const insertUser = db.prepare(`
      INSERT INTO users (
        email, password_hash, full_name, phone, role, uae_pass_verified,
        emirates_id_or_passport, rera_brn, rera_orn, agency_or_company_name, title_deed_ref, created_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)
    `)
    const insertUsage = db.prepare(`
      INSERT INTO user_custom_usage (
        user_id, user_email, persona_code, persona_badge, custom_plan_name,
        default_cheque_mode, preferred_emirate, chiller_free_preferred, max_commute_difc_mins,
        custom_commission_pct, custom_flat_fee_aed, fifo_queue_cap_units,
        personal_api_key_masked, custom_webhook_url, whatsapp_pitch_signature,
        listings_synced_count, portal_credit_burn_aed, estimated_competitor_spend_saved_aed,
        viewings_booked_or_dispatched, digital_offers_submitted_or_reviewed,
        workflows_signed_off_count, whatsapp_pitches_generated, api_webhook_events_count, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
    `)
    const now = '2026-11-04T04:00:00Z'

    const demoAccountsSeed = [
      {
        email: 'admin@swk.rent',
        fullName: 'Shahid · SWK Managing Director',
        phone: '+971 50 515 1700',
        role: 'ADMIN' as UserRole,
        eid: '784-1990-5151700-1',
        brn: 'BRN-51517',
        orn: 'ORN-51517',
        company: 'SWK Properties L.L.C.',
        deed: null,
        personaCode: 'SWK_ADMIN',
        personaBadge: 'SWK Super-Admin · ORN 51517 & Escrow Guard',
        planName: 'Full 1,000-User MVP Cohort Governance + External OS REST API Bridge',
        chequeMode: 12,
        emirate: 'All',
        chillerFree: 1,
        maxCommute: 90,
        commPct: 5.0,
        flatFee: 2999,
        fifoCap: 3,
        apiKey: 'swk_adm_live_****_51517',
        webhook: 'https://swk.rent/api/os-api/webhook',
        signature: 'Shahid · Managing Director | SWK Properties L.L.C. (RERA ORN 51517)',
        listings: 48,
        savedAed: 163200,
        viewings: 19,
        offers: 14,
        workflows: 12,
        pitches: 28,
        webhooks: 64,
      },
      {
        email: 'advisor@swk.rent',
        fullName: 'Mohammad Haseeb · Senior RERA Advisor',
        phone: '+971 50 589 1200',
        role: 'AGENT' as UserRole,
        eid: '784-1993-5891200-2',
        brn: 'BRN-58912',
        orn: 'ORN-51517',
        company: 'SWK Properties L.L.C.',
        deed: null,
        personaCode: 'SWK_ADVISOR',
        personaBadge: 'SWK Exclusive RERA Advisor · 50/50 Split + Key Vault',
        planName: 'SWK Exclusive 50/50 Commission Split + Instant Key Vault + Ejari Sign-Off',
        chequeMode: 2,
        emirate: 'Dubai',
        chillerFree: 1,
        maxCommute: 35,
        commPct: 5.0,
        flatFee: 0,
        fifoCap: 3,
        apiKey: 'swk_agt_live_****_58912',
        webhook: 'https://api.os.swk.rent/v1/advisor/haseeb/events',
        signature: 'Mohammad Haseeb · Senior RERA Advisor (BRN-58912) | SWK Rent',
        listings: 24,
        savedAed: 96000,
        viewings: 31,
        offers: 11,
        workflows: 9,
        pitches: 42,
        webhooks: 27,
      },
      {
        email: 'partner@apexcrest.ae',
        fullName: 'Omar Farooq · A2A Partner Broker',
        phone: '+971 52 491 8200',
        role: 'AGENT' as UserRole,
        eid: '784-1991-4918200-4',
        brn: 'BRN-49182',
        orn: 'ORN-31940',
        company: 'Apex Crest Real Estate LLC',
        deed: null,
        personaCode: 'A2A_BROKER',
        personaBadge: 'External A2A Partner Broker · 50% Protected Split',
        planName: 'Protected 50% Partner / 25% SWK / 25% Advisor A2A Split + AED 0 XML Sync',
        chequeMode: 1,
        emirate: 'Dubai',
        chillerFree: 1,
        maxCommute: 40,
        commPct: 2.5,
        flatFee: 0,
        fifoCap: 3,
        apiKey: 'swk_a2a_live_****_31940',
        webhook: 'https://crm.apexcrest.ae/webhooks/swk-rent',
        signature: 'Omar Farooq (BRN-49182) · Apex Crest Real Estate (ORN-31940) via swk.rent A2A Shield',
        listings: 32,
        savedAed: 115200,
        viewings: 14,
        offers: 6,
        workflows: 5,
        pitches: 35,
        webhooks: 19,
      },
      {
        email: 'landlord@swk.rent',
        fullName: 'Dr. Khalid Al Mansoori · Owner360 Landlord',
        phone: '+971 50 884 1200',
        role: 'LANDLORD' as UserRole,
        eid: '784-1982-8841200-9',
        brn: null,
        orn: null,
        company: 'Al Mansoori Family Portfolio',
        deed: 'TD-DXB-2023-19402',
        personaCode: 'DIRECT_LANDLORD',
        personaBadge: 'Direct Self-Serve Landlord · AED 0 Owner Fee',
        planName: 'Tier 1: Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)',
        chequeMode: 1,
        emirate: 'Dubai',
        chillerFree: 1,
        maxCommute: 45,
        commPct: 0,
        flatFee: 2999,
        fifoCap: 1,
        apiKey: 'swk_own_live_****_19402',
        webhook: 'https://swk.rent/api/owner360/almansoori',
        signature: 'Dr. Khalid Al Mansoori · Verified DLD Title Deed Owner (TD-DXB-2023-19402)',
        listings: 3,
        savedAed: 18500,
        viewings: 8,
        offers: 5,
        workflows: 4,
        pitches: 6,
        webhooks: 11,
      },
      {
        email: 'familyoffice@swk.rent',
        fullName: 'H.E. Tariq Al Maktoum · Portfolio Landlord',
        phone: '+971 50 700 8800',
        role: 'LANDLORD' as UserRole,
        eid: '784-1978-7008800-3',
        brn: null,
        orn: null,
        company: 'H.E. Tariq Al Maktoum Family Office',
        deed: 'TD-DXB-2021-88412',
        personaCode: 'PORTFOLIO_LANDLORD',
        personaBadge: 'Institutional Portfolio · 1-Cheque Day-1 Guarantee',
        planName: 'Tier 3: SWK 1-Cheque Upfront Guarantee (8% · Paid Day 1 while Tenant pays 12x)',
        chequeMode: 1,
        emirate: 'All',
        chillerFree: 1,
        maxCommute: 60,
        commPct: 8.0,
        flatFee: 0,
        fifoCap: 3,
        apiKey: 'swk_fmo_live_****_88412',
        webhook: 'https://treasury.almaktoum-fo.ae/webhooks/swk-rent',
        signature: 'H.E. Tariq Al Maktoum Family Office · Institutional Rental Portfolio',
        listings: 14,
        savedAed: 64000,
        viewings: 22,
        offers: 9,
        workflows: 7,
        pitches: 12,
        webhooks: 24,
      },
      {
        email: 'developer@selectgroup.ae',
        fullName: 'Rami Al Ghaith · Director of BTR Handover',
        phone: '+971 56 300 9900',
        role: 'DEVELOPER' as UserRole,
        eid: '784-1985-3009900-7',
        brn: null,
        orn: 'DLD-DEV-104',
        company: 'Select Group BTR Division',
        deed: 'PROJ-PENINSULA-4',
        personaCode: 'BTR_DEVELOPER',
        personaBadge: 'Developer BTR Pool · FIFO Anti-Cannibalization',
        planName: 'Bulk Tower Handover FIFO Queue (Max 3 Units Public per Layout · 16.5% Yield Protection)',
        chequeMode: 1,
        emirate: 'Dubai',
        chillerFree: 1,
        maxCommute: 30,
        commPct: 5.0,
        flatFee: 0,
        fifoCap: 3,
        apiKey: 'swk_dev_live_****_0104',
        webhook: 'https://btr.select-group.ae/api/webhooks/swk-rent',
        signature: 'Rami Al Ghaith · Select Group BTR Lease-Up Desk (DLD-DEV-104)',
        listings: 180,
        savedAed: 342000,
        viewings: 64,
        offers: 38,
        workflows: 29,
        pitches: 45,
        webhooks: 88,
      },
      {
        email: 'tenant@uaepass.ae',
        fullName: 'Alexander Vance · Verified Executive Tenant',
        phone: '+971 58 210 4490',
        role: 'TENANT' as UserRole,
        eid: '784-1994-2104490-5',
        brn: null,
        orn: null,
        company: 'Emirates Group Executive Housing',
        deed: null,
        personaCode: 'EXEC_TENANT',
        personaBadge: 'Corporate Executive Tenant · 12x Monthly UAEDDS',
        planName: '12x Monthly UAEDDS Direct Debit + 90-Day RERA Decree 43 Renewal Shield',
        chequeMode: 12,
        emirate: 'Dubai',
        chillerFree: 1,
        maxCommute: 25,
        commPct: 5.0,
        flatFee: 2999,
        fifoCap: 3,
        apiKey: 'swk_tnt_live_****_4490',
        webhook: 'https://swk.rent/api/tenant-alerts/alexander-vance',
        signature: 'Alexander Vance · UAE PASS Verified Tenant (Emirates Group)',
        listings: 0,
        savedAed: 6251,
        viewings: 4,
        offers: 2,
        workflows: 2,
        pitches: 3,
        webhooks: 7,
      },
      {
        email: 'expat@swk.rent',
        fullName: 'Charlotte Laurent · New Expat Relocation Tenant',
        phone: '+971 52 904 1180',
        role: 'TENANT' as UserRole,
        eid: 'PASSPORT-FR-9920148 (EID In Process)',
        brn: null,
        orn: null,
        company: 'TotalEnergies EP UAE Relocation',
        deed: null,
        personaCode: 'EXPAT_BRIDGE_TENANT',
        personaBadge: 'New Expat · 30-Day Bridge-to-Ejari Pass',
        planName: '30-Day New Expat Bridge Pass (Move In Before Emirates ID · Auto-Converts to 12m Ejari)',
        chequeMode: 30,
        emirate: 'Dubai',
        chillerFree: 1,
        maxCommute: 30,
        commPct: 5.0,
        flatFee: 2999,
        fifoCap: 3,
        apiKey: 'swk_exp_live_****_1180',
        webhook: 'https://swk.rent/api/tenant-alerts/charlotte-laurent',
        signature: 'Charlotte Laurent · TotalEnergies Relocation (30-Day Bridge Verified)',
        listings: 0,
        savedAed: 14800,
        viewings: 3,
        offers: 1,
        workflows: 1,
        pitches: 2,
        webhooks: 5,
      },
    ]

    for (const acc of demoAccountsSeed) {
      const info = insertUser.run(
        acc.email,
        defaultPwHash,
        acc.fullName,
        acc.phone,
        acc.role,
        acc.eid,
        acc.brn,
        acc.orn,
        acc.company,
        acc.deed,
        now,
      )
      const uid = Number(info.lastInsertRowid)
      insertUsage.run(
        uid,
        acc.email,
        acc.personaCode,
        acc.personaBadge,
        acc.planName,
        acc.chequeMode,
        acc.emirate,
        acc.chillerFree,
        acc.maxCommute,
        acc.commPct,
        acc.flatFee,
        acc.fifoCap,
        acc.apiKey,
        acc.webhook,
        acc.signature,
        acc.listings,
        acc.savedAed,
        acc.viewings,
        acc.offers,
        acc.workflows,
        acc.pitches,
        acc.webhooks,
        now,
      )
    }

    db.prepare(`
      INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_ref, details, created_at)
      VALUES (1, 'admin@swk.rent', 'ADMIN', 'MVP_COHORT_INITIALIZED', 'SYSTEM', 'MVP-1000', 'swk.rent 1,000-User MVP Cohort & 8 Dedicated Demo Personas initialized (RERA ORN 51517)', ?)
    `).run(now)
  }

  // Seed 7-Stage End-to-End UAE Rental Deal Workflows if empty
  const wfCount = (db.prepare('SELECT COUNT(*) as c FROM rental_workflows').get() as { c: number }).c
  if (wfCount === 0) {
    const insertWf = db.prepare(`
      INSERT INTO rental_workflows (
        workflow_code, unit_id, unit_code, building_name, unit_no,
        tenant_name, tenant_email, landlord_name, advisor_name, supply_tier,
        annual_rent_aed, cheque_option, current_stage, status,
        ejari_or_tawtheeq_no, gate_pass_code, snagging_score,
        swk_company_share_aed, swk_advisor_share_aed, a2a_partner_share_aed,
        stage_history_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    insertWf.run(
      'WF-DXB-2026-101',
      1,
      'SWK-RENT-101',
      'Marina Gate I (Select Group)',
      '3402',
      'Alexander Vance',
      'tenant@uaepass.ae',
      'H.E. Tariq Al Maktoum Portfolio',
      'Mohammad Haseeb',
      'SWK_EXCLUSIVE',
      125000,
      2,
      2,
      'IN_PROGRESS',
      'PENDING-EJARI',
      'PENDING-NOC',
      99,
      3125,
      3125,
      0,
      JSON.stringify([
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: 'TENANT',
          completedByName: 'Alexander Vance',
          completedAt: '2026-11-04T01:15:00Z',
          note: 'UAE PASS Emirates ID matched + GPS viewing verified at Marina Gate I.',
        },
        {
          stage: 2,
          code: 'OFFER_AND_DEPOSIT_LOCK',
          completedByRole: 'TENANT',
          completedByName: 'Alexander Vance',
          completedAt: '2026-11-04T02:00:00Z',
          note: 'Offer AED 125,000 (2 Cheques) + AED 2,000 SWK Corporate Escrow Lock active.',
        },
      ]),
      '2026-11-04T02:00:00Z',
    )

    insertWf.run(
      'WF-DXB-2026-102',
      2,
      'SWK-RENT-102',
      'Downtown Views II — Tower 1',
      '4805',
      'Sami Al Hashimi',
      'sami.hashimi@uaepass.ae',
      'Dr. Khalid Al Mansoori (UAE PASS Verified)',
      'SWK Direct Landlord Concierge',
      'DIRECT_LANDLORD',
      185000,
      1,
      4,
      'IN_PROGRESS',
      'PENDING-EJARI',
      'PENDING-NOC',
      98,
      2999,
      0,
      0,
      JSON.stringify([
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: 'TENANT',
          completedByName: 'Sami Al Hashimi',
          completedAt: '2026-11-03T10:00:00Z',
          note: 'Smart-Lock self-tour passcode verified via UAE PASS FaceID.',
        },
        {
          stage: 2,
          code: 'OFFER_AND_DEPOSIT_LOCK',
          completedByRole: 'TENANT',
          completedByName: 'Sami Al Hashimi',
          completedAt: '2026-11-03T11:30:00Z',
          note: 'Direct-to-Landlord Flat AED 2,999 fee selected (Saved AED 6,251).',
        },
        {
          stage: 3,
          code: 'LANDLORD_APPROVAL',
          completedByRole: 'LANDLORD',
          completedByName: 'Dr. Khalid Al Mansoori',
          completedAt: '2026-11-03T14:20:00Z',
          note: 'Landlord approved 1-cheque offer in Owner360 via UAE PASS signature.',
        },
        {
          stage: 4,
          code: 'CONTRACT_AND_PAYMENTS',
          completedByRole: 'TENANT',
          completedByName: 'Sami Al Hashimi',
          completedAt: '2026-11-04T03:10:00Z',
          note: 'DLD Unified Tenancy Contract signed + Manager Cheque verified in SWK Escrow.',
        },
      ]),
      '2026-11-04T03:10:00Z',
    )

    insertWf.run(
      'WF-DXB-2026-103',
      4,
      'SWK-RENT-104',
      'Park Heights I — Dubai Hills Boulevard',
      '1108',
      'Charlotte Laurent',
      'charlotte.laurent@totalenergies.ae',
      'Nasser Al Suwaidi Family Office',
      'Shabib Siraj (A2A w/ Omar Farooq)',
      'A2A_PARTNER',
      138000,
      1,
      6,
      'IN_PROGRESS',
      'EJARI-2026-774910',
      'PENDING-NOC',
      99,
      1725,
      1725,
      3450,
      JSON.stringify([
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: 'AGENT',
          completedByName: 'Omar Farooq (Apex Crest A2A)',
          completedAt: '2026-11-01T12:00:00Z',
          note: 'Protected A2A viewing completed with SWK Key Vault tag SWK-KEY-PH1-1108.',
        },
        {
          stage: 2,
          code: 'OFFER_AND_DEPOSIT_LOCK',
          completedByRole: 'AGENT',
          completedByName: 'Omar Farooq',
          completedAt: '2026-11-01T15:00:00Z',
          note: 'Corporate relocation offer locked in SWK Escrow.',
        },
        {
          stage: 3,
          code: 'LANDLORD_APPROVAL',
          completedByRole: 'LANDLORD',
          completedByName: 'Nasser Al Suwaidi Family Office',
          completedAt: '2026-11-02T09:00:00Z',
          note: 'Approved in Owner360.',
        },
        {
          stage: 4,
          code: 'CONTRACT_AND_PAYMENTS',
          completedByRole: 'TENANT',
          completedByName: 'Charlotte Laurent',
          completedAt: '2026-11-02T16:00:00Z',
          note: 'Corporate transfer cleared.',
        },
        {
          stage: 5,
          code: 'EJARI_TAWTHEEQ_ISSUED',
          completedByRole: 'AGENT',
          completedByName: 'Shabib Siraj',
          completedAt: '2026-11-03T11:00:00Z',
          note: 'Official Ejari #EJARI-2026-774910 issued; 50/25/25 A2A split locked.',
        },
        {
          stage: 6,
          code: 'DEWA_CHILLER_AND_SNAGGING',
          completedByRole: 'TENANT',
          completedByName: 'Charlotte Laurent',
          completedAt: '2026-11-04T04:10:00Z',
          note: 'DEWA Premise activated + 50-Point Move-In Snagging Vault locked (99/100).',
        },
      ]),
      '2026-11-04T04:10:00Z',
    )
  }

  // Seed Developer BTR & Bulk Handover Lease-Up Pools if empty
  const devCount = (db.prepare('SELECT COUNT(*) as c FROM developer_btr_pools').get() as { c: number }).c
  if (devCount === 0) {
    const insertDev = db.prepare(`
      INSERT INTO developer_btr_pools (
        project_code, project_name, developer_name, community, handover_date,
        total_handover_units, leased_count, active_public_queue_cap,
        protected_floor_rent_1br_aed, protected_floor_rent_2br_aed,
        yield_protection_boost_pct, dlp_snagging_included, commission_to_partner_agents_pct, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insertDev.run(
      'DEV-PENINSULA-4',
      'Peninsula Four — The Plaza (Bulk Handover Lease-Up)',
      'Select Group',
      'Business Bay Waterfront',
      '2026-11-30',
      180,
      114,
      3,
      135000,
      195000,
      16.5,
      1,
      5.0,
      'FIFO Anti-Cannibalization Active (Max 3 Units Shown per Layout)',
    )
    insertDev.run(
      'DEV-OXFORD-GARDENS',
      'Oxford Gardens Smart Resort Tower',
      'Iman Developers',
      'Arjan / Miracle Garden',
      '2026-12-15',
      120,
      78,
      3,
      78000,
      112000,
      14.2,
      1,
      5.0,
      'Pre-Handover DLP Snag-to-Lease Open (0-Day Vacancy Mode)',
    )
    insertDev.run(
      'DEV-CREEK-WATERS',
      'Creek Waters II — Island BTR Pool',
      'Emaar Properties (Institutional Pool)',
      'Dubai Creek Harbour',
      '2027-01-10',
      150,
      62,
      4,
      128000,
      182000,
      15.8,
      1,
      5.0,
      'FIFO Queue Active — Protected RERA Yield Floor',
    )
  }

  // Seed Reverse Rental Auction (Verified Tenant Briefs) if empty
  const briefCount = (db.prepare('SELECT COUNT(*) as c FROM tenant_reverse_briefs').get() as { c: number }).c
  if (briefCount === 0) {
    const insertBrief = db.prepare(`
      INSERT INTO tenant_reverse_briefs (
        brief_code, tenant_alias, corporate_employer, uae_pass_verified,
        preferred_communities, bedrooms_min, max_annual_budget_aed, cheques_ready,
        target_move_in_date, representing_agent_name, representing_agency_orn,
        bids_count, best_bid_rent_aed, best_bid_unit_label, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    insertBrief.run(
      'TENANT-BRIEF-901',
      'VP Engineering · Emirates Group',
      'Emirates Group / Corporate Housing',
      1,
      'Dubai Hills Estate, Downtown Dubai, or Business Bay',
      2,
      175000,
      1,
      '2026-11-18',
      'Mohammad Haseeb',
      'ORN-51517',
      2,
      168000,
      'Downtown Views II · #4805 (Chiller Free)',
      '1 Cheque Ready in Bank — Accepting Landlord Bids',
    )
    insertBrief.run(
      'TENANT-BRIEF-902',
      'Senior Legal Counsel · ADGM / DIFC',
      'Clifford Chance / DIFC',
      1,
      'Dubai Marina or DIFC / Index Tower',
      1,
      130000,
      2,
      '2026-11-22',
      'Talha Shabbir',
      'ORN-51517',
      3,
      124000,
      'Marina Gate I · #3402 (Full Marina View)',
      'UAE PASS KYC Verified — Landlords Bidding Down',
    )
    insertBrief.run(
      'TENANT-BRIEF-903',
      'Regional Medical Director · Cleveland Clinic',
      'Mubadala Health / Abu Dhabi',
      1,
      'Al Reem Island or Al Maryah Island (Abu Dhabi)',
      1,
      88000,
      1,
      '2026-11-25',
      'Shabib Siraj',
      'ORN-51517',
      1,
      81000,
      'Sun Tower Shams Gate · #4201',
      'Tawtheeq Instant Ready — Accepting Bids',
    )
  }

  // Seed CRM XML Feeds & Move-In Gate Passes if empty
  const feedCount = (db.prepare('SELECT COUNT(*) as c FROM crm_xml_feeds').get() as { c: number }).c
  if (feedCount === 0) {
    const insertFeed = db.prepare(`
      INSERT INTO crm_xml_feeds (agency_name, crm_provider, feed_url, imported_units_count, annual_credit_burn_saved_aed, synced_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    insertFeed.run(
      'SWK Properties LLC (ORN 51517)',
      'External OS REST API Bridge',
      'https://api.os.swk.rent/v1/syndication/rentals.xml',
      48,
      163200,
      '2026-11-04T03:30:00Z',
    )
    insertFeed.run(
      'Apex Crest Real Estate LLC',
      'PropSpace / Propertybase XML',
      'https://feeds.propspace.com/apex-crest-rera-verified.xml',
      32,
      115200,
      '2026-11-04T02:45:00Z',
    )
  }

  const passCount = (db.prepare('SELECT COUNT(*) as c FROM move_in_gate_passes').get() as { c: number }).c
  if (passCount === 0) {
    db.prepare(`
      INSERT INTO move_in_gate_passes (
        pass_code, building_name, unit_no, tenant_name, ejari_verified, dewa_verified, chiller_verified,
        mover_company, move_date, qr_token, status
      ) VALUES (?, ?, ?, ?, 1, 1, 1, ?, ?, ?, ?)
    `).run(
      'NOC-PASS-2026-8841',
      'Marina Gate I (Select Group)',
      '3402',
      'Alexander Vance',
      'TruKKer / Allied Pickfords UAE',
      '2026-11-15',
      'QR-OA-VERIFIED-MG1-3402',
      'Cleared by Building OA Security — Gate Barrier Auto-Approved',
    )
  }

  const bCount = (db.prepare('SELECT COUNT(*) as c FROM buildings').get() as { c: number }).c
  if (bCount > 0) return

  const buildingsSeed: Omit<BuildingProfile, 'id'>[] = [
    {
      code: 'BLD-MARINA-GATE-1',
      name: 'Marina Gate I (Select Group)',
      emirate: 'Dubai',
      community: 'Dubai Marina',
      subCommunity: 'Marina Walk North',
      developer: 'Select Group',
      completionYear: 2018,
      totalFloors: 52,
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 520,
      serviceChargeSqft: 21.4,
      metroStation: 'Sobha Realty Metro / Marina Tram',
      metroWalkMinsWinter: 4,
      metroWalkMinsSummerShade: 6,
      commuteDifcMins: 22,
      commuteMediaCityMins: 8,
      commuteBusinessBayMins: 24,
      commuteAdgmMins: 68,
      elevatorWaitScore: 9.4,
      soundproofingScore: 9.2,
      maintenanceSlaHours: 4,
      tenantRating: 4.9,
      reviewsCount: 142,
      verifiedNoPartition: true,
      amenities: ['Chiller Free', 'Direct Marina Walk Access', 'Infinity Lap Pool', '2-Level Championship Gym', 'Squash & Paddle Courts', '24/7 Concierge'],
      heroImage: '/media/properties/marina-sky-penthouse-1.webp',
    },
    {
      code: 'BLD-DOWNTOWN-VIEWS-2',
      name: 'Downtown Views II — Tower 1',
      emirate: 'Dubai',
      community: 'Downtown Dubai',
      subCommunity: 'Zabeel Link / Dubai Mall',
      developer: 'Emaar Properties',
      completionYear: 2023,
      totalFloors: 67,
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 580,
      serviceChargeSqft: 22.8,
      metroStation: 'Burj Khalifa / Dubai Mall Metro',
      metroWalkMinsWinter: 7,
      metroWalkMinsSummerShade: 5,
      commuteDifcMins: 6,
      commuteMediaCityMins: 21,
      commuteBusinessBayMins: 8,
      commuteAdgmMins: 82,
      elevatorWaitScore: 9.1,
      soundproofingScore: 9.0,
      maintenanceSlaHours: 4,
      tenantRating: 4.8,
      reviewsCount: 118,
      verifiedNoPartition: true,
      amenities: ['Chiller Free (Emaar)', 'AC Link Bridge to Dubai Mall', 'Burj Khalifa View Deck', 'Technogym Studio', 'Kids Splash Pad'],
      heroImage: '/media/properties/business-bay-executive-tower-2.webp',
    },
    {
      code: 'BLD-OXFORD-212-JVC',
      name: 'Oxford 212 Smart Residences',
      emirate: 'Dubai',
      community: 'JVC (Jumeirah Village Circle)',
      subCommunity: 'District 11 (Al Khail Fast Exit)',
      developer: 'Iman Developers',
      completionYear: 2024,
      totalFloors: 6,
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 410,
      serviceChargeSqft: 14.5,
      metroStation: 'Dubai Internet City Metro (Feeder Bus J01)',
      metroWalkMinsWinter: 18,
      metroWalkMinsSummerShade: 22,
      commuteDifcMins: 24,
      commuteMediaCityMins: 14,
      commuteBusinessBayMins: 20,
      commuteAdgmMins: 75,
      elevatorWaitScore: 9.6,
      soundproofingScore: 8.9,
      maintenanceSlaHours: 6,
      tenantRating: 4.85,
      reviewsCount: 89,
      verifiedNoPartition: true,
      amenities: ['Chiller Free', 'Smart Home Automation', 'Rooftop Outdoor Cinema', 'Cabana Pool Deck', 'BBQ Lounge', 'Avoids Hessa St Bottleneck'],
      heroImage: '/media/properties/jvc-boulevard-residences-2.webp',
    },
    {
      code: 'BLD-HILLS-PARK-HEIGHTS',
      name: 'Park Heights I — Dubai Hills Boulevard',
      emirate: 'Dubai',
      community: 'Dubai Hills Estate',
      subCommunity: 'Central Park & Boulevard',
      developer: 'Emaar Properties',
      completionYear: 2021,
      totalFloors: 18,
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 640,
      serviceChargeSqft: 17.9,
      metroStation: 'Equiti Metro (Hills Bus Link)',
      metroWalkMinsWinter: 15,
      metroWalkMinsSummerShade: 18,
      commuteDifcMins: 17,
      commuteMediaCityMins: 14,
      commuteBusinessBayMins: 15,
      commuteAdgmMins: 78,
      elevatorWaitScore: 9.3,
      soundproofingScore: 9.1,
      maintenanceSlaHours: 4,
      tenantRating: 4.9,
      reviewsCount: 164,
      verifiedNoPartition: true,
      amenities: ['Chiller Free', '2 Mins to Dubai Hills Park', '5 Mins to Dubai Hills Mall', 'GEMS School Catchment', 'Pet Friendly'],
      heroImage: '/media/properties/hills-estate-golf-mansion-1.webp',
    },
    {
      code: 'BLD-EXEC-TOWER-B',
      name: 'Executive Tower B (Aspect / Bay Avenue)',
      emirate: 'Dubai',
      community: 'Business Bay',
      subCommunity: 'Bay Avenue Park',
      developer: 'Dubai Properties',
      completionYear: 2011,
      totalFloors: 45,
      chillerProvider: 'Empower',
      avgMonthlyChillerAed: 780,
      avgMonthlyDewaAed: 590,
      serviceChargeSqft: 18.2,
      metroStation: 'Business Bay Metro Station',
      metroWalkMinsWinter: 5,
      metroWalkMinsSummerShade: 8,
      commuteDifcMins: 8,
      commuteMediaCityMins: 19,
      commuteBusinessBayMins: 3,
      commuteAdgmMins: 80,
      elevatorWaitScore: 8.1,
      soundproofingScore: 8.7,
      maintenanceSlaHours: 6,
      tenantRating: 4.5,
      reviewsCount: 205,
      verifiedNoPartition: true,
      amenities: ['Direct Bay Avenue Mall Access', '5 Mins Walk to Metro', '2-Story Podium Park', 'Spinneys Downstairs', 'Large Floorplans'],
      heroImage: '/media/properties/creek-harbour-waterside-townhouse-1.webp',
    },
    {
      code: 'BLD-REEM-SUN-TOWER',
      name: 'Sun Tower — Shams Gate District',
      emirate: 'Abu Dhabi',
      community: 'Al Reem Island',
      subCommunity: 'Shams Abu Dhabi (Boutik Mall Link)',
      developer: 'Aldar Properties',
      completionYear: 2012,
      totalFloors: 65,
      chillerProvider: 'Tabreed',
      avgMonthlyChillerAed: 620,
      avgMonthlyDewaAed: 450,
      serviceChargeSqft: 15.8,
      metroStation: 'Shams Boutik Transit Hub',
      metroWalkMinsWinter: 2,
      metroWalkMinsSummerShade: 3,
      commuteDifcMins: 75,
      commuteMediaCityMins: 62,
      commuteBusinessBayMins: 75,
      commuteAdgmMins: 6,
      elevatorWaitScore: 9.0,
      soundproofingScore: 9.3,
      maintenanceSlaHours: 4,
      tenantRating: 4.75,
      reviewsCount: 94,
      verifiedNoPartition: true,
      amenities: ['Direct Shams Boutik Mall Access', '6 Mins to ADGM Al Maryah Island', 'Olympic Lap Pool', 'Tennis Courts', 'Tawtheeq Instant Ready'],
      heroImage: '/media/properties/palm-garden-homes-1.webp',
    },
  ]

  const insertBuilding = db.prepare(`
    INSERT INTO buildings (
      code, name, emirate, community, sub_community, developer, completion_year, total_floors,
      chiller_provider, avg_monthly_chiller_aed, avg_monthly_dewa_aed, service_charge_sqft,
      metro_station, metro_walk_mins_winter, metro_walk_mins_summer_shade,
      commute_difc_mins, commute_media_city_mins, commute_business_bay_mins, commute_adgm_mins,
      elevator_wait_score, soundproofing_score, maintenance_sla_hours, tenant_rating, reviews_count,
      verified_no_partition, amenities_json, hero_image
    ) VALUES (
      @code, @name, @emirate, @community, @subCommunity, @developer, @completionYear, @totalFloors,
      @chillerProvider, @avgMonthlyChillerAed, @avgMonthlyDewaAed, @serviceChargeSqft,
      @metroStation, @metroWalkMinsWinter, @metroWalkMinsSummerShade,
      @commuteDifcMins, @commuteMediaCityMins, @commuteBusinessBayMins, @commuteAdgmMins,
      @elevatorWaitScore, @soundproofingScore, @maintenanceSlaHours, @tenantRating, @reviewsCount,
      @verifiedNoPartition, @amenitiesJson, @heroImage
    )
  `)

  const buildingIds: number[] = []
  for (const b of buildingsSeed) {
    const info = insertBuilding.run({
      ...b,
      verifiedNoPartition: b.verifiedNoPartition ? 1 : 0,
      amenitiesJson: JSON.stringify(b.amenities),
    })
    buildingIds.push(Number(info.lastInsertRowid))
  }

  const unitsSeed: Omit<RentalUnit, 'id'>[] = [
    {
      unitCode: 'SWK-RENT-101',
      buildingId: buildingIds[0]!,
      unitNo: '3402',
      floor: 34,
      bedrooms: 1,
      bathrooms: 2,
      areaSqft: 864,
      furnishing: 'Fully Furnished',
      viewType: 'Full Marina & Yacht Club View',
      supplyTier: 'SWK_EXCLUSIVE',
      annualRent1Cheque: 125000,
      annualRent2Cheques: 128000,
      annualRent4Cheques: 132000,
      annualRent12Monthly: 136800,
      bridgeMonthlyAed: 12900,
      reraIndexRent: 135000,
      trakheesiPermitNo: '7129481024',
      madmounQrCode: 'DLD-MADMOUN-MG1-3402',
      titleDeedNo: 'TD-DXB-2021-88412',
      makaniNo: '25194 74812',
      keyCustody: 'In SWK Vault',
      keyVaultTag: 'SWK-KEY-MG1-3402',
      availabilityStatus: 'Available',
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 520,
      advisorName: 'Mohammad Haseeb',
      advisorBrn: 'BRN-58912',
      landlordName: 'H.E. Tariq Al Maktoum Portfolio',
      landlordUaePassVerified: true,
      lastBiAnnualInspectionDate: '2026-10-18',
      images: ['/media/properties/marina-sky-penthouse-1.webp', '/media/properties/palm-garden-homes-1.webp'],
      highlights: ['Priced 7.4% Below RERA Index', 'Chiller Free (Saves AED 8,500/yr)', 'Physical Key in SWK Vault — 60-Min Viewing', '30-Day New Expat Bridge Eligible'],
      swkOsPropertyId: 1,
    },
    {
      unitCode: 'SWK-RENT-102',
      buildingId: buildingIds[1]!,
      unitNo: '4805',
      floor: 48,
      bedrooms: 2,
      bathrooms: 3,
      areaSqft: 1218,
      furnishing: 'Kitchen Appliances Only',
      viewType: 'Direct Burj Khalifa & Fountain View',
      supplyTier: 'DIRECT_LANDLORD',
      annualRent1Cheque: 185000,
      annualRent2Cheques: 189000,
      annualRent4Cheques: 194000,
      annualRent12Monthly: 201600,
      bridgeMonthlyAed: 18200,
      reraIndexRent: 195000,
      trakheesiPermitNo: '7194028411',
      madmounQrCode: 'DLD-MADMOUN-DV2-4805',
      titleDeedNo: 'TD-DXB-2023-19402',
      makaniNo: '29841 81023',
      keyCustody: 'Smart Lock Instant',
      keyVaultTag: 'SMARTLOCK-DV2-4805',
      availabilityStatus: 'Available',
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 580,
      advisorName: 'SWK Direct Landlord Concierge',
      advisorBrn: 'ORN-51517',
      landlordName: 'Dr. Khalid Al Mansoori (UAE PASS Verified)',
      landlordUaePassVerified: true,
      lastBiAnnualInspectionDate: '2026-10-25',
      images: ['/media/properties/business-bay-executive-tower-2.webp', '/media/properties/creek-harbour-waterside-townhouse-1.webp'],
      highlights: ['Direct-to-Landlord Flat AED 2,999 Fee (Save AED 6,251!)', 'AC Bridge to Dubai Mall Metro', 'Chiller Free Emaar Tower', 'Smart-Lock Self Viewing'],
      swkOsPropertyId: 2,
    },
    {
      unitCode: 'SWK-RENT-103',
      buildingId: buildingIds[2]!,
      unitNo: '411',
      floor: 4,
      bedrooms: 1,
      bathrooms: 2,
      areaSqft: 792,
      furnishing: 'Fully Furnished',
      viewType: 'Resort Pool Cabana View',
      supplyTier: 'SWK_EXCLUSIVE',
      annualRent1Cheque: 76000,
      annualRent2Cheques: 78000,
      annualRent4Cheques: 80000,
      annualRent12Monthly: 84000,
      bridgeMonthlyAed: 7800,
      reraIndexRent: 82000,
      trakheesiPermitNo: '7144920188',
      madmounQrCode: 'DLD-MADMOUN-OX212-411',
      titleDeedNo: 'TD-DXB-2024-55201',
      makaniNo: '21492 66109',
      keyCustody: 'In SWK Vault',
      keyVaultTag: 'SWK-KEY-OX212-411',
      availabilityStatus: 'Available',
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 410,
      advisorName: 'Talha Shabbir',
      advisorBrn: 'BRN-61204',
      landlordName: 'Elena Rostova (Golden Visa Investor)',
      landlordUaePassVerified: true,
      lastBiAnnualInspectionDate: '2026-10-29',
      images: ['/media/properties/jvc-boulevard-residences-2.webp', '/media/properties/villa-sanctuary-6.webp'],
      highlights: ['District 11 Fast Al Khail Exit (No Hessa Traffic)', 'Chiller Free + Alexa Smart Home', '12 Monthly Payments via UAEDDS', 'Key in SWK Vault'],
      swkOsPropertyId: 3,
    },
    {
      unitCode: 'SWK-RENT-104',
      buildingId: buildingIds[3]!,
      unitNo: '1108',
      floor: 11,
      bedrooms: 2,
      bathrooms: 2,
      areaSqft: 988,
      furnishing: 'Unfurnished',
      viewType: 'Central Park & Boulevard View',
      supplyTier: 'A2A_PARTNER',
      annualRent1Cheque: 138000,
      annualRent2Cheques: 142000,
      annualRent4Cheques: 146000,
      annualRent12Monthly: 152400,
      bridgeMonthlyAed: 13900,
      reraIndexRent: 145000,
      trakheesiPermitNo: '7168392014',
      madmounQrCode: 'DLD-MADMOUN-PH1-1108',
      titleDeedNo: 'TD-DXB-2021-33910',
      makaniNo: '27401 71920',
      keyCustody: 'In SWK Vault',
      keyVaultTag: 'SWK-KEY-PH1-1108',
      availabilityStatus: 'Available',
      chillerProvider: 'Chiller Free',
      avgMonthlyChillerAed: 0,
      avgMonthlyDewaAed: 640,
      advisorName: 'Shabib Siraj',
      advisorBrn: 'BRN-51517',
      a2aAgencyName: 'Apex Crest Real Estate LLC',
      a2aAgencyOrn: 'ORN-31940',
      landlordName: 'Nasser Al Suwaidi Family Office',
      landlordUaePassVerified: true,
      lastBiAnnualInspectionDate: '2026-10-12',
      images: ['/media/properties/hills-estate-golf-mansion-1.webp', '/media/properties/arabian-ranches-courtyard-villa-2.webp'],
      highlights: ['Protected 50/50 A2A Co-Brokering Mandate', 'Chiller Free Emaar Community', '2 Mins Walk to Dubai Hills Park', 'Snagging Shield Pre-Inspected'],
      swkOsPropertyId: 4,
    },
    {
      unitCode: 'SWK-RENT-105',
      buildingId: buildingIds[4]!,
      unitNo: '2904',
      floor: 29,
      bedrooms: 2,
      bathrooms: 3,
      areaSqft: 1465,
      furnishing: 'Unfurnished',
      viewType: 'Bay Avenue Park & Canal View',
      supplyTier: 'DIRECT_LANDLORD',
      annualRent1Cheque: 130000,
      annualRent2Cheques: 134000,
      annualRent4Cheques: 138000,
      annualRent12Monthly: 144000,
      bridgeMonthlyAed: 13200,
      reraIndexRent: 140000,
      trakheesiPermitNo: '7183920144',
      madmounQrCode: 'DLD-MADMOUN-EXB-2904',
      titleDeedNo: 'TD-DXB-2016-77123',
      makaniNo: '28910 80112',
      keyCustody: 'In SWK Vault',
      keyVaultTag: 'SWK-KEY-EXB-2904',
      availabilityStatus: 'Available',
      chillerProvider: 'Empower',
      avgMonthlyChillerAed: 780,
      avgMonthlyDewaAed: 590,
      advisorName: 'Mohammad Haseeb',
      advisorBrn: 'BRN-58912',
      landlordName: 'Rami Al Ghaith (UAE PASS Verified)',
      landlordUaePassVerified: true,
      lastBiAnnualInspectionDate: '2026-10-20',
      images: ['/media/properties/creek-harbour-waterside-townhouse-1.webp', '/media/properties/business-bay-executive-tower-2.webp'],
      highlights: ['Direct-to-Landlord Flat AED 2,999 Fee (Save AED 3,501!)', 'Transparent Empower Chiller Estimate Upfront', 'Huge 1,465 Sqft Layout', '5 Mins to Business Bay Metro'],
      swkOsPropertyId: 5,
    },
    {
      unitCode: 'SWK-RENT-106',
      buildingId: buildingIds[5]!,
      unitNo: '4201',
      floor: 42,
      bedrooms: 1,
      bathrooms: 2,
      areaSqft: 945,
      furnishing: 'Kitchen Appliances Only',
      viewType: 'Mangrove & Arabian Gulf View',
      supplyTier: 'SWK_EXCLUSIVE',
      annualRent1Cheque: 82000,
      annualRent2Cheques: 84000,
      annualRent4Cheques: 86000,
      annualRent12Monthly: 90000,
      bridgeMonthlyAed: 8200,
      reraIndexRent: 88000,
      trakheesiPermitNo: 'AD-MADHMOUN-992814',
      madmounQrCode: 'ADREC-MADHMOUN-SUN-4201',
      titleDeedNo: 'TD-AUH-2019-41022',
      makaniNo: 'AUH-REEM-4201',
      keyCustody: 'In SWK Vault',
      keyVaultTag: 'SWK-KEY-SUN-4201',
      availabilityStatus: 'Available',
      chillerProvider: 'Tabreed',
      avgMonthlyChillerAed: 620,
      avgMonthlyDewaAed: 450,
      advisorName: 'Talha Shabbir',
      advisorBrn: 'BRN-61204',
      landlordName: 'Al Dhaheri Capital Holdings',
      landlordUaePassVerified: true,
      lastBiAnnualInspectionDate: '2026-10-15',
      images: ['/media/properties/palm-garden-homes-1.webp', '/media/properties/islands-2-1.webp'],
      highlights: ['Abu Dhabi ADREC Madhmoun & Tawtheeq Verified', '6 Mins to ADGM Financial Center', 'Direct Elevator to Boutik Mall', '12x Monthly Direct Debit Ready'],
      swkOsPropertyId: 6,
    },
  ]

  const insertUnit = db.prepare(`
    INSERT INTO rental_units (
      unit_code, building_id, unit_no, floor, bedrooms, bathrooms, area_sqft,
      furnishing, view_type, supply_tier,
      annual_rent_1_cheque, annual_rent_2_cheques, annual_rent_4_cheques, annual_rent_12_monthly, bridge_monthly_aed,
      rera_index_rent, trakheesi_permit_no, madmoun_qr_code, title_deed_no, makani_no,
      key_custody, key_vault_tag, availability_status,
      chiller_provider, avg_monthly_chiller_aed, avg_monthly_dewa_aed,
      advisor_name, advisor_brn, a2a_agency_name, a2a_agency_orn,
      landlord_name, landlord_uae_pass_verified, last_bi_annual_inspection_date,
      images_json, highlights_json, swk_os_property_id
    ) VALUES (
      @unitCode, @buildingId, @unitNo, @floor, @bedrooms, @bathrooms, @areaSqft,
      @furnishing, @viewType, @supplyTier,
      @annualRent1Cheque, @annualRent2Cheques, @annualRent4Cheques, @annualRent12Monthly, @bridgeMonthlyAed,
      @reraIndexRent, @trakheesiPermitNo, @madmounQrCode, @titleDeedNo, @makaniNo,
      @keyCustody, @keyVaultTag, @availabilityStatus,
      @chillerProvider, @avgMonthlyChillerAed, @avgMonthlyDewaAed,
      @advisorName, @advisorBrn, @a2aAgencyName, @a2aAgencyOrn,
      @landlordName, @landlordUaePassVerified, @lastBiAnnualInspectionDate,
      @imagesJson, @highlightsJson, @swkOsPropertyId
    )
  `)

  for (const u of unitsSeed) {
    insertUnit.run({
      ...u,
      keyVaultTag: u.keyVaultTag ?? null,
      a2aAgencyName: u.a2aAgencyName ?? null,
      a2aAgencyOrn: u.a2aAgencyOrn ?? null,
      landlordUaePassVerified: u.landlordUaePassVerified ? 1 : 0,
      imagesJson: JSON.stringify(u.images),
      highlightsJson: JSON.stringify(u.highlights),
      swkOsPropertyId: u.swkOsPropertyId ?? null,
    })
  }

  const insertLease = db.prepare(`
    INSERT INTO active_leases_shield (
      lease_code, unit_id, unit_label, tenant_name, landlord_name, ejari_no,
      start_date, end_date, current_annual_rent, rera_index_rent, proposed_renewal_rent,
      notice_served_date, security_deposit_aed, autopilot_stage, snagging_move_in_score,
      snagging_photos_count, eviction_watchdog_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  insertLease.run(
    'EJARI-2026-884120',
    1,
    'Marina Gate I · Unit 3402',
    'Alexander Vance',
    'H.E. Tariq Al Maktoum Portfolio',
    '0120260884120',
    '2026-01-15',
    '2027-01-14',
    115000,
    135000,
    132000,
    '2026-10-05',
    5750,
    6,
    99,
    54,
    1,
  )

  insertLease.run(
    'EJARI-2026-991044',
    3,
    'Oxford 212 JVC · Unit 411',
    'Priya Nair',
    'Elena Rostova',
    '0120260991044',
    '2025-12-20',
    '2026-12-19',
    72000,
    82000,
    80000,
    '2026-10-18',
    7200,
    6,
    97,
    50,
    1,
  )

  const insertPdc = db.prepare(`
    INSERT INTO pdc_cheques (lease_code, cheque_no, bank_name, tenant_name, unit_label, due_date, amount_aed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertPdc.run('EJARI-2026-884120', 'CHQ-ENBD-740101', 'Emirates NBD', 'Alexander Vance', 'Marina Gate I · 3402', '2026-07-15', 28750, 'Cleared')
  insertPdc.run('EJARI-2026-884120', 'CHQ-ENBD-740102', 'Emirates NBD', 'Alexander Vance', 'Marina Gate I · 3402', '2026-10-15', 28750, 'Cleared')
  insertPdc.run('EJARI-2026-884120', 'CHQ-ENBD-740103', 'Emirates NBD', 'Alexander Vance', 'Marina Gate I · 3402', '2026-11-12', 28750, 'Due Soon (8 Days)')
  insertPdc.run('EJARI-2026-991044', 'CHQ-FAB-881204', 'First Abu Dhabi Bank (FAB)', 'Priya Nair', 'Oxford 212 JVC · 411', '2026-11-18', 18000, 'In SWK Vault')

  const insertMaint = db.prepare(`
    INSERT INTO maintenance_tickets (lease_code, unit_label, category, issue_summary, estimated_cost_aed, responsible_party, rule_explanation, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const m1 = classifyMaintenanceResponsibility({ category: 'AC / Cooling', estimatedCostAed: 1150 })
  insertMaint.run(
    'EJARI-2026-884120',
    'Marina Gate I · 3402',
    'AC / Cooling',
    'Master bedroom FCU actuator valve replacement & pressure flush',
    1150,
    m1.responsibleParty,
    m1.ruleExplanation,
    'Approved by Landlord in Owner360',
    '2026-11-02T11:20:00Z',
  )
  const m2 = classifyMaintenanceResponsibility({ category: 'Cosmetic / Bulbs', estimatedCostAed: 280 })
  insertMaint.run(
    'EJARI-2026-991044',
    'Oxford 212 JVC · 411',
    'Cosmetic / Bulbs',
    'Kitchen under-cabinet LED driver strip & balcony door latch adjustment',
    280,
    m2.responsibleParty,
    m2.ruleExplanation,
    'Scheduled — Tenant Minor Wear Tier (< AED 500)',
    '2026-11-03T14:15:00Z',
  )

  db.prepare(`
    INSERT INTO viewing_bookings (unit_id, tenant_name, tenant_phone, tenant_emirates_id_status, viewing_mode, slot_datetime, advisor_name, gps_status, key_vault_tag, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    1,
    'Sami Al Hashimi',
    '+971 50 492 8173',
    'UAE PASS Verified',
    'SWK Advisor GPS Escorted (Key in Vault)',
    '2026-11-04 16:30 GST',
    'Mohammad Haseeb',
    'GPS Checked-In at Marina Gate I Lobby (Accuracy 4.2m)',
    'SWK-KEY-MG1-3402',
    '2026-11-04T09:15:00Z',
  )

  db.prepare(`
    INSERT INTO a2a_partner_mandates (partner_agency_name, partner_orn, broker_name, broker_brn, unit_id, client_name, protection_expires_at, agreed_a2a_split_pct, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'Apex Crest Real Estate LLC',
    'ORN-31940',
    'Omar Farooq',
    'BRN-49182',
    4,
    'Charlotte Laurent (TotalEnergies Relocation)',
    '2026-11-11',
    50,
    'Protected Lead — 50% Partner / 25% SWK / 25% Advisor Locked',
    '2026-11-03T16:00:00Z',
  )
}

export function listBuildings(): BuildingProfile[] {
  const rows = db.prepare('SELECT * FROM buildings ORDER BY tenant_rating DESC').all() as any[]
  return rows.map(r => ({
    id: r.id,
    code: r.code,
    name: r.name,
    emirate: r.emirate,
    community: r.community,
    subCommunity: r.sub_community,
    developer: r.developer,
    completionYear: r.completion_year,
    totalFloors: r.total_floors,
    chillerProvider: r.chiller_provider,
    avgMonthlyChillerAed: r.avg_monthly_chiller_aed,
    avgMonthlyDewaAed: r.avg_monthly_dewa_aed,
    serviceChargeSqft: r.service_charge_sqft,
    metroStation: r.metro_station,
    metroWalkMinsWinter: r.metro_walk_mins_winter,
    metroWalkMinsSummerShade: r.metro_walk_mins_summer_shade,
    commuteDifcMins: r.commute_difc_mins,
    commuteMediaCityMins: r.commute_media_city_mins,
    commuteBusinessBayMins: r.commute_business_bay_mins,
    commuteAdgmMins: r.commute_adgm_mins,
    elevatorWaitScore: r.elevator_wait_score,
    soundproofingScore: r.soundproofing_score,
    maintenanceSlaHours: r.maintenance_sla_hours,
    tenantRating: r.tenant_rating,
    reviewsCount: r.reviews_count,
    verifiedNoPartition: Boolean(r.verified_no_partition),
    amenities: JSON.parse(r.amenities_json || '[]'),
    heroImage: r.hero_image,
  }))
}

export function listRentalUnits(): RentalUnit[] {
  const rows = db
    .prepare(`
      SELECT u.*, b.name as building_name, b.community as building_community, b.emirate as building_emirate
      FROM rental_units u
      JOIN buildings b ON b.id = u.building_id
      ORDER BY u.id ASC
    `)
    .all() as any[]

  return rows.map(r => ({
    id: r.id,
    unitCode: r.unit_code,
    buildingId: r.building_id,
    buildingName: r.building_name,
    community: r.building_community,
    emirate: r.building_emirate,
    unitNo: r.unit_no,
    floor: r.floor,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    areaSqft: r.area_sqft,
    furnishing: r.furnishing,
    viewType: r.view_type,
    supplyTier: r.supply_tier,
    annualRent1Cheque: r.annual_rent_1_cheque,
    annualRent2Cheques: r.annual_rent_2_cheques,
    annualRent4Cheques: r.annual_rent_4_cheques,
    annualRent12Monthly: r.annual_rent_12_monthly,
    bridgeMonthlyAed: r.bridge_monthly_aed,
    reraIndexRent: r.rera_index_rent,
    trakheesiPermitNo: r.trakheesi_permit_no,
    madmounQrCode: r.madmoun_qr_code,
    titleDeedNo: r.title_deed_no,
    makaniNo: r.makani_no,
    keyCustody: r.key_custody,
    keyVaultTag: r.key_vault_tag ?? undefined,
    availabilityStatus: r.availability_status,
    chillerProvider: r.chiller_provider,
    avgMonthlyChillerAed: r.avg_monthly_chiller_aed,
    avgMonthlyDewaAed: r.avg_monthly_dewa_aed,
    advisorName: r.advisor_name,
    advisorBrn: r.advisor_brn,
    a2aAgencyName: r.a2a_agency_name ?? undefined,
    a2aAgencyOrn: r.a2a_agency_orn ?? undefined,
    landlordName: r.landlord_name,
    landlordUaePassVerified: Boolean(r.landlord_uae_pass_verified),
    lastBiAnnualInspectionDate: r.last_bi_annual_inspection_date,
    images: JSON.parse(r.images_json || '[]'),
    highlights: JSON.parse(r.highlights_json || '[]'),
    swkOsPropertyId: r.swk_os_property_id ?? undefined,
  }))
}

export function getActiveLeasesWithReraShield() {
  const rows = db.prepare('SELECT * FROM active_leases_shield ORDER BY id ASC').all() as any[]
  return rows.map(r => {
    const reraEval = evaluateReraRenewal({
      currentRent: r.current_annual_rent,
      reraIndexRent: r.rera_index_rent,
      proposedRent: r.proposed_renewal_rent,
      leaseEndDate: r.end_date,
      noticeServedDate: r.notice_served_date,
    })
    return {
      ...r,
      reraEvaluation: reraEval,
    }
  })
}

export function listDeveloperBtrPools(): (DeveloperLeaseUpPool & { yieldProtection: any })[] {
  const rows = db.prepare('SELECT * FROM developer_btr_pools ORDER BY id ASC').all() as any[]
  return rows.map(r => ({
    id: r.id,
    projectCode: r.project_code,
    projectName: r.project_name,
    developerName: r.developer_name,
    community: r.community,
    handoverDate: r.handover_date,
    totalHandoverUnits: r.total_handover_units,
    leasedCount: r.leased_count,
    activePublicQueueCap: r.active_public_queue_cap,
    protectedFloorRent1BrAed: r.protected_floor_rent_1br_aed,
    protectedFloorRent2BrAed: r.protected_floor_rent_2br_aed,
    yieldProtectionBoostPct: r.yield_protection_boost_pct,
    dlpSnaggingIncluded: Boolean(r.dlp_snagging_included),
    commissionToPartnerAgentsPct: r.commission_to_partner_agents_pct,
    status: r.status,
    yieldProtection: calculateDeveloperBtrYieldProtection({
      totalUnits: r.total_handover_units,
      protectedFloorRentAed: r.protected_floor_rent_1br_aed,
    }),
  }))
}

export function listTenantReverseBriefs(): VerifiedTenantBrief[] {
  const rows = db.prepare('SELECT * FROM tenant_reverse_briefs ORDER BY id DESC').all() as any[]
  return rows.map(r => ({
    id: r.id,
    briefCode: r.brief_code,
    tenantAlias: r.tenant_alias,
    corporateEmployer: r.corporate_employer,
    uaePassVerified: Boolean(r.uae_pass_verified),
    preferredCommunities: r.preferred_communities,
    bedroomsMin: r.bedrooms_min,
    maxAnnualBudgetAed: r.max_annual_budget_aed,
    chequesReady: r.cheques_ready,
    targetMoveInDate: r.target_move_in_date,
    representingAgentName: r.representing_agent_name,
    representingAgencyOrn: r.representing_agency_orn,
    bidsCount: r.bids_count,
    bestBidRentAed: r.best_bid_rent_aed ?? undefined,
    bestBidUnitLabel: r.best_bid_unit_label ?? undefined,
    status: r.status,
  }))
}

export function mapCustomUsageRow(row: any): UserCustomUsageProfile {
  const listingsSyncedCount = Number(row.listings_synced_count) || 0
  const portalCreditBurnAed = Number(row.portal_credit_burn_aed) || 0
  const estimatedCompetitorSpendSavedAed = Number(row.estimated_competitor_spend_saved_aed) || 0
  const viewingsBookedOrDispatched = Number(row.viewings_booked_or_dispatched) || 0
  const digitalOffersSubmittedOrReviewed = Number(row.digital_offers_submitted_or_reviewed) || 0
  const workflowsSignedOffCount = Number(row.workflows_signed_off_count) || 0
  const whatsappPitchesGenerated = Number(row.whatsapp_pitches_generated) || 0
  const apiWebhookEventsCount = Number(row.api_webhook_events_count) || 0
  const fifoQueueCapUnits = Number(row.fifo_queue_cap_units) || 3

  return {
    userId: row.user_id,
    userEmail: row.user_email,
    personaCode: row.persona_code,
    personaBadge: row.persona_badge,
    customPlanName: row.custom_plan_name,
    customPlanTier: row.custom_plan_name,
    commissionSplitRatio: row.persona_badge,
    defaultChequeMode: (Number(row.default_cheque_mode) || 12) as ChequeOption,
    preferredEmirate: (row.preferred_emirate || 'All') as 'All' | 'Dubai' | 'Abu Dhabi',
    chillerFreePreferred: Boolean(row.chiller_free_preferred),
    maxCommuteDifcMins: Number(row.max_commute_difc_mins) || 45,
    customCommissionPct: Number(row.custom_commission_pct ?? 5.0),
    customFlatFeeAed: Number(row.custom_flat_fee_aed ?? 2999),
    fifoQueueCapUnits,
    btrFifoQueueCap: fifoQueueCapUnits,
    personalApiKeyMasked: row.personal_api_key_masked,
    personalApiKey: row.personal_api_key_masked,
    customWebhookUrl: row.custom_webhook_url,
    whatsappPitchSignature: row.whatsapp_pitch_signature,
    ejariAutopilotEnabled: true,
    rera90DayShieldEnabled: true,
    pdcBounceShieldEnabled: true,
    listingsSyncedCount,
    portalCreditBurnAed,
    estimatedCompetitorSpendSavedAed,
    viewingsBookedOrDispatched,
    digitalOffersSubmittedOrReviewed,
    workflowsSignedOffCount,
    whatsappPitchesGenerated,
    apiWebhookEventsCount,
    usageMetrics: {
      listingsSyncedCount,
      portalCreditBurnAed,
      estimatedCompetitorSpendSavedAed,
      viewingsBookedOrDispatched,
      digitalOffersSubmittedOrReviewed,
      workflowsSignedOffCount,
      whatsappPitchesGenerated,
      apiWebhookEventsCount,
    },
    updatedAt: row.updated_at,
  }
}

export function getUserCustomUsage(userId: number, fallbackUserRow?: any): UserCustomUsageProfile {
  const existing = db.prepare('SELECT * FROM user_custom_usage WHERE user_id = ?').get(userId) as any
  if (existing) return mapCustomUsageRow(existing)

  const uRow = fallbackUserRow || (db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any)
  const role: UserRole = (uRow?.role as UserRole) || 'TENANT'
  const email = uRow?.email || `user.${userId}@swk.rent`
  const fullName = uRow?.full_name || 'Verified swk.rent Member'
  const now = new Date().toISOString()

  const defaultPlanByRole: Record<UserRole, { code: string; badge: string; plan: string; cheque: number; comm: number; fee: number }> = {
    TENANT: {
      code: 'CUSTOM_TENANT',
      badge: 'Verified Tenant · Custom 12x UAEDDS & RERA Shield',
      plan: '12x Monthly UAEDDS Direct Debit + Flat AED 2,999 Direct Landlord Access',
      cheque: 12,
      comm: 5.0,
      fee: 2999,
    },
    LANDLORD: {
      code: 'CUSTOM_LANDLORD',
      badge: 'Owner360 Landlord · Custom Self-Serve / Managed Plan',
      plan: 'Tier 1: Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)',
      cheque: 1,
      comm: 0,
      fee: 2999,
    },
    AGENT: {
      code: 'CUSTOM_AGENT',
      badge: 'RERA Broker · AED 0 XML Sync & Protected A2A Split',
      plan: 'Protected 50% A2A / 50% SWK Commission Split + AED 0 Unlimited XML Sync',
      cheque: 2,
      comm: 5.0,
      fee: 0,
    },
    DEVELOPER: {
      code: 'CUSTOM_DEVELOPER',
      badge: 'Developer BTR · FIFO Anti-Cannibalization Pool',
      plan: 'Bulk Handover FIFO Queue (Max 3 Units Public per Layout · Yield Floor Protected)',
      cheque: 1,
      comm: 5.0,
      fee: 0,
    },
    ADMIN: {
      code: 'CUSTOM_ADMIN',
      badge: 'SWK Super-Admin · Full Platform & Escrow Governance',
      plan: 'Full 1,000-User MVP Cohort Governance + External OS REST API Bridge',
      cheque: 12,
      comm: 5.0,
      fee: 2999,
    },
  }

  const preset = defaultPlanByRole[role] || defaultPlanByRole.TENANT
  const apiKey = `swk_${role.slice(0, 3).toLowerCase()}_live_****_${String(1000 + userId)}`
  const webhook = `https://swk.rent/api/custom-webhooks/user-${userId}`
  const signature = `${fullName} · Verified ${role} on https://swk.rent`

  db.prepare(`
    INSERT OR IGNORE INTO user_custom_usage (
      user_id, user_email, persona_code, persona_badge, custom_plan_name,
      default_cheque_mode, preferred_emirate, chiller_free_preferred, max_commute_difc_mins,
      custom_commission_pct, custom_flat_fee_aed, fifo_queue_cap_units,
      personal_api_key_masked, custom_webhook_url, whatsapp_pitch_signature,
      listings_synced_count, portal_credit_burn_aed, estimated_competitor_spend_saved_aed,
      viewings_booked_or_dispatched, digital_offers_submitted_or_reviewed,
      workflows_signed_off_count, whatsapp_pitches_generated, api_webhook_events_count, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'Dubai', 1, 40, ?, ?, 3, ?, ?, ?, 0, 0, 12000, 1, 0, 0, 1, 1, ?)
  `).run(
    userId,
    email,
    preset.code,
    preset.badge,
    preset.plan,
    preset.cheque,
    preset.comm,
    preset.fee,
    apiKey,
    webhook,
    signature,
    now,
  )

  return mapCustomUsageRow(db.prepare('SELECT * FROM user_custom_usage WHERE user_id = ?').get(userId))
}

export function upsertUserCustomUsage(
  userId: number,
  input: {
    personaBadge?: string
    commissionSplitRatio?: string
    customPlanName?: string
    customPlanTier?: string
    defaultChequeMode?: ChequeOption
    preferredEmirate?: 'All' | 'Dubai' | 'Abu Dhabi'
    chillerFreePreferred?: boolean
    maxCommuteDifcMins?: number
    customCommissionPct?: number
    customFlatFeeAed?: number
    fifoQueueCapUnits?: number
    btrFifoQueueCap?: number
    customWebhookUrl?: string
    whatsappPitchSignature?: string
  },
): UserCustomUsageProfile {
  const current = getUserCustomUsage(userId)
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE user_custom_usage
    SET persona_badge = ?,
        custom_plan_name = ?,
        default_cheque_mode = ?,
        preferred_emirate = ?,
        chiller_free_preferred = ?,
        max_commute_difc_mins = ?,
        custom_commission_pct = ?,
        custom_flat_fee_aed = ?,
        fifo_queue_cap_units = ?,
        custom_webhook_url = ?,
        whatsapp_pitch_signature = ?,
        api_webhook_events_count = api_webhook_events_count + 1,
        updated_at = ?
    WHERE user_id = ?
  `).run(
    (input.commissionSplitRatio || input.personaBadge)?.trim() || current.personaBadge,
    (input.customPlanTier || input.customPlanName)?.trim() || current.customPlanName,
    Number(input.defaultChequeMode) || current.defaultChequeMode,
    input.preferredEmirate || current.preferredEmirate,
    typeof input.chillerFreePreferred === 'boolean'
      ? input.chillerFreePreferred
        ? 1
        : 0
      : current.chillerFreePreferred
        ? 1
        : 0,
    Number(input.maxCommuteDifcMins) || current.maxCommuteDifcMins,
    input.customCommissionPct !== undefined ? Number(input.customCommissionPct) : current.customCommissionPct,
    input.customFlatFeeAed !== undefined ? Number(input.customFlatFeeAed) : current.customFlatFeeAed,
    Number(input.btrFifoQueueCap ?? input.fifoQueueCapUnits) || current.fifoQueueCapUnits,
    input.customWebhookUrl?.trim() || current.customWebhookUrl,
    input.whatsappPitchSignature?.trim() || current.whatsappPitchSignature,
    now,
    userId,
  )

  return getUserCustomUsage(userId)
}

export function incrementUserUsageMetric(
  userId: number | null | undefined,
  metric:
    | 'listings'
    | 'listingsSyncedCount'
    | 'viewings'
    | 'viewingsBookedOrDispatched'
    | 'offers'
    | 'digitalOffersSubmittedOrReviewed'
    | 'workflows'
    | 'workflowsSignedOffCount'
    | 'pitches'
    | 'whatsappPitchesGenerated'
    | 'webhooks'
    | 'apiWebhookEventsCount',
  delta = 1,
) {
  if (!userId) return
  getUserCustomUsage(userId)
  const colMap: Record<typeof metric, string> = {
    listings: 'listings_synced_count',
    listingsSyncedCount: 'listings_synced_count',
    viewings: 'viewings_booked_or_dispatched',
    viewingsBookedOrDispatched: 'viewings_booked_or_dispatched',
    offers: 'digital_offers_submitted_or_reviewed',
    digitalOffersSubmittedOrReviewed: 'digital_offers_submitted_or_reviewed',
    workflows: 'workflows_signed_off_count',
    workflowsSignedOffCount: 'workflows_signed_off_count',
    pitches: 'whatsapp_pitches_generated',
    whatsappPitchesGenerated: 'whatsapp_pitches_generated',
    webhooks: 'api_webhook_events_count',
    apiWebhookEventsCount: 'api_webhook_events_count',
  }
  const col = colMap[metric] || 'whatsapp_pitches_generated'
  db.prepare(
    `UPDATE user_custom_usage SET ${col} = ${col} + ?, updated_at = ? WHERE user_id = ?`,
  ).run(delta, new Date().toISOString(), userId)
}

export function mapUserRow(r: any): AuthUser {
  return {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    phone: r.phone,
    role: r.role as UserRole,
    uaePassVerified: Boolean(r.uae_pass_verified),
    emiratesIdOrPassport: r.emirates_id_or_passport,
    reraBrn: r.rera_brn ?? null,
    reraOrn: r.rera_orn ?? null,
    agencyOrCompanyName: r.agency_or_company_name ?? null,
    titleDeedRef: r.title_deed_ref ?? null,
    createdAt: r.created_at,
    customUsage: getUserCustomUsage(r.id, r),
  }
}

export function listUsersPublic(): AuthUser[] {
  const rows = db.prepare('SELECT * FROM users ORDER BY id ASC').all() as any[]
  return rows.map(mapUserRow)
}

export function listRentalWorkflows(): RentalDealWorkflow[] {
  const rows = db.prepare('SELECT * FROM rental_workflows ORDER BY id DESC').all() as any[]
  return rows.map(r => ({
    id: r.id,
    workflowCode: r.workflow_code,
    unitId: r.unit_id,
    unitCode: r.unit_code,
    buildingName: r.building_name,
    unitNo: r.unit_no,
    tenantName: r.tenant_name,
    tenantEmail: r.tenant_email,
    landlordName: r.landlord_name,
    advisorName: r.advisor_name,
    supplyTier: r.supply_tier,
    annualRentAed: r.annual_rent_aed,
    chequeOption: r.cheque_option,
    currentStage: r.current_stage,
    status: r.status,
    ejariOrTawtheeqNo: r.ejari_or_tawtheeq_no,
    gatePassCode: r.gate_pass_code,
    snaggingScore: r.snagging_score,
    swkCompanyShareAed: r.swk_company_share_aed,
    swkAdvisorShareAed: r.swk_advisor_share_aed,
    a2aPartnerShareAed: r.a2a_partner_share_aed,
    stageHistory: JSON.parse(r.stage_history_json || '[]'),
    updatedAt: r.updated_at,
  }))
}

export function recordAuditLog(params: {
  user?: AuthUser | null
  action: string
  entityType: string
  entityRef?: string
  details: string
}) {
  db.prepare(`
    INSERT INTO audit_logs (user_id, user_email, user_role, action, entity_type, entity_ref, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    params.user?.id ?? null,
    params.user?.email ?? 'anonymous',
    params.user?.role ?? 'GUEST',
    params.action,
    params.entityType,
    params.entityRef ?? null,
    params.details,
    new Date().toISOString(),
  )
}

export function getMvpLaunchTelemetry() {
  const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c
  const byRoleRows = db
    .prepare('SELECT role, COUNT(*) as count FROM users GROUP BY role')
    .all() as { role: UserRole; count: number }[]
  const roleBreakdown: Record<string, number> = {
    TENANT: 0,
    LANDLORD: 0,
    AGENT: 0,
    DEVELOPER: 0,
    ADMIN: 0,
  }
  for (const r of byRoleRows) {
    roleBreakdown[r.role] = r.count
  }

  const activeWorkflows = (db.prepare('SELECT COUNT(*) as c FROM rental_workflows').get() as { c: number }).c
  const completedWorkflows = (
    db.prepare("SELECT COUNT(*) as c FROM rental_workflows WHERE status = 'COMPLETED_ACTIVE_LEASE'").get() as {
      c: number
    }
  ).c
  const recentAuditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 15').all()

  return {
    mvpCohortCapacity: 1000,
    registeredUsersCount: totalUsers,
    remainingEarlyAdopterSlots: Math.max(0, 1000 - totalUsers),
    roleBreakdown,
    activeWorkflows,
    completedWorkflows,
    sqliteWalActive: true,
    rateLimiterActive: true,
    helmetSecurityHeadersActive: true,
    androidBundleReady: true,
    iosBundleReady: true,
    recentAuditLogs,
  }
}

export function listFieldDutySessions(): FieldDutySession[] {
  const rows = db.prepare('SELECT * FROM field_duty_sessions ORDER BY id DESC').all() as any[]
  return rows.map(r => ({
    id: r.id,
    sessionCode: r.session_code,
    agentName: r.agent_name,
    agentEmail: r.agent_email,
    agentRole: r.agent_role as UserRole,
    unitId: r.unit_id,
    unitCode: r.unit_code,
    assignedLocation: r.assigned_location,
    keyVaultTag: r.key_vault_tag,
    deviceId: r.device_id,
    batteryPct: r.battery_pct,
    networkType: r.network_type,
    lastLat: r.last_lat,
    lastLng: r.last_lng,
    accuracyM: r.accuracy_m,
    pointsCount: r.points_count,
    status: r.status,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
  }))
}
