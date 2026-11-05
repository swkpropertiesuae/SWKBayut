import {
  type BuildingProfile,
  type RentalUnit,
  type DeveloperLeaseUpPool,
  type VerifiedTenantBrief,
  type AuthUser,
  type UserRole,
  type ChequeOption,
  type SupplyTier,
  type UserCustomUsageProfile,
  type RentalDealWorkflow,
  type FieldDutySession,
  type RbacAction,
  ROLE_CAPABILITIES,
  RBAC_ACTION_CATALOG,
  ROLE_LANDING_PORTALS,
  UAE_COMMUNITY_GUIDES,
  UAE_RENTAL_WORKFLOW_STAGES,
  canRoleExecuteAction,
  canRoleAdvanceWorkflowStage,
  calculateTrueRentalCost,
  evaluateReraRenewal,
  validateUaeLegalPayment,
  classifyMaintenanceResponsibility,
  calculateDeveloperBtrYieldProtection,
  calculatePortalSavingsVsCompetitors,
} from '../shared/uae-rental-rules'

const STORAGE_KEY = 'swkrent_fullstack_state_v2'

interface LocalFullStackState {
  buildings: BuildingProfile[]
  units: RentalUnit[]
  users: AuthUser[]
  sessions: Record<string, { userId: number; role: UserRole }>
  workflows: RentalDealWorkflow[]
  leases: any[]
  cheques: any[]
  maintenance: any[]
  viewings: any[]
  offers: any[]
  a2aMandates: any[]
  landlordMandates: any[]
  developerPools: (DeveloperLeaseUpPool & { yieldProtection: any })[]
  reverseBriefs: VerifiedTenantBrief[]
  crmFeeds: any[]
  gatePasses: any[]
  fieldDutySessions: FieldDutySession[]
  auditLogs: any[]
  osBridge: {
    osApiUrl: string
    osApiKeyMasked: string
    webhookEndpoint: string
    autoSyncEnabled: boolean
    updatedAt: string
    recentSyncLogs: any[]
  }
}

