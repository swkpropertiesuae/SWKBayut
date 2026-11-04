/**
 * SWKBayut Shared UAE Rental Intelligence, Loophole-Protection &
 * Agent / Developer / Property Management Super-Engine
 * Synchronized with SWK Properties OS (RERA ORN 51517)
 */

export type SupplyTier = 'SWK_EXCLUSIVE' | 'A2A_PARTNER' | 'DIRECT_LANDLORD'
export type ChequeOption = 1 | 2 | 4 | 12 | 30 // 30 = 30-Day Bridge-to-Ejari New Expat Pass
export type ChillerProvider = 'Chiller Free' | 'Empower' | 'Tabreed' | 'Logic Utilities' | 'DEWA Included'
export type EmirateName = 'Dubai' | 'Abu Dhabi' | 'Sharjah'

export interface BuildingProfile {
  id: number
  code: string
  name: string
  emirate: EmirateName
  community: string
  subCommunity: string
  developer: string
  completionYear: number
  totalFloors: number
  chillerProvider: ChillerProvider
  avgMonthlyChillerAed: number
  avgMonthlyDewaAed: number
  serviceChargeSqft: number
  metroStation: string
  metroWalkMinsWinter: number
  metroWalkMinsSummerShade: number
  commuteDifcMins: number
  commuteMediaCityMins: number
  commuteBusinessBayMins: number
  commuteAdgmMins: number
  elevatorWaitScore: number // 1-10
  soundproofingScore: number // 1-10
  maintenanceSlaHours: number
  tenantRating: number
  reviewsCount: number
  verifiedNoPartition: boolean
  amenities: string[]
  heroImage: string
}

export interface RentalUnit {
  id: number
  unitCode: string
  buildingId: number
  buildingName?: string
  community?: string
  emirate?: EmirateName
  unitNo: string
  floor: number
  bedrooms: number // 0 = Studio
  bathrooms: number
  areaSqft: number
  furnishing: 'Unfurnished' | 'Fully Furnished' | 'Kitchen Appliances Only'
  viewType: string
  supplyTier: SupplyTier
  annualRent1Cheque: number
  annualRent2Cheques: number
  annualRent4Cheques: number
  annualRent12Monthly: number
  bridgeMonthlyAed: number // For newly arrived expats without Emirates ID yet
  reraIndexRent: number
  trakheesiPermitNo: string
  madmounQrCode: string
  titleDeedNo: string
  makaniNo: string
  keyCustody: 'In SWK Vault' | 'Smart Lock Instant' | 'A2A Partner Held' | 'Tenant Occupied (Notice Given)'
  keyVaultTag?: string
  availabilityStatus: 'Available' | 'Offer Locked (48h)' | 'Ejari Active / Rented'
  chillerProvider: ChillerProvider
  avgMonthlyChillerAed: number
  avgMonthlyDewaAed: number
  advisorName: string
  advisorBrn: string
  a2aAgencyName?: string
  a2aAgencyOrn?: string
  landlordName: string
  landlordUaePassVerified: boolean
  lastBiAnnualInspectionDate: string
  images: string[]
  highlights: string[]
  swkOsPropertyId?: number
}

export interface TrueCostBreakdown {
  chequeOption: ChequeOption
  supplyTier: SupplyTier
  annualHeadlineRent: number
  monthlyBaseRent: number
  monthlyChillerAed: number
  monthlyDewaAed: number
  monthlyMunicipalityFeeAed: number
  agencyOrPlatformFeeAed: number
  agencyFeeVatAed: number
  agencyFeeSavingVsTraditionalAed: number
  securityDepositAed: number
  ejariRegistrationFeeAed: number
  dewaRefundableDepositAed: number
  chillerRefundableDepositAed: number
  upfrontFirstRentPaymentAed: number
  totalCashNeededToMoveInAed: number
  trueMonthlyAllInOperatingCostAed: number
  commissionSplit: {
    grossFeeExclVat: number
    a2aPartnerShareAed: number
    swkCompanyShareAed: number
    swkAdvisorShareAed: number
  }
}

