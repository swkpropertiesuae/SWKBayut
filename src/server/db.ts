import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import {
  type BuildingProfile,
  type RentalUnit,
  calculateTrueRentalCost,
  evaluateReraRenewal,
  classifyMaintenanceResponsibility,
} from '../shared/uae-rental-rules'

const dataDir = path.resolve('data')
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'swkbayut.db'))
db.pragma('journal_mode = WAL')

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
  `)

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
      metroWalkMinsSummerShade: 5, // Air-conditioned Dubai Mall Zabeel bridge!
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

  // Seed Active Leases for Post-Lease Shield, PDC Vault, and RERA Renewal Shield
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
    132000, // Landlord asking +14.7%, but Decree 43 caps 11-20% below index at 5% (AED 120,750)!
    '2026-10-05', // Served on time (before Oct 16 90-day cutoff)
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
    80000, // Notice served LATE (after 90-day deadline of 2026-09-20) -> 0% allowed!
    '2026-10-18',
    7200,
    6,
    97,
    50,
    1,
  )

  // Seed PDC Cheques in SWK Vault
  const insertPdc = db.prepare(`
    INSERT INTO pdc_cheques (lease_code, cheque_no, bank_name, tenant_name, unit_label, due_date, amount_aed, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertPdc.run('EJARI-2026-884120', 'CHQ-ENBD-740101', 'Emirates NBD', 'Alexander Vance', 'Marina Gate I · 3402', '2026-07-15', 28750, 'Cleared')
  insertPdc.run('EJARI-2026-884120', 'CHQ-ENBD-740102', 'Emirates NBD', 'Alexander Vance', 'Marina Gate I · 3402', '2026-10-15', 28750, 'Cleared')
  insertPdc.run('EJARI-2026-884120', 'CHQ-ENBD-740103', 'Emirates NBD', 'Alexander Vance', 'Marina Gate I · 3402', '2026-11-12', 28750, 'Due Soon (8 Days)')
  insertPdc.run('EJARI-2026-991044', 'CHQ-FAB-881204', 'First Abu Dhabi Bank (FAB)', 'Priya Nair', 'Oxford 212 JVC · 411', '2026-11-18', 18000, 'In SWK Vault')

  // Seed Maintenance Tickets with AED 500 UAE Threshold Classifier
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

  // Seed initial GPS viewing & A2A Partner registration
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