function createInitialLocalState(): LocalFullStackState {
  const now = '2026-11-05T08:00:00Z'

  const buildings: BuildingProfile[] = [
    {
      id: 1,
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
      id: 2,
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
      id: 3,
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
      id: 4,
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
      id: 5,
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
      id: 6,
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

  const units: RentalUnit[] = [
    {
      id: 1,
      unitCode: 'SWK-RENT-101',
      buildingId: 1,
      buildingName: 'Marina Gate I (Select Group)',
      community: 'Dubai Marina',
      emirate: 'Dubai',
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
      id: 2,
      unitCode: 'SWK-RENT-102',
      buildingId: 2,
      buildingName: 'Downtown Views II — Tower 1',
      community: 'Downtown Dubai',
      emirate: 'Dubai',
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
      id: 3,
      unitCode: 'SWK-RENT-103',
      buildingId: 3,
      buildingName: 'Oxford 212 Smart Residences',
      community: 'JVC (Jumeirah Village Circle)',
      emirate: 'Dubai',
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
      id: 4,
      unitCode: 'SWK-RENT-104',
      buildingId: 4,
      buildingName: 'Park Heights I — Dubai Hills Boulevard',
      community: 'Dubai Hills Estate',
      emirate: 'Dubai',
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
      id: 5,
      unitCode: 'SWK-RENT-105',
      buildingId: 5,
      buildingName: 'Executive Tower B (Aspect / Bay Avenue)',
      community: 'Business Bay',
      emirate: 'Dubai',
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
      id: 6,
      unitCode: 'SWK-RENT-106',
      buildingId: 6,
      buildingName: 'Sun Tower — Shams Gate District',
      community: 'Al Reem Island',
      emirate: 'Abu Dhabi',
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

  const makeUsage = (
    userId: number,
    email: string,
    personaCode: string,
    personaBadge: string,
    customPlanName: string,
    defaultChequeMode: ChequeOption,
    preferredEmirate: 'All' | 'Dubai' | 'Abu Dhabi',
    maxCommuteDifcMins: number,
    customCommissionPct: number,
    customFlatFeeAed: number,
    fifoQueueCapUnits: number,
    personalApiKeyMasked: string,
    customWebhookUrl: string,
    whatsappPitchSignature: string,
    listingsSyncedCount: number,
    estimatedCompetitorSpendSavedAed: number,
    viewingsBookedOrDispatched: number,
    digitalOffersSubmittedOrReviewed: number,
    workflowsSignedOffCount: number,
    whatsappPitchesGenerated: number,
    apiWebhookEventsCount: number,
  ): UserCustomUsageProfile => ({
    userId,
    userEmail: email,
    personaCode,
    personaBadge,
    customPlanName,
    customPlanTier: customPlanName,
    commissionSplitRatio: personaBadge,
    defaultChequeMode,
    preferredEmirate,
    chillerFreePreferred: true,
    maxCommuteDifcMins,
    customCommissionPct,
    customFlatFeeAed,
    fifoQueueCapUnits,
    btrFifoQueueCap: fifoQueueCapUnits,
    personalApiKeyMasked,
    personalApiKey: personalApiKeyMasked,
    customWebhookUrl,
    whatsappPitchSignature,
    ejariAutopilotEnabled: true,
    rera90DayShieldEnabled: true,
    pdcBounceShieldEnabled: true,
    listingsSyncedCount,
    portalCreditBurnAed: 0,
    estimatedCompetitorSpendSavedAed,
    viewingsBookedOrDispatched,
    digitalOffersSubmittedOrReviewed,
    workflowsSignedOffCount,
    whatsappPitchesGenerated,
    apiWebhookEventsCount,
    usageMetrics: {
      listingsSyncedCount,
      portalCreditBurnAed: 0,
      estimatedCompetitorSpendSavedAed,
      viewingsBookedOrDispatched,
      digitalOffersSubmittedOrReviewed,
      workflowsSignedOffCount,
      whatsappPitchesGenerated,
      apiWebhookEventsCount,
    },
    updatedAt: now,
  })

  const users: AuthUser[] = [
    {
      id: 1,
      email: 'admin@swk.rent',
      fullName: 'Shahid · SWK Managing Director',
      phone: '+971 50 515 1700',
      role: 'ADMIN',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1990-5151700-1',
      reraBrn: 'BRN-51517',
      reraOrn: 'ORN-51517',
      agencyOrCompanyName: 'SWK Properties L.L.C.',
      titleDeedRef: null,
      createdAt: now,
      customUsage: makeUsage(
        1,
        'admin@swk.rent',
        'SWK_ADMIN',
        'SWK Super-Admin · ORN 51517 & Escrow Guard',
        'Full 1,000-User MVP Cohort Governance + External OS REST API Bridge',
        12,
        'All',
        90,
        5.0,
        2999,
        3,
        'swk_adm_live_****_51517',
        'https://swk.rent/api/os-api/webhook',
        'Shahid · Managing Director | SWK Properties L.L.C. (RERA ORN 51517)',
        48,
        163200,
        19,
        14,
        12,
        28,
        64,
      ),
    },
    {
      id: 2,
      email: 'advisor@swk.rent',
      fullName: 'Mohammad Haseeb · Senior RERA Advisor',
      phone: '+971 50 589 1200',
      role: 'AGENT',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1993-5891200-2',
      reraBrn: 'BRN-58912',
      reraOrn: 'ORN-51517',
      agencyOrCompanyName: 'SWK Properties L.L.C.',
      titleDeedRef: null,
      createdAt: now,
      customUsage: makeUsage(
        2,
        'advisor@swk.rent',
        'SWK_ADVISOR',
        'SWK Exclusive RERA Advisor · 50/50 Split + Key Vault',
        'SWK Exclusive 50/50 Commission Split + Instant Key Vault + Ejari Sign-Off',
        2,
        'Dubai',
        35,
        5.0,
        0,
        3,
        'swk_agt_live_****_58912',
        'https://api.os.swk.rent/v1/advisor/haseeb/events',
        'Mohammad Haseeb · Senior RERA Advisor (BRN-58912) | SWK Rent',
        24,
        96000,
        31,
        11,
        9,
        42,
        27,
      ),
    },
    {
      id: 3,
      email: 'partner@apexcrest.ae',
      fullName: 'Omar Farooq · A2A Partner Broker',
      phone: '+971 52 491 8200',
      role: 'AGENT',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1991-4918200-4',
      reraBrn: 'BRN-49182',
      reraOrn: 'ORN-31940',
      agencyOrCompanyName: 'Apex Crest Real Estate LLC',
      titleDeedRef: null,
      createdAt: now,
      customUsage: makeUsage(
        3,
        'partner@apexcrest.ae',
        'A2A_BROKER',
        'External A2A Partner Broker · 50% Protected Split',
        'Protected 50% Partner / 25% SWK / 25% Advisor A2A Split + AED 0 XML Sync',
        1,
        'Dubai',
        40,
        2.5,
        0,
        3,
        'swk_a2a_live_****_31940',
        'https://crm.apexcrest.ae/webhooks/swk-rent',
        'Omar Farooq (BRN-49182) · Apex Crest Real Estate (ORN-31940) via swk.rent A2A Shield',
        32,
        115200,
        14,
        6,
        5,
        35,
        19,
      ),
    },
    {
      id: 4,
      email: 'landlord@swk.rent',
      fullName: 'Dr. Khalid Al Mansoori · Owner360 Landlord',
      phone: '+971 50 884 1200',
      role: 'LANDLORD',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1982-8841200-9',
      reraBrn: null,
      reraOrn: null,
      agencyOrCompanyName: 'Al Mansoori Family Portfolio',
      titleDeedRef: 'TD-DXB-2023-19402',
      createdAt: now,
      customUsage: makeUsage(
        4,
        'landlord@swk.rent',
        'DIRECT_LANDLORD',
        'Direct Self-Serve Landlord · AED 0 Owner Fee',
        'Tier 1: Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)',
        1,
        'Dubai',
        45,
        0,
        2999,
        1,
        'swk_own_live_****_19402',
        'https://swk.rent/api/owner360/almansoori',
        'Dr. Khalid Al Mansoori · Verified DLD Title Deed Owner (TD-DXB-2023-19402)',
        3,
        18500,
        8,
        5,
        4,
        6,
        11,
      ),
    },
    {
      id: 5,
      email: 'familyoffice@swk.rent',
      fullName: 'H.E. Tariq Al Maktoum · Portfolio Landlord',
      phone: '+971 50 700 8800',
      role: 'LANDLORD',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1978-7008800-3',
      reraBrn: null,
      reraOrn: null,
      agencyOrCompanyName: 'H.E. Tariq Al Maktoum Family Office',
      titleDeedRef: 'TD-DXB-2021-88412',
      createdAt: now,
      customUsage: makeUsage(
        5,
        'familyoffice@swk.rent',
        'PORTFOLIO_LANDLORD',
        'Institutional Portfolio · 1-Cheque Day-1 Guarantee',
        'Tier 3: SWK 1-Cheque Upfront Guarantee (8% · Paid Day 1 while Tenant pays 12x)',
        1,
        'All',
        60,
        8.0,
        0,
        3,
        'swk_fmo_live_****_88412',
        'https://treasury.almaktoum-fo.ae/webhooks/swk-rent',
        'H.E. Tariq Al Maktoum Family Office · Institutional Rental Portfolio',
        14,
        64000,
        22,
        9,
        7,
        12,
        24,
      ),
    },
    {
      id: 6,
      email: 'developer@selectgroup.ae',
      fullName: 'Rami Al Ghaith · Director of BTR Handover',
      phone: '+971 56 300 9900',
      role: 'DEVELOPER',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1985-3009900-7',
      reraBrn: null,
      reraOrn: 'DLD-DEV-104',
      agencyOrCompanyName: 'Select Group BTR Division',
      titleDeedRef: 'PROJ-PENINSULA-4',
      createdAt: now,
      customUsage: makeUsage(
        6,
        'developer@selectgroup.ae',
        'BTR_DEVELOPER',
        'Developer BTR Pool · FIFO Anti-Cannibalization',
        'Bulk Tower Handover FIFO Queue (Max 3 Units Public per Layout · 16.5% Yield Protection)',
        1,
        'Dubai',
        30,
        5.0,
        0,
        3,
        'swk_dev_live_****_0104',
        'https://btr.select-group.ae/api/webhooks/swk-rent',
        'Rami Al Ghaith · Select Group BTR Lease-Up Desk (DLD-DEV-104)',
        180,
        342000,
        64,
        38,
        29,
        45,
        88,
      ),
    },
    {
      id: 7,
      email: 'tenant@uaepass.ae',
      fullName: 'Alexander Vance · Verified Executive Tenant',
      phone: '+971 58 210 4490',
      role: 'TENANT',
      uaePassVerified: true,
      emiratesIdOrPassport: '784-1994-2104490-5',
      reraBrn: null,
      reraOrn: null,
      agencyOrCompanyName: 'Emirates Group Executive Housing',
      titleDeedRef: null,
      createdAt: now,
      customUsage: makeUsage(
        7,
        'tenant@uaepass.ae',
        'EXEC_TENANT',
        'Corporate Executive Tenant · 12x Monthly UAEDDS',
        '12x Monthly UAEDDS Direct Debit + 90-Day RERA Decree 43 Renewal Shield',
        12,
        'Dubai',
        25,
        5.0,
        2999,
        3,
        'swk_tnt_live_****_4490',
        'https://swk.rent/api/tenant-alerts/alexander-vance',
        'Alexander Vance · UAE PASS Verified Tenant (Emirates Group)',
        0,
        6251,
        4,
        2,
        2,
        3,
        7,
      ),
    },
    {
      id: 8,
      email: 'expat@swk.rent',
      fullName: 'Charlotte Laurent · New Expat Relocation Tenant',
      phone: '+971 52 904 1180',
      role: 'TENANT',
      uaePassVerified: true,
      emiratesIdOrPassport: 'PASSPORT-FR-9920148 (EID In Process)',
      reraBrn: null,
      reraOrn: null,
      agencyOrCompanyName: 'TotalEnergies EP UAE Relocation',
      titleDeedRef: null,
      createdAt: now,
      customUsage: makeUsage(
        8,
        'expat@swk.rent',
        'EXPAT_BRIDGE_TENANT',
        'New Expat · 30-Day Bridge-to-Ejari Pass',
        '30-Day New Expat Bridge Pass (Move In Before Emirates ID · Auto-Converts to 12m Ejari)',
        30,
        'Dubai',
        30,
        5.0,
        2999,
        3,
        'swk_exp_live_****_1180',
        'https://swk.rent/api/tenant-alerts/charlotte-laurent',
        'Charlotte Laurent · TotalEnergies Relocation (30-Day Bridge Verified)',
        0,
        14800,
        3,
        1,
        1,
        2,
        5,
      ),
    },
  ]

  const workflows: RentalDealWorkflow[] = [
    {
      id: 1,
      workflowCode: 'WF-DXB-2026-101',
      unitId: 1,
      unitCode: 'SWK-RENT-101',
      buildingName: 'Marina Gate I (Select Group)',
      unitNo: '3402',
      tenantName: 'Alexander Vance',
      tenantEmail: 'tenant@uaepass.ae',
      landlordName: 'H.E. Tariq Al Maktoum Portfolio',
      advisorName: 'Mohammad Haseeb',
      supplyTier: 'SWK_EXCLUSIVE',
      annualRentAed: 125000,
      chequeOption: 2,
      currentStage: 2,
      status: 'IN_PROGRESS',
      ejariOrTawtheeqNo: 'PENDING-EJARI',
      gatePassCode: 'PENDING-NOC',
      snaggingScore: 99,
      swkCompanyShareAed: 3125,
      swkAdvisorShareAed: 3125,
      a2aPartnerShareAed: 0,
      stageHistory: [
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
      ],
      updatedAt: '2026-11-04T02:00:00Z',
    },
    {
      id: 2,
      workflowCode: 'WF-DXB-2026-102',
      unitId: 2,
      unitCode: 'SWK-RENT-102',
      buildingName: 'Downtown Views II — Tower 1',
      unitNo: '4805',
      tenantName: 'Sami Al Hashimi',
      tenantEmail: 'sami.hashimi@uaepass.ae',
      landlordName: 'Dr. Khalid Al Mansoori (UAE PASS Verified)',
      advisorName: 'SWK Direct Landlord Concierge',
      supplyTier: 'DIRECT_LANDLORD',
      annualRentAed: 185000,
      chequeOption: 1,
      currentStage: 4,
      status: 'IN_PROGRESS',
      ejariOrTawtheeqNo: 'PENDING-EJARI',
      gatePassCode: 'PENDING-NOC',
      snaggingScore: 98,
      swkCompanyShareAed: 2999,
      swkAdvisorShareAed: 0,
      a2aPartnerShareAed: 0,
      stageHistory: [
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: 'TENANT',
          completedByName: 'Sami Al Hashimi',
          completedAt: '2026-11-03T10:00:00Z',
          note: 'Smart-Lock self-tour passcode verified via UAE PASS FaceID.',
        },
        {
          stage: 4,
          code: 'CONTRACT_AND_PAYMENTS',
          completedByRole: 'TENANT',
          completedByName: 'Sami Al Hashimi',
          completedAt: '2026-11-04T03:10:00Z',
          note: 'DLD Unified Tenancy Contract signed + Manager Cheque verified in SWK Escrow.',
        },
      ],
      updatedAt: '2026-11-04T03:10:00Z',
    },
    {
      id: 3,
      workflowCode: 'WF-DXB-2026-103',
      unitId: 4,
      unitCode: 'SWK-RENT-104',
      buildingName: 'Park Heights I — Dubai Hills Boulevard',
      unitNo: '1108',
      tenantName: 'Charlotte Laurent',
      tenantEmail: 'charlotte.laurent@totalenergies.ae',
      landlordName: 'Nasser Al Suwaidi Family Office',
      advisorName: 'Shabib Siraj (A2A w/ Omar Farooq)',
      supplyTier: 'A2A_PARTNER',
      annualRentAed: 138000,
      chequeOption: 1,
      currentStage: 6,
      status: 'IN_PROGRESS',
      ejariOrTawtheeqNo: 'EJARI-2026-774910',
      gatePassCode: 'PENDING-NOC',
      snaggingScore: 99,
      swkCompanyShareAed: 1725,
      swkAdvisorShareAed: 1725,
      a2aPartnerShareAed: 3450,
      stageHistory: [
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: 'AGENT',
          completedByName: 'Omar Farooq (Apex Crest A2A)',
          completedAt: '2026-11-01T12:00:00Z',
          note: 'Protected A2A viewing completed with SWK Key Vault tag SWK-KEY-PH1-1108.',
        },
        {
          stage: 6,
          code: 'DEWA_CHILLER_AND_SNAGGING',
          completedByRole: 'TENANT',
          completedByName: 'Charlotte Laurent',
          completedAt: '2026-11-04T04:10:00Z',
          note: 'DEWA Premise activated + 50-Point Move-In Snagging Vault locked (99/100).',
        },
      ],
      updatedAt: '2026-11-04T04:10:00Z',
    },
  ]

  const leases = [
    {
      id: 1,
      lease_code: 'EJARI-2026-884120',
      unit_id: 1,
      unit_label: 'Marina Gate I · Unit 3402',
      tenant_name: 'Alexander Vance',
      landlord_name: 'H.E. Tariq Al Maktoum Portfolio',
      ejari_no: '0120260884120',
      start_date: '2026-01-15',
      end_date: '2027-01-14',
      current_annual_rent: 115000,
      rera_index_rent: 135000,
      proposed_renewal_rent: 132000,
      notice_served_date: '2026-10-05',
      security_deposit_aed: 5750,
      autopilot_stage: 6,
      snagging_move_in_score: 99,
      snagging_photos_count: 54,
      eviction_watchdog_active: 1,
      reraEvaluation: evaluateReraRenewal({
        currentRent: 115000,
        reraIndexRent: 135000,
        proposedRent: 132000,
        leaseEndDate: '2027-01-14',
        noticeServedDate: '2026-10-05',
      }),
    },
    {
      id: 2,
      lease_code: 'EJARI-2026-991044',
      unit_id: 3,
      unit_label: 'Oxford 212 JVC · Unit 411',
      tenant_name: 'Priya Nair',
      landlord_name: 'Elena Rostova',
      ejari_no: '0120260991044',
      start_date: '2025-12-20',
      end_date: '2026-12-19',
      current_annual_rent: 72000,
      rera_index_rent: 82000,
      proposed_renewal_rent: 80000,
      notice_served_date: '2026-10-18',
      security_deposit_aed: 7200,
      autopilot_stage: 6,
      snagging_move_in_score: 97,
      snagging_photos_count: 50,
      eviction_watchdog_active: 1,
      reraEvaluation: evaluateReraRenewal({
        currentRent: 72000,
        reraIndexRent: 82000,
        proposedRent: 80000,
        leaseEndDate: '2026-12-19',
        noticeServedDate: '2026-10-18',
      }),
    },
  ]

  const cheques = [
    { id: 1, lease_code: 'EJARI-2026-884120', cheque_no: 'CHQ-ENBD-740101', bank_name: 'Emirates NBD', tenant_name: 'Alexander Vance', unit_label: 'Marina Gate I · 3402', due_date: '2026-07-15', amount_aed: 28750, status: 'Cleared' },
    { id: 2, lease_code: 'EJARI-2026-884120', cheque_no: 'CHQ-ENBD-740102', bank_name: 'Emirates NBD', tenant_name: 'Alexander Vance', unit_label: 'Marina Gate I · 3402', due_date: '2026-10-15', amount_aed: 28750, status: 'Cleared' },
    { id: 3, lease_code: 'EJARI-2026-884120', cheque_no: 'CHQ-ENBD-740103', bank_name: 'Emirates NBD', tenant_name: 'Alexander Vance', unit_label: 'Marina Gate I · 3402', due_date: '2026-11-12', amount_aed: 28750, status: 'Due Soon (8 Days)' },
    { id: 4, lease_code: 'EJARI-2026-991044', cheque_no: 'CHQ-FAB-881204', bank_name: 'First Abu Dhabi Bank (FAB)', tenant_name: 'Priya Nair', unit_label: 'Oxford 212 JVC · 411', due_date: '2026-11-18', amount_aed: 18000, status: 'In SWK Vault' },
  ]

  const m1 = classifyMaintenanceResponsibility({ category: 'AC / Cooling', estimatedCostAed: 1150 })
  const m2 = classifyMaintenanceResponsibility({ category: 'Cosmetic / Bulbs', estimatedCostAed: 280 })
  const maintenance = [
    {
      id: 1,
      lease_code: 'EJARI-2026-884120',
      unit_label: 'Marina Gate I · 3402',
      category: 'AC / Cooling',
      issue_summary: 'Master bedroom FCU actuator valve replacement & pressure flush',
      estimated_cost_aed: 1150,
      responsible_party: m1.responsibleParty,
      rule_explanation: m1.ruleExplanation,
      status: 'Approved by Landlord in Owner360',
      created_at: '2026-11-02T11:20:00Z',
    },
    {
      id: 2,
      lease_code: 'EJARI-2026-991044',
      unit_label: 'Oxford 212 JVC · 411',
      category: 'Cosmetic / Bulbs',
      issue_summary: 'Kitchen under-cabinet LED driver strip & balcony door latch adjustment',
      estimated_cost_aed: 280,
      responsible_party: m2.responsibleParty,
      rule_explanation: m2.ruleExplanation,
      status: 'Scheduled — Tenant Minor Wear Tier (< AED 500)',
      created_at: '2026-11-03T14:15:00Z',
    },
  ]

  const viewings = [
    {
      id: 1,
      unit_id: 1,
      tenant_name: 'Sami Al Hashimi',
      tenant_phone: '+971 50 492 8173',
      tenant_emirates_id_status: 'UAE PASS Verified',
      viewing_mode: 'SWK Advisor GPS Escorted (Key in Vault)',
      slot_datetime: '2026-11-05 16:30 GST',
      advisor_name: 'Mohammad Haseeb',
      gps_status: 'GPS Checked-In at Marina Gate I Lobby (Accuracy 4.2m)',
      key_vault_tag: 'SWK-KEY-MG1-3402',
      created_at: '2026-11-04T09:15:00Z',
    },
  ]

  const a2aMandates = [
    {
      id: 1,
      partner_agency_name: 'Apex Crest Real Estate LLC',
      partner_orn: 'ORN-31940',
      broker_name: 'Omar Farooq',
      broker_brn: 'BRN-49182',
      unit_id: 4,
      client_name: 'Charlotte Laurent (TotalEnergies Relocation)',
      protection_expires_at: '2026-11-11',
      agreed_a2a_split_pct: 50,
      status: 'Protected Lead — 50% Partner / 25% SWK / 25% Advisor Locked',
      created_at: '2026-11-03T16:00:00Z',
    },
  ]

  const developerPools: (DeveloperLeaseUpPool & { yieldProtection: any })[] = [
    {
      id: 1,
      projectCode: 'DEV-PENINSULA-4',
      projectName: 'Peninsula Four — The Plaza (Bulk Handover Lease-Up)',
      developerName: 'Select Group',
      community: 'Business Bay Waterfront',
      handoverDate: '2026-11-30',
      totalHandoverUnits: 180,
      leasedCount: 114,
      activePublicQueueCap: 3,
      protectedFloorRent1BrAed: 135000,
      protectedFloorRent2BrAed: 195000,
      yieldProtectionBoostPct: 16.5,
      dlpSnaggingIncluded: true,
      commissionToPartnerAgentsPct: 5.0,
      status: 'FIFO Anti-Cannibalization Active (Max 3 Units Shown per Layout)',
      yieldProtection: calculateDeveloperBtrYieldProtection({ totalUnits: 180, protectedFloorRentAed: 135000 }),
    },
    {
      id: 2,
      projectCode: 'DEV-OXFORD-GARDENS',
      projectName: 'Oxford Gardens Smart Resort Tower',
      developerName: 'Iman Developers',
      community: 'Arjan / Miracle Garden',
      handoverDate: '2026-12-15',
      totalHandoverUnits: 120,
      leasedCount: 78,
      activePublicQueueCap: 3,
      protectedFloorRent1BrAed: 78000,
      protectedFloorRent2BrAed: 112000,
      yieldProtectionBoostPct: 14.2,
      dlpSnaggingIncluded: true,
      commissionToPartnerAgentsPct: 5.0,
      status: 'Pre-Handover DLP Snag-to-Lease Open (0-Day Vacancy Mode)',
      yieldProtection: calculateDeveloperBtrYieldProtection({ totalUnits: 120, protectedFloorRentAed: 78000 }),
    },
    {
      id: 3,
      projectCode: 'DEV-CREEK-WATERS',
      projectName: 'Creek Waters II — Island BTR Pool',
      developerName: 'Emaar Properties (Institutional Pool)',
      community: 'Dubai Creek Harbour',
      handoverDate: '2027-01-10',
      totalHandoverUnits: 150,
      leasedCount: 62,
      activePublicQueueCap: 4,
      protectedFloorRent1BrAed: 128000,
      protectedFloorRent2BrAed: 182000,
      yieldProtectionBoostPct: 15.8,
      dlpSnaggingIncluded: true,
      commissionToPartnerAgentsPct: 5.0,
      status: 'FIFO Queue Active — Protected RERA Yield Floor',
      yieldProtection: calculateDeveloperBtrYieldProtection({ totalUnits: 150, protectedFloorRentAed: 128000 }),
    },
  ]

  const reverseBriefs: VerifiedTenantBrief[] = [
    {
      id: 1,
      briefCode: 'TENANT-BRIEF-901',
      tenantAlias: 'VP Engineering · Emirates Group',
      corporateEmployer: 'Emirates Group / Corporate Housing',
      uaePassVerified: true,
      preferredCommunities: 'Dubai Hills Estate, Downtown Dubai, or Business Bay',
      bedroomsMin: 2,
      maxAnnualBudgetAed: 175000,
      chequesReady: 1,
      targetMoveInDate: '2026-11-18',
      representingAgentName: 'Mohammad Haseeb',
      representingAgencyOrn: 'ORN-51517',
      bidsCount: 2,
      bestBidRentAed: 168000,
      bestBidUnitLabel: 'Downtown Views II · #4805 (Chiller Free)',
      status: '1 Cheque Ready in Bank — Accepting Landlord Bids',
    },
    {
      id: 2,
      briefCode: 'TENANT-BRIEF-902',
      tenantAlias: 'Senior Legal Counsel · ADGM / DIFC',
      corporateEmployer: 'Clifford Chance / DIFC',
      uaePassVerified: true,
      preferredCommunities: 'Dubai Marina or DIFC / Index Tower',
      bedroomsMin: 1,
      maxAnnualBudgetAed: 130000,
      chequesReady: 2,
      targetMoveInDate: '2026-11-22',
      representingAgentName: 'Talha Shabbir',
      representingAgencyOrn: 'ORN-51517',
      bidsCount: 3,
      bestBidRentAed: 124000,
      bestBidUnitLabel: 'Marina Gate I · #3402 (Full Marina View)',
      status: 'UAE PASS KYC Verified — Landlords Bidding Down',
    },
    {
      id: 3,
      briefCode: 'TENANT-BRIEF-903',
      tenantAlias: 'Regional Medical Director · Cleveland Clinic',
      corporateEmployer: 'Mubadala Health / Abu Dhabi',
      uaePassVerified: true,
      preferredCommunities: 'Al Reem Island or Al Maryah Island (Abu Dhabi)',
      bedroomsMin: 1,
      maxAnnualBudgetAed: 88000,
      chequesReady: 1,
      targetMoveInDate: '2026-11-25',
      representingAgentName: 'Shabib Siraj',
      representingAgencyOrn: 'ORN-51517',
      bidsCount: 1,
      bestBidRentAed: 81000,
      bestBidUnitLabel: 'Sun Tower Shams Gate · #4201',
      status: 'Tawtheeq Instant Ready — Accepting Bids',
    },
  ]

  const crmFeeds = [
    {
      id: 1,
      agency_name: 'SWK Properties LLC (ORN 51517)',
      crm_provider: 'External OS REST API Bridge',
      feed_url: 'https://api.os.swk.rent/v1/syndication/rentals.xml',
      imported_units_count: 48,
      annual_credit_burn_saved_aed: 163200,
      synced_at: '2026-11-04T03:30:00Z',
    },
    {
      id: 2,
      agency_name: 'Apex Crest Real Estate LLC',
      crm_provider: 'PropSpace / Propertybase XML',
      feed_url: 'https://feeds.propspace.com/apex-crest-rera-verified.xml',
      imported_units_count: 32,
      annual_credit_burn_saved_aed: 115200,
      synced_at: '2026-11-04T02:45:00Z',
    },
  ]

  const gatePasses = [
    {
      id: 1,
      pass_code: 'NOC-PASS-2026-8841',
      building_name: 'Marina Gate I (Select Group)',
      unit_no: '3402',
      tenant_name: 'Alexander Vance',
      ejari_verified: 1,
      dewa_verified: 1,
      chiller_verified: 1,
      mover_company: 'TruKKer / Allied Pickfords UAE',
      move_date: '2026-11-15',
      qr_token: 'QR-OA-VERIFIED-MG1-3402',
      status: 'Cleared by Building OA Security — Gate Barrier Auto-Approved',
    },
  ]

  const fieldDutySessions: FieldDutySession[] = [
    {
      id: 1,
      sessionCode: 'DUTY-AND-401',
      agentName: 'Mohammad Haseeb',
      agentEmail: 'advisor@swk.rent',
      agentRole: 'AGENT',
      unitId: 1,
      unitCode: 'SWK-RENT-101',
      assignedLocation: 'Marina Gate I · Unit #3402 (Dubai Marina)',
      keyVaultTag: 'SWK-KEY-MG1-3402',
      deviceId: 'SWK-AND-S24ULTRA-58912',
      batteryPct: 94,
      networkType: '5G Standalone',
      lastLat: 25.0889,
      lastLng: 55.1462,
      accuracyM: 3.8,
      pointsCount: 12,
      status: 'ACTIVE_GPS_ESCORT',
      startedAt: '2026-11-04T03:45:00Z',
      updatedAt: '2026-11-04T04:12:00Z',
    },
    {
      id: 2,
      sessionCode: 'DUTY-AND-402',
      agentName: 'Omar Farooq (A2A)',
      agentEmail: 'partner@apexcrest.ae',
      agentRole: 'AGENT',
      unitId: 4,
      unitCode: 'SWK-RENT-104',
      assignedLocation: 'Park Heights I · Unit #1108 (Dubai Hills)',
      keyVaultTag: 'SWK-KEY-PH1-1108',
      deviceId: 'SWK-AND-PIXEL9PRO-49182',
      batteryPct: 88,
      networkType: 'Wi-Fi 6E',
      lastLat: 25.1045,
      lastLng: 55.2418,
      accuracyM: 4.5,
      pointsCount: 19,
      status: 'COMPLETED_VERIFIED',
      startedAt: '2026-11-03T11:30:00Z',
      updatedAt: '2026-11-03T12:25:00Z',
    },
  ]

  return {
    buildings,
    units,
    users,
    sessions: {},
    workflows,
    leases,
    cheques,
    maintenance,
    viewings,
    offers: [],
    a2aMandates,
    landlordMandates: [],
    developerPools,
    reverseBriefs,
    crmFeeds,
    gatePasses,
    fieldDutySessions,
    auditLogs: [
      {
        id: 1,
        user_id: 1,
        user_email: 'admin@swk.rent',
        user_role: 'ADMIN',
        action: 'MVP_COHORT_INITIALIZED',
        entity_type: 'SYSTEM',
        entity_ref: 'MVP-1000',
        details: 'swk.rent 1,000-User MVP Cohort & 8 Dedicated Demo Personas initialized (RERA ORN 51517)',
        created_at: now,
      },
    ],
    osBridge: {
      osApiUrl: 'https://api.os.swk.rent',
      osApiKeyMasked: 'elv_live_****_orn51517',
      webhookEndpoint: 'https://swk.rent/api/os-api/webhook',
      autoSyncEnabled: true,
      updatedAt: now,
      recentSyncLogs: [
        {
          id: 1,
          direction: 'INVENTORY_PULL',
          event_type: 'OS_INVENTORY_SYNC',
          endpoint: 'https://api.os.swk.rent/api/public/properties',
          status: '200 OK (6 Verified Units Synced)',
          payload_summary: 'Pulled Title-Deed & Key-Vault verified rental inventory via REST API',
          created_at: now,
        },
        {
          id: 2,
          direction: 'OUTBOUND_REST',
          event_type: 'WORKFLOW_STAGE_SYNC',
          endpoint: 'https://api.os.swk.rent/api/webhooks/swk-rent',
          status: '200 OK (Webhook Delivered)',
          payload_summary: 'Synced 7-stage rental deal pipeline & commission splits to external OS API',
          created_at: now,
        },
      ],
    },
  }
}

function loadState(): LocalFullStackState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as LocalFullStackState
      if (parsed && Array.isArray(parsed.units) && Array.isArray(parsed.users)) {
        if (!parsed.fieldDutySessions) {
          parsed.fieldDutySessions = createInitialLocalState().fieldDutySessions
        }
        return parsed
      }
    }
  } catch {
    // ignore storage read errors
  }
  const initial = createInitialLocalState()
  saveState(initial)
  return initial
}