export function calculateTrueRentalCost(
  unit: Pick<
    RentalUnit,
    | 'annualRent1Cheque'
    | 'annualRent2Cheques'
    | 'annualRent4Cheques'
    | 'annualRent12Monthly'
    | 'bridgeMonthlyAed'
    | 'chillerProvider'
    | 'avgMonthlyChillerAed'
    | 'avgMonthlyDewaAed'
    | 'furnishing'
    | 'supplyTier'
  >,
  chequeOption: ChequeOption = 1,
  overrideSupplyTier?: SupplyTier,
): TrueCostBreakdown {
  const tier = overrideSupplyTier ?? unit.supplyTier

  const annualHeadlineRent =
    chequeOption === 1
      ? unit.annualRent1Cheque
      : chequeOption === 2
        ? unit.annualRent2Cheques
        : chequeOption === 4
          ? unit.annualRent4Cheques
          : chequeOption === 12
            ? unit.annualRent12Monthly
            : unit.bridgeMonthlyAed * 12

  const monthlyBaseRent =
    chequeOption === 30 ? unit.bridgeMonthlyAed : Math.round(annualHeadlineRent / 12)

  const monthlyChillerAed =
    unit.chillerProvider === 'Chiller Free' || unit.chillerProvider === 'DEWA Included'
      ? 0
      : unit.avgMonthlyChillerAed

  const monthlyDewaAed =
    unit.chillerProvider === 'DEWA Included' ? 0 : unit.avgMonthlyDewaAed

  const monthlyMunicipalityFeeAed = Math.round((annualHeadlineRent * 0.05) / 12)
  const traditionalBrokerFee = Math.max(5000, Math.round(annualHeadlineRent * 0.05))
  const agencyOrPlatformFeeAed =
    tier === 'DIRECT_LANDLORD' ? 2999 : traditionalBrokerFee

  const agencyFeeVatAed = Math.round(agencyOrPlatformFeeAed * 0.05)
  const agencyFeeSavingVsTraditionalAed = Math.max(0, traditionalBrokerFee - agencyOrPlatformFeeAed)

  const securityDepositAed =
    chequeOption === 30
      ? 3000
      : Math.round(annualHeadlineRent * (unit.furnishing === 'Fully Furnished' ? 0.1 : 0.05))

  const ejariRegistrationFeeAed = 220
  const dewaRefundableDepositAed = unit.chillerProvider === 'DEWA Included' ? 0 : 2130
  const chillerRefundableDepositAed =
    unit.chillerProvider === 'Empower' || unit.chillerProvider === 'Tabreed' || unit.chillerProvider === 'Logic Utilities'
      ? 2000
      : 0

  const upfrontFirstRentPaymentAed =
    chequeOption === 1
      ? annualHeadlineRent
      : chequeOption === 2
        ? Math.round(annualHeadlineRent / 2)
        : chequeOption === 4
          ? Math.round(annualHeadlineRent / 4)
          : monthlyBaseRent

  const totalCashNeededToMoveInAed =
    upfrontFirstRentPaymentAed +
    securityDepositAed +
    agencyOrPlatformFeeAed +
    agencyFeeVatAed +
    ejariRegistrationFeeAed +
    dewaRefundableDepositAed +
    chillerRefundableDepositAed

  const trueMonthlyAllInOperatingCostAed = Math.round(
    monthlyBaseRent +
      monthlyChillerAed +
      monthlyDewaAed +
      monthlyMunicipalityFeeAed +
      (agencyOrPlatformFeeAed + agencyFeeVatAed + ejariRegistrationFeeAed) / 12,
  )

  let a2aPartnerShareAed = 0
  let swkCompanyShareAed = 0
  let swkAdvisorShareAed = 0

  if (tier === 'DIRECT_LANDLORD') {
    swkCompanyShareAed = agencyOrPlatformFeeAed
  } else if (tier === 'A2A_PARTNER') {
    a2aPartnerShareAed = Math.round(agencyOrPlatformFeeAed * 0.5)
    const netPool = agencyOrPlatformFeeAed - a2aPartnerShareAed
    swkCompanyShareAed = Math.round(netPool * 0.5)
    swkAdvisorShareAed = netPool - swkCompanyShareAed
  } else {
    swkCompanyShareAed = Math.round(agencyOrPlatformFeeAed * 0.5)
    swkAdvisorShareAed = agencyOrPlatformFeeAed - swkCompanyShareAed
  }

  return {
    chequeOption,
    supplyTier: tier,
    annualHeadlineRent,
    monthlyBaseRent,
    monthlyChillerAed,
    monthlyDewaAed,
    monthlyMunicipalityFeeAed,
    agencyOrPlatformFeeAed,
    agencyFeeVatAed,
    agencyFeeSavingVsTraditionalAed,
    securityDepositAed,
    ejariRegistrationFeeAed,
    dewaRefundableDepositAed,
    chillerRefundableDepositAed,
    upfrontFirstRentPaymentAed,
    totalCashNeededToMoveInAed,
    trueMonthlyAllInOperatingCostAed,
    commissionSplit: {
      grossFeeExclVat: agencyOrPlatformFeeAed,
      a2aPartnerShareAed,
      swkCompanyShareAed,
      swkAdvisorShareAed,
    },
  }
}

