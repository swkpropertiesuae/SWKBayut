/**
 * SWKBayut Shared UAE Rental Intelligence & Loophole-Protection Engine
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

/**
 * Calculates the exact True Monthly All-In Cost & Move-In Cash Required,
 * plus the Hybrid Commission Split (SWK Exclusive 50/50, A2A 50/25/25, or Direct Landlord Flat AED 2,999).
 */
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

  // Dubai Municipality Housing Fee = 5% of annual rent / 12 billed on DEWA
  const monthlyMunicipalityFeeAed = Math.round((annualHeadlineRent * 0.05) / 12)

  // Traditional 5% broker fee (min AED 5,000)
  const traditionalBrokerFee = Math.max(5000, Math.round(annualHeadlineRent * 0.05))

  // Hybrid Supply Model Fee:
  // - DIRECT_LANDLORD: Flat AED 2,999 Digital Execution Fee
  // - SWK_EXCLUSIVE / A2A_PARTNER: Standard 5% (min AED 5,000)
  const agencyOrPlatformFeeAed =
    tier === 'DIRECT_LANDLORD' ? 2999 : traditionalBrokerFee

  const agencyFeeVatAed = Math.round(agencyOrPlatformFeeAed * 0.05)
  const agencyFeeSavingVsTraditionalAed = Math.max(0, traditionalBrokerFee - agencyOrPlatformFeeAed)

  // Security deposit: 5% unfurnished, 10% furnished (or AED 3,000 for 30-day bridge)
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

  // Non-refundable annualized fees amortized over 12 months + base rent + utilities
  const trueMonthlyAllInOperatingCostAed = Math.round(
    monthlyBaseRent +
      monthlyChillerAed +
      monthlyDewaAed +
      monthlyMunicipalityFeeAed +
      (agencyOrPlatformFeeAed + agencyFeeVatAed + ejariRegistrationFeeAed) / 12,
  )

  // Commission split matching swkpropertiesOS leaseHooks
  let a2aPartnerShareAed = 0
  let swkCompanyShareAed = 0
  let swkAdvisorShareAed = 0

  if (tier === 'DIRECT_LANDLORD') {
    // 100% platform revenue to SWK Company (self-serve digital execution)
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