function saveState(state: LocalFullStackState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage quota errors
  }
}

function computeMvpTelemetry(state: LocalFullStackState) {
  const roleBreakdown: Record<string, number> = {
    TENANT: 0,
    LANDLORD: 0,
    AGENT: 0,
    DEVELOPER: 0,
    ADMIN: 0,
  }
  for (const u of state.users) {
    roleBreakdown[u.role] = (roleBreakdown[u.role] || 0) + 1
  }
  return {
    mvpCohortCapacity: 1000,
    registeredUsersCount: state.users.length,
    remainingEarlyAdopterSlots: Math.max(0, 1000 - state.users.length),
    roleBreakdown,
    activeWorkflows: state.workflows.length,
    completedWorkflows: state.workflows.filter(w => w.status === 'COMPLETED_ACTIVE_LEASE').length,
    sqliteWalActive: true,
    rateLimiterActive: true,
    helmetSecurityHeadersActive: true,
    androidBundleReady: true,
    iosBundleReady: true,
    recentAuditLogs: state.auditLogs.slice(0, 15),
  }
}

function getActiveUser(state: LocalFullStackState, sessionToken: string | null, activeRole: UserRole): AuthUser {
  const sess = sessionToken ? state.sessions[sessionToken] : undefined
  if (sess) {
    const found = state.users.find(u => u.id === sess.userId)
    if (found) return found
  }
  const fallbackByRole = state.users.find(u => u.role === activeRole)
  return fallbackByRole || state.users[6]!
}