// ------------------------------------------------------------------
// RERA Decree 43 of 2013 & Law 33 of 2008 (90-Day Notice) Shield
// ------------------------------------------------------------------
export const RERA_DECREE_43_BANDS = [
  { maxBelowPct: 10, allowedIncreasePct: 0, label: '0–10% below RERA Index (0% increase allowed)' },
  { maxBelowPct: 20, allowedIncreasePct: 5, label: '11–20% below RERA Index (Max 5% increase)' },
  { maxBelowPct: 30, allowedIncreasePct: 10, label: '21–30% below RERA Index (Max 10% increase)' },
  { maxBelowPct: 40, allowedIncreasePct: 15, label: '31–40% below RERA Index (Max 15% increase)' },
  { maxBelowPct: Infinity, allowedIncreasePct: 20, label: 'More than 40% below RERA Index (Max 20% increase)' },
] as const

export interface ReraRenewalEvaluation {
  currentRent: number
  reraIndexRent: number
  proposedRent: number
  pctBelowIndex: number
  bandLabel: string
  maxAllowedIncreasePct: number
  maxLegalRenewalRent: number
  noticeDeadlineDate: string
  daysUntilExpiry: number
  noticeGivenOnTime: boolean
  isLegalProposal: boolean
  tenantAnnualSavingsVsProposalAed: number
  violations: string[]
}

export function evaluateReraRenewal(params: {
  currentRent: number
  reraIndexRent: number
  proposedRent: number
  leaseEndDate: string
  noticeServedDate?: string | null
  todayDate?: string
}): ReraRenewalEvaluation {
  const { currentRent, reraIndexRent, proposedRent, leaseEndDate, noticeServedDate } = params
  const today = params.todayDate ?? '2026-11-04'

  const pctBelowIndex =
    reraIndexRent > 0 ? Math.max(0, Math.round(((reraIndexRent - currentRent) / reraIndexRent) * 1000) / 10) : 0

  const band =
    pctBelowIndex <= 0
      ? RERA_DECREE_43_BANDS[0]
      : RERA_DECREE_43_BANDS.find(b => pctBelowIndex <= b.maxBelowPct) ?? RERA_DECREE_43_BANDS[4]

  const endMs = new Date(`${leaseEndDate}T00:00:00Z`).getTime()
  const todayMs = new Date(`${today}T00:00:00Z`).getTime()
  const deadlineMs = endMs - 90 * 86400000
  const noticeDeadlineDate = new Date(deadlineMs).toISOString().slice(0, 10)
  const daysUntilExpiry = Math.round((endMs - todayMs) / 86400000)

  const noticeGivenOnTime = noticeServedDate
    ? noticeServedDate <= noticeDeadlineDate
    : today <= noticeDeadlineDate

  const effectiveAllowedPct = noticeGivenOnTime ? band.allowedIncreasePct : 0
  const maxLegalRenewalRent = Math.round(currentRent * (1 + effectiveAllowedPct / 100))

  const violations: string[] = []
  if (proposedRent > currentRent && !noticeGivenOnTime) {
    violations.push(
      `Violation of Dubai Law No. 33 of 2008 (Art. 14): Written notice was not served before the 90-day cutoff (${noticeDeadlineDate}). Legal increase is locked at 0% (AED ${currentRent.toLocaleString('en-US')}).`,
    )
  }
  if (proposedRent > maxLegalRenewalRent) {
    const proposedPct = Math.round(((proposedRent - currentRent) / currentRent) * 1000) / 10
    violations.push(
      `Violation of Dubai Decree No. 43 of 2013: Proposed increase of +${proposedPct}% (AED ${proposedRent.toLocaleString('en-US')}) exceeds the RERA statutory cap of +${effectiveAllowedPct}% (Max AED ${maxLegalRenewalRent.toLocaleString('en-US')}).`,
    )
  }

  return {
    currentRent,
    reraIndexRent,
    proposedRent,
    pctBelowIndex,
    bandLabel: band.label,
    maxAllowedIncreasePct: effectiveAllowedPct,
    maxLegalRenewalRent,
    noticeDeadlineDate,
    daysUntilExpiry,
    noticeGivenOnTime,
    isLegalProposal: violations.length === 0,
    tenantAnnualSavingsVsProposalAed: Math.max(0, proposedRent - maxLegalRenewalRent),
    violations,
  }
}

// ------------------------------------------------------------------
// UAE Strictly Legal Payment Guard (Zero Personal Account Tolerance)
// ------------------------------------------------------------------
export const PERMITTED_UAE_RENTAL_PAYMENT_CHANNELS = [
  'SWK Company Escrow / Corporate Account (AED)',
  'Title-Deed Verified Landlord IBAN (Direct Transfer)',
  'UAEDDS Central Bank Monthly Direct Debit',
  'Post-Dated Cheques (PDC in SWK Vault) + Manager Cheque',
  'RNPL Partner (1 Cheque to Landlord / 12 Monthly for Tenant)',
  'VARA-Licensed USDT / Crypto Escrow Gateway',
] as const

export function validateUaeLegalPayment(paymentMethod: string, destinationAccount: string) {
  const combined = `${paymentMethod} ${destinationAccount}`
  if (/personal\s*(bank|account|iban)|advisor\s*personal|agent\s*personal|cash\s*to\s*agent/i.test(combined)) {
    return {
      ok: false,
      error:
        'UAE Compliance Block (ORN 51517): Client funds may NEVER be transferred to a Sales Advisor personal bank account or unreceipted cash. Use SWK Corporate Escrow, Title-Deed Verified Landlord IBAN, PDC Vault, or UAEDDS.',
    }
  }
  return { ok: true, error: null }
}

// ------------------------------------------------------------------
// UAE Maintenance AED 500 Threshold Rule Classifier
// ------------------------------------------------------------------
export function classifyMaintenanceResponsibility(params: {
  category: 'AC / Cooling' | 'Plumbing Leak' | 'Electrical' | 'Appliances' | 'Structural / Roof / Water Heater' | 'Cosmetic / Bulbs'
  estimatedCostAed: number
  thresholdAed?: number
}) {
  const threshold = params.thresholdAed ?? 500
  const isStructural = params.category === 'Structural / Roof / Water Heater'
  const responsibleParty: 'Landlord' | 'Tenant' =
    isStructural || params.estimatedCostAed >= threshold ? 'Landlord' : 'Tenant'

  return {
    responsibleParty,
    thresholdAed: threshold,
    autoApproved: responsibleParty === 'Tenant' || params.estimatedCostAed <= 750,
    ruleExplanation: isStructural
      ? 'Structural & major MEP assets are 100% Landlord responsibility under UAE Tenancy Law (Art. 16).'
      : params.estimatedCostAed >= threshold
        ? `Quote (AED ${params.estimatedCostAed}) is ≥ AED ${threshold} major maintenance threshold — routed to Landlord in Owner360.`
        : `Quote (AED ${params.estimatedCostAed}) is < AED ${threshold} minor wear threshold — Tenant responsibility.`,
  }
}