function assertLocalRbac(role: UserRole, action: RbacAction) {
  if (!canRoleExecuteAction(role, action)) {
    throw new Error(
      `RBAC Access Denied: Role "${role}" (${ROLE_CAPABILITIES[role]?.label ?? role}) is not permitted to perform "${action}".`,
    )
  }
}

export interface SmartFetchResponseLike {
  ok: boolean
  status: number
  json: () => Promise<any>
}

export async function smartFetchResponse(
  url: string,
  init: RequestInit | undefined,
  sessionToken: string | null,
  activeRole: UserRole,
  serverBaseUrl?: string,
): Promise<SmartFetchResponseLike> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-swk-role': activeRole,
    ...((init?.headers as Record<string, string>) || {}),
  }
  if (sessionToken) {
    headers['x-swk-session'] = sessionToken
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  const normalizedBase =
    serverBaseUrl &&
    serverBaseUrl.trim() !== '' &&
    !serverBaseUrl.startsWith('https://localhost')
      ? serverBaseUrl.trim().replace(/\/+$/, '')
      : ''

  const targetUrl = normalizedBase && url.startsWith('/') ? `${normalizedBase}${url}` : url

  const isBundledAndroidAssetOrigin =
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    window.location.hostname === 'localhost' &&
    !normalizedBase

  if (!isBundledAndroidAssetOrigin) {
    try {
      const res = await fetch(targetUrl, {
        ...init,
        headers,
      })
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        return {
          ok: res.ok,
          status: res.status,
          json: async () => data,
        }
      }
    } catch {
      // Fall back to local full-stack engine when offline or inside standalone WebView
    }
  }

  try {
    const data = handleLocalApiRequest(url, init, sessionToken, activeRole)
    return {
      ok: true,
      status: 200,
      json: async () => data,
    }
  } catch (err: any) {
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: err?.message || 'Local API error' }),
    }
  }
}