// ------------------------------------------------------------------
// NEW SUPER-ENGINE 1: Agency & Developer Portal Cost Savings Calculator
// (Zero-Credit-Burn Model vs. Bayut / Property Finder / Dubizzle)
// ------------------------------------------------------------------
export interface PortalSavingsAnalysis {
  activeListingsCount: number
  agentsCount: number
  traditionalPortalAnnualCostAed: number
  swkBayutUpfrontListingCostAed: number
  annualPortalSavingsAed: number
  monthlyCashflowSavedAed: number
  costPerVerifiedViewingAed: number
  wasteEliminatedPct: number
}

export function calculatePortalSavingsVsCompetitors(params: {
  activeListingsCount: number
  agentsCount: number
}): PortalSavingsAnalysis {
  const listings = Math.max(1, Number(params.activeListingsCount) || 25)
  const agents = Math.max(1, Number(params.agentsCount) || 10)

  // UAE agencies typically pay AED 1,800–2,800/yr per listing slot + TruCheck/Featured credit burn + seat fees across Bayut/PF
  const bayutAndPfAnnualEstimate = Math.round(listings * 2400 + agents * 4800)
  const swkBayutUpfrontListingCostAed = 0 // 100% Free to list verified Form A / Title Deed mandates

  return {
    activeListingsCount: listings,
    agentsCount: agents,
    traditionalPortalAnnualCostAed: bayutAndPfAnnualEstimate,
    swkBayutUpfrontListingCostAed,
    annualPortalSavingsAed: bayutAndPfAnnualEstimate,
    monthlyCashflowSavedAed: Math.round(bayutAndPfAnnualEstimate / 12),
    costPerVerifiedViewingAed: 0,
    wasteEliminatedPct: 100,
  }
}

// ------------------------------------------------------------------
// NEW SUPER-ENGINE 2: Developer & BTR Anti-Cannibalization FIFO Lease-Up
// Protects new handover buildings from investor price wars!
// ------------------------------------------------------------------
export interface DeveloperLeaseUpPool {
  id: number
  projectCode: string
  projectName: string
  developerName: string
  community: string
  handoverDate: string
  totalHandoverUnits: number
  leasedCount: number
  activePublicQueueCap: number // Max units shown simultaneously per layout to prevent price wars
  protectedFloorRent1BrAed: number
  protectedFloorRent2BrAed: number
  yieldProtectionBoostPct: number
  dlpSnaggingIncluded: boolean
  commissionToPartnerAgentsPct: number
  status: string
}

export function calculateDeveloperBtrYieldProtection(pool: {
  totalUnits: number
  protectedFloorRentAed: number
  unmanagedPriceWarDropPct?: number
}) {
  const dropPct = pool.unmanagedPriceWarDropPct ?? 14 // Typical 14% rent crash when 100 owners list simultaneously
  const unmanagedRentAed = Math.round(pool.protectedFloorRentAed * (1 - dropPct / 100))
  const annualRevenueProtectedAed = (pool.protectedFloorRentAed - unmanagedRentAed) * pool.totalUnits
  // At a 6.5% cap rate, protecting rent increases building capital valuation by:
  const assetValuationProtectedAed = Math.round(annualRevenueProtectedAed / 0.065)

  return {
    protectedFloorRentAed: pool.protectedFloorRentAed,
    unmanagedFloorWarRentAed: unmanagedRentAed,
    annualRevenueProtectedAed,
    assetValuationProtectedAed,
  }
}

// ------------------------------------------------------------------
// NEW SUPER-ENGINE 3: Reverse Rental Auction (Verified Tenant Briefs)
// Pre-qualified tenants with UAE PASS + Cheques Ready; Landlords/Agents Bid!
// ------------------------------------------------------------------
export interface VerifiedTenantBrief {
  id: number
  briefCode: string
  tenantAlias: string
  corporateEmployer: string
  uaePassVerified: boolean
  preferredCommunities: string
  bedroomsMin: number
  maxAnnualBudgetAed: number
  chequesReady: ChequeOption
  targetMoveInDate: string
  representingAgentName: string
  representingAgencyOrn: string
  bidsCount: number
  bestBidRentAed?: number
  bestBidUnitLabel?: string
  status: string
}