function handleLocalApiRequest(
  url: string,
  init: RequestInit | undefined,
  sessionToken: string | null,
  activeRole: UserRole,
): any {
  const state = loadState()
  const method = (init?.method || 'GET').toUpperCase()
  const body = init?.body ? JSON.parse(String(init.body)) : {}
  const activeUser = getActiveUser(state, sessionToken, activeRole)
  const effectiveRole: UserRole = (sessionToken && state.sessions[sessionToken]?.role) || activeRole

  const cleanUrl = url.split('?')[0]!

  if (method === 'GET' && cleanUrl === '/api/bootstrap') {
    return {
      currentUser: sessionToken && state.sessions[sessionToken] ? activeUser : null,
      roleCapabilities: ROLE_CAPABILITIES,
      rbacActionCatalog: RBAC_ACTION_CATALOG,
      roleLandingPortals: ROLE_LANDING_PORTALS,
      communityGuides: UAE_COMMUNITY_GUIDES,
      workflowStageDefinitions: UAE_RENTAL_WORKFLOW_STAGES,
      demoUsers: state.users,
      mvpTelemetry: computeMvpTelemetry(state),
      buildings: state.buildings,
      units: state.units,
      leases: state.leases,
      cheques: state.cheques,
      maintenance: state.maintenance,
      viewings: state.viewings,
      offers: state.offers,
      a2aMandates: state.a2aMandates,
      landlordMandates: state.landlordMandates,
      developerPools: state.developerPools,
      reverseBriefs: state.reverseBriefs,
      crmFeeds: state.crmFeeds,
      gatePasses: state.gatePasses,
      workflows: state.workflows,
      fieldDutySessions: state.fieldDutySessions,
      portalSavingsSample: calculatePortalSavingsVsCompetitors({
        activeListingsCount: 45,
        agentsCount: 15,
      }),
      osBridge: state.osBridge,
    }
  }

  if (method === 'GET' && cleanUrl === '/api/landing') {
    return {
      ok: true,
      domain: 'https://swk.rent',
      reraOrn: '51517',
      androidPackage: 'ae.swk.rent',
      iosBundleId: 'ae.swk.rent',
      heroStats: {
        verifiedUnitsCount: state.units.length,
        canonicalTowersCount: state.buildings.length,
        brokerListingCostAed: 0,
        directLandlordFlatFeeAed: 2999,
        mvpCohortSlotsTotal: 1000,
      },
      roleLandingPortals: ROLE_LANDING_PORTALS,
      communityGuides: UAE_COMMUNITY_GUIDES,
      featuredUnits: state.units.slice(0, 3),
    }
  }

  if (method === 'GET' && cleanUrl === '/api/rbac/matrix') {
    return {
      ok: true,
      activeRole: effectiveRole,
      currentUser: sessionToken && state.sessions[sessionToken] ? activeUser : null,
      roleCapabilities: ROLE_CAPABILITIES,
      actionCatalog: RBAC_ACTION_CATALOG.map(item => ({
        ...item,
        grantedForActiveRole: item.allowedRoles.includes(effectiveRole),
      })),
      workflowStages: UAE_RENTAL_WORKFLOW_STAGES.map(st => ({
        ...st,
        grantedForActiveRole: st.allowedRolesToAdvance.includes(effectiveRole),
      })),
    }
  }

  if (method === 'POST' && cleanUrl === '/api/auth/login') {
    let user: AuthUser | undefined
    if (body.demoEmail) {
      user = state.users.find(u => u.email.toLowerCase() === String(body.demoEmail).trim().toLowerCase())
    } else if (body.demoQuickRole) {
      user = state.users.find(u => u.role === body.demoQuickRole)
    } else if (body.uaePassQuickAuth) {
      const targetEmail = (body.email || 'tenant@uaepass.ae').trim().toLowerCase()
      user = state.users.find(u => u.email.toLowerCase() === targetEmail) || state.users[6]
    } else {
      const email = (body.email || '').trim().toLowerCase()
      user = state.users.find(u => u.email.toLowerCase() === email)
      if (!user || (!body.password && !body.uaePassQuickAuth)) {
        throw new Error('Invalid email address or password.')
      }
    }
    if (!user) {
      throw new Error('Account not found.')
    }

    const token = `swk_local_tok_${user.id}_${Date.now()}`
    state.sessions[token] = { userId: user.id, role: user.role }
    state.auditLogs.unshift({
      id: state.auditLogs.length + 1,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role,
      action: 'USER_SIGNIN',
      entity_type: 'SESSION',
      entity_ref: user.email,
      details: `Signed in as ${user.role} (${user.fullName})`,
      created_at: new Date().toISOString(),
    })
    saveState(state)
    return {
      ok: true,
      sessionToken: token,
      user,
      capabilities: ROLE_CAPABILITIES[user.role],
    }
  }

  if (method === 'POST' && cleanUrl === '/api/auth/signup') {
    const email = (body.email || '').trim().toLowerCase()
    const fullName = (body.fullName || '').trim()
    const phone = (body.phone || '+971 50 000 0000').trim()
    const role: UserRole = body.role || 'TENANT'
    if (!email || !fullName) {
      throw new Error('Full name, email address, UAE phone number, and password are required.')
    }
    if (state.users.some(u => u.email.toLowerCase() === email)) {
      throw new Error('An account with this email address is already registered. Please sign in.')
    }
    if (role === 'AGENT' && !body.reraBrn && !body.reraOrn) {
      throw new Error('RERA Broker Registration (BRN) or Agency ORN is required for Agent/Broker signup.')
    }
    if (role === 'LANDLORD' && !body.titleDeedRef) {
      throw new Error('DLD Title Deed Reference or Mulkiya No. is required for Direct Landlord signup.')
    }

    const newId = state.users.length + 1
    const now = new Date().toISOString()
    const newUser: AuthUser = {
      id: newId,
      email,
      fullName,
      phone,
      role,
      uaePassVerified: true,
      emiratesIdOrPassport: body.emiratesIdOrPassport || '784-1995-9918273-1',
      reraBrn: body.reraBrn || null,
      reraOrn: body.reraOrn || null,
      agencyOrCompanyName: body.agencyOrCompanyName || null,
      titleDeedRef: body.titleDeedRef || null,
      createdAt: now,
      customUsage: {
        userId: newId,
        userEmail: email,
        personaCode: `CUSTOM_${role}`,
        personaBadge: body.commissionSplitRatio || `${role} · Verified UAE PASS Member`,
        customPlanName: body.customPlanTier || `Standard ${role} Plan · RERA ORN 51517 Verified`,
        customPlanTier: body.customPlanTier || `Standard ${role} Plan · RERA ORN 51517 Verified`,
        commissionSplitRatio: body.commissionSplitRatio || `${role} · Verified UAE PASS Member`,
        defaultChequeMode: (Number(body.defaultChequeMode) || 12) as ChequeOption,
        preferredEmirate: body.preferredEmirate || 'Dubai',
        chillerFreePreferred: Boolean(body.chillerFreePreferred ?? true),
        maxCommuteDifcMins: Number(body.maxCommuteDifcMins) || 40,
        customCommissionPct: Number(body.customCommissionPct ?? 5.0),
        customFlatFeeAed: Number(body.customFlatFeeAed ?? 2999),
        fifoQueueCapUnits: Number(body.btrFifoQueueCap) || 3,
        btrFifoQueueCap: Number(body.btrFifoQueueCap) || 3,
        personalApiKeyMasked: `swk_${role.slice(0, 3).toLowerCase()}_live_****_${1000 + newId}`,
        personalApiKey: `swk_${role.slice(0, 3).toLowerCase()}_live_****_${1000 + newId}`,
        customWebhookUrl: body.customWebhookUrl || `https://swk.rent/api/custom-webhooks/user-${newId}`,
        whatsappPitchSignature: body.whatsappPitchSignature || `${fullName} · Verified ${role} on swk.rent`,
        ejariAutopilotEnabled: true,
        rera90DayShieldEnabled: true,
        pdcBounceShieldEnabled: true,
        listingsSyncedCount: 0,
        portalCreditBurnAed: 0,
        estimatedCompetitorSpendSavedAed: 12000,
        viewingsBookedOrDispatched: 1,
        digitalOffersSubmittedOrReviewed: 0,
        workflowsSignedOffCount: 0,
        whatsappPitchesGenerated: 1,
        apiWebhookEventsCount: 1,
        usageMetrics: {
          listingsSyncedCount: 0,
          portalCreditBurnAed: 0,
          estimatedCompetitorSpendSavedAed: 12000,
          viewingsBookedOrDispatched: 1,
          digitalOffersSubmittedOrReviewed: 0,
          workflowsSignedOffCount: 0,
          whatsappPitchesGenerated: 1,
          apiWebhookEventsCount: 1,
        },
        updatedAt: now,
      },
    }

    state.users.push(newUser)
    const token = `swk_local_tok_${newId}_${Date.now()}`
    state.sessions[token] = { userId: newId, role }
    saveState(state)
    return {
      ok: true,
      sessionToken: token,
      user: newUser,
      capabilities: ROLE_CAPABILITIES[role],
    }
  }

  if (method === 'POST' && cleanUrl === '/api/auth/logout') {
    if (sessionToken) delete state.sessions[sessionToken]
    saveState(state)
    return { ok: true }
  }

  if ((method === 'POST' || method === 'PUT') && cleanUrl === '/api/auth/custom-usage') {
    if (activeUser.customUsage) {
      const cu = activeUser.customUsage
      cu.personaBadge = body.commissionSplitRatio || body.personaBadge || cu.personaBadge
      cu.commissionSplitRatio = cu.personaBadge
      cu.customPlanName = body.customPlanTier || body.customPlanName || cu.customPlanName
      cu.customPlanTier = cu.customPlanName
      cu.defaultChequeMode = (Number(body.defaultChequeMode) || cu.defaultChequeMode) as ChequeOption
      cu.preferredEmirate = body.preferredEmirate || cu.preferredEmirate
      if (typeof body.chillerFreePreferred === 'boolean') cu.chillerFreePreferred = body.chillerFreePreferred
      cu.maxCommuteDifcMins = Number(body.maxCommuteDifcMins) || cu.maxCommuteDifcMins
      cu.fifoQueueCapUnits = Number(body.btrFifoQueueCap ?? body.fifoQueueCapUnits) || cu.fifoQueueCapUnits
      cu.btrFifoQueueCap = cu.fifoQueueCapUnits
      cu.customWebhookUrl = body.customWebhookUrl || cu.customWebhookUrl
      cu.whatsappPitchSignature = body.whatsappPitchSignature || cu.whatsappPitchSignature
      cu.apiWebhookEventsCount += 1
      cu.usageMetrics.apiWebhookEventsCount = cu.apiWebhookEventsCount
      cu.updatedAt = new Date().toISOString()
    }
    saveState(state)
    return { ok: true, user: activeUser, customUsage: activeUser.customUsage }
  }

  if (method === 'POST' && cleanUrl === '/api/auth/custom-usage/track') {
    if (activeUser.customUsage) {
      const m = body.metric || 'whatsappPitchesGenerated'
      const delta = Number(body.delta) || 1
      const cu: any = activeUser.customUsage
      if (typeof cu[m] === 'number') {
        cu[m] += delta
        if (cu.usageMetrics && typeof cu.usageMetrics[m] === 'number') {
          cu.usageMetrics[m] = cu[m]
        }
      }
      saveState(state)
    }
    return { ok: true, customUsage: activeUser.customUsage }
  }

  if (method === 'POST' && cleanUrl === '/api/workflows') {
    assertLocalRbac(effectiveRole, 'SUBMIT_OFFER')
    const unit = state.units.find(u => u.id === Number(body.unitId))
    if (!unit) throw new Error('Unit not found')
    const annualRent = Number(body.annualRentAed) || unit.annualRent1Cheque
    const cheques = (Number(body.chequeOption) as ChequeOption) || 1
    const cost = calculateTrueRentalCost(unit, cheques, unit.supplyTier)
    const wfCode = `WF-DXB-${Math.floor(1000 + Math.random() * 9000)}`
    const now = new Date().toISOString()
    const newWf: RentalDealWorkflow = {
      id: state.workflows.length + 1,
      workflowCode: wfCode,
      unitId: unit.id,
      unitCode: unit.unitCode,
      buildingName: unit.buildingName || 'SWK Verified Tower',
      unitNo: unit.unitNo,
      tenantName: body.tenantName || activeUser.fullName,
      tenantEmail: body.tenantEmail || activeUser.email,
      landlordName: unit.landlordName,
      advisorName: unit.advisorName,
      supplyTier: unit.supplyTier,
      annualRentAed: annualRent,
      chequeOption: cheques,
      currentStage: 1,
      status: 'IN_PROGRESS',
      ejariOrTawtheeqNo: 'PENDING-EJARI',
      gatePassCode: 'PENDING-NOC',
      snaggingScore: 99,
      swkCompanyShareAed: cost.commissionSplit.swkCompanyShareAed,
      swkAdvisorShareAed: cost.commissionSplit.swkAdvisorShareAed,
      a2aPartnerShareAed: cost.commissionSplit.a2aPartnerShareAed,
      stageHistory: [
        {
          stage: 1,
          code: 'KYC_AND_VIEWING',
          completedByRole: effectiveRole,
          completedByName: activeUser.fullName,
          completedAt: now,
          note: 'UAE PASS KYC & Property Viewing verified.',
        },
      ],
      updatedAt: now,
    }
    state.workflows.unshift(newWf)
    saveState(state)
    return { ok: true, workflow: newWf }
  }

  const wfAdvanceMatch = cleanUrl.match(/^\/api\/workflows\/(\d+)\/advance$/)
  if (method === 'POST' && wfAdvanceMatch) {
    const wfId = Number(wfAdvanceMatch[1])
    const wf = state.workflows.find(w => w.id === wfId)
    if (!wf) throw new Error('Rental workflow not found.')
    if (wf.currentStage >= 7) {
      throw new Error('Workflow has already completed all 7 stages.')
    }
    const nextStageNum = wf.currentStage + 1
    const stageCheck = canRoleAdvanceWorkflowStage(effectiveRole, nextStageNum)
    if (!stageCheck.allowed) {
      throw new Error(stageCheck.reason)
    }
    const stageDef = UAE_RENTAL_WORKFLOW_STAGES.find(s => s.stage === nextStageNum)!
    const now = new Date().toISOString()
    wf.currentStage = nextStageNum
    if (nextStageNum >= 5 && wf.ejariOrTawtheeqNo === 'PENDING-EJARI') {
      wf.ejariOrTawtheeqNo = `EJARI-2026-${Math.floor(100000 + Math.random() * 899999)}`
    }
    if (nextStageNum === 7) {
      wf.status = 'COMPLETED_ACTIVE_LEASE'
      wf.gatePassCode = `NOC-PASS-2026-${Math.floor(1000 + Math.random() * 8999)}`
    }
    wf.stageHistory.push({
      stage: nextStageNum,
      code: stageDef.code,
      completedByRole: effectiveRole,
      completedByName: activeUser.fullName,
      completedAt: now,
      note: body.note || `${stageDef.deliverableBadge} completed by ${activeUser.fullName}`,
    })
    wf.updatedAt = now
    saveState(state)
    return { ok: true, workflow: wf }
  }

  if (method === 'POST' && cleanUrl === '/api/viewings') {
    assertLocalRbac(effectiveRole, 'BOOK_VIEWING')
    const unit = state.units.find(u => u.id === Number(body.unitId))
    if (!unit) throw new Error('Unit not found.')
    const gpsStatus =
      unit.keyCustody === 'Smart Lock Instant'
        ? 'One-Time Smart Lock Passcode Issued (UAE PASS Biometric Matched)'
        : `SWK ONE Android Dispatched · Key Tag ${unit.keyVaultTag ?? 'SWK-VAULT'} Checked Out`
    const created = {
      id: state.viewings.length + 1,
      unit_id: unit.id,
      tenant_name: body.tenantName,
      tenant_phone: body.tenantPhone,
      tenant_emirates_id_status: 'UAE PASS Verified',
      viewing_mode: body.viewingMode || 'SWK Advisor GPS Escorted',
      slot_datetime: body.slotDatetime || 'Today · Within 60 Mins (Instant Key Dispatch)',
      advisor_name: unit.advisorName,
      gps_status: gpsStatus,
      key_vault_tag: unit.keyVaultTag || 'SWK-VAULT-KEY',
      created_at: new Date().toISOString(),
    }
    state.viewings.unshift(created)
    saveState(state)
    return { ok: true, viewing: created }
  }

  if (method === 'POST' && cleanUrl === '/api/offers') {
    assertLocalRbac(effectiveRole, 'SUBMIT_OFFER')
    const paymentCheck = validateUaeLegalPayment(body.paymentChannel || '', body.destinationAccount || '')
    if (!paymentCheck.ok) {
      throw new Error(paymentCheck.error || 'Invalid UAE payment channel')
    }
    const unit = state.units.find(u => u.id === Number(body.unitId))
    if (!unit) throw new Error('Unit not found.')
    if (unit.availabilityStatus === 'Ejari Active / Rented') {
      throw new Error('OS Availability Lock: This unit already has an active Ejari lease and cannot accept duplicate offers.')
    }
    const cheques = (Number(body.chequeOption) as ChequeOption) || 1
    const cost = calculateTrueRentalCost(unit, cheques, body.supplyTier ?? unit.supplyTier)
    const wfCode = `WF-DXB-${Math.floor(1000 + Math.random() * 9000)}`
    const created = {
      id: state.offers.length + 1,
      unit_id: unit.id,
      tenant_name: body.tenantName,
      tenant_email: body.tenantEmail || activeUser.email,
      tenant_phone: body.tenantPhone,
      kyc_status: 'UAE PASS Verified (Emirates ID Matched)',
      offered_annual_rent: body.offeredAnnualRent,
      cheque_option: cheques,
      supply_tier: unit.supplyTier,
      move_in_date: body.moveInDate || '2026-11-15',
      payment_channel: body.paymentChannel,
      holding_deposit_aed: 2000,
      true_monthly_all_in_aed: cost.trueMonthlyAllInOperatingCostAed,
      swk_company_share_aed: cost.commissionSplit.swkCompanyShareAed,
      swk_advisor_share_aed: cost.commissionSplit.swkAdvisorShareAed,
      a2a_partner_share_aed: cost.commissionSplit.a2aPartnerShareAed,
      status: '48h Unit Lock Active — Pending Landlord 1-Click Sign',
      created_at: new Date().toISOString(),
    }
    state.offers.unshift(created)
    unit.availabilityStatus = 'Offer Locked (48h)'
    saveState(state)
    return { ok: true, offer: created, costBreakdown: cost, workflowCode: wfCode }
  }

  const offerDecMatch = cleanUrl.match(/^\/api\/offers\/(\d+)\/decision$/)
  if (method === 'POST' && offerDecMatch) {
    assertLocalRbac(effectiveRole, 'DECIDE_OFFER')
    const offerId = Number(offerDecMatch[1])
    const offer = state.offers.find(o => o.id === offerId)
    if (!offer) throw new Error('Offer not found')
    const unit = state.units.find(u => u.id === offer.unit_id)
    offer.status = body.decision
    if (body.decision === 'Accepted — Ejari Issued') {
      if (unit) unit.availabilityStatus = 'Ejari Active / Rented'
    } else {
      if (unit) unit.availabilityStatus = 'Available'
    }
    saveState(state)
    return { ok: true }
  }

  const pdcMatch = cleanUrl.match(/^\/api\/pdc\/(\d+)\/action$/)
  if (method === 'POST' && pdcMatch) {
    assertLocalRbac(effectiveRole, 'MANAGE_PDC_CHEQUES')
    const chq = state.cheques.find(c => c.id === Number(pdcMatch[1]))
    if (chq) {
      chq.status =
        body.action === 'RNPL_Bounce_Shield'
          ? 'Converted to UAEDDS / RNPL Monthly (Bounce Prevented)'
          : body.action
      saveState(state)
    }
    return { ok: true }
  }

  if (method === 'POST' && cleanUrl === '/api/maintenance') {
    assertLocalRbac(effectiveRole, 'SUBMIT_MAINTENANCE')
    const classification = classifyMaintenanceResponsibility({
      category: body.category,
      estimatedCostAed: Number(body.estimatedCostAed),
    })
    const ticket = {
      id: state.maintenance.length + 1,
      lease_code: body.leaseCode || 'EJARI-2026-884120',
      unit_label: body.unitLabel,
      category: body.category,
      issue_summary: body.issueSummary,
      estimated_cost_aed: Number(body.estimatedCostAed),
      responsible_party: classification.responsibleParty,
      rule_explanation: classification.ruleExplanation,
      status:
        classification.responsibleParty === 'Landlord'
          ? 'Routed to Landlord in Owner360 (≥ AED 500 Major SLA)'
          : 'Auto-Dispatched — Tenant Minor Wear Tier (< AED 500)',
      created_at: new Date().toISOString(),
    }
    state.maintenance.unshift(ticket)
    saveState(state)
    return { ok: true, ticket, classification }
  }

  if (method === 'POST' && cleanUrl === '/api/a2a/register') {
    assertLocalRbac(effectiveRole, 'REGISTER_A2A_MANDATE')
    const mandate = {
      id: state.a2aMandates.length + 1,
      partner_agency_name: body.partnerAgencyName,
      partner_orn: body.partnerOrn,
      broker_name: body.brokerName,
      broker_brn: body.brokerBrn,
      unit_id: body.unitId,
      client_name: body.clientName,
      protection_expires_at: '2026-11-18',
      agreed_a2a_split_pct: 50,
      status: 'Protected Lead — 50% Partner / 25% SWK / 25% Advisor Locked',
      created_at: new Date().toISOString(),
    }
    state.a2aMandates.unshift(mandate)
    saveState(state)
    return { ok: true, mandate }
  }

  if (method === 'POST' && cleanUrl === '/api/landlord/onboard') {
    assertLocalRbac(effectiveRole, 'ONBOARD_LANDLORD_UNIT')
    const mandate = {
      id: state.landlordMandates.length + 1,
      landlord_name: body.landlordName,
      uae_pass_uuid: 'UAEPASS-VERIFIED-9921',
      title_deed_no: body.titleDeedNo,
      makani_no: body.makaniNo,
      building_name: body.buildingName,
      unit_no: body.unitNo,
      bedrooms: body.bedrooms,
      asking_rent_aed: body.askingRentAed,
      selected_plan: body.selectedPlan,
      status: 'Title Deed & UAE PASS Verified — Live on swk.rent & Owner360',
      created_at: new Date().toISOString(),
    }
    state.landlordMandates.unshift(mandate)
    saveState(state)
    return { ok: true, mandate }
  }

  if (method === 'POST' && cleanUrl === '/api/developer-pools') {
    assertLocalRbac(effectiveRole, 'CREATE_DEVELOPER_POOL')
    const projectCode = `DEV-${Date.now().toString(36).toUpperCase()}`
    const yieldStats = calculateDeveloperBtrYieldProtection({
      totalUnits: Number(body.totalHandoverUnits),
      protectedFloorRentAed: Number(body.protectedFloorRent1BrAed),
    })
    state.developerPools.push({
      id: state.developerPools.length + 1,
      projectCode,
      projectName: body.projectName,
      developerName: body.developerName,
      community: body.community,
      handoverDate: body.handoverDate || '2026-12-30',
      totalHandoverUnits: Number(body.totalHandoverUnits),
      leasedCount: 0,
      activePublicQueueCap: body.activePublicQueueCap || 3,
      protectedFloorRent1BrAed: Number(body.protectedFloorRent1BrAed),
      protectedFloorRent2BrAed: Number(body.protectedFloorRent2BrAed) || Math.round(Number(body.protectedFloorRent1BrAed) * 1.42),
      yieldProtectionBoostPct: 15.0,
      dlpSnaggingIncluded: true,
      commissionToPartnerAgentsPct: 5.0,
      status: 'FIFO Anti-Cannibalization Active (Protected Yield Floor)',
      yieldProtection: yieldStats,
    })
    saveState(state)
    return { ok: true, pools: state.developerPools }
  }

  const devResMatch = cleanUrl.match(/^\/api\/developer-pools\/(\d+)\/reserve$/)
  if (method === 'POST' && devResMatch) {
    assertLocalRbac(effectiveRole, 'RESERVE_DEVELOPER_FIFO')
    const pool = state.developerPools.find(p => p.id === Number(devResMatch[1]))
    if (!pool) throw new Error('Developer pool not found')
    pool.leasedCount = Math.min(pool.totalHandoverUnits, pool.leasedCount + 1)
    pool.status = `FIFO Unit #${pool.leasedCount} Locked — Next Queue Unit Auto-Released at AED ${pool.protectedFloorRent1BrAed.toLocaleString('en-US')}`
    saveState(state)
    return { ok: true, leasedCount: pool.leasedCount }
  }

  if (method === 'POST' && cleanUrl === '/api/reverse-briefs') {
    assertLocalRbac(effectiveRole, 'POST_REVERSE_BRIEF')
    const briefCode = `TENANT-BRIEF-${900 + state.reverseBriefs.length + 1}`
    state.reverseBriefs.unshift({
      id: state.reverseBriefs.length + 1,
      briefCode,
      tenantAlias: body.tenantAlias,
      corporateEmployer: body.corporateEmployer,
      uaePassVerified: true,
      preferredCommunities: body.preferredCommunities,
      bedroomsMin: Number(body.bedroomsMin) || 1,
      maxAnnualBudgetAed: Number(body.maxAnnualBudgetAed),
      chequesReady: (Number(body.chequesReady) || 1) as ChequeOption,
      targetMoveInDate: body.targetMoveInDate || '2026-11-25',
      representingAgentName: body.representingAgentName || 'SWK Leasing Desk',
      representingAgencyOrn: 'ORN-51517',
      bidsCount: 0,
      status: 'UAE PASS & Cheques Verified — Open for Landlord Bids',
    })
    saveState(state)
    return { ok: true, briefs: state.reverseBriefs }
  }

  const briefBidMatch = cleanUrl.match(/^\/api\/reverse-briefs\/(\d+)\/bid$/)
  if (method === 'POST' && briefBidMatch) {
    assertLocalRbac(effectiveRole, 'BID_REVERSE_BRIEF')
    const brief = state.reverseBriefs.find(b => b.id === Number(briefBidMatch[1]))
    if (!brief) throw new Error('Brief not found')
    brief.bidsCount += 1
    brief.bestBidRentAed =
      brief.bestBidRentAed && brief.bestBidRentAed < body.bidRentAed ? brief.bestBidRentAed : body.bidRentAed
    brief.bestBidUnitLabel = body.unitLabel
    brief.status = `Matched! Best Bid AED ${brief.bestBidRentAed!.toLocaleString('en-US')} (${body.unitLabel})`
    saveState(state)
    return { ok: true, bidsCount: brief.bidsCount, bestBidRentAed: brief.bestBidRentAed }
  }

  if (method === 'POST' && cleanUrl === '/api/crm-sync/import') {
    assertLocalRbac(effectiveRole, 'IMPORT_CRM_XML')
    const unitsCount = Number(body.unitsCount) || 35
    const savings = calculatePortalSavingsVsCompetitors({
      activeListingsCount: unitsCount,
      agentsCount: Math.max(5, Math.round(unitsCount / 3)),
    })
    const feed = {
      id: state.crmFeeds.length + 1,
      agency_name: body.agencyName,
      crm_provider: body.crmProvider,
      feed_url: body.feedUrl,
      imported_units_count: unitsCount,
      annual_credit_burn_saved_aed: savings.annualPortalSavingsAed,
      synced_at: new Date().toISOString(),
    }
    state.crmFeeds.unshift(feed)
    saveState(state)
    return { ok: true, feed, savings }
  }

  if (method === 'POST' && cleanUrl === '/api/gate-pass/generate') {
    assertLocalRbac(effectiveRole, 'GENERATE_GATE_PASS')
    const passCode = `NOC-PASS-${Math.floor(1000 + Math.random() * 9000)}`
    const qrToken = `QR-OA-VERIFIED-${body.unitNo}-${Date.now().toString(36).toUpperCase()}`
    const pass = {
      id: state.gatePasses.length + 1,
      pass_code: passCode,
      building_name: body.buildingName,
      unit_no: body.unitNo,
      tenant_name: body.tenantName,
      ejari_verified: 1,
      dewa_verified: 1,
      chiller_verified: 1,
      mover_company: body.moverCompany,
      move_date: body.moveDate || '2026-11-18',
      qr_token: qrToken,
      status: 'Cleared by Building OA Security — Gate Barrier Auto-Approved',
    }
    state.gatePasses.unshift(pass)
    saveState(state)
    return { ok: true, pass }
  }

  if (method === 'GET' && cleanUrl === '/api/field-duty') {
    return {
      ok: true,
      sessions: state.fieldDutySessions,
    }
  }

  if (method === 'POST' && cleanUrl === '/api/field-duty/start') {
    if (effectiveRole !== 'AGENT' && effectiveRole !== 'ADMIN') {
      throw new Error(
        `RBAC Access Denied: Live GPS Key-Vault Viewing Escort requires role "AGENT" or "ADMIN" (current: "${effectiveRole}").`,
      )
    }
    const unit = state.units.find(u => u.id === (Number(body.unitId) || 1)) || state.units[0]!
    const sessionCode = `DUTY-AND-${Math.floor(500 + Math.random() * 499)}`
    const now = new Date().toISOString()
    const newSession: FieldDutySession = {
      id: state.fieldDutySessions.length + 1,
      sessionCode,
      agentName: activeUser.fullName,
      agentEmail: activeUser.email,
      agentRole: effectiveRole,
      unitId: unit.id,
      unitCode: unit.unitCode,
      assignedLocation: body.assignedLocation || `${unit.buildingName} · Unit #${unit.unitNo}`,
      keyVaultTag: unit.keyVaultTag || `SWK-KEY-${unit.unitCode}`,
      deviceId: body.deviceId || 'SWK-AND-DEVICE-LOCAL',
      batteryPct: Number(body.batteryPct) || 96,
      networkType: body.networkType || '5G / Wi-Fi',
      lastLat: Number(body.lat) || 25.0889,
      lastLng: Number(body.lng) || 55.1462,
      accuracyM: Number(body.accuracyM) || 3.5,
      pointsCount: 1,
      status: 'ACTIVE_GPS_ESCORT',
      startedAt: now,
      updatedAt: now,
    }
    state.fieldDutySessions.unshift(newSession)
    saveState(state)
    return {
      ok: true,
      session: newSession,
    }
  }

  const dutyBatchMatch = cleanUrl.match(/^\/api\/(?:swk-one\/)?field-duty\/(\d+)\/location-batch$/)
  if (method === 'POST' && dutyBatchMatch) {
    const sess = state.fieldDutySessions.find(s => s.id === Number(dutyBatchMatch[1]))
    if (sess) {
      const pts = Array.isArray(body.points) ? body.points : []
      const lastPt = pts[pts.length - 1] || {}
      sess.lastLat = Number(lastPt.lat) || sess.lastLat
      sess.lastLng = Number(lastPt.lng) || sess.lastLng
      sess.accuracyM = Number(lastPt.accuracy_m) || sess.accuracyM
      if (body.battery_pct) sess.batteryPct = Number(body.battery_pct)
      if (body.network_type) sess.networkType = body.network_type
      sess.pointsCount += Math.max(1, pts.length)
      sess.updatedAt = new Date().toISOString()
      saveState(state)
    }
    return { ok: true, session: sess }
  }

  const dutyEndMatch = cleanUrl.match(/^\/api\/(?:swk-one\/)?field-duty\/(\d+)\/end$/)
  if (method === 'POST' && dutyEndMatch) {
    const sess = state.fieldDutySessions.find(s => s.id === Number(dutyEndMatch[1]))
    if (sess) {
      sess.status = 'COMPLETED_VERIFIED'
      sess.updatedAt = new Date().toISOString()
      saveState(state)
    }
    return { ok: true, session: sess }
  }

  if (method === 'POST' && cleanUrl === '/api/os-api/config') {
    state.osBridge.osApiUrl = (body.osApiUrl || state.osBridge.osApiUrl).trim()
    state.osBridge.updatedAt = new Date().toISOString()
    saveState(state)
    return { ok: true, status: state.osBridge }
  }

  if (method === 'POST' && cleanUrl === '/api/os-api/sync-inventory') {
    const now = new Date().toISOString()
    state.osBridge.recentSyncLogs.unshift({
      id: state.osBridge.recentSyncLogs.length + 1,
      direction: 'INVENTORY_PULL',
      event_type: 'OS_INVENTORY_SYNC',
      endpoint: `${state.osBridge.osApiUrl}/api/public/properties`,
      status: '200 OK (Verified Local OS Bridge)',
      payload_summary: 'Synchronized 6 Verified Units via REST API Contract',
      created_at: now,
    })
    saveState(state)
    return {
      ok: true,
      syncedUnitsCount: state.units.length,
      endpoint: `${state.osBridge.osApiUrl}/api/public/properties`,
    }
  }

  return { ok: true }
}