// ------------------------------------------------------------------
// NEW SUPER-ENGINE 4: Role-Based Access Control (RBAC) & 5 UAE Personas
// ------------------------------------------------------------------
export type UserRole = 'TENANT' | 'LANDLORD' | 'AGENT' | 'DEVELOPER' | 'ADMIN'

export interface AuthUser {
  id: number
  email: string
  fullName: string
  phone: string
  role: UserRole
  uaePassVerified: boolean
  emiratesIdOrPassport: string
  reraBrn?: string | null
  reraOrn?: string | null
  agencyOrCompanyName?: string | null
  titleDeedRef?: string | null
  createdAt: string
}

export type RbacAction =
  | 'BOOK_VIEWING'
  | 'SUBMIT_OFFER'
  | 'DECIDE_OFFER'
  | 'ONBOARD_LANDLORD_UNIT'
  | 'REGISTER_A2A_MANDATE'
  | 'IMPORT_CRM_XML'
  | 'CREATE_DEVELOPER_POOL'
  | 'RESERVE_DEVELOPER_FIFO'
  | 'POST_REVERSE_BRIEF'
  | 'BID_REVERSE_BRIEF'
  | 'GENERATE_GATE_PASS'
  | 'MANAGE_PDC_CHEQUES'
  | 'SUBMIT_MAINTENANCE'
  | 'ADMIN_PLATFORM_CONTROL'

export const ROLE_CAPABILITIES: Record<
  UserRole,
  {
    label: string
    badgeColor: string
    subtitle: string
    verifyRequirement: string
    allowedActions: RbacAction[]
  }
> = {
  TENANT: {
    label: 'Verified Tenant / Expat Renter',
    badgeColor: 'emerald',
    subtitle: 'UAE PASS KYC · True Cost Calculator · Instant Viewings · 48h Offer Lock · RERA Shield',
    verifyRequirement: 'UAE PASS / Emirates ID or New Expat Passport (30-Day Bridge Eligible)',
    allowedActions: [
      'BOOK_VIEWING',
      'SUBMIT_OFFER',
      'POST_REVERSE_BRIEF',
      'SUBMIT_MAINTENANCE',
    ],
  },
  LANDLORD: {
    label: 'Property Owner / Landlord (Owner360)',
    badgeColor: 'amber',
    subtitle: 'AED 0 Direct Listing · 1-Click Offer Sign · Reverse Brief Bidding · PDC & Maintenance Shield',
    verifyRequirement: 'DLD Title Deed No. + UAE PASS Owner Match',
    allowedActions: [
      'DECIDE_OFFER',
      'ONBOARD_LANDLORD_UNIT',
      'BID_REVERSE_BRIEF',
      'GENERATE_GATE_PASS',
      'MANAGE_PDC_CHEQUES',
      'SUBMIT_MAINTENANCE',
    ],
  },
  AGENT: {
    label: 'RERA Broker / SWK Advisor / A2A Partner',
    badgeColor: 'sky',
    subtitle: 'AED 0 Free CRM XML Sync · Protected 50/25/25 A2A Splits · GPS Key Vault · 1-Tap WhatsApp Pitch',
    verifyRequirement: 'RERA Broker BRN + Agency ORN (ORN 51517 or Partner ORN)',
    allowedActions: [
      'BOOK_VIEWING',
      'SUBMIT_OFFER',
      'DECIDE_OFFER',
      'REGISTER_A2A_MANDATE',
      'IMPORT_CRM_XML',
      'RESERVE_DEVELOPER_FIFO',
      'POST_REVERSE_BRIEF',
      'BID_REVERSE_BRIEF',
      'GENERATE_GATE_PASS',
      'MANAGE_PDC_CHEQUES',
      'SUBMIT_MAINTENANCE',
    ],
  },
  DEVELOPER: {
    label: 'Developer / Institutional BTR Manager',
    badgeColor: 'purple',
    subtitle: 'Bulk Tower Handover FIFO Queue · Anti-Cannibalization Floor Rent · Pre-Handover Snag-to-Lease',
    verifyRequirement: 'DLD Developer Project No. / Escrow Registration',
    allowedActions: [
      'CREATE_DEVELOPER_POOL',
      'RESERVE_DEVELOPER_FIFO',
      'IMPORT_CRM_XML',
      'DECIDE_OFFER',
      'GENERATE_GATE_PASS',
    ],
  },
  ADMIN: {
    label: 'SWK Super Admin & Compliance (ORN 51517)',
    badgeColor: 'rose',
    subtitle: 'Full 1,000-User MVP Launch Control · DLD Escrow Guard · KYC Approval · Workflow Override',
    verifyRequirement: 'SWK Properties L.L.C. Executive Credential (RERA ORN 51517)',
    allowedActions: [
      'BOOK_VIEWING',
      'SUBMIT_OFFER',
      'DECIDE_OFFER',
      'ONBOARD_LANDLORD_UNIT',
      'REGISTER_A2A_MANDATE',
      'IMPORT_CRM_XML',
      'CREATE_DEVELOPER_POOL',
      'RESERVE_DEVELOPER_FIFO',
      'POST_REVERSE_BRIEF',
      'BID_REVERSE_BRIEF',
      'GENERATE_GATE_PASS',
      'MANAGE_PDC_CHEQUES',
      'SUBMIT_MAINTENANCE',
      'ADMIN_PLATFORM_CONTROL',
    ],
  },
}

export function canRoleExecuteAction(role: UserRole, action: RbacAction): boolean {
  return ROLE_CAPABILITIES[role]?.allowedActions.includes(action) ?? false
}

// ------------------------------------------------------------------
// NEW SUPER-ENGINE 5: 7-Stage End-to-End UAE Rental Deal Workflow
// ------------------------------------------------------------------
export interface WorkflowStageDefinition {
  stage: number
  code:
    | 'KYC_AND_VIEWING'
    | 'OFFER_AND_DEPOSIT_LOCK'
    | 'LANDLORD_APPROVAL'
    | 'CONTRACT_AND_PAYMENTS'
    | 'EJARI_TAWTHEEQ_ISSUED'
    | 'DEWA_CHILLER_AND_SNAGGING'
    | 'MOVE_IN_NOC_AND_KEYS'
  title: string
  shortTitle: string
  description: string
  allowedRolesToAdvance: UserRole[]
  slaHours: number
  deliverableBadge: string
}

export const UAE_RENTAL_WORKFLOW_STAGES: WorkflowStageDefinition[] = [
  {
    stage: 1,
    code: 'KYC_AND_VIEWING',
    title: 'Stage 1 · UAE PASS KYC & Verified GPS / Smart-Lock Viewing',
    shortTitle: '1. KYC & Viewing',
    description: 'Tenant identity verified via UAE PASS / Passport and physical key vault or smart-lock viewing completed.',
    allowedRolesToAdvance: ['TENANT', 'AGENT', 'ADMIN'],
    slaHours: 2,
    deliverableBadge: 'UAE PASS + GPS Viewing Verified',
  },
  {
    stage: 2,
    code: 'OFFER_AND_DEPOSIT_LOCK',
    title: 'Stage 2 · Digital Offer & AED 2,000 Corporate Escrow Lock (48h)',
    shortTitle: '2. Offer & 48h Lock',
    description: 'Binding digital rental terms submitted with legal DLD payment verification; unit locked for 48 hours.',
    allowedRolesToAdvance: ['TENANT', 'AGENT', 'ADMIN'],
    slaHours: 4,
    deliverableBadge: 'Unit Locked 48h in SWK Escrow',
  },
  {
    stage: 3,
    code: 'LANDLORD_APPROVAL',
    title: 'Stage 3 · Landlord 1-Click Offer Acceptance (Owner360)',
    shortTitle: '3. Owner Approval',
    description: 'Title-Deed verified landlord reviews tenant profile & net yield in Owner360 and signs 1-click acceptance.',
    allowedRolesToAdvance: ['LANDLORD', 'AGENT', 'ADMIN'],
    slaHours: 24,
    deliverableBadge: 'Landlord UAE PASS Signed',
  },
  {
    stage: 4,
    code: 'CONTRACT_AND_PAYMENTS',
    title: 'Stage 4 · Unified Tenancy Contract & PDC Vault / UAEDDS Mandate',
    shortTitle: '4. Contract & Cheques',
    description: 'DLD Unified Tenancy Contract signed by both parties; Post-Dated Cheques vaulted or UAEDDS monthly debit active.',
    allowedRolesToAdvance: ['TENANT', 'LANDLORD', 'AGENT', 'ADMIN'],
    slaHours: 12,
    deliverableBadge: 'Contract + UAEDDS / PDC Cleared',
  },
  {
    stage: 5,
    code: 'EJARI_TAWTHEEQ_ISSUED',
    title: 'Stage 5 · Official DLD Ejari / Tawtheeq Certificate & Commission Split',
    shortTitle: '5. Ejari Issued',
    description: 'Official Ejari / Tawtheeq registered online; commission split (50/50 or 50/25/25 A2A) locked in SWK OS ledger.',
    allowedRolesToAdvance: ['AGENT', 'LANDLORD', 'ADMIN'],
    slaHours: 6,
    deliverableBadge: 'Official Ejari Certificate PDF',
  },
  {
    stage: 6,
    code: 'DEWA_CHILLER_AND_SNAGGING',
    title: 'Stage 6 · DEWA + Empower/Tabreed Auto-Activation & 50-Pt Snagging',
    shortTitle: '6. DEWA & Snagging',
    description: 'DEWA & district cooling auto-triggered from Ejari; 50-point timestamped move-in snagging photo vault locked.',
    allowedRolesToAdvance: ['TENANT', 'AGENT', 'ADMIN'],
    slaHours: 12,
    deliverableBadge: 'DEWA Active + 50-Pt Snagging Vault',
  },
  {
    stage: 7,
    code: 'MOVE_IN_NOC_AND_KEYS',
    title: 'Stage 7 · Building OA Digital Move-In Gate Pass & Key Handover',
    shortTitle: '7. Move-In & Keys',
    description: 'Building security QR Move-In NOC issued for moving truck; physical keys or master smart-lock code handed over.',
    allowedRolesToAdvance: ['AGENT', 'LANDLORD', 'ADMIN'],
    slaHours: 4,
    deliverableBadge: 'Move-In QR Gate Pass + Keys Handed Over',
  },
]

export interface RentalDealWorkflow {
  id: number
  workflowCode: string
  unitId: number
  unitCode: string
  buildingName: string
  unitNo: string
  tenantName: string
  tenantEmail: string
  landlordName: string
  advisorName: string
  supplyTier: SupplyTier
  annualRentAed: number
  chequeOption: ChequeOption
  currentStage: number // 1..7
  status: 'IN_PROGRESS' | 'COMPLETED_ACTIVE_LEASE'
  ejariOrTawtheeqNo: string
  gatePassCode: string
  snaggingScore: number
  swkCompanyShareAed: number
  swkAdvisorShareAed: number
  a2aPartnerShareAed: number
  stageHistory: {
    stage: number
    code: string
    completedByRole: UserRole
    completedByName: string
    completedAt: string
    note: string
  }[]
  updatedAt: string
}

export function canRoleAdvanceWorkflowStage(role: UserRole, targetStage: number): {
  allowed: boolean
  reason?: string
} {
  const def = UAE_RENTAL_WORKFLOW_STAGES.find(s => s.stage === targetStage)
  if (!def) return { allowed: false, reason: 'Invalid workflow stage.' }
  if (def.allowedRolesToAdvance.includes(role)) {
    return { allowed: true }
  }
  return {
    allowed: false,
    reason: `Role "${role}" cannot sign off "${def.shortTitle}". Required role: ${def.allowedRolesToAdvance.join(' or ')}.`,
  }
}
