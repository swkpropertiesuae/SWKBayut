import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Compass,
  Copy,
  FileSignature,
  Flame,
  Handshake,
  KeyRound,
  Landmark,
  Layers,
  MapPin,
  QrCode,
  Rocket,
  Scale,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Train,
  TrendingUp,
  Users,
  Wallet,
  Wrench,
  X,
  Zap,
} from 'lucide-react'
import {
  type BuildingProfile,
  type ChequeOption,
  type DeveloperLeaseUpPool,
  type RentalUnit,
  type SupplyTier,
  type VerifiedTenantBrief,
  type UserRole,
  type AuthUser,
  type RentalDealWorkflow,
  PERMITTED_UAE_RENTAL_PAYMENT_CHANNELS,
  ROLE_CAPABILITIES,
  UAE_RENTAL_WORKFLOW_STAGES,
  canRoleAdvanceWorkflowStage,
  calculatePortalSavingsVsCompetitors,
  calculateTrueRentalCost,
  evaluateReraRenewal,
} from '@shared/uae-rental-rules'

type ActiveTab = 'marketplace' | 'buildings' | 'superhub' | 'workflow' | 'shield' | 'partners' | 'auth'

const aed = (n: number) => `AED ${Math.round(n || 0).toLocaleString('en-US')}`

const DEDICATED_DEMO_PERSONA_META: Record<
  string,
  {
    badge: string
    personaTitle: string
    highlightColor: string
    keySuperpower: string
    competitorEdge: string
  }
> = {
  'admin@swk.rent': {
    badge: 'ADMIN · ORN 51517 MASTER',
    personaTitle: 'SWK Managing Director & Compliance Desk',
    highlightColor: 'border-[#B89040] bg-[#17191C] text-white',
    keySuperpower: 'Full 7-Stage Deal Override · Escrow Release · External OS REST API & Webhook Control',
    competitorEdge: 'Zero portal tax; manages 320+ verified mandates with automated DLD/RERA compliance gates.',
  },
  'advisor@swk.rent': {
    badge: 'AGENT · SWK EXCLUSIVE ADVISOR',
    personaTitle: 'Senior RERA Advisor (Key Vault & GPS Dispatch)',
    highlightColor: 'border-[#B89040]/60 bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: '60-Min Key Vault Dispatch · 50/50 Commission Split · Watermark-Free WhatsApp Pitch Deck',
    competitorEdge: 'Saves AED 84,000/yr vs legacy portal packages with AED 0 credit burn & BRN attribution lock.',
  },
  'partner@apexcrest.ae': {
    badge: 'AGENT · EXTERNAL A2A PARTNER BROKER',
    personaTitle: 'Partner Agency Director (A2A Co-Broking Desk)',
    highlightColor: 'border-[#17625F]/50 bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: 'Protected 50% Partner / 50% SWK Commission Certificate · AED 0 XML CRM Feed Sync',
    competitorEdge: 'Saves AED 112,000/yr vs Property Finder/Dubizzle; zero lead hijacking with 7-day A2A lock.',
  },
  'landlord@swk.rent': {
    badge: 'LANDLORD · DIRECT OWNER360 (TIER 1)',
    personaTitle: 'Direct Title-Deed Landlord (AED 0 Landlord Fee)',
    highlightColor: 'border-[#17625F] bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: 'AED 0 Landlord Listing Fee · Tenant Pays Flat AED 2,999 · 90-Day RERA Renewal Autopilot',
    competitorEdge: 'Eliminates 5% broker commission drag for price-sensitive tenants while protecting Title Deed privacy.',
  },
  'familyoffice@swk.rent': {
    badge: 'LANDLORD · INSTITUTIONAL FAMILY OFFICE (TIER 3)',
    personaTitle: 'Multi-Unit Royal & Family Office Portfolio Owner',
    highlightColor: 'border-[#9E7628] bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: '100% 1-Cheque Upfront Day-1 Rent Payout while Tenants Pay 12x Monthly UAEDDS',
    competitorEdge: 'Zero cheque bounce risk + automated Article 16 landlord/tenant maintenance cap enforcement.',
  },
  'developer@selectgroup.ae': {
    badge: 'DEVELOPER · BTR BULK HANDOVER DESK',
    personaTitle: 'Director of Institutional BTR Tower Lease-Up',
    highlightColor: 'border-[#B89040] bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: 'FIFO Anti-Cannibalization Queue (Max 3 Public Units/Layout) · RERA Floor Rent Guard',
    competitorEdge: 'Prevents 200+ handover units from undercutting each other on public portals; saves AED 240,000/yr.',
  },
  'tenant@uaepass.ae': {
    badge: 'TENANT · UAE PASS EXECUTIVE RENTER',
    personaTitle: 'Verified Corporate Executive Tenant (DIFC / Marina)',
    highlightColor: 'border-emerald-600/50 bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: '12x Monthly UAEDDS Autopay · True Monthly All-In Cost · 1-ClickAED 2,000 48h Unit Lock',
    competitorEdge: 'Exposes hidden chiller/DEWA/muni costs upfront and blocks illegal Decree 43/2013 rent hikes.',
  },
  'expat@swk.rent': {
    badge: 'TENANT · NEW EXPAT 30-DAY BRIDGE PASS',
    personaTitle: 'Newly Relocated International Executive (EID In-Process)',
    highlightColor: 'border-amber-600/50 bg-[#FBF8F1] text-[#17191C]',
    keySuperpower: '30-Day DTCM Bridge-to-Ejari Legal Entry with Passport + Visa Application Receipt',
    competitorEdge: 'Solves the #1 UAE expat catch-22 (move in legally on Day 1 while Emirates ID & bank cheque book clear).',
  },
}

const SUPPLY_BADGES: Record<
  SupplyTier,
  { label: string; sub: string; bg: string; text: string; border: string }
> = {
  SWK_EXCLUSIVE: {
    label: 'SWK Exclusive Mandate',
    sub: 'Key in SWK Vault · 50/50 Split',
    bg: 'bg-[#17191C]',
    text: 'text-[#D6B46C]',
    border: 'border-[#B89040]/40',
  },
  DIRECT_LANDLORD: {
    label: 'Direct-to-Landlord · Flat AED 2,999',
    sub: 'Save up to 70% on Commission',
    bg: 'bg-[#17625F]',
    text: 'text-white',
    border: 'border-[#17625F]',
  },
  A2A_PARTNER: {
    label: 'Verified A2A Partner Network',
    sub: 'Protected 50% Partner / 50% SWK Pool',
    bg: 'bg-[#F4EFE3]',
    text: 'text-[#7C5D1E]',
    border: 'border-[#D6B46C]',
  },
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('marketplace')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    currentUser: AuthUser | null
    demoUsers: AuthUser[]
    mvpTelemetry: any
    workflows: RentalDealWorkflow[]
    buildings: BuildingProfile[]
    units: RentalUnit[]
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
    osBridge: any
  } | null>(null)

  // Auth, RBAC & Session State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null)
  const [sessionToken, setSessionToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('swkrent_session_token')
    } catch {
      return null
    }
  })
  const [activeRole, setActiveRole] = useState<UserRole>('TENANT')
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [loginEmail, setLoginEmail] = useState('tenant@uaepass.ae')
  const [loginPassword, setLoginPassword] = useState('SwkRent2026!')
  const [showPassword, setShowPassword] = useState(false)
  const [demoRoleFilter, setDemoRoleFilter] = useState<'ALL' | UserRole>('ALL')

  // Signup Form State
  const [signupFullName, setSignupFullName] = useState('')
  const [signupEmail, setSignupEmail] = useState('')
  const [signupPhone, setSignupPhone] = useState('+971 50 ')
  const [signupPassword, setSignupPassword] = useState('SwkRent2026!')
  const [signupRole, setSignupRole] = useState<UserRole>('TENANT')
  const [signupEmiratesId, setSignupEmiratesId] = useState('784-1995-4810291-1')
  const [signupReraBrn, setSignupReraBrn] = useState('BRN-62109')
  const [signupReraOrn, setSignupReraOrn] = useState('ORN-51517')
  const [signupCompany, setSignupCompany] = useState('SWK Properties L.L.C.')
  const [signupTitleDeed, setSignupTitleDeed] = useState('TD-DXB-2026-44109')

  // Connected Custom Usage Studio State (Per-Account Custom Rules, API Key & Telemetry)
  const [cuPlanTier, setCuPlanTier] = useState('UAE PASS Verified Tenant — 12x Monthly UAEDDS & RERA Shield')
  const [cuDefaultCheque, setCuDefaultCheque] = useState<ChequeOption>(12)
  const [cuPreferredEmirate, setCuPreferredEmirate] = useState<'All' | 'Dubai' | 'Abu Dhabi'>('All')
  const [cuChillerFree, setCuChillerFree] = useState(false)
  const [cuMaxCommute, setCuMaxCommute] = useState(90)
  const [cuFlatFee, setCuFlatFee] = useState(2999)
  const [cuCommPct, setCuCommPct] = useState(5)
  const [cuSplitRatio, setCuSplitRatio] = useState('Flat AED 2,999 Direct Landlord / 5% Standard Agency')
  const [cuBtrQueueCap, setCuBtrQueueCap] = useState(3)
  const [cuWebhookUrl, setCuWebhookUrl] = useState('https://api.os.swk.rent/webhooks/tenant-events')
  const [cuWhatsappSig, setCuWhatsappSig] = useState('Verified via UAE PASS on swk.rent · ORN 51517')
  const [cuEjariAutopilot, setCuEjariAutopilot] = useState(true)
  const [cuRera90DayShield, setCuRera90DayShield] = useState(true)
  const [cuPdcBounceShield, setCuPdcBounceShield] = useState(true)

  // 7-Stage Deal Workflow New Deal, OS REST API Config & Icon Variant State
  const [wfUnitId, setWfUnitId] = useState(1)
  const [wfTenantName, setWfTenantName] = useState('Layla Al Qasimi')
  const [wfAnnualRent, setWfAnnualRent] = useState(125000)
  const [wfCheques, setWfCheques] = useState<ChequeOption>(2)
  const [appIconVariant, setAppIconVariant] = useState<'emblem' | 'wordmark'>('emblem')
  const [osApiUrlInput, setOsApiUrlInput] = useState('https://api.os.swk.rent')
  const [osApiKeyInput, setOsApiKeyInput] = useState('')
  const [osSyncBusy, setOsSyncBusy] = useState(false)

  // Marketplace Filters & Live Payment Mode
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedEmirate, setSelectedEmirate] = useState<'All' | 'Dubai' | 'Abu Dhabi'>('All')
  const [selectedSupplyTier, setSelectedSupplyTier] = useState<'All' | SupplyTier>('All')
  const [chillerFreeOnly, setChillerFreeOnly] = useState(false)
  const [maxDifcCommute, setMaxDifcCommute] = useState<number>(90)
  const [chequeMode, setChequeMode] = useState<ChequeOption>(12)
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | null>(null)

  // Modals: Offer, Viewing, & Full Unit Detail Drawer
  const [offerModalUnit, setOfferModalUnit] = useState<RentalUnit | null>(null)
  const [viewingModalUnit, setViewingModalUnit] = useState<RentalUnit | null>(null)
  const [detailUnit, setDetailUnit] = useState<RentalUnit | null>(null)
  const [toast, setToast] = useState<{ tone: 'ok' | 'err'; msg: string } | null>(null)

  // Offer Form State
  const [offerTenantName, setOfferTenantName] = useState('Tariq Al Ghaith')
  const [offerTenantPhone, setOfferTenantPhone] = useState('+971 50 882 1940')
  const [offerAmount, setOfferAmount] = useState<number>(125000)
  const [offerCheques, setOfferCheques] = useState<ChequeOption>(12)
  const [offerPaymentChannel, setOfferPaymentChannel] = useState<string>(
    PERMITTED_UAE_RENTAL_PAYMENT_CHANNELS[0],
  )
  const [offerDestinationNote, setOfferDestinationNote] = useState('')
  const [offerMoveInDate, setOfferMoveInDate] = useState('2026-11-15')

  // Viewing Form State
  const [viewingName, setViewingName] = useState('Nadia Al Mansoori')
  const [viewingPhone, setViewingPhone] = useState('+971 52 391 4401')
  const [viewingSlot, setViewingSlot] = useState('Today · Within 60 Mins (Instant Key Dispatch)')

  // Agency Portal Cost Savings Calculator State
  const [calcListingsCount, setCalcListingsCount] = useState(50)
  const [calcAgentsCount, setCalcAgentsCount] = useState(15)
  const [crmAgencyName, setCrmAgencyName] = useState('Gulf Horizon Properties LLC')
  const [crmProvider, setCrmProvider] = useState('PropSpace / Propertybase XML')
  const [crmFeedUrl, setCrmFeedUrl] = useState('https://feeds.propspace.com/gulf-horizon-rera.xml')
  const [crmUnitsCount, setCrmUnitsCount] = useState(42)

  // Developer BTR Onboarding State
  const [devProjectName, setDevProjectName] = useState('Sobha Hartland II — Riverside BTR Tower')
  const [devDeveloperName, setDevDeveloperName] = useState('Sobha Realty')
  const [devCommunity, setDevCommunity] = useState('MBR City / Sobha Hartland')
  const [devTotalUnits, setDevTotalUnits] = useState(160)
  const [devFloorRent1Br, setDevFloorRent1Br] = useState(115000)
  const [devFloorRent2Br, setDevFloorRent2Br] = useState(165000)

  // Reverse Tenant Auction Form State
  const [briefAlias, setBriefAlias] = useState('Director of AI · G42 / Mubadala')
  const [briefEmployer, setBriefEmployer] = useState('G42 / Abu Dhabi & Dubai')
  const [briefCommunities, setBriefCommunities] = useState('Downtown Dubai, DIFC, or Al Reem Island')
  const [briefBeds, setBriefBeds] = useState(2)
  const [briefBudget, setBriefBudget] = useState(180000)
  const [briefCheques, setBriefCheques] = useState<ChequeOption>(1)

  // Smart Move-In Gate Pass Form State
  const [gateBuilding, setGateBuilding] = useState('Marina Gate I (Select Group)')
  const [gateUnitNo, setGateUnitNo] = useState('3402')
  const [gateTenant, setGateTenant] = useState('Alexander Vance')
  const [gateMover, setGateMover] = useState('Allied Pickfords / TruKKer UAE')

  // RERA Shield Interactive Simulator
  const [simCurrentRent, setSimCurrentRent] = useState(115000)
  const [simIndexRent, setSimIndexRent] = useState(135000)
  const [simProposedRent, setSimProposedRent] = useState(132000)
  const [simEndDate, setSimEndDate] = useState('2027-01-14')
  const [simNoticeDate, setSimNoticeDate] = useState('2026-10-05')

  // Maintenance Form State
  const [maintUnit, setMaintUnit] = useState('Marina Gate I · 3402')
  const [maintCategory, setMaintCategory] = useState<
    'AC / Cooling' | 'Plumbing Leak' | 'Electrical' | 'Appliances' | 'Structural / Roof / Water Heater' | 'Cosmetic / Bulbs'
  >('AC / Cooling')
  const [maintIssue, setMaintIssue] = useState('')
  const [maintCost, setMaintCost] = useState(850)

  // A2A Partner & Landlord Onboarding State
  const [a2aAgency, setA2aAgency] = useState('Knight Frank / Betterhomes Partner Desk')
  const [a2aOrn, setA2aOrn] = useState('ORN-44210')
  const [a2aBroker, setA2aBroker] = useState('Zayd Al Qasimi')
  const [a2aBrn, setA2aBrn] = useState('BRN-55812')
  const [a2aUnitId, setA2aUnitId] = useState(1)
  const [a2aClient, setA2aClient] = useState('Marcus Vance (DIFC Executive)')

  const [llName, setLlName] = useState('Sheikh Majid Al Nuaimi')
  const [llDeed, setLlDeed] = useState('TD-DXB-2026-90411')
  const [llMakani, setLlMakani] = useState('25194 74812')
  const [llBuilding, setLlBuilding] = useState('Marina Gate I (Select Group)')
  const [llUnitNo, setLlUnitNo] = useState('3901')
  const [llBeds, setLlBeds] = useState(2)
  const [llRent, setLlRent] = useState(165000)
  const [llPlan, setLlPlan] = useState(
    'Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)',
  )

  const showNotice = (tone: 'ok' | 'err', msg: string) => {
    setToast({ tone, msg })
    setTimeout(() => setToast(null), 5500)
  }

  const applyUserCustomUsageToWorkspace = (user: AuthUser | null) => {
    if (!user) return
    setOfferTenantName(user.fullName)
    setViewingName(user.fullName)
    if (user.phone) {
      setOfferTenantPhone(user.phone)
      setViewingPhone(user.phone)
    }
    const cu = user.customUsage
    if (!cu) return
    setChequeMode(cu.defaultChequeMode)
    setOfferCheques(cu.defaultChequeMode)
    setSelectedEmirate(cu.preferredEmirate)
    setChillerFreeOnly(cu.chillerFreePreferred)
    setMaxDifcCommute(cu.maxCommuteDifcMins)
    setCuPlanTier(cu.customPlanTier)
    setCuDefaultCheque(cu.defaultChequeMode)
    setCuPreferredEmirate(cu.preferredEmirate)
    setCuChillerFree(cu.chillerFreePreferred)
    setCuMaxCommute(cu.maxCommuteDifcMins)
    setCuFlatFee(cu.customFlatFeeAed)
    setCuCommPct(cu.customCommissionPct)
    setCuSplitRatio(cu.commissionSplitRatio)
    setCuBtrQueueCap(cu.btrFifoQueueCap)
    setCuWebhookUrl(cu.customWebhookUrl)
    setCuWhatsappSig(cu.whatsappPitchSignature)
    setCuEjariAutopilot(cu.ejariAutopilotEnabled)
    setCuRera90DayShield(cu.rera90DayShieldEnabled)
    setCuPdcBounceShield(cu.pdcBounceShieldEnabled)
  }

  const apiFetch = async (url: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers || {})
    if (sessionToken) headers.set('x-swk-session', sessionToken)
    headers.set('x-swk-role', currentUser?.role ?? activeRole)
    return fetch(url, { ...init, headers })
  }

  const refreshData = async (overrideToken?: string | null) => {
    try {
      const headers: Record<string, string> = {}
      const tok = overrideToken !== undefined ? overrideToken : sessionToken
      if (tok) headers['x-swk-session'] = tok
      const res = await fetch('/api/bootstrap', { headers })
      const json = await res.json()
      setData(json)
      if (json.currentUser) {
        setCurrentUser(json.currentUser)
        setActiveRole(json.currentUser.role)
        applyUserCustomUsageToWorkspace(json.currentUser)
      }
      if (json.osBridge?.osApiUrl) {
        setOsApiUrlInput(json.osBridge.osApiUrl)
      }
    } catch (e: any) {
      showNotice('err', e?.message || 'Failed to load swk.rent platform data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshData()
  }, [])

  const buildingsById = useMemo(() => {
    const map = new Map<number, BuildingProfile>()
    for (const b of data?.buildings ?? []) map.set(b.id, b)
    return map
  }, [data?.buildings])

  const filteredUnits = useMemo(() => {
    const units = data?.units ?? []
    return units.filter(u => {
      const b = buildingsById.get(u.buildingId)
      if (selectedBuildingId && u.buildingId !== selectedBuildingId) return false
      if (selectedEmirate !== 'All' && u.emirate !== selectedEmirate) return false
      if (selectedSupplyTier !== 'All' && u.supplyTier !== selectedSupplyTier) return false
      if (chillerFreeOnly && u.chillerProvider !== 'Chiller Free') return false
      if (b && b.commuteDifcMins > maxDifcCommute) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hay = `${u.unitCode} ${u.buildingName} ${u.community} ${u.viewType} ${u.makaniNo} ${u.trakheesiPermitNo}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [
    data?.units,
    buildingsById,
    selectedBuildingId,
    selectedEmirate,
    selectedSupplyTier,
    chillerFreeOnly,
    maxDifcCommute,
    searchQuery,
  ])

  const liveReraSim = useMemo(
    () =>
      evaluateReraRenewal({
        currentRent: simCurrentRent,
        reraIndexRent: simIndexRent,
        proposedRent: simProposedRent,
        leaseEndDate: simEndDate,
        noticeServedDate: simNoticeDate,
      }),
    [simCurrentRent, simIndexRent, simProposedRent, simEndDate, simNoticeDate],
  )

  const livePortalSavings = useMemo(
    () =>
      calculatePortalSavingsVsCompetitors({
        activeListingsCount: calcListingsCount,
        agentsCount: calcAgentsCount,
      }),
    [calcListingsCount, calcAgentsCount],
  )

  const copyWhatsAppClientPitch = (u: RentalUnit) => {
    const cost = calculateTrueRentalCost(u, chequeMode)
    const bld = buildingsById.get(u.buildingId)
    const customSig =
      currentUser?.customUsage?.whatsappPitchSignature ||
      cuWhatsappSig ||
      'Verified on https://swk.rent · ORN 51517'
    const pitch = [
      `✨ *SWK Verified Rental Pitch (${u.unitCode})*`,
      `🏢 *${u.buildingName} · Unit #${u.unitNo}* (${u.community})`,
      `🛏 ${u.bedrooms === 0 ? 'Studio' : `${u.bedrooms} BR`} · ${u.bathrooms} Bath · ${u.areaSqft} sqft · ${u.furnishing}`,
      `💰 *Headline Rent:* ${aed(cost.annualHeadlineRent)}/yr (${chequeMode === 12 ? '12 Monthly UAEDDS' : chequeMode === 30 ? '30-Day New Expat Bridge' : `${chequeMode} Cheques`})`,
      `📊 *True Monthly All-In:* ${aed(cost.trueMonthlyAllInOperatingCostAed)}/mo (Includes Chiller: ${u.chillerProvider}, DEWA & 5% Muni)`,
      `🔑 *Viewing:* ${u.keyCustody} | 🚇 DIFC: ${bld?.commuteDifcMins ?? 18} mins`,
      `🛡 *DLD Permit:* #${u.trakheesiPermitNo} | ${customSig}`,
      `👉 Book Instant GPS Viewing or Lock Unit for 48h on https://swk.rent`,
    ].join('\n')
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(pitch)
    }
    if (currentUser) {
      void apiFetch('/api/auth/custom-usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metric: 'whatsappPitchesGenerated', delta: 1 }),
      }).then(() => refreshData())
    }
    showNotice('ok', `Client WhatsApp Pitch Deck copied for ${u.buildingName} #${u.unitNo} with Custom Usage Signature!`)
  }

  const openOfferModal = (u: RentalUnit) => {
    setOfferModalUnit(u)
    setOfferCheques(chequeMode)
    const defaultRent =
      chequeMode === 1
        ? u.annualRent1Cheque
        : chequeMode === 2
          ? u.annualRent2Cheques
          : chequeMode === 4
            ? u.annualRent4Cheques
            : u.annualRent12Monthly
    setOfferAmount(defaultRent)
    setOfferPaymentChannel(PERMITTED_UAE_RENTAL_PAYMENT_CHANNELS[0])
    setOfferDestinationNote('')
  }

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: loginEmail, password: loginPassword }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Sign-in failed')
      return
    }
    setCurrentUser(json.user)
    setActiveRole(json.user.role)
    setSessionToken(json.sessionToken)
    applyUserCustomUsageToWorkspace(json.user)
    try {
      localStorage.setItem('swkrent_session_token', json.sessionToken)
    } catch {}
    setAuthModalOpen(false)
    showNotice(
      'ok',
      `Signed in as ${json.user.fullName} [${json.user.role}] — Custom Usage (${json.user.customUsage?.customPlanTier || 'Active'}) connected!`,
    )
    await refreshData(json.sessionToken)
  }

  const handleDemoAccountLogin = async (email: string) => {
    setLoginEmail(email)
    setLoginPassword('SwkRent2026!')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoEmail: email }),
    })
    const json = await res.json()
    if (!res.ok || !json.user) {
      showNotice('err', json.error || `Could not sign in to demo account ${email}`)
      return
    }
    setCurrentUser(json.user)
    setActiveRole(json.user.role)
    setSessionToken(json.sessionToken)
    applyUserCustomUsageToWorkspace(json.user)
    try {
      localStorage.setItem('swkrent_session_token', json.sessionToken)
    } catch {}
    setAuthModalOpen(false)
    showNotice(
      'ok',
      `Switched to Dedicated Demo Account: ${json.user.fullName} (${json.user.email}) · Custom Usage Connected!`,
    )
    await refreshData(json.sessionToken)
  }

  const handleUaePassLogin = async (email?: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uaePassQuickAuth: true, email: email || loginEmail }),
    })
    const json = await res.json()
    if (!res.ok || !json.user) {
      showNotice('err', json.error || 'UAE PASS Digital Identity authentication failed')
      return
    }
    setCurrentUser(json.user)
    setActiveRole(json.user.role)
    setSessionToken(json.sessionToken)
    applyUserCustomUsageToWorkspace(json.user)
    try {
      localStorage.setItem('swkrent_session_token', json.sessionToken)
    } catch {}
    setAuthModalOpen(false)
    showNotice(
      'ok',
      `UAE PASS Biometric Session Verified: ${json.user.fullName} (${json.user.emiratesIdOrPassport})!`,
    )
    await refreshData(json.sessionToken)
  }

  const handleQuickRoleSwitch = async (role: UserRole) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoQuickRole: role }),
    })
    const json = await res.json()
    if (res.ok && json.user) {
      setCurrentUser(json.user)
      setActiveRole(json.user.role)
      setSessionToken(json.sessionToken)
      applyUserCustomUsageToWorkspace(json.user)
      try {
        localStorage.setItem('swkrent_session_token', json.sessionToken)
      } catch {}
      showNotice(
        'ok',
        `Switched Active RBAC Persona to ${json.user.fullName} (${ROLE_CAPABILITIES[role].label}) · Custom Usage Synced`,
      )
      await refreshData(json.sessionToken)
    } else {
      setActiveRole(role)
      showNotice('ok', `Active RBAC Role set to ${role}`)
    }
  }

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: signupFullName,
        email: signupEmail,
        phone: signupPhone,
        password: signupPassword,
        role: signupRole,
        emiratesIdOrPassport: signupEmiratesId,
        reraBrn: signupRole === 'AGENT' ? signupReraBrn : undefined,
        reraOrn: signupRole === 'AGENT' ? signupReraOrn : undefined,
        agencyOrCompanyName: signupCompany,
        titleDeedRef: signupRole === 'LANDLORD' ? signupTitleDeed : undefined,
        customPlanTier: cuPlanTier,
        defaultChequeMode: cuDefaultCheque,
        preferredEmirate: cuPreferredEmirate,
        chillerFreePreferred: cuChillerFree,
        maxCommuteDifcMins: cuMaxCommute,
        customFlatFeeAed: cuFlatFee,
        customCommissionPct: cuCommPct,
        commissionSplitRatio: cuSplitRatio,
        btrFifoQueueCap: cuBtrQueueCap,
        customWebhookUrl: cuWebhookUrl,
        whatsappPitchSignature: cuWhatsappSig,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not create account')
      return
    }
    setCurrentUser(json.user)
    setActiveRole(json.user.role)
    setSessionToken(json.sessionToken)
    applyUserCustomUsageToWorkspace(json.user)
    try {
      localStorage.setItem('swkrent_session_token', json.sessionToken)
    } catch {}
    setAuthModalOpen(false)
    showNotice(
      'ok',
      `Welcome to swk.rent MVP Cohort, ${json.user.fullName} (${json.user.role}) — Custom Usage Profile Connected!`,
    )
    await refreshData(json.sessionToken)
  }

  const handleSaveCustomUsage = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/auth/custom-usage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser?.id,
        customPlanTier: cuPlanTier,
        defaultChequeMode: cuDefaultCheque,
        preferredEmirate: cuPreferredEmirate,
        chillerFreePreferred: cuChillerFree,
        maxCommuteDifcMins: cuMaxCommute,
        customFlatFeeAed: cuFlatFee,
        customCommissionPct: cuCommPct,
        commissionSplitRatio: cuSplitRatio,
        btrFifoQueueCap: cuBtrQueueCap,
        customWebhookUrl: cuWebhookUrl,
        whatsappPitchSignature: cuWhatsappSig,
        ejariAutopilotEnabled: cuEjariAutopilot,
        rera90DayShieldEnabled: cuRera90DayShield,
        pdcBounceShieldEnabled: cuPdcBounceShield,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not save custom usage profile')
      return
    }
    setChequeMode(cuDefaultCheque)
    setSelectedEmirate(cuPreferredEmirate)
    setChillerFreeOnly(cuChillerFree)
    setMaxDifcCommute(cuMaxCommute)
    showNotice(
      'ok',
      `Custom Usage Profile saved & connected live to Marketplace, Fee Calculator & WhatsApp Pitch Engine!`,
    )
    await refreshData()
  }

  const handleTrackUsageEvent = async (
    metric:
      | 'listingsSyncedCount'
      | 'viewingsBookedOrDispatched'
      | 'digitalOffersSubmittedOrReviewed'
      | 'workflowsSignedOffCount'
      | 'whatsappPitchesGenerated'
      | 'apiWebhookEventsCount',
    label: string,
  ) => {
    const res = await apiFetch('/api/auth/custom-usage/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser?.id, metric, delta: 1 }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not track usage event')
      return
    }
    showNotice('ok', `Live Custom Usage Telemetry Incremented: ${label} (+1 persisted in SQLite)`)
    await refreshData()
  }

  const handleLogout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST' })
    setCurrentUser(null)
    setSessionToken(null)
    try {
      localStorage.removeItem('swkrent_session_token')
    } catch {}
    showNotice('ok', 'Signed out of swk.rent session.')
    await refreshData(null)
  }

  const handleSaveOsApiConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/os-api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        osApiUrl: osApiUrlInput,
        osApiKey: osApiKeyInput || undefined,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not update OS REST API endpoint')
      return
    }
    setOsApiKeyInput('')
    showNotice('ok', `External OS REST API endpoint saved: ${json.status.osApiUrl}`)
    await refreshData()
  }

  const handleSyncOsInventory = async () => {
    setOsSyncBusy(true)
    try {
      const res = await apiFetch('/api/os-api/sync-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osApiUrlOverride: osApiUrlInput }),
      })
      const json = await res.json()
      if (!res.ok) {
        showNotice('err', json.error || 'OS REST API sync failed')
        return
      }
      showNotice('ok', `OS REST API Sync Complete: ${json.syncedUnitsCount} units verified via ${json.endpoint}`)
      await refreshData()
    } finally {
      setOsSyncBusy(false)
    }
  }

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/workflows', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: wfUnitId,
        tenantName: wfTenantName,
        annualRentAed: wfAnnualRent,
        chequeOption: wfCheques,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not start workflow')
      return
    }
    showNotice('ok', `7-Stage Rental Deal Workflow ${json.workflow.workflowCode} launched!`)
    await refreshData()
  }

  const handleAdvanceWorkflow = async (wfId: number) => {
    const res = await apiFetch(`/api/workflows/${wfId}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actorRole: currentUser?.role ?? activeRole,
        actorName: currentUser?.fullName ?? `${activeRole} Verified Sign-Off`,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC Permission Denied for this workflow stage')
      return
    }
    showNotice(
      'ok',
      `Deal ${json.workflow.workflowCode} advanced to Stage ${json.workflow.currentStage}/7 (${
        UAE_RENTAL_WORKFLOW_STAGES.find(s => s.stage === json.workflow.currentStage)?.shortTitle
      })!`,
    )
    await refreshData()
  }

  const handleSwitchAppIconVariant = (variant: 'emblem' | 'wordmark') => {
    setAppIconVariant(variant)
    try {
      const w = window as any
      if (w.SwkAndroidBridge?.setLauncherIconVariant) {
        w.SwkAndroidBridge.setLauncherIconVariant(variant)
      }
      if (w.webkit?.messageHandlers?.SwkIosBridge?.postMessage) {
        w.webkit.messageHandlers.SwkIosBridge.postMessage({ action: 'setIconVariant', variant })
      }
    } catch {}
    showNotice(
      'ok',
      variant === 'emblem'
        ? 'App Icon set to Primary "Emblem + SWK" (Android Adaptive & iOS AppIcon).'
        : 'App Icon set to Alternate "SWK Matte Gold Wordmark" (Android Alias & iOS AppIconWordmark).',
    )
  }

  const submitDigitalOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerModalUnit) return
    const res = await apiFetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: offerModalUnit.id,
        tenantName: offerTenantName,
        tenantPhone: offerTenantPhone,
        offeredAnnualRent: offerAmount,
        chequeOption: offerCheques,
        supplyTier: offerModalUnit.supplyTier,
        moveInDate: offerMoveInDate,
        paymentChannel: offerPaymentChannel,
        destinationAccount: offerDestinationNote,
        lockUnitWithDeposit: true,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Offer rejected by UAE Compliance Gate')
      return
    }
    showNotice(
      'ok',
      `48-Hour Unit Lock & 7-Stage Workflow (${json.workflowCode}) Activated for ${offerModalUnit.buildingName} #${offerModalUnit.unitNo}!`,
    )
    setOfferModalUnit(null)
    await refreshData()
  }

  const submitInstantViewing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewingModalUnit) return
    const res = await apiFetch('/api/viewings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitId: viewingModalUnit.id,
        tenantName: viewingName,
        tenantPhone: viewingPhone,
        slotDatetime: viewingSlot,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not schedule viewing')
      return
    }
    showNotice('ok', `Instant Viewing Confirmed! ${json.viewing.gps_status}`)
    setViewingModalUnit(null)
    await refreshData()
  }

  const handleReserveDeveloperFifo = async (poolId: number) => {
    const res = await apiFetch(`/api/developer-pools/${poolId}/reserve`, { method: 'POST' })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Agent, Developer, or Admin can reserve FIFO units.')
      return
    }
    showNotice(
      'ok',
      'FIFO Unit Reserved! Next unit in developer queue automatically released at protected RERA floor rent.',
    )
    await refreshData()
  }

  const submitDeveloperPool = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/developer-pools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: devProjectName,
        developerName: devDeveloperName,
        community: devCommunity,
        handoverDate: '2026-12-28',
        totalHandoverUnits: devTotalUnits,
        activePublicQueueCap: 3,
        protectedFloorRent1BrAed: devFloorRent1Br,
        protectedFloorRent2BrAed: devFloorRent2Br,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Developer or Admin can create BTR pools.')
      return
    }
    showNotice('ok', 'Developer Bulk Handover BTR Pool Activated with FIFO Anti-Cannibalization Queue!')
    await refreshData()
  }

  const submitTenantBrief = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/reverse-briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantAlias: briefAlias,
        corporateEmployer: briefEmployer,
        preferredCommunities: briefCommunities,
        bedroomsMin: briefBeds,
        maxAnnualBudgetAed: briefBudget,
        chequesReady: briefCheques,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not post tenant brief')
      return
    }
    showNotice('ok', 'Verified Tenant Brief Broadcasted! Holding agents & landlords can now bid down.')
    await refreshData()
  }

  const handleBidOnTenantBrief = async (brief: VerifiedTenantBrief) => {
    const nextBid = Math.round((brief.bestBidRentAed ?? brief.maxAnnualBudgetAed) * 0.97)
    const res = await apiFetch(`/api/reverse-briefs/${brief.id}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bidRentAed: nextBid,
        unitLabel: 'SWK Verified Chiller-Free Mandate',
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Landlord, Agent, or Admin can bid on tenant briefs.')
      return
    }
    showNotice('ok', `Winning Landlord Bid Placed at ${aed(nextBid)}/yr! Tenant & Agent notified.`)
    await refreshData()
  }

  const submitCrmImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/crm-sync/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agencyName: crmAgencyName,
        crmProvider,
        feedUrl: crmFeedUrl,
        unitsCount: crmUnitsCount,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Agent, Developer, or Admin can import XML feeds.')
      return
    }
    showNotice(
      'ok',
      `Imported ${crmUnitsCount} verified units at AED 0 cost — saving ${aed(json.savings.annualPortalSavingsAed)}/yr vs traditional portals!`,
    )
    await refreshData()
  }

  const submitGatePass = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/gate-pass/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        buildingName: gateBuilding,
        unitNo: gateUnitNo,
        tenantName: gateTenant,
        moverCompany: gateMover,
        moveDate: '2026-11-18',
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Landlord, Agent, Developer, or Admin can issue Move-In NOCs.')
      return
    }
    showNotice('ok', 'Smart Building OA Move-In Security QR Gate Pass Issued!')
    await refreshData()
  }

  const handlePdcAction = async (id: number, action: 'Cleared' | 'Deposited' | 'RNPL_Bounce_Shield') => {
    const res = await apiFetch(`/api/pdc/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Landlord, Agent, or Admin can manage PDC cheques.')
      return
    }
    showNotice(
      'ok',
      action === 'RNPL_Bounce_Shield'
        ? 'Cheque converted to 12-Month UAEDDS / RNPL Split — Bounce Prevented!'
        : `Cheque marked as ${action}`,
    )
    await refreshData()
  }

  const handleOfferDecision = async (id: number, decision: 'Accepted — Ejari Issued' | 'Declined — Unit Unlocked') => {
    const res = await apiFetch(`/api/offers/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Landlord, Agent, or Admin can approve/decline offers.')
      return
    }
    showNotice('ok', `Offer status updated: ${decision}`)
    await refreshData()
  }

  const submitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintIssue.trim()) return
    const res = await apiFetch('/api/maintenance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unitLabel: maintUnit,
        category: maintCategory,
        issueSummary: maintIssue,
        estimatedCostAed: maintCost,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'Could not log maintenance ticket')
      return
    }
    showNotice('ok', `Ticket logged: ${json.classification.ruleExplanation}`)
    setMaintIssue('')
    await refreshData()
  }

  const submitA2aRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/a2a/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerAgencyName: a2aAgency,
        partnerOrn: a2aOrn,
        brokerName: a2aBroker,
        brokerBrn: a2aBrn,
        unitId: a2aUnitId,
        clientName: a2aClient,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only RERA Agent or Admin can register A2A mandates.')
      return
    }
    showNotice('ok', '7-Day A2A Lead Protection & 50/50 Commission Split Certificate Locked!')
    await refreshData()
  }

  const submitLandlordOnboarding = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await apiFetch('/api/landlord/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        landlordName: llName,
        titleDeedNo: llDeed,
        makaniNo: llMakani,
        buildingName: llBuilding,
        unitNo: llUnitNo,
        bedrooms: llBeds,
        askingRentAed: llRent,
        selectedPlan: llPlan,
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      showNotice('err', json.error || 'RBAC: Only Landlord or Admin can onboard direct Title Deed units.')
      return
    }
    showNotice('ok', 'Landlord Title Deed & UAE PASS Verified! Mandate synced with Owner360.')
    await refreshData()
  }

  const effectiveRole: UserRole = currentUser?.role ?? activeRole

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F1] text-[#17191C] pb-20 md:pb-6">
      {/* Top Luxury SWK Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#17191C] text-white border-b border-[#B89040]/30 shadow-lg">
        <div className="max-w-[1640px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src="/brand/swk-rent/transparent_for_black/Full_logo/SWK_Rent_Full_logo_512px.png"
              alt="SWK Rent — UAE Verified Rentals"
              className="h-12 sm:h-14 w-auto rounded-xl object-contain bg-[#111315] px-2.5 py-1 border border-[#B89040]/40 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-base sm:text-lg text-white">
                  SWK <span className="text-[#D6B46C]">RENT</span>
                </span>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#B89040]/20 text-[#D6B46C] border border-[#B89040]/40 font-semibold">
                  ORN 51517 · Web + Android + iOS
                </span>
              </div>
              <p className="hidden sm:block text-xs text-gray-400">
                1,000-User MVP Launch · 5-Role RBAC · 7-Stage Deal Workflow · BTR FIFO Queue · RERA Shield
              </p>
            </div>
          </div>

          {/* Desktop 6-Module Switcher */}
          <nav className="hidden md:flex flex-wrap items-center gap-1.5 bg-[#22262B] p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'marketplace'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Search size={14} />
              1. Marketplace
            </button>
            <button
              onClick={() => setActiveTab('buildings')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'buildings'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 size={14} />
              2. Towers
            </button>
            <button
              onClick={() => setActiveTab('superhub')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'superhub'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-[#D6B46C] hover:text-white bg-[#B89040]/10 border border-[#B89040]/30'
              }`}
            >
              <Rocket size={14} />
              3. Agent & Dev Hub
            </button>
            <button
              onClick={() => setActiveTab('workflow')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'workflow'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-emerald-300 hover:text-white bg-emerald-500/10 border border-emerald-400/30'
              }`}
            >
              <Layers size={14} />
              4. 7-Stage Workflow & MVP
            </button>
            <button
              onClick={() => setActiveTab('shield')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'shield'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck size={14} />
              5. RERA Shield
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'partners'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Handshake size={14} />
              6. Landlords & A2A
            </button>
            <button
              onClick={() => setActiveTab('auth')}
              className={`px-2.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'auth'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-[#D6B46C] hover:text-white bg-[#B89040]/15 border border-[#D6B46C]/50'
              }`}
            >
              <KeyRound size={14} />
              7. Sign In / Register & Demo Hub
            </button>
          </nav>
        </div>

        {/* RBAC Role Switcher, Auth Status & First 1,000 Users MVP Bar */}
        <div className="bg-[#111315] border-t border-white/10 px-3 sm:px-6 py-2">
          <div className="max-w-[1640px] mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#D6B46C] mr-1">
                Active RBAC Persona:
              </span>
              {(
                [
                  { role: 'TENANT', label: 'Tenant' },
                  { role: 'LANDLORD', label: 'Landlord' },
                  { role: 'AGENT', label: 'RERA Agent' },
                  { role: 'DEVELOPER', label: 'Developer' },
                  { role: 'ADMIN', label: 'SWK Admin' },
                ] as const
              ).map(p => (
                <button
                  key={p.role}
                  onClick={() => handleQuickRoleSwitch(p.role)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition border ${
                    effectiveRole === p.role
                      ? 'bg-[#D6B46C] text-[#17191C] border-[#D6B46C] shadow'
                      : 'bg-[#17191C] text-gray-300 border-white/10 hover:border-[#D6B46C]/50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setActiveTab('auth')}
                className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-[#17625F] text-white border border-emerald-400/40 hover:bg-[#124e4b] transition"
              >
                8 Dedicated Demo Accounts →
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-400/30 text-[11px] font-semibold">
                <BadgeCheck size={13} />
                MVP Cohort: {data?.mvpTelemetry?.registeredUsersCount ?? 8} / 1,000 Users ({data?.mvpTelemetry?.remainingEarlyAdopterSlots ?? 992} Slots Open)
              </span>

              {currentUser ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setActiveTab('auth')}
                    className="px-2.5 py-1 rounded-lg bg-[#22262B] border border-[#B89040]/50 text-white font-semibold text-[11px] hover:border-[#D6B46C] flex items-center gap-1.5"
                    title="Open Connected Custom Usage & Account Studio"
                  >
                    <KeyRound size={12} className="text-[#D6B46C]" />
                    <span>{currentUser.fullName}</span>
                    <strong className="text-[#D6B46C]">[{currentUser.role}]</strong>
                    <span className="hidden sm:inline text-[10px] text-emerald-300">
                      · Custom Usage Active
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('auth')}
                    className="px-2.5 py-1 rounded-lg swk-gold-gradient text-[#17191C] font-extrabold text-[11px]"
                  >
                    Custom Usage & Switch Account
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-gray-200 font-semibold text-[11px]"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setAuthMode('signin')
                      setActiveTab('auth')
                    }}
                    className="px-3 py-1 rounded-lg bg-[#22262B] border border-[#D6B46C]/50 text-[#D6B46C] font-bold text-[11px] hover:bg-white/10"
                  >
                    Sign In & 8 Demo Accounts
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signup')
                      setActiveTab('auth')
                    }}
                    className="px-3 py-1 rounded-lg swk-gold-gradient text-[#17191C] font-extrabold text-[11px] shadow"
                  >
                    Register + Custom Usage (First 1,000 MVP)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (100% Mobile-Friendly Interface) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#17191C] text-white border-t border-[#B89040]/40 grid grid-cols-7 py-1.5 px-1 shadow-2xl">
        {(
          [
            { id: 'marketplace', label: 'Rentals', icon: Search },
            { id: 'buildings', label: 'Towers', icon: Building2 },
            { id: 'superhub', label: 'Agent/Dev', icon: Rocket },
            { id: 'workflow', label: 'Workflow', icon: Layers },
            { id: 'shield', label: 'Shield', icon: ShieldCheck },
            { id: 'partners', label: 'A2A/Owner', icon: Handshake },
            { id: 'auth', label: 'Sign In', icon: KeyRound },
          ] as const
        ).map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-bold transition ${
                active ? 'text-[#D6B46C] bg-white/10' : 'text-gray-400'
              }`}
            >
              <Icon size={16} />
              <span className="mt-0.5">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed bottom-16 md:bottom-5 right-3 left-3 md:left-auto md:max-w-md z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl border flex items-start gap-3 text-xs sm:text-sm font-medium ${
              toast.tone === 'ok'
                ? 'bg-[#17625F] text-white border-[#9CE2DC]'
                : 'bg-[#8C1D40] text-white border-red-300'
            }`}
          >
            {toast.tone === 'ok' ? (
              <CheckCircle2 className="shrink-0 mt-0.5" size={18} />
            ) : (
              <ShieldAlert className="shrink-0 mt-0.5" size={18} />
            )}
            <div className="flex-1">{toast.msg}</div>
            <button onClick={() => setToast(null)} className="opacity-80 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1640px] w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6">
        {/* Live Connected Custom Usage & 8 Dedicated Demo Accounts Quick Ribbon */}
        <section className="bg-white rounded-2xl p-3 sm:p-4 border border-[#D6B46C]/60 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#17191C] text-[#D6B46C] font-extrabold text-[11px] flex items-center gap-1.5">
              <Zap size={13} />
              Connected Custom Usage:
            </span>
            <span className="font-bold text-[#17191C]">
              {currentUser ? `${currentUser.fullName} (${currentUser.email})` : `Demo Role: ${effectiveRole}`}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FBF8F1] border border-[#E5DEC9] text-[#7C5D1E] font-semibold text-[11px]">
              {currentUser?.customUsage?.customPlanTier ?? cuPlanTier}
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-[11px]">
              Default: {chequeMode === 12 ? '12x Monthly UAEDDS' : chequeMode === 30 ? '30-Day Expat Bridge' : `${chequeMode} Cheques`} · Fee: {aed(currentUser?.customUsage?.customFlatFeeAed ?? cuFlatFee)} / {currentUser?.customUsage?.customCommissionPct ?? cuCommPct}%
            </span>
            <span className="hidden xl:inline px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px]">
              API Key: {currentUser?.customUsage?.personalApiKey ?? 'swk_live_orn51517_verified'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => {
                setAuthMode('signin')
                setActiveTab('auth')
              }}
              className="px-3 py-1.5 rounded-xl bg-[#17191C] text-[#D6B46C] font-extrabold text-[11px] hover:bg-black transition flex items-center gap-1.5"
            >
              <KeyRound size={13} />
              Open Full Sign-In, Register & 8 Demo Accounts Hub
            </button>
            <button
              onClick={() => {
                setAuthMode('signup')
                setActiveTab('auth')
              }}
              className="px-3 py-1.5 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-[11px] shadow"
            >
              + Register New Account
            </button>
          </div>
        </section>

        {/* ============================================================
            MODULE 1: PUBLIC VERIFIED RENTAL MARKETPLACE & TRUE COST ENGINE
           ============================================================ */}
        {activeTab === 'marketplace' && (
          <>
            <section className="swk-obsidian-card text-white rounded-2xl p-4 sm:p-6 border border-[#B89040]/40 shadow-xl">
              <div className="grid lg:grid-cols-12 gap-5 items-center">
                <div className="lg:col-span-7 space-y-2.5">
                  <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-[#B89040]/20 border border-[#B89040]/40 text-[#D6B46C] text-[11px] font-semibold">
                    <Sparkles size={13} />
                    swk.rent · Zero Duplicate Ads · AED 0 Broker Listing Cost · Android & iOS (`ae.swk.rent`) Ready
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                    Every Unit Deduplicated by Title Deed.{' '}
                    <span className="text-[#D6B46C]">Every Dirham Calculated Upfront.</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Connected live via <strong className="text-white">External OS REST API & Webhooks</strong>. Filter by 8:30 AM rush-hour commute, toggle 1–12x Monthly UAEDDS payments, or tap <strong className="text-[#D6B46C]">"WhatsApp Client Pitch"</strong> to share a watermark-free BRN-protected deal sheet in 1 second.
                  </p>
                </div>

                {/* Global Cheque & Monthly Payment Mode Switcher */}
                <div className="lg:col-span-5 bg-[#22262B] p-3.5 sm:p-4 rounded-xl border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D6B46C]">
                      Payment Mode (Recalculates All Cards)
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> UAEDDS / RNPL
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {(
                      [
                        { v: 1, label: '1 Chq', sub: 'Best Rate' },
                        { v: 2, label: '2 Chq', sub: 'Bi-Annual' },
                        { v: 4, label: '4 Chq', sub: 'Quarterly' },
                        { v: 12, label: '12 Mo', sub: 'Monthly' },
                        { v: 30, label: '30d Pass', sub: 'New Expat' },
                      ] as const
                    ).map(opt => (
                      <button
                        key={opt.v}
                        onClick={() => setChequeMode(opt.v)}
                        className={`p-2 rounded-lg text-center transition border ${
                          chequeMode === opt.v
                            ? 'bg-[#B89040] text-[#17191C] border-[#D6B46C] font-bold shadow'
                            : 'bg-[#17191C] text-gray-300 border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="text-[11px] sm:text-xs font-bold">{opt.label}</div>
                        <div className="text-[9px] sm:text-[10px] opacity-80">{opt.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
                <div className="lg:col-span-2 relative">
                  <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search Marina, JVC, Makani, Trakheesi..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#111315] border border-white/15 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D6B46C]"
                  />
                </div>

                <select
                  value={selectedEmirate}
                  onChange={e => setSelectedEmirate(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#111315] border border-white/15 text-xs sm:text-sm text-white"
                >
                  <option value="All">All Emirates (Dubai & Abu Dhabi)</option>
                  <option value="Dubai">Dubai (DLD / Ejari)</option>
                  <option value="Abu Dhabi">Abu Dhabi (ADREC / Tawtheeq)</option>
                </select>

                <select
                  value={selectedSupplyTier}
                  onChange={e => setSelectedSupplyTier(e.target.value as any)}
                  className="px-3 py-2 rounded-xl bg-[#111315] border border-white/15 text-xs sm:text-sm text-white"
                >
                  <option value="All">All Supply Tiers (Hybrid)</option>
                  <option value="DIRECT_LANDLORD">Direct Landlord (Flat AED 2,999)</option>
                  <option value="SWK_EXCLUSIVE">SWK Exclusive (Key in Vault)</option>
                  <option value="A2A_PARTNER">Verified A2A Partner (50/50)</option>
                </select>

                <select
                  value={maxDifcCommute}
                  onChange={e => setMaxDifcCommute(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-[#111315] border border-white/15 text-xs sm:text-sm text-white"
                >
                  <option value={90}>Any 8:30 AM Commute</option>
                  <option value={10}>≤ 10 mins to DIFC / Downtown</option>
                  <option value={20}>≤ 20 mins to DIFC / Business Bay</option>
                  <option value={25}>≤ 25 mins to DIFC (No Hessa Traffic)</option>
                </select>

                <button
                  onClick={() => setChillerFreeOnly(!chillerFreeOnly)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    chillerFreeOnly
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                      : 'bg-[#111315] border-white/15 text-gray-300 hover:border-white/30'
                  }`}
                >
                  <Flame size={14} />
                  {chillerFreeOnly ? '✓ Chiller Free Only' : 'Chiller Free Only'}
                </button>
              </div>

              {selectedBuildingId && (
                <div className="mt-3 flex items-center justify-between bg-[#B89040]/20 border border-[#B89040]/40 px-4 py-2 rounded-xl text-xs">
                  <span>
                    Filtering by Tower: <strong>{buildingsById.get(selectedBuildingId)?.name}</strong>
                  </span>
                  <button
                    onClick={() => setSelectedBuildingId(null)}
                    className="underline font-bold text-[#D6B46C]"
                  >
                    Show All Towers
                  </button>
                </div>
              )}
            </section>

            {/* Property Cards Grid */}
            {loading ? (
              <div className="p-12 text-center text-gray-500">Loading verified UAE inventory...</div>
            ) : (
              <section className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
                {filteredUnits.map(unit => {
                  const bld = buildingsById.get(unit.buildingId)
                  const cost = calculateTrueRentalCost(unit, chequeMode)
                  const tierBadge = SUPPLY_BADGES[unit.supplyTier]
                  const belowIndexPct =
                    unit.reraIndexRent > cost.annualHeadlineRent
                      ? Math.round(
                          ((unit.reraIndexRent - cost.annualHeadlineRent) / unit.reraIndexRent) * 100,
                        )
                      : 0

                  return (
                    <article
                      key={unit.id}
                      className="bg-white rounded-2xl border border-[#E5DEC9] shadow-sm hover:shadow-xl transition overflow-hidden flex flex-col"
                    >
                      <div
                        onClick={() => setDetailUnit(unit)}
                        className="relative h-52 sm:h-56 bg-gray-900 cursor-pointer group"
                      >
                        <img
                          src={unit.images[0] || '/media/properties/marina-sky-penthouse-1.webp'}
                          alt={unit.buildingName}
                          className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold border ${tierBadge.bg} ${tierBadge.text} ${tierBadge.border}`}
                          >
                            {tierBadge.label}
                          </span>
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold ${
                              unit.availabilityStatus === 'Available'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-500 text-black'
                            }`}
                          >
                            {unit.availabilityStatus}
                          </span>
                        </div>

                        <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-white px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1 text-[10px] sm:text-[11px]">
                          <QrCode size={12} className="text-[#D6B46C]" />
                          <span>#{unit.trakheesiPermitNo.slice(-6)}</span>
                        </div>

                        <div className="absolute bottom-3 left-3 right-3 text-white">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] uppercase tracking-wider text-[#D6B46C] font-bold">
                              {unit.community} · {unit.emirate}
                            </span>
                            <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded backdrop-blur-sm">
                              Tap for 50-Pt Snagging & Specs
                            </span>
                          </div>
                          <h2 className="text-base sm:text-lg font-bold leading-snug">
                            {unit.buildingName} · Unit #{unit.unitNo}
                          </h2>
                          <p className="text-xs text-gray-300">
                            {unit.bedrooms === 0 ? 'Studio' : `${unit.bedrooms} BR`} · {unit.bathrooms} Bath ·{' '}
                            {unit.areaSqft.toLocaleString()} sqft · {unit.furnishing}
                          </p>
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="p-3.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                            <div className="flex items-baseline justify-between">
                              <div>
                                <div className="text-[10px] sm:text-[11px] uppercase font-bold text-gray-500">
                                  True Monthly All-In ({chequeMode === 30 ? '30d Expat' : `${chequeMode}x Mode`})
                                </div>
                                <div className="text-xl sm:text-2xl font-extrabold text-[#17191C]">
                                  {aed(cost.trueMonthlyAllInOperatingCostAed)}
                                  <span className="text-xs font-normal text-gray-500"> / mo</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-gray-500">Headline Lease</div>
                                <div className="text-xs sm:text-sm font-bold text-[#9E7628]">
                                  {aed(cost.annualHeadlineRent)}/yr
                                </div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2.5 border-t border-[#E5DEC9] grid grid-cols-3 gap-2 text-[11px]">
                              <div>
                                <span className="text-gray-500 block">Chiller</span>
                                <strong className={cost.monthlyChillerAed === 0 ? 'text-emerald-700' : 'text-gray-900'}>
                                  {cost.monthlyChillerAed === 0 ? 'AED 0 (Free)' : `${aed(cost.monthlyChillerAed)}/mo`}
                                </strong>
                              </div>
                              <div>
                                <span className="text-gray-500 block">DEWA + Muni</span>
                                <strong>{aed(cost.monthlyDewaAed + cost.monthlyMunicipalityFeeAed)}/mo</strong>
                              </div>
                              <div>
                                <span className="text-gray-500 block">Move-In Cash</span>
                                <strong>{aed(cost.totalCashNeededToMoveInAed)}</strong>
                              </div>
                            </div>

                            {cost.agencyFeeSavingVsTraditionalAed > 0 && (
                              <div className="mt-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-semibold flex items-center justify-between">
                                <span>Direct Landlord Flat AED 2,999 Fee</span>
                                <span>Save {aed(cost.agencyFeeSavingVsTraditionalAed)}!</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5 text-[11px]">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                              <Scale size={11} />
                              {belowIndexPct > 0
                                ? `${belowIndexPct}% Below RERA Index`
                                : `RERA Verified (${aed(unit.reraIndexRent)})`}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-semibold flex items-center gap-1">
                              <KeyRound size={11} />
                              {unit.keyCustody}
                            </span>
                            {bld && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium flex items-center gap-1">
                                <Train size={11} />
                                DIFC {bld.commuteDifcMins}m
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 3 Action Buttons: Viewing, Offer, & Agent 1-Tap WhatsApp Pitch */}
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setViewingModalUnit(unit)}
                              className="px-2.5 py-2.5 rounded-xl border border-[#17191C] text-[#17191C] hover:bg-[#17191C] hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                            >
                              <Compass size={14} />
                              Instant Viewing
                            </button>
                            <button
                              onClick={() => openOfferModal(unit)}
                              className="px-2.5 py-2.5 rounded-xl swk-gold-gradient text-[#17191C] text-xs font-bold shadow hover:opacity-95 transition flex items-center justify-center gap-1.5"
                            >
                              <FileSignature size={14} />
                              1-Click Offer
                            </button>
                          </div>
                          <button
                            onClick={() => copyWhatsAppClientPitch(unit)}
                            className="w-full py-1.5 rounded-lg bg-[#F4EFE3] hover:bg-[#E8DFC8] text-[#7C5D1E] text-[11px] font-bold transition flex items-center justify-center gap-1.5"
                          >
                            <Share2 size={12} />
                            Agent 1-Tap WhatsApp Client Pitch (BRN Split Locked)
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </section>
            )}
          </>
        )}

        {/* ============================================================
            MODULE 2: CANONICAL BUILDING INTELLIGENCE DIRECTORY
           ============================================================ */}
        {activeTab === 'buildings' && (
          <section className="space-y-6">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                Loophole #2, #3 & #5 Solved · Zero Duplicate Tower Profiles
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#17191C]">
                UAE Building-Level Transparency & Utility Directory
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Every tower is audited for Chiller provider bills, elevator wait times, acoustic insulation, shaded summer walk to Metro, and peak 8:30 AM rush-hour commute times.
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              {(data?.buildings ?? []).map(b => {
                const towerUnits = (data?.units ?? []).filter(u => u.buildingId === b.id)
                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border border-[#E5DEC9] overflow-hidden shadow-sm flex flex-col"
                  >
                    <div className="relative h-44 bg-gray-900">
                      <img src={b.heroImage} alt={b.name} className="w-full h-full object-cover opacity-85" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#17191C] text-[#D6B46C] border border-[#B89040]/40">
                          {b.emirate} · {b.community}
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            b.chillerProvider === 'Chiller Free'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-black'
                          }`}
                        >
                          {b.chillerProvider}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-4 right-4 text-white flex items-end justify-between">
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold">{b.name}</h3>
                          <p className="text-xs text-gray-300">
                            Developer: {b.developer} · {b.completionYear} · {b.totalFloors} Floors
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-extrabold text-[#D6B46C]">★ {b.tenantRating}</div>
                          <div className="text-[11px] text-gray-300">{b.reviewsCount} Reviews</div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                          <span className="text-gray-500 block">Avg Chiller / mo</span>
                          <strong className="text-sm">
                            {b.avgMonthlyChillerAed === 0 ? 'AED 0 (Free)' : aed(b.avgMonthlyChillerAed)}
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                          <span className="text-gray-500 block">Elevator & Sound</span>
                          <strong className="text-sm">
                            {b.elevatorWaitScore}/10 · {b.soundproofingScore}/10
                          </strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                          <span className="text-gray-500 block">8:30 AM to DIFC</span>
                          <strong className="text-sm">{b.commuteDifcMins} mins</strong>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                          <span className="text-gray-500 block">Metro Walk (Shade)</span>
                          <strong className="text-sm">{b.metroWalkMinsSummerShade} mins</strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {b.amenities.map((am, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium"
                          >
                            {am}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#17625F]">
                          {towerUnits.length} Verified Unit(s) Available
                        </span>
                        <button
                          onClick={() => {
                            setSelectedBuildingId(b.id)
                            setActiveTab('marketplace')
                          }}
                          className="px-4 py-2 rounded-xl bg-[#17191C] text-[#D6B46C] text-xs font-bold hover:opacity-90 flex items-center gap-1.5"
                        >
                          View Units <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ============================================================
            MODULE 3 (NEW!): AGENT, DEVELOPER BTR & BUILDING OA SUPER-HUB
           ============================================================ */}
        {activeTab === 'superhub' && (
          <div className="space-y-6">
            {/* 1. Zero-Credit-Burn Agency Cost Calculator & Free 1-Click XML CRM Sync */}
            <section className="swk-obsidian-card text-white rounded-2xl p-5 sm:p-6 border border-[#B89040]/40 shadow-xl">
              <div className="grid lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                    <Zap size={14} />
                    100% Cost-Friendly for Agencies & Developers · AED 0 Credit Burn
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
                    Stop Paying <span className="text-[#D6B46C]">AED 150,000–350,000/yr</span> for Listing Credits on Duplicate Ads.
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-300">
                    On <strong className="text-white">swk.rent</strong>, RERA-verified agencies, developers, and property managers sync their <strong className="text-white">PropSpace, Propertybase, Bitrix24, Pixxi, or External OS REST API</strong> feeds for <strong className="text-emerald-400">AED 0 upfront</strong>. You only share commission or pay a flat transaction fee when a lease actually closes.
                  </p>

                  <div className="grid grid-cols-2 gap-4 bg-[#22262B] p-4 rounded-xl border border-white/10 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1">
                        Your Active Rental Listings: <strong className="text-white">{calcListingsCount}</strong>
                      </label>
                      <input
                        type="range"
                        min={5}
                        max={250}
                        value={calcListingsCount}
                        onChange={e => setCalcListingsCount(Number(e.target.value))}
                        className="w-full accent-[#D6B46C]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">
                        Leasing Agents on Team: <strong className="text-white">{calcAgentsCount}</strong>
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={80}
                        value={calcAgentsCount}
                        onChange={e => setCalcAgentsCount(Number(e.target.value))}
                        className="w-full accent-[#D6B46C]"
                      />
                    </div>
                    <div className="col-span-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-gray-400 block">Legacy Classifieds Credit Spend</span>
                        <strong className="text-lg text-red-400 line-through">
                          {aed(livePortalSavings.traditionalPortalAnnualCostAed)}/yr
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">swk.rent Listing Cost</span>
                        <strong className="text-lg text-emerald-400">AED 0 / yr</strong>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-400/40 px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] uppercase text-emerald-200 block font-bold">
                          Your Net Annual Cash Saved
                        </span>
                        <strong className="text-lg text-emerald-300">
                          {aed(livePortalSavings.annualPortalSavingsAed)}/yr
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 1-Click Free XML CRM Feed Importer */}
                <div className="lg:col-span-6 bg-[#22262B] p-5 rounded-2xl border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase text-[#D6B46C]">
                        1-Click Free XML / JSON Inventory Sync
                      </span>
                      <h3 className="text-lg font-bold text-white">
                        Connect PropSpace, Propertybase, Bitrix24, Pixxi or SWK OS
                      </h3>
                    </div>
                    <Layers className="text-[#D6B46C]" size={22} />
                  </div>

                  <form onSubmit={submitCrmImport} className="space-y-3 text-xs">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-gray-400 block mb-1">Brokerage / Developer Name</label>
                        <input
                          value={crmAgencyName}
                          onChange={e => setCrmAgencyName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">CRM XML Format</label>
                        <select
                          value={crmProvider}
                          onChange={e => setCrmProvider(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                        >
                          <option value="SWK Properties OS Native Bridge">SWK Properties OS Native Bridge</option>
                          <option value="PropSpace / Propertybase XML">PropSpace / Propertybase XML</option>
                          <option value="Bitrix24 UAE Real Estate Feed">Bitrix24 UAE Real Estate Feed</option>
                          <option value="Pixxi CRM / Goyzer XML">Pixxi CRM / Goyzer XML</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">XML Feed URL</label>
                        <input
                          value={crmFeedUrl}
                          onChange={e => setCrmFeedUrl(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">Verified Units in Feed</label>
                        <input
                          type="number"
                          value={crmUnitsCount}
                          onChange={e => setCrmUnitsCount(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-bold"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold"
                    >
                      Sync CRM Feed Now for AED 0 (Zero Credit Burn)
                    </button>
                  </form>

                  <div className="space-y-2 pt-2 border-t border-white/10">
                    {(data?.crmFeeds ?? []).slice(0, 3).map((f: any) => (
                      <div
                        key={f.id}
                        className="p-2.5 rounded-xl bg-[#17191C] border border-white/10 text-xs flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-bold text-white">{f.agency_name}</span>{' '}
                          <span className="text-gray-400">({f.crm_provider})</span>
                        </div>
                        <span className="text-emerald-400 font-bold">
                          {f.imported_units_count} Units Live · Saved {aed(f.annual_credit_burn_saved_aed)}/yr
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Developer & Institutional Build-to-Rent (BTR) Anti-Cannibalization FIFO Lease-Up */}
            <section className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                      Industry-First for UAE Developers & Whole-Building Landlords
                    </span>
                    <h3 className="text-xl font-extrabold">
                      Developer Handover & BTR "FIFO Anti-Cannibalization" Lease-Up Queue
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      When a new tower hands over 200 units, individual owners listing simultaneously on legacy portals crash rents by 15%. Our FIFO Engine shows only <strong>3 units per layout at a time</strong> at a locked RERA/Developer floor rent and auto-releases the next unit upon booking!
                    </p>
                  </div>
                  <TrendingUp className="text-[#17625F] shrink-0" size={26} />
                </div>

                <div className="space-y-3">
                  {(data?.developerPools ?? []).map(pool => (
                    <div
                      key={pool.id}
                      className="p-4 rounded-2xl bg-[#FBF8F1] border border-[#E5DEC9] space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-bold text-[#17625F] uppercase">
                            {pool.developerName} · {pool.community} · Handover {pool.handoverDate}
                          </span>
                          <h4 className="text-base font-extrabold">{pool.projectName}</h4>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold">
                          {pool.leasedCount} / {pool.totalHandoverUnits} Units Pre-Leased
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-xl border border-gray-200">
                        <div>
                          <span className="text-gray-500 block">Locked 1BR Floor</span>
                          <strong>{aed(pool.protectedFloorRent1BrAed)}/yr</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Locked 2BR Floor</span>
                          <strong>{aed(pool.protectedFloorRent2BrAed)}/yr</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Rent War Prevented</span>
                          <strong className="text-emerald-700">
                            +{aed(pool.yieldProtection.annualRevenueProtectedAed)}/yr
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block">Asset Value Protected</span>
                          <strong className="text-[#9E7628]">
                            +{aed(pool.yieldProtection.assetValuationProtectedAed)}
                          </strong>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-gray-600 font-medium">{pool.status}</span>
                        <button
                          onClick={() => handleReserveDeveloperFifo(pool.id)}
                          className="px-3.5 py-2 rounded-xl bg-[#17191C] text-[#D6B46C] font-bold hover:opacity-90"
                        >
                          Reserve Next FIFO Unit (5% Agent Commission)
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Developer Handover Pool Form */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[#17625F]">
                  Launch Bulk Handover / BTR Tower Pool
                </span>
                <h3 className="text-lg font-extrabold">
                  Onboard New Developer Handover Building (Zero-Vacancy DLP Mode)
                </h3>
                <form onSubmit={submitDeveloperPool} className="space-y-3 text-xs">
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">Tower / Project Name</label>
                    <input
                      value={devProjectName}
                      onChange={e => setDevProjectName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Developer / Family Office</label>
                      <input
                        value={devDeveloperName}
                        onChange={e => setDevDeveloperName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Community</label>
                      <input
                        value={devCommunity}
                        onChange={e => setDevCommunity(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Total Units in Pool</label>
                      <input
                        type="number"
                        value={devTotalUnits}
                        onChange={e => setDevTotalUnits(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Protected 1BR Floor (AED)</label>
                      <input
                        type="number"
                        value={devFloorRent1Br}
                        onChange={e => setDevFloorRent1Br(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#17625F] text-white font-extrabold"
                  >
                    Activate FIFO Yield-Floor Queue & Pre-Handover Leasing
                  </button>
                </form>

                {/* Smart Building OA Move-In Gate Pass Generator */}
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <span className="text-xs font-bold uppercase text-[#9E7628]">
                    Loophole #18 Solved · Building OA / Property Management
                  </span>
                  <h4 className="text-base font-extrabold">
                    Automated Move-In NOC & Security Gate Pass QR Generator
                  </h4>
                  <form onSubmit={submitGatePass} className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={gateBuilding}
                        onChange={e => setGateBuilding(e.target.value)}
                        placeholder="Tower"
                        className="px-3 py-2 rounded-lg border border-gray-300"
                      />
                      <input
                        value={gateUnitNo}
                        onChange={e => setGateUnitNo(e.target.value)}
                        placeholder="Unit #"
                        className="px-3 py-2 rounded-lg border border-gray-300"
                      />
                      <input
                        value={gateTenant}
                        onChange={e => setGateTenant(e.target.value)}
                        placeholder="Tenant Name"
                        className="px-3 py-2 rounded-lg border border-gray-300"
                      />
                      <input
                        value={gateMover}
                        onChange={e => setGateMover(e.target.value)}
                        placeholder="Mover Company"
                        className="px-3 py-2 rounded-lg border border-gray-300"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl swk-gold-gradient text-[#17191C] font-bold"
                    >
                      Verify Ejari + DEWA + Chiller & Issue Security QR Gate Pass
                    </button>
                  </form>
                  {(data?.gatePasses ?? []).slice(0, 2).map((gp: any) => (
                    <div
                      key={gp.id}
                      className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-emerald-950">
                          {gp.pass_code} · {gp.building_name} #{gp.unit_no}
                        </div>
                        <div className="text-emerald-800">
                          Tenant: {gp.tenant_name} · Mover: {gp.mover_company}
                        </div>
                      </div>
                      <QrCode className="text-emerald-800 shrink-0" size={22} />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 3. Reverse Rental Auction (Pre-Qualified Tenants Broadcast — Landlords Bid Down!) */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
              <div className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                    Zero-Cold-Call Deal Maker for Agents & Landlords
                  </span>
                  <h3 className="text-xl font-extrabold">
                    Reverse Rental Auction: UAE-PASS Verified Tenants With Cheques Ready
                  </h3>
                  <p className="text-xs text-gray-600">
                    Instead of landlords waiting months for leads, agents post pre-verified corporate tenants with employment & cheque proof. Landlords and holding agents click <strong>"Bid Unit (-3%)"</strong> to win an instant lease today.
                  </p>

                  <div className="space-y-3">
                    {(data?.reverseBriefs ?? []).map(b => (
                      <div
                        key={b.id}
                        className="p-4 rounded-2xl bg-[#FBF8F1] border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm">{b.tenantAlias}</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              UAE PASS + {b.chequesReady} Cheque(s) Ready
                            </span>
                            <span className="text-gray-500">{b.briefCode}</span>
                          </div>
                          <div className="text-gray-700">
                            Target: <strong>{b.preferredCommunities}</strong> · Min {b.bedroomsMin} BR · Max Budget:{' '}
                            <strong>{aed(b.maxAnnualBudgetAed)}/yr</strong> · Move-in {b.targetMoveInDate}
                          </div>
                          <div className="text-[#17625F] font-semibold">
                            {b.status} ({b.bidsCount} Landlord Bids)
                          </div>
                        </div>
                        <button
                          onClick={() => handleBidOnTenantBrief(b)}
                          className="px-3.5 py-2 rounded-xl bg-[#17191C] text-[#D6B46C] font-bold hover:opacity-90"
                        >
                          Pitch My Unit & Bid {aed(Math.round((b.bestBidRentAed ?? b.maxAnnualBudgetAed) * 0.97))}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 bg-[#FBF8F1] p-5 rounded-2xl border border-[#E5DEC9] space-y-3">
                  <span className="text-xs font-bold uppercase text-[#17625F]">
                    Post Verified Tenant Mandate
                  </span>
                  <h4 className="text-base font-extrabold">
                    Broadcast Pre-Qualified Tenant to Landlords & A2A Network
                  </h4>
                  <form onSubmit={submitTenantBrief} className="space-y-2.5 text-xs">
                    <input
                      value={briefAlias}
                      onChange={e => setBriefAlias(e.target.value)}
                      placeholder="Tenant Role / Alias (e.g., Partner at McKinsey)"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white font-semibold"
                    />
                    <input
                      value={briefCommunities}
                      onChange={e => setBriefCommunities(e.target.value)}
                      placeholder="Target Communities"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-gray-500 block mb-1">Min Beds</label>
                        <input
                          type="number"
                          value={briefBeds}
                          onChange={e => setBriefBeds(Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-1">Max Budget</label>
                        <input
                          type="number"
                          value={briefBudget}
                          onChange={e => setBriefBudget(Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-lg border border-gray-300 bg-white font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-gray-500 block mb-1">Cheques</label>
                        <select
                          value={briefCheques}
                          onChange={e => setBriefCheques(Number(e.target.value) as ChequeOption)}
                          className="w-full px-2 py-2 rounded-lg border border-gray-300 bg-white font-bold"
                        >
                          <option value={1}>1 Chq</option>
                          <option value={2}>2 Chq</option>
                          <option value={4}>4 Chq</option>
                          <option value={12}>12x Mo</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#17625F] text-white font-bold"
                    >
                      Broadcast Verified Tenant Brief (Lock 50% Agent Split)
                    </button>
                  </form>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            MODULE 4: POST-LEASE TENANCY SHIELD, PDC VAULT & RERA DECREE 43
           ============================================================ */}
        {activeTab === 'shield' && (
          <div className="space-y-6">
            <section className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                      Loopholes #11, #13, #15 & #18 Solved + 105-Day Agent Renewal Harvester
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold">
                      Active Ejari Leases, 90-Day RERA Renewal Shield & Expiry Harvester
                    </h2>
                  </div>
                  <ShieldCheck className="text-[#17625F] shrink-0" size={28} />
                </div>

                <div className="space-y-4">
                  {(data?.leases ?? []).map((l: any) => {
                    const ev = l.reraEvaluation
                    return (
                      <div
                        key={l.id}
                        className="p-4 rounded-2xl bg-[#FBF8F1] border border-[#E5DEC9] space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-[#17625F]">{l.lease_code}</span>
                            <h3 className="text-base font-bold">{l.unit_label}</h3>
                            <p className="text-xs text-gray-600">
                              Tenant: <strong>{l.tenant_name}</strong> · Landlord: <strong>{l.landlord_name}</strong>
                            </p>
                          </div>
                          <div className="text-right">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                ev.isLegalProposal
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {ev.isLegalProposal
                                ? 'RERA Renewal Compliant'
                                : 'Illegal Rent Hike Blocked by SWK Shield'}
                            </span>
                            <div className="text-[11px] text-gray-500 mt-1">
                              90-Day Notice Cutoff: <strong>{ev.noticeDeadlineDate}</strong>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-xl border border-gray-200">
                          <div>
                            <span className="text-gray-500 block">Current Rent</span>
                            <strong>{aed(l.current_annual_rent)}</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block">DLD RERA Index</span>
                            <strong>{aed(l.rera_index_rent)}</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Landlord Proposed</span>
                            <strong className="text-red-700">{aed(l.proposed_renewal_rent)}</strong>
                          </div>
                          <div>
                            <span className="text-gray-500 block">SWK Legal Max Cap</span>
                            <strong className="text-emerald-700">
                              {aed(ev.maxLegalRenewalRent)} (+{ev.maxAllowedIncreasePct}%)
                            </strong>
                          </div>
                        </div>

                        {ev.violations.length > 0 && (
                          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 space-y-1">
                            {ev.violations.map((v: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 font-medium">
                                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-700" />
                                <span>{v}</span>
                              </div>
                            ))}
                            <div className="pt-1 font-bold text-emerald-800">
                              → SWK Renewal Shield saves tenant {aed(ev.tenantAnnualSavingsVsProposalAed)}/yr!
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 swk-obsidian-card text-white rounded-2xl p-5 sm:p-6 border border-[#B89040]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#D6B46C] font-bold">
                      Dubai Decree 43 of 2013 + Law 33 of 2008
                    </span>
                    <h3 className="text-lg font-extrabold">
                      Interactive RERA Rent Increase & 90-Day Notice Calculator
                    </h3>
                  </div>
                  <Scale className="text-[#D6B46C]" size={24} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Current Annual Rent (AED)</label>
                    <input
                      type="number"
                      value={simCurrentRent}
                      onChange={e => setSimCurrentRent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Official RERA Index (AED)</label>
                    <input
                      type="number"
                      value={simIndexRent}
                      onChange={e => setSimIndexRent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Landlord Proposed Rent (AED)</label>
                    <input
                      type="number"
                      value={simProposedRent}
                      onChange={e => setSimProposedRent(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Lease Expiry Date</label>
                    <input
                      type="date"
                      value={simEndDate}
                      onChange={e => setSimEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-gray-400 block mb-1">Date Written Notice Was Served</label>
                    <input
                      type="date"
                      value={simNoticeDate}
                      onChange={e => setSimNoticeDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#22262B] border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">RERA Decree 43 Band:</span>
                    <strong className="text-[#D6B46C]">{liveReraSim.bandLabel}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">90-Day Notice Cutoff Date:</span>
                    <strong>
                      {liveReraSim.noticeDeadlineDate} (
                      {liveReraSim.noticeGivenOnTime ? 'Served On Time' : 'LATE — 0% Locked'})
                    </strong>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-white/10">
                    <span className="text-gray-300">Maximum Legal Renewal Rent:</span>
                    <strong className="text-emerald-400">{aed(liveReraSim.maxLegalRenewalRent)}/yr</strong>
                  </div>
                </div>
              </div>
            </section>

            {/* PDC Cheque Vault & Maintenance AED 500 Classifier */}
            <section className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                      Loophole #14 Solved · Connected to SWK PDC Vault
                    </span>
                    <h3 className="text-lg font-extrabold">
                      Post-Dated Cheque (PDC) Vault & "Salary Delay / RNPL Bounce Shield"
                    </h3>
                  </div>
                  <Wallet className="text-[#17191C]" size={22} />
                </div>

                <div className="space-y-3">
                  {(data?.cheques ?? []).map((c: any) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{c.cheque_no}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-800">
                            {c.bank_name}
                          </span>
                          <span className="text-xs font-semibold text-[#17625F]">{c.status}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {c.unit_label} · Tenant: {c.tenant_name} · Due: <strong>{c.due_date}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm mr-2">{aed(c.amount_aed)}</span>
                        {c.status !== 'Cleared' && (
                          <>
                            <button
                              onClick={() => handlePdcAction(c.id, 'RNPL_Bounce_Shield')}
                              className="px-2.5 py-1.5 rounded-lg bg-[#17625F] text-white text-[11px] font-bold hover:opacity-90"
                            >
                              Swap to Monthly RNPL
                            </button>
                            <button
                              onClick={() => handlePdcAction(c.id, 'Cleared')}
                              className="px-2.5 py-1.5 rounded-lg bg-[#17191C] text-[#D6B46C] text-[11px] font-bold"
                            >
                              Mark Cleared
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                      Loophole #12 Solved · UAE Art. 16 Maintenance Classifier
                    </span>
                    <h3 className="text-lg font-extrabold">
                      AED 500 Minor vs. Major Maintenance Router
                    </h3>
                  </div>
                  <Wrench className="text-[#17625F]" size={22} />
                </div>

                <form onSubmit={submitMaintenance} className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-gray-500 block mb-1">Category</label>
                      <select
                        value={maintCategory}
                        onChange={e => setMaintCategory(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white"
                      >
                        <option value="AC / Cooling">AC / Cooling</option>
                        <option value="Plumbing Leak">Plumbing Leak</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Appliances">Appliances</option>
                        <option value="Structural / Roof / Water Heater">Structural / Water Heater</option>
                        <option value="Cosmetic / Bulbs">Cosmetic / Bulbs</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">Contractor Quote (AED)</label>
                      <input
                        type="number"
                        value={maintCost}
                        onChange={e => setMaintCost(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                  </div>
                  <input
                    value={maintIssue}
                    onChange={e => setMaintIssue(e.target.value)}
                    placeholder="Describe repair..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl swk-gold-gradient text-[#17191C] font-bold"
                  >
                    Classify Under UAE AED 500 Rule & Dispatch
                  </button>
                </form>

                <div className="space-y-2 pt-2 border-t border-gray-100">
                  {(data?.maintenance ?? []).slice(0, 3).map((m: any) => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] text-xs">
                      <div className="flex justify-between font-bold">
                        <span>
                          {m.unit_label} · {m.category} ({aed(m.estimated_cost_aed)})
                        </span>
                        <span
                          className={
                            m.responsible_party === 'Landlord' ? 'text-[#9E7628]' : 'text-slate-700'
                          }
                        >
                          {m.responsible_party} Pays
                        </span>
                      </div>
                      <p className="text-gray-600 mt-0.5">{m.issue_summary}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================
            MODULE 5: HYBRID SUPPLY HUB — DIRECT LANDLORDS, A2A & OS BRIDGE
           ============================================================ */}
        {activeTab === 'partners' && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#17625F]">
                      Direct-to-Landlord Self-Serve + Property Management Tiers
                    </span>
                    <h3 className="text-xl font-extrabold">
                      Onboard Property via UAE PASS & Title Deed
                    </h3>
                  </div>
                  <Landmark className="text-[#17625F]" size={24} />
                </div>

                <form onSubmit={submitLandlordOnboarding} className="space-y-3 text-xs">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-500 block mb-1">Landlord Name (UAE PASS)</label>
                      <input
                        value={llName}
                        onChange={e => setLlName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">DLD Title Deed Number</label>
                      <input
                        value={llDeed}
                        onChange={e => setLlDeed(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">Building / Tower</label>
                      <input
                        value={llBuilding}
                        onChange={e => setLlBuilding(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 block mb-1">Unit No. & Annual Rent (AED)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          value={llUnitNo}
                          onChange={e => setLlUnitNo(e.target.value)}
                          placeholder="Unit"
                          className="px-2.5 py-2 rounded-lg border border-gray-300"
                        />
                        <input
                          type="number"
                          value={llRent}
                          onChange={e => setLlRent(Number(e.target.value))}
                          className="px-2.5 py-2 rounded-lg border border-gray-300 font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-500 block mb-1">Select Landlord Service Tier</label>
                    <select
                      value={llPlan}
                      onChange={e => setLlPlan(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 font-semibold bg-[#FBF8F1]"
                    >
                      <option value="Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)">
                        Tier 1: Direct Self-Serve (AED 0 Landlord Fee · Tenant Pays Flat AED 2,999)
                      </option>
                      <option value="SWK Full Property Management (5% Annual · PDC Vault + Bi-Annual Inspections)">
                        Tier 2: SWK Full Property Management (5% · PDC Vault + Anti-Partition Inspections)
                      </option>
                      <option value="SWK 1-Cheque Upfront Guarantee (8% · Landlord Paid Day 1, Tenant Pays 12x Monthly)">
                        Tier 3: SWK 1-Cheque Upfront Guarantee (8% · Landlord Paid Day 1, Tenant Pays 12x)
                      </option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-[#17625F] text-white font-bold hover:opacity-95"
                  >
                    Verify Title Deed via DLD & Publish to swk.rent + Owner360
                  </button>
                </form>
              </div>

              <div className="lg:col-span-6 swk-obsidian-card text-white rounded-2xl p-5 sm:p-6 border border-[#B89040]/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#D6B46C]">
                      Loophole #8 Solved · Protected A2A Co-Brokering
                    </span>
                    <h3 className="text-xl font-extrabold">
                      External RERA Broker Lead Registration (50/50 Split Lock)
                    </h3>
                  </div>
                  <Users className="text-[#D6B46C]" size={24} />
                </div>

                <form onSubmit={submitA2aRegistration} className="space-y-3 text-xs">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Partner Agency Name</label>
                      <input
                        value={a2aAgency}
                        onChange={e => setA2aAgency(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">RERA ORN & Broker BRN</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          value={a2aOrn}
                          onChange={e => setA2aOrn(e.target.value)}
                          className="px-2.5 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                        />
                        <input
                          value={a2aBrn}
                          onChange={e => setA2aBrn(e.target.value)}
                          className="px-2.5 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Target SWK Unit</label>
                      <select
                        value={a2aUnitId}
                        onChange={e => setA2aUnitId(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white"
                      >
                        {(data?.units ?? []).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.buildingName} #{u.unitNo} ({aed(u.annualRent1Cheque)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Registered Tenant Client Name</label>
                      <input
                        value={a2aClient}
                        onChange={e => setA2aClient(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-semibold"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl swk-gold-gradient text-[#17191C] font-bold"
                  >
                    Lock 7-Day Lead Protection & Digital 50% A2A Commission Split
                  </button>
                </form>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  {(data?.a2aMandates ?? []).map((m: any) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-[#22262B] border border-white/10 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-[#D6B46C]">
                          {m.partner_agency_name} ({m.partner_orn}) · Broker: {m.broker_name}
                        </div>
                        <div className="text-gray-300">
                          Client: <strong>{m.client_name}</strong> · Protected until {m.protection_expires_at}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                        50% Split Locked
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Digital Offers Command Center */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                    Synced via External OS REST API (`{data?.osBridge?.osApiUrl ?? 'https://api.os.swk.rent'}`)
                  </span>
                  <h3 className="text-xl font-extrabold">
                    Live Digital Rental Offers & 48-Hour Unit Locks
                  </h3>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  Zero Personal Account Payment Guard Active
                </span>
              </div>

              {(data?.offers ?? []).length === 0 ? (
                <p className="text-xs text-gray-500">
                  No digital offers submitted yet — tap "1-Click Offer" on any unit in the Marketplace tab to test the live 48-hour unit lock!
                </p>
              ) : (
                <div className="space-y-3">
                  {(data?.offers ?? []).map((o: any) => (
                    <div
                      key={o.id}
                      className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{o.tenant_name}</span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                            {o.kyc_status}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#17191C] text-[#D6B46C] font-semibold">
                            {o.status}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          Offered: <strong>{aed(o.offered_annual_rent)}/yr</strong> ({o.cheque_option}x Mode) · True Monthly All-In: <strong>{aed(o.true_monthly_all_in_aed)}/mo</strong>
                        </div>
                        <div className="text-[#17625F] font-semibold">
                          OS Commission Split → SWK: {aed(o.swk_company_share_aed)} · Advisor: {aed(o.swk_advisor_share_aed)} · A2A: {aed(o.a2a_partner_share_aed)}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOfferDecision(o.id, 'Accepted — Ejari Issued')}
                          className="px-3 py-2 rounded-lg bg-emerald-700 text-white font-bold"
                        >
                          Landlord Accept & Issue Ejari
                        </button>
                        <button
                          onClick={() => handleOfferDecision(o.id, 'Declined — Unit Unlocked')}
                          className="px-3 py-2 rounded-lg bg-gray-200 text-gray-800 font-bold"
                        >
                          Release Lock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            MODULE 4: 7-STAGE RENTAL WORKFLOW, RBAC & FIRST 1,000-USER MVP
           ============================================================ */}
        {activeTab === 'workflow' && (
          <div className="space-y-6">
            {/* Hero Banner: 7-Stage Deal Pipeline & 1,000-User MVP Launch Control */}
            <div className="swk-obsidian-card text-white rounded-2xl p-5 sm:p-6 border border-[#B89040]/40 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold uppercase tracking-wider">
                    <Layers size={13} />
                    End-to-End UAE Rental Lifecycle · 5-Role RBAC Enforced · First 1,000 Users MVP Ready
                  </div>
                  <h2 className="text-xl sm:text-2xl font-extrabold">
                    7-Stage Rental Deal Workflow & Role-Based Access Control (RBAC)
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-300 max-w-4xl">
                    Every rental deal on <strong className="text-[#D6B46C]">SWK RENT</strong> moves through 7 verifiable stages—from UAE PASS KYC & GPS Viewing to Official DLD Ejari, 50-Point Snagging, and Building OA Move-In QR Gate Pass. Each stage is cryptographically gated by role (<strong className="text-white">Tenant, Landlord, RERA Agent, Developer, SWK Admin</strong>).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setAuthMode('signup')
                      setAuthModalOpen(true)
                    }}
                    className="px-4 py-2.5 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow-lg"
                  >
                    + Register New MVP User (Sign Up)
                  </button>
                  <button
                    onClick={() => {
                      setAuthMode('signin')
                      setAuthModalOpen(true)
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs"
                  >
                    Sign In / Switch Role
                  </button>
                </div>
              </div>

              {/* 7-Stage Master Reference Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
                {UAE_RENTAL_WORKFLOW_STAGES.map(st => (
                  <div
                    key={st.stage}
                    className="p-3 rounded-xl bg-[#22262B] border border-white/10 flex flex-col justify-between space-y-2"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-[#D6B46C]">
                        <span>STAGE {st.stage}</span>
                        <span className="text-gray-400">SLA {st.slaHours}h</span>
                      </div>
                      <div className="font-bold text-xs text-white mt-0.5">{st.shortTitle}</div>
                      <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">{st.description}</p>
                    </div>
                    <div className="pt-1.5 border-t border-white/10 text-[10px] text-emerald-300 font-semibold">
                      Roles: {st.allowedRolesToAdvance.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active 7-Stage Rental Deal Workflows */}
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#17625F]">
                        Live Deal Pipeline · Role-Gated Stage Sign-Offs
                      </span>
                      <h3 className="text-lg sm:text-xl font-extrabold">
                        Active 7-Stage UAE Rental Workflows ({(data?.workflows ?? []).length})
                      </h3>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#17191C] text-[#D6B46C] text-xs font-bold">
                      Your Active Role: {effectiveRole} ({ROLE_CAPABILITIES[effectiveRole].label})
                    </span>
                  </div>

                  <div className="space-y-4">
                    {(data?.workflows ?? []).map(wf => {
                      const nextStageNum = wf.currentStage < 7 ? wf.currentStage + 1 : null
                      const nextStageDef = nextStageNum
                        ? UAE_RENTAL_WORKFLOW_STAGES.find(s => s.stage === nextStageNum)
                        : null
                      const perm = nextStageNum
                        ? canRoleAdvanceWorkflowStage(effectiveRole, nextStageNum)
                        : { allowed: false }

                      return (
                        <div
                          key={wf.id}
                          className="p-4 sm:p-5 rounded-2xl bg-[#FBF8F1] border border-[#D6B46C]/50 space-y-4 shadow-sm"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded bg-[#17191C] text-[#D6B46C] font-extrabold text-xs">
                                  {wf.workflowCode}
                                </span>
                                <span className="font-extrabold text-sm sm:text-base text-[#17191C]">
                                  {wf.buildingName} · Unit #{wf.unitNo}
                                </span>
                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    wf.status === 'COMPLETED_ACTIVE_LEASE'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                                  }`}
                                >
                                  {wf.status === 'COMPLETED_ACTIVE_LEASE'
                                    ? '✓ Stage 7/7 Completed — Active Lease'
                                    : `In Progress · Stage ${wf.currentStage} of 7`}
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Tenant: <strong>{wf.tenantName}</strong> · Landlord: <strong>{wf.landlordName}</strong> · Advisor: <strong>{wf.advisorName}</strong>
                              </div>
                            </div>

                            <div className="text-right text-xs">
                              <div className="font-extrabold text-sm text-[#17625F]">
                                {aed(wf.annualRentAed)}/yr ({wf.chequeOption}x Mode)
                              </div>
                              <div className="text-[11px] text-gray-500">
                                Split → SWK: {aed(wf.swkCompanyShareAed)} · Advisor: {aed(wf.swkAdvisorShareAed)} · A2A: {aed(wf.a2aPartnerShareAed)}
                              </div>
                            </div>
                          </div>

                          {/* 7-Step Progress Bar */}
                          <div className="grid grid-cols-7 gap-1.5">
                            {UAE_RENTAL_WORKFLOW_STAGES.map(st => {
                              const done = st.stage <= wf.currentStage
                              const current = st.stage === wf.currentStage
                              return (
                                <div
                                  key={st.stage}
                                  className={`p-2 rounded-lg border text-center transition ${
                                    done
                                      ? current
                                        ? 'bg-[#17191C] text-[#D6B46C] border-[#B89040] font-bold shadow'
                                        : 'bg-[#17625F] text-white border-[#17625F] font-semibold'
                                      : 'bg-white text-gray-400 border-gray-200'
                                  }`}
                                >
                                  <div className="text-[10px] font-extrabold">S{st.stage}</div>
                                  <div className="text-[10px] truncate">{st.shortTitle.slice(3)}</div>
                                </div>
                              )
                            })}
                          </div>

                          {/* Certificates & Deliverable Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 font-semibold">
                                Ejari / Tawtheeq: <strong className="text-[#17625F]">{wf.ejariOrTawtheeqNo}</strong>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 font-semibold">
                                Move-In NOC Gate Pass: <strong className="text-[#9E7628]">{wf.gatePassCode}</strong>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 font-semibold">
                                Snagging Shield: <strong>{wf.snaggingScore}/100</strong>
                              </span>
                            </div>

                            {nextStageDef ? (
                              <div className="flex flex-wrap items-center gap-2">
                                {perm.allowed ? (
                                  <button
                                    onClick={() => handleAdvanceWorkflow(wf.id)}
                                    className="px-3.5 py-2 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow hover:opacity-95"
                                  >
                                    Sign Off & Advance to {nextStageDef.shortTitle} →
                                  </button>
                                ) : (
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-[11px] text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 font-semibold">
                                      Next ({nextStageDef.shortTitle}) requires {nextStageDef.allowedRolesToAdvance.join('/')}
                                    </span>
                                    <button
                                      onClick={() => handleQuickRoleSwitch(nextStageDef.allowedRolesToAdvance[0]!)}
                                      className="px-2.5 py-1.5 rounded-lg bg-[#17191C] text-[#D6B46C] font-bold text-[11px]"
                                    >
                                      Switch to {nextStageDef.allowedRolesToAdvance[0]}
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs">
                                ✓ All 7 Stages Complete · Keys Handed Over
                              </span>
                            )}
                          </div>

                          {/* Stage History Audit Log */}
                          <div className="pt-2 border-t border-[#E5DEC9] space-y-1">
                            <div className="text-[11px] font-bold text-gray-500 uppercase">
                              Verified Workflow Audit Trail:
                            </div>
                            <div className="grid sm:grid-cols-2 gap-1.5 text-[11px]">
                              {wf.stageHistory.map((h, idx) => (
                                <div key={idx} className="p-2 rounded bg-white border border-gray-200">
                                  <span className="font-bold text-[#17625F]">Stage {h.stage}</span> ·{' '}
                                  <strong>{h.completedByName}</strong>{' '}
                                  <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-semibold">
                                    {h.completedByRole}
                                  </span>
                                  <div className="text-gray-600 truncate">{h.note}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Launch New Deal Workflow + App Icons Showcase */}
              <div className="lg:col-span-4 space-y-6">
                <div className="bg-white rounded-2xl p-5 border border-[#E5DEC9] shadow-sm space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                    Initiate New Rental Deal
                  </span>
                  <h3 className="text-lg font-extrabold">
                    Launch 7-Stage Deal Workflow
                  </h3>
                  <form onSubmit={handleCreateWorkflow} className="space-y-3 text-xs">
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Select Verified Unit</label>
                      <select
                        value={wfUnitId}
                        onChange={e => setWfUnitId(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold bg-[#FBF8F1]"
                      >
                        {(data?.units ?? []).map(u => (
                          <option key={u.id} value={u.id}>
                            {u.unitCode} · {u.buildingName} #{u.unitNo} ({aed(u.annualRent1Cheque)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Verified Tenant Name</label>
                      <input
                        value={wfTenantName}
                        onChange={e => setWfTenantName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-600 block mb-1 font-semibold">Agreed Rent (AED)</label>
                        <input
                          type="number"
                          value={wfAnnualRent}
                          onChange={e => setWfAnnualRent(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-gray-600 block mb-1 font-semibold">Payment Split</label>
                        <select
                          value={wfCheques}
                          onChange={e => setWfCheques(Number(e.target.value) as ChequeOption)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                        >
                          <option value={1}>1 Cheque</option>
                          <option value={2}>2 Cheques</option>
                          <option value={4}>4 Cheques</option>
                          <option value={12}>12x Monthly</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-[#17191C] text-[#D6B46C] font-extrabold text-xs"
                    >
                      Create 7-Stage Deal Pipeline
                    </button>
                  </form>
                </div>

                {/* Official Android & iOS Matte Gold App Icon Showcase & Switcher */}
                <div className="swk-obsidian-card text-white rounded-2xl p-5 border border-[#B89040]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#D6B46C]">
                        Android & iOS (`ae.swk.rent`) App Icons
                      </span>
                      <h3 className="text-base font-extrabold">
                        Official Matte Gold App Icon Kit
                      </h3>
                    </div>
                    <Smartphone className="text-[#D6B46C]" size={22} />
                  </div>

                  <img
                    src="/brand/app-icons/SWK_Matte_Gold_Wordmark_App_Icon_Preview.png"
                    alt="SWK Matte Gold Android & iOS App Icons Preview"
                    className="w-full rounded-xl border border-[#B89040]/40 shadow-md"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleSwitchAppIconVariant('emblem')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        appIconVariant === 'emblem'
                          ? 'bg-[#B89040]/25 border-[#D6B46C] text-white font-bold'
                          : 'bg-[#17191C] border-white/10 text-gray-400'
                      }`}
                    >
                      <img
                        src="/brand/app-icons/Emblem_and_SWK/Android/Google-Play-512.png"
                        alt="Emblem + SWK"
                        className="w-10 h-10 rounded-lg border border-white/20"
                      />
                      <div>
                        <div className="text-[11px] font-bold text-white">Emblem + SWK</div>
                        <div className="text-[10px] text-[#D6B46C]">Primary Icon</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSwitchAppIconVariant('wordmark')}
                      className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                        appIconVariant === 'wordmark'
                          ? 'bg-[#B89040]/25 border-[#D6B46C] text-white font-bold'
                          : 'bg-[#17191C] border-white/10 text-gray-400'
                      }`}
                    >
                      <img
                        src="/brand/app-icons/SWK_Wordmark/Android/Google-Play-512.png"
                        alt="SWK Wordmark"
                        className="w-10 h-10 rounded-lg border border-white/20"
                      />
                      <div>
                        <div className="text-[11px] font-bold text-white">SWK Wordmark</div>
                        <div className="text-[10px] text-[#D6B46C]">Alternate Icon</div>
                      </div>
                    </button>
                  </div>

                  <div className="text-[11px] text-gray-300 space-y-1 pt-1 border-t border-white/10">
                    <div>✓ <strong>Android:</strong> Adaptive `mipmap-anydpi-v26/v33` + `Google-Play-512.png` + Gradle Wrapper ready</div>
                    <div>✓ <strong>iOS:</strong> Xcode `AppIcon.appiconset` + `AppIconWordmark.appiconset` (`1024x1024`) wired</div>
                  </div>
                </div>
              </div>
            </div>

            {/* First 1,000-User MVP Telemetry, RBAC Matrix & Audit Trail */}
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#17625F]">
                      5-Persona Role-Based Access Control (RBAC)
                    </span>
                    <h3 className="text-lg font-extrabold">
                      Registered MVP Accounts & Role Capabilities
                    </h3>
                  </div>
                  <Users className="text-[#17625F]" size={22} />
                </div>

                <div className="space-y-2.5 text-xs">
                  {(data?.demoUsers ?? []).map(u => (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <div className="font-bold text-[#17191C]">
                          {u.fullName}{' '}
                          <span className="px-2 py-0.5 rounded bg-[#17191C] text-[#D6B46C] text-[10px] font-extrabold">
                            {u.role}
                          </span>
                        </div>
                        <div className="text-gray-500 text-[11px]">
                          {u.email} · {u.phone} {u.reraBrn ? `· ${u.reraBrn}` : ''} {u.titleDeedRef ? `· ${u.titleDeedRef}` : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuickRoleSwitch(u.role)}
                        className="px-3 py-1.5 rounded-lg bg-[#17625F] text-white font-bold text-[11px]"
                      >
                        Act as {u.role}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                      First 1,000 Users Production Hardening
                    </span>
                    <h3 className="text-lg font-extrabold">
                      Live Compliance & Security Audit Log
                    </h3>
                  </div>
                  <ShieldCheck className="text-[#9E7628]" size={22} />
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                    <span className="text-gray-500 block">MVP Cohort Capacity</span>
                    <strong className="text-base text-[#17191C]">
                      {data?.mvpTelemetry?.registeredUsersCount ?? 6} / 1,000
                    </strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                    <span className="text-gray-500 block">SQLite WAL + Helmet</span>
                    <strong className="text-base text-emerald-700">Active (600 req/m)</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                    <span className="text-gray-500 block">Password & Session</span>
                    <strong className="text-base text-[#17625F]">scrypt + SHA-256</strong>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1 text-xs">
                  {(data?.mvpTelemetry?.recentAuditLogs ?? []).map((log: any) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg bg-[#FBF8F1] border border-gray-200 flex items-start justify-between gap-2"
                    >
                      <div>
                        <span className="font-bold text-[#17191C]">{log.action}</span>{' '}
                        <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-800 text-[10px] font-bold">
                          {log.user_role}
                        </span>
                        <div className="text-gray-600 text-[11px]">{log.details}</div>
                      </div>
                      <span className="text-[10px] text-gray-400 shrink-0">
                        {String(log.created_at).slice(11, 19)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* External OS REST API & Webhook Integration Control Center */}
            <div className="swk-obsidian-card text-white rounded-2xl p-5 sm:p-6 border border-[#B89040]/40 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#D6B46C]">
                    swk.rent API-First Architecture · Zero Direct Repo Coupling
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold">
                    External OS REST API & Webhook Integration Bridge
                  </h3>
                  <p className="text-xs text-gray-300 mt-0.5">
                    All property inventory, key-vault telemetry, and 7-stage rental deal updates communicate exclusively via REST API & Webhooks (`GET /api/os-api/status`, `POST /api/os-api/sync-inventory`, `POST /api/os-api/webhook`).
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                  REST API Connected · {data?.osBridge?.apiLinkedUnitsCount ?? 6} Units Linked
                </span>
              </div>

              <div className="grid lg:grid-cols-12 gap-5 items-start">
                <form onSubmit={handleSaveOsApiConfig} className="lg:col-span-5 bg-[#22262B] p-4 rounded-xl border border-white/10 space-y-3 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1 font-semibold">
                      External OS REST API Base URL (`SWK_OS_API_URL`)
                    </label>
                    <input
                      value={osApiUrlInput}
                      onChange={e => setOsApiUrlInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-mono text-xs"
                      placeholder="https://api.os.swk.rent"
                    />
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1 font-semibold">
                      API Bearer Key (`{data?.osBridge?.osApiKeyMasked ?? 'elv_live_****_orn51517'}`)
                    </label>
                    <input
                      type="password"
                      value={osApiKeyInput}
                      onChange={e => setOsApiKeyInput(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#111315] border border-white/15 text-white font-mono text-xs"
                      placeholder="Leave blank to keep active key or enter new API key"
                    />
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Inbound Webhook Receiver: <code className="text-[#D6B46C]">{data?.osBridge?.webhookEndpoint ?? 'https://swk.rent/api/os-api/webhook'}</code>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="submit"
                      className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold"
                    >
                      Save API Endpoint
                    </button>
                    <button
                      type="button"
                      disabled={osSyncBusy}
                      onClick={() => void handleSyncOsInventory()}
                      className="py-2.5 px-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold"
                    >
                      {osSyncBusy ? 'Syncing REST API...' : 'Pull OS Inventory via API'}
                    </button>
                  </div>
                </form>

                <div className="lg:col-span-7 bg-[#22262B] p-4 rounded-xl border border-white/10 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#D6B46C] uppercase tracking-wider text-[11px]">
                      Live OS REST API & Webhook Transaction Log
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Domain: <strong className="text-white">https://swk.rent</strong>
                    </span>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(data?.osBridge?.recentSyncLogs ?? []).map((item: any) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-[#17191C] border border-white/10 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-[#B89040]/20 text-[#D6B46C] font-bold text-[10px]">
                              {item.direction}
                            </span>
                            <span className="font-bold text-white">{item.event_type}</span>
                            <span className="text-emerald-400 text-[11px] font-semibold">{item.status}</span>
                          </div>
                          <div className="text-gray-300 text-[11px] mt-0.5">{item.payload_summary}</div>
                          <div className="text-gray-500 font-mono text-[10px]">{item.endpoint}</div>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {String(item.created_at).slice(11, 19)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            MODULE 7: PRODUCTION SIGN-IN, REGISTRATION, 8 DEDICATED DEMO
            ACCOUNTS & CONNECTED CUSTOM USAGE COMMAND CENTER
           ============================================================ */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            {/* Hero Banner */}
            <section className="swk-obsidian-card text-white rounded-2xl p-5 sm:p-7 border border-[#B89040]/50 shadow-2xl">
              <div className="grid lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-3">
                  <div className="inline-flex flex-wrap items-center gap-2 px-3 py-1 rounded-full bg-[#B89040]/20 border border-[#B89040]/40 text-[#D6B46C] text-xs font-bold">
                    <KeyRound size={14} />
                    SWK RENT Identity, 8 Dedicated Role Demo Accounts & Connected Custom Usage Engine
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Sign In, Register, or Instant-Switch Across{' '}
                    <span className="text-[#D6B46C]">8 Dedicated UAE Rental Personas</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Every account on <strong className="text-white">swk.rent</strong> is directly wired to a persistent{' '}
                    <strong className="text-[#D6B46C]">Custom Usage Profile</strong> in SQLite — controlling your default
                    cheque split (<code className="text-emerald-300">1 / 2 / 4 / 12x UAEDDS / 30-Day Expat Bridge</code>),
                    custom flat fee or commission split, DIFC commute filter, personal REST API key, webhook endpoint,
                    WhatsApp client pitch signature, and live AED 0 portal credit telemetry.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
                      ✓ 8 Dedicated Demo Accounts (All 5 RBAC Roles + Sub-Personas)
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-gray-200 font-semibold">
                      ✓ 1-Tap UAE PASS Digital Identity + RERA BRN/ORN + Title Deed Check
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-[#B89040]/20 border border-[#D6B46C]/40 text-[#D6B46C] font-bold">
                      ✓ AED 0 Portal Credit Burn vs AED 95k–240k/yr Legacy Portals
                    </span>
                  </div>
                </div>

                {/* Active Session & Connected Custom Usage Summary Box */}
                <div className="lg:col-span-4 bg-[#22262B] p-4 rounded-xl border border-[#B89040]/40 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#D6B46C]">
                      Active Connected Session
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                      {currentUser ? 'ENCRYPTED SESSION ACTIVE' : `DEMO PERSONA (${effectiveRole})`}
                    </span>
                  </div>
                  <div className="font-extrabold text-base text-white">
                    {currentUser ? currentUser.fullName : `Active Role: ${effectiveRole}`}
                  </div>
                  <div className="text-gray-300 text-[11px]">
                    Email: <strong className="text-white">{currentUser?.email ?? loginEmail}</strong> · Role:{' '}
                    <strong className="text-[#D6B46C]">{effectiveRole}</strong>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#17191C] border border-white/10 space-y-1 text-[11px]">
                    <div className="text-[#D6B46C] font-bold">
                      {currentUser?.customUsage?.customPlanTier ?? cuPlanTier}
                    </div>
                    <div className="text-gray-300">
                      Split / Fee Rule:{' '}
                      <strong className="text-white">
                        {currentUser?.customUsage?.commissionSplitRatio ?? cuSplitRatio}
                      </strong>
                    </div>
                    <div className="text-emerald-400 font-semibold">
                      Portal Credit Burn: AED 0 · Saved vs Competitors:{' '}
                      {aed(currentUser?.customUsage?.estimatedCompetitorSpendSavedAed ?? 84000)}/yr
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ============================================================
                SECTION 1: 8 DEDICATED DEMO ACCOUNTS MATRIX (ALL ROLES)
               ============================================================ */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#9E7628]">
                    Instant 1-Click Role & Persona Switching · Password for All Demo Accounts: SwkRent2026!
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#17191C]">
                    8 Dedicated Demo Accounts Across All 5 UAE Rental Roles (Connected to Custom Usage)
                  </h3>
                </div>

                {/* Role Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {(
                    [
                      { id: 'ALL', label: 'All 8 Accounts' },
                      { id: 'TENANT', label: 'Tenants (2)' },
                      { id: 'LANDLORD', label: 'Landlords (2)' },
                      { id: 'AGENT', label: 'RERA Agents (2)' },
                      { id: 'DEVELOPER', label: 'Developer (1)' },
                      { id: 'ADMIN', label: 'SWK Admin (1)' },
                    ] as const
                  ).map(f => (
                    <button
                      key={f.id}
                      onClick={() => setDemoRoleFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                        demoRoleFilter === f.id
                          ? 'bg-[#17191C] text-[#D6B46C] border-[#B89040]'
                          : 'bg-[#FBF8F1] text-gray-700 border-[#E5DEC9] hover:border-[#B89040]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {(data?.demoUsers ?? [])
                  .filter(u => demoRoleFilter === 'ALL' || u.role === demoRoleFilter)
                  .map(u => {
                    const meta = DEDICATED_DEMO_PERSONA_META[u.email] ?? {
                      badge: `${u.role} · VERIFIED DEMO`,
                      personaTitle: ROLE_CAPABILITIES[u.role]?.label ?? u.role,
                      highlightColor: 'border-[#E5DEC9] bg-[#FBF8F1] text-[#17191C]',
                      keySuperpower: 'Full RBAC workflow & custom usage telemetry connected.',
                      competitorEdge: 'AED 0 portal listing fee & verified UAE PASS identity.',
                    }
                    const isCurrentAccount = currentUser?.email?.toLowerCase() === u.email.toLowerCase()
                    const cu = u.customUsage
                    return (
                      <div
                        key={u.id}
                        className={`rounded-2xl p-4 border-2 transition flex flex-col justify-between space-y-3 ${
                          isCurrentAccount
                            ? 'border-[#17625F] bg-[#F3FAF9] shadow-lg ring-2 ring-[#17625F]/20'
                            : 'border-[#E5DEC9] bg-[#FBF8F1] hover:border-[#B89040] shadow-sm'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#17191C] text-[#D6B46C] font-extrabold text-[10px] tracking-wide">
                              {meta.badge}
                            </span>
                            {isCurrentAccount && (
                              <span className="px-2 py-0.5 rounded-full bg-[#17625F] text-white font-bold text-[10px] flex items-center gap-1">
                                <CheckCircle2 size={11} /> Active Account
                              </span>
                            )}
                          </div>

                          <div>
                            <h4 className="font-extrabold text-sm sm:text-base text-[#17191C]">{u.fullName}</h4>
                            <p className="text-[11px] font-semibold text-[#9E7628]">{meta.personaTitle}</p>
                            <p className="text-[11px] text-gray-600">{u.agencyOrCompanyName}</p>
                          </div>

                          {/* Credentials & Regulatory IDs */}
                          <div className="p-2.5 rounded-xl bg-white border border-[#E5DEC9] text-[11px] space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Email:</span>
                              <code className="font-bold text-[#17191C]">{u.email}</code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">Password:</span>
                              <code className="font-bold text-[#17625F]">SwkRent2026!</code>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500">UAE PASS / ID:</span>
                              <span className="font-semibold text-gray-800">{u.emiratesIdOrPassport}</span>
                            </div>
                            {u.reraBrn && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">RERA BRN / ORN:</span>
                                <span className="font-bold text-[#9E7628]">
                                  {u.reraBrn} · {u.reraOrn}
                                </span>
                              </div>
                            )}
                            {u.titleDeedRef && (
                              <div className="flex items-center justify-between">
                                <span className="text-gray-500">Title Deed Ref:</span>
                                <span className="font-bold text-[#17625F]">{u.titleDeedRef}</span>
                              </div>
                            )}
                          </div>

                          {/* Connected Custom Usage Profile Summary */}
                          {cu && (
                            <div className="p-2.5 rounded-xl bg-[#17191C] text-white text-[11px] space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[#D6B46C] font-bold uppercase text-[10px]">
                                  Connected Custom Usage
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                                  {cu.defaultChequeMode === 12
                                    ? '12x UAEDDS'
                                    : cu.defaultChequeMode === 30
                                      ? '30d Expat Bridge'
                                      : `${cu.defaultChequeMode} Cheque(s)`}
                                </span>
                              </div>
                              <div className="font-semibold text-gray-200 line-clamp-1">{cu.customPlanTier}</div>
                              <div className="text-[10px] text-gray-400">
                                Fee/Split: <strong className="text-white">{cu.commissionSplitRatio}</strong>
                              </div>
                              <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/10 text-center">
                                <div>
                                  <div className="text-[9px] text-gray-400">Synced/Active</div>
                                  <div className="font-extrabold text-[#D6B46C]">{cu.listingsSyncedCount}</div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-gray-400">Offers/Deals</div>
                                  <div className="font-extrabold text-white">
                                    {cu.digitalOffersSubmittedOrReviewed + cu.workflowsSignedOffCount}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[9px] text-gray-400">Saved/Yr</div>
                                  <div className="font-extrabold text-emerald-400">
                                    {cu.estimatedCompetitorSpendSavedAed > 0
                                      ? `${Math.round(cu.estimatedCompetitorSpendSavedAed / 1000)}k`
                                      : 'AED 2.9k Fee'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          <p className="text-[11px] text-gray-600 leading-snug">
                            <strong className="text-[#17191C]">Superpower:</strong> {meta.keySuperpower}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-1.5 pt-2">
                          <button
                            type="button"
                            onClick={() => void handleDemoAccountLogin(u.email)}
                            className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs transition shadow flex items-center justify-center gap-1.5 ${
                              isCurrentAccount
                                ? 'bg-[#17625F] text-white'
                                : 'swk-gold-gradient text-[#17191C] hover:opacity-95'
                            }`}
                          >
                            <KeyRound size={13} />
                            {isCurrentAccount
                              ? 'Active — Re-Sync Custom Usage'
                              : `1-Click Sign In as ${u.fullName.split(' ')[0]}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode('signin')
                              setLoginEmail(u.email)
                              setLoginPassword('SwkRent2026!')
                              showNotice('ok', `Loaded ${u.email} into Sign-In form.`)
                            }}
                            className="w-full py-1.5 px-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-[11px]"
                          >
                            Load Credentials into Sign-In Form
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </section>

            {/* ============================================================
                SECTION 2: PRODUCTION SIGN-IN / REGISTER PORTAL (LEFT) +
                CONNECTED CUSTOM USAGE CONTROL STUDIO & TELEMETRY (RIGHT)
               ============================================================ */}
            <div className="grid lg:grid-cols-12 gap-6">
              {/* LEFT PANE: PRODUCTION SIGN-IN & ROLE-TAILORED REGISTRATION */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#B89040]/60 shadow-md space-y-5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#9E7628]">
                      UAE PASS · RERA ORN 51517 · DLD Title Deed Gate
                    </span>
                    <h3 className="text-xl font-extrabold text-[#17191C]">
                      {authMode === 'signin'
                        ? 'Production Sign-In Portal'
                        : 'Verified Role Registration & Custom Usage Setup'}
                    </h3>
                  </div>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] text-xs font-extrabold">
                  <button
                    type="button"
                    onClick={() => setAuthMode('signin')}
                    className={`py-2.5 rounded-lg transition ${
                      authMode === 'signin'
                        ? 'bg-[#17191C] text-[#D6B46C] shadow'
                        : 'text-gray-600 hover:text-[#17191C]'
                    }`}
                  >
                    Sign In (Email / UAE PASS / Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className={`py-2.5 rounded-lg transition ${
                      authMode === 'signup'
                        ? 'bg-[#17191C] text-[#D6B46C] shadow'
                        : 'text-gray-600 hover:text-[#17191C]'
                    }`}
                  >
                    Register New Verified Account
                  </button>
                </div>

                {authMode === 'signin' ? (
                  <div className="space-y-5 text-xs">
                    {/* 1-Tap UAE PASS Digital Identity Quick Authentication */}
                    <div className="p-4 rounded-2xl bg-[#F3FAF9] border border-[#17625F]/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-[#17625F] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <ShieldCheck size={15} />
                          1-Tap UAE PASS Biometric Digital Identity Sign-In
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#17625F] text-white font-bold text-[10px]">
                          ICP / DLD Verified
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600">
                        Authenticate immediately with UAE PASS (Emirates ID + verified mobile) and auto-connect your
                        role&apos;s Custom Usage rules without typing passwords:
                      </p>
                      <div className="grid sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void handleUaePassLogin('tenant@uaepass.ae')}
                          className="p-2.5 rounded-xl bg-[#17625F] hover:bg-[#124e4b] text-white font-bold text-left transition flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-extrabold">UAE PASS · Executive Tenant</div>
                            <div className="text-[10px] text-emerald-200">Alexander Vance (EID Verified)</div>
                          </div>
                          <ArrowUpRight size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleUaePassLogin('landlord@swk.rent')}
                          className="p-2.5 rounded-xl bg-[#17191C] hover:bg-black text-white font-bold text-left transition flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-extrabold text-[#D6B46C]">UAE PASS · Owner360 Landlord</div>
                            <div className="text-[10px] text-gray-300">Dr. Khalid (Title Deed Linked)</div>
                          </div>
                          <ArrowUpRight size={16} className="text-[#D6B46C]" />
                        </button>
                      </div>
                    </div>

                    {/* Standard Email & Password Form */}
                    <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">
                          Registered Email Address (`@swk.rent`, `@uaepass.ae`, or Corporate Domain)
                        </label>
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={e => setLoginEmail(e.target.value)}
                          placeholder="advisor@swk.rent"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm"
                          required
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-gray-700 font-bold">Password</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="text-[11px] text-[#9E7628] font-bold underline"
                          >
                            {showPassword ? 'Hide Password' : 'Show Password'}
                          </button>
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={loginPassword}
                          onChange={e => setLoginPassword(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 font-semibold text-sm"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3.5 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-sm shadow-lg"
                      >
                        Sign In & Connect Custom Usage Profile
                      </button>
                    </form>

                    {/* Quick 8-Account Pill Bar */}
                    <div className="pt-3 border-t border-gray-200 space-y-2">
                      <div className="font-bold text-gray-700">
                        Quick Switch Any of the 8 Dedicated Demo Accounts (Password: <code>SwkRent2026!</code>):
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(data?.demoUsers ?? []).map(u => (
                          <button
                            key={u.email}
                            type="button"
                            onClick={() => void handleDemoAccountLogin(u.email)}
                            className="p-2 rounded-lg bg-[#FBF8F1] hover:bg-[#F4EFE3] border border-[#D6B46C]/60 text-left transition"
                          >
                            <div className="font-extrabold text-[#17191C] truncate">
                              [{u.role}] {u.fullName}
                            </div>
                            <div className="text-[10px] text-gray-600 truncate">{u.email}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* REGISTRATION FORM WITH ROLE-SPECIFIC VERIFICATION & INITIAL CUSTOM USAGE */
                  <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs">
                    <div>
                      <label className="text-gray-700 block mb-1.5 font-bold">
                        1. Choose Your UAE Rental Role (Auto-Configures Custom Usage Defaults)
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {(
                          [
                            {
                              role: 'TENANT' as UserRole,
                              title: 'TENANT',
                              sub: '12x UAEDDS & RERA Shield',
                              plan: 'UAE PASS Verified Tenant — 12x Monthly UAEDDS & RERA Shield',
                              cheque: 12 as ChequeOption,
                              fee: 2999,
                              comm: 5,
                              split: 'Flat AED 2,999 Direct Landlord / 5% Standard Agency',
                            },
                            {
                              role: 'LANDLORD' as UserRole,
                              title: 'LANDLORD',
                              sub: 'AED 0 Fee · Owner360',
                              plan: 'Owner360 Direct Landlord — Tier 1 (AED 0 Landlord Fee)',
                              cheque: 1 as ChequeOption,
                              fee: 2999,
                              comm: 0,
                              split: '0% Landlord Fee · Tenant Pays Flat AED 2,999',
                            },
                            {
                              role: 'AGENT' as UserRole,
                              title: 'RERA AGENT',
                              sub: '50/50 Split · AED 0 XML',
                              plan: 'RERA Broker Pro — AED 0 Portal Credits + 50/50 A2A Split',
                              cheque: 2 as ChequeOption,
                              fee: 0,
                              comm: 5,
                              split: '50% Partner Broker / 50% SWK Listing Pool',
                            },
                            {
                              role: 'DEVELOPER' as UserRole,
                              title: 'DEVELOPER',
                              sub: 'BTR FIFO Queue Cap',
                              plan: 'Institutional BTR Handover — FIFO Anti-Cannibalization',
                              cheque: 4 as ChequeOption,
                              fee: 0,
                              comm: 2.5,
                              split: 'Direct BTR Institutional Mandate (AED 0 Portal Fee)',
                            },
                            {
                              role: 'ADMIN' as UserRole,
                              title: 'SWK ADMIN',
                              sub: 'ORN 51517 Compliance',
                              plan: 'SWK Enterprise OS Master — Unlimited Mandates & Escrow',
                              cheque: 1 as ChequeOption,
                              fee: 2999,
                              comm: 5,
                              split: '100% SWK House / 50-50 A2A Protected Pool',
                            },
                          ] as const
                        ).map(r => (
                          <button
                            key={r.role}
                            type="button"
                            onClick={() => {
                              setSignupRole(r.role)
                              setCuPlanTier(r.plan)
                              setCuDefaultCheque(r.cheque)
                              setCuFlatFee(r.fee)
                              setCuCommPct(r.comm)
                              setCuSplitRatio(r.split)
                            }}
                            className={`p-2.5 rounded-xl border text-left transition ${
                              signupRole === r.role
                                ? 'bg-[#17191C] text-white border-[#B89040] shadow'
                                : 'bg-[#FBF8F1] text-[#17191C] border-[#E5DEC9] hover:border-[#B89040]'
                            }`}
                          >
                            <div className="font-extrabold text-xs text-[#D6B46C]">{r.title}</div>
                            <div className="text-[10px] opacity-85 mt-0.5">{r.sub}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">Full Legal Name *</label>
                        <input
                          value={signupFullName}
                          onChange={e => setSignupFullName(e.target.value)}
                          placeholder="e.g. Layla Al Qasimi"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">UAE Mobile / WhatsApp *</label>
                        <input
                          value={signupPhone}
                          onChange={e => setSignupPhone(e.target.value)}
                          placeholder="+971 50 123 4567"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">Email Address *</label>
                        <input
                          type="email"
                          value={signupEmail}
                          onChange={e => setSignupEmail(e.target.value)}
                          placeholder="name@company.ae"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">
                          Password (min 8 chars + number) *
                        </label>
                        <input
                          type="password"
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                          required
                        />
                      </div>
                    </div>

                    {/* Password Security Meter */}
                    <div className="p-2.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-gray-600">
                        Session Encryption & Password Compliance:
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          signupPassword.length >= 8 && /[0-9]/.test(signupPassword)
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {signupPassword.length >= 8 && /[0-9]/.test(signupPassword)
                          ? '✓ Strong (SHA-256 Salted +UAE PASS Ready)'
                          : 'Requires 8+ chars & at least 1 number'}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">
                          Emirates ID or New Expat Passport No.
                        </label>
                        <input
                          value={signupEmiratesId}
                          onChange={e => setSignupEmiratesId(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-gray-700 block mb-1 font-bold">
                          Employer / Agency / Family Office
                        </label>
                        <input
                          value={signupCompany}
                          onChange={e => setSignupCompany(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                        />
                      </div>
                    </div>

                    {signupRole === 'AGENT' && (
                      <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#FBF8F1] border border-[#D6B46C]">
                        <div>
                          <label className="text-gray-700 block mb-1 font-bold">RERA Broker BRN *</label>
                          <input
                            value={signupReraBrn}
                            onChange={e => setSignupReraBrn(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                            required
                          />
                        </div>
                        <div>
                          <label className="text-gray-700 block mb-1 font-bold">Agency RERA ORN *</label>
                          <input
                            value={signupReraOrn}
                            onChange={e => setSignupReraOrn(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                            required
                          />
                        </div>
                      </div>
                    )}

                    {signupRole === 'LANDLORD' && (
                      <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#D6B46C]">
                        <label className="text-gray-700 block mb-1 font-bold">
                          DLD Title Deed / Abu Dhabi Mulkiya Reference *
                        </label>
                        <input
                          value={signupTitleDeed}
                          onChange={e => setSignupTitleDeed(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                          required
                        />
                      </div>
                    )}

                    {/* Initial Custom Usage Preferences during Registration */}
                    <div className="p-3.5 rounded-xl bg-[#17191C] text-white space-y-2.5">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#D6B46C]">
                        2. Pre-Connect Your Custom Usage Rules at Registration
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-gray-300 block mb-1 text-[10px]">Default Payment Mode</label>
                          <select
                            value={cuDefaultCheque}
                            onChange={e => setCuDefaultCheque(Number(e.target.value) as ChequeOption)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#22262B] border border-white/15 text-white font-bold"
                          >
                            <option value={1}>1 Cheque</option>
                            <option value={2}>2 Cheques</option>
                            <option value={4}>4 Cheques</option>
                            <option value={12}>12x Monthly UAEDDS</option>
                            <option value={30}>30-Day Expat Bridge</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-300 block mb-1 text-[10px]">Preferred Emirate</label>
                          <select
                            value={cuPreferredEmirate}
                            onChange={e =>
                              setCuPreferredEmirate(e.target.value as 'All' | 'Dubai' | 'Abu Dhabi')
                            }
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#22262B] border border-white/15 text-white font-bold"
                          >
                            <option value="All">All UAE</option>
                            <option value="Dubai">Dubai (DLD/Ejari)</option>
                            <option value="Abu Dhabi">Abu Dhabi (Tawtheeq)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-300 block mb-1 text-[10px]">Max DIFC Commute (Mins)</label>
                          <input
                            type="number"
                            value={cuMaxCommute}
                            onChange={e => setCuMaxCommute(Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#22262B] border border-white/15 text-white font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-sm shadow-lg"
                    >
                      Create Verified Account & Connect Custom Usage Profile
                    </button>
                  </form>
                )}
              </div>

              {/* RIGHT PANE: CONNECTED CUSTOM USAGE STUDIO & LIVE TELEMETRY */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 sm:p-6 border border-[#17625F]/50 shadow-md space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-xs font-bold uppercase text-[#17625F]">
                      Per-Account Custom Usage & Live Telemetry Engine
                    </span>
                    <h3 className="text-xl font-extrabold text-[#17191C]">
                      Connected Custom Usage Studio ({currentUser?.fullName ?? `${effectiveRole} Demo`})
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                    Synced with Marketplace & Calculator
                  </span>
                </div>

                {/* Live Telemetry Counters Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-[#17191C] text-white border border-[#B89040]/40">
                    <div className="text-[10px] text-gray-400">Listings / Mandates Synced</div>
                    <div className="text-xl font-extrabold text-[#D6B46C] mt-0.5">
                      {currentUser?.customUsage?.listingsSyncedCount ?? 18}
                    </div>
                    <div className="text-[10px] text-emerald-400">AED 0 Portal Credit Burn</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F3FAF9] border border-[#17625F]/30">
                    <div className="text-[10px] text-gray-500">Saved vs Legacy Portals</div>
                    <div className="text-lg font-extrabold text-[#17625F] mt-0.5">
                      {aed(currentUser?.customUsage?.estimatedCompetitorSpendSavedAed ?? 84000)}
                    </div>
                    <div className="text-[10px] text-gray-600">Annual Subscription Saved</div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                    <div className="text-[10px] text-gray-500">Viewings & Offers</div>
                    <div className="text-xl font-extrabold text-[#17191C] mt-0.5">
                      {(currentUser?.customUsage?.viewingsBookedOrDispatched ?? 4) +
                        (currentUser?.customUsage?.digitalOffersSubmittedOrReviewed ?? 2)}
                    </div>
                    <div className="text-[10px] text-gray-600">
                      {currentUser?.customUsage?.workflowsSignedOffCount ?? 2} Workflow Sign-Offs
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9]">
                    <div className="text-[10px] text-gray-500">WhatsApp Pitches & API</div>
                    <div className="text-xl font-extrabold text-[#9E7628] mt-0.5">
                      {(currentUser?.customUsage?.whatsappPitchesGenerated ?? 6) +
                        (currentUser?.customUsage?.apiWebhookEventsCount ?? 5)}
                    </div>
                    <div className="text-[10px] text-gray-600">BRN-Locked & Webhook Synced</div>
                  </div>
                </div>

                {/* Interactive Custom Usage Configuration Form */}
                <form onSubmit={handleSaveCustomUsage} className="space-y-3 text-xs">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Custom Usage Plan / Mandate Tier</label>
                      <input
                        value={cuPlanTier}
                        onChange={e => setCuPlanTier(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Commission / Fee Split Rule</label>
                      <input
                        value={cuSplitRatio}
                        onChange={e => setCuSplitRatio(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Default Cheque Split</label>
                      <select
                        value={cuDefaultCheque}
                        onChange={e => setCuDefaultCheque(Number(e.target.value) as ChequeOption)}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 font-bold bg-[#FBF8F1]"
                      >
                        <option value={1}>1 Cheque</option>
                        <option value={2}>2 Cheques</option>
                        <option value={4}>4 Cheques</option>
                        <option value={12}>12x UAEDDS</option>
                        <option value={30}>30d Expat Bridge</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Preferred Emirate</label>
                      <select
                        value={cuPreferredEmirate}
                        onChange={e =>
                          setCuPreferredEmirate(e.target.value as 'All' | 'Dubai' | 'Abu Dhabi')
                        }
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 font-bold bg-[#FBF8F1]"
                      >
                        <option value="All">All UAE</option>
                        <option value="Dubai">Dubai</option>
                        <option value="Abu Dhabi">Abu Dhabi</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Direct Flat Fee (AED)</label>
                      <input
                        type="number"
                        value={cuFlatFee}
                        onChange={e => setCuFlatFee(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Agency Comm (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={cuCommPct}
                        onChange={e => setCuCommPct(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Max DIFC Commute (Mins)</label>
                      <input
                        type="number"
                        value={cuMaxCommute}
                        onChange={e => setCuMaxCommute(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">BTR FIFO Queue Cap</label>
                      <input
                        type="number"
                        value={cuBtrQueueCap}
                        onChange={e => setCuBtrQueueCap(Number(e.target.value))}
                        className="w-full px-2.5 py-2 rounded-lg border border-gray-300 font-bold"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-[#FBF8F1] border border-[#E5DEC9] w-full cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          checked={cuChillerFree}
                          onChange={e => setCuChillerFree(e.target.checked)}
                        />
                        <span>Chiller-Free Only</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">
                        Personal REST API Key (Connected to External OS)
                      </label>
                      <input
                        readOnly
                        value={currentUser?.customUsage?.personalApiKey ?? 'swk_live_orn51517_verified'}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="text-gray-700 block mb-1 font-bold">Custom Webhook Endpoint URL</label>
                      <input
                        value={cuWebhookUrl}
                        onChange={e => setCuWebhookUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono text-[11px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-700 block mb-1 font-bold">
                      Custom WhatsApp Client Pitch Signature (Auto-Appended on Every Share)
                    </label>
                    <input
                      value={cuWhatsappSig}
                      onChange={e => setCuWhatsappSig(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                    />
                  </div>

                  {/* Automation Guard Toggles */}
                  <div className="grid sm:grid-cols-3 gap-2 pt-1">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#FBF8F1] border border-[#E5DEC9] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cuEjariAutopilot}
                        onChange={e => setCuEjariAutopilot(e.target.checked)}
                      />
                      <span>Ejari Autopilot</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#FBF8F1] border border-[#E5DEC9] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cuRera90DayShield}
                        onChange={e => setCuRera90DayShield(e.target.checked)}
                      />
                      <span>90-Day RERA Shield</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-[#FBF8F1] border border-[#E5DEC9] font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cuPdcBounceShield}
                        onChange={e => setCuPdcBounceShield(e.target.checked)}
                      />
                      <span>PDC Bounce Shield</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#17191C] text-[#D6B46C] font-extrabold text-sm shadow hover:bg-black transition"
                  >
                    Save & Apply Custom Usage to Marketplace, Calculator & API
                  </button>
                </form>

                {/* Live Telemetry Event Simulator Buttons */}
                <div className="pt-3 border-t border-gray-200 space-y-2 text-xs">
                  <div className="font-bold text-gray-700">
                    Test Live Custom Usage Telemetry Persistence (Increments SQLite Counters):
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => void handleTrackUsageEvent('listingsSyncedCount', 'Listing Synced at AED 0')}
                      className="py-2 px-2.5 rounded-lg bg-[#FBF8F1] hover:bg-[#F4EFE3] border border-[#D6B46C] font-bold text-[11px]"
                    >
                      +1 Sync Listing (AED 0)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleTrackUsageEvent('whatsappPitchesGenerated', 'WhatsApp Client Pitch Deck')
                      }
                      className="py-2 px-2.5 rounded-lg bg-[#FBF8F1] hover:bg-[#F4EFE3] border border-[#D6B46C] font-bold text-[11px]"
                    >
                      +1 WhatsApp Pitch
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTrackUsageEvent('apiWebhookEventsCount', 'External OS Webhook Event')}
                      className="py-2 px-2.5 rounded-lg bg-[#FBF8F1] hover:bg-[#F4EFE3] border border-[#D6B46C] font-bold text-[11px]"
                    >
                      +1 OS API Webhook
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ============================================================
                SECTION 3: WHY SWK.RENT OUTPERFORMS EVERY UAE COMPETITOR
               ============================================================ */}
            <section className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E5DEC9] shadow-sm space-y-4">
              <div>
                <span className="text-xs font-bold uppercase text-[#9E7628]">
                  Head-to-Head UAE PropTech Benchmark
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold text-[#17191C]">
                  Why SWK RENT (`swk.rent`) Is Higher Than Any Other Competitor for All 5 Roles
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#17191C] text-[#D6B46C]">
                      <th className="p-3 rounded-tl-xl">Capability / Role Dimension</th>
                      <th className="p-3">SWK RENT (`https://swk.rent`)</th>
                      <th className="p-3 rounded-tr-xl">Legacy UAE Portals & Competitors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    <tr>
                      <td className="p-3 font-bold">1. Broker & Developer Listing Cost</td>
                      <td className="p-3 font-bold text-[#17625F]">
                        AED 0 Unlimited Verified XML Sync (Pay only on closed deal split)
                      </td>
                      <td className="p-3 text-gray-600">AED 95,000 – AED 240,000/yr mandatory portal credit packages</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">2. Dedicated Demo Accounts & Custom Usage</td>
                      <td className="p-3 font-bold text-[#17625F]">
                        8 Dedicated Accounts across all 5 roles + per-account SQLite Custom Usage Studio
                      </td>
                      <td className="p-3 text-gray-600">No multi-role sandbox or custom commission/cheque rule engine</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">3. Duplicate Listing Elimination</td>
                      <td className="p-3 font-bold text-[#17625F]">
                        100% Deduplicated by DLD Title Deed + Trakheesi + Makani No.
                      </td>
                      <td className="p-3 text-gray-600">8–15 duplicate ads per apartment with bait-and-switch pricing</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">4. True Monthly All-In Cost Transparency</td>
                      <td className="p-3 font-bold text-[#17625F]">
                        Includes Chiller (Empower/Tabreed), DEWA base, 5% Muni Fee, Deposit, VAT & Ejari
                      </td>
                      <td className="p-3 text-gray-600">Shows only headline annual rent; hides AED 15k–25k upfront shock</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">5. Developer Bulk Handover BTR Protection</td>
                      <td className="p-3 font-bold text-[#17625F]">
                        FIFO Anti-Cannibalization Queue (Max 3 public units/layout) + RERA Floor Guard
                      </td>
                      <td className="p-3 text-gray-600">200 identical handover units dumped at once, crashing tower yields</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold">6. Landlord Direct & Instant Rent Payout</td>
                      <td className="p-3 font-bold text-[#17625F]">
                        Tier 1 Direct (AED 0 Landlord Fee / Flat AED 2,999 Tenant) + Tier 3 1-Cheque Day-1 Payout
                      </td>
                      <td className="p-3 text-gray-600">Rigid 5% commission + manual paper PDC cheque chasing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* ============================================================
          MODAL: SIGN IN, SIGN UP & 8 DEDICATED DEMO ACCOUNTS
         ============================================================ */}
      {authModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-[#B89040] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src="/brand/app-icons/Emblem_and_SWK/Android/Google-Play-512.png"
                  alt="SWK RENT"
                  className="w-11 h-11 rounded-xl border border-[#B89040]"
                />
                <div>
                  <span className="text-[11px] font-bold uppercase text-[#9E7628]">
                    SWK RENT · First 1,000 Users MVP Access
                  </span>
                  <h3 className="text-lg font-extrabold text-[#17191C]">
                    {authMode === 'signin' ? 'Sign In to SWK RENT' : 'Create Verified MVP Account'}
                  </h3>
                </div>
              </div>
              <button onClick={() => setAuthModalOpen(false)} className="p-1 text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-gray-100 text-xs font-bold">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className={`py-2 rounded-lg transition ${
                  authMode === 'signin' ? 'bg-[#17191C] text-[#D6B46C] shadow' : 'text-gray-600'
                }`}
              >
                Sign In (Existing / Demo)
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                className={`py-2 rounded-lg transition ${
                  authMode === 'signup' ? 'bg-[#17191C] text-[#D6B46C] shadow' : 'text-gray-600'
                }`}
              >
                Sign Up (New MVP User)
              </button>
            </div>

            {authMode === 'signin' ? (
              <div className="space-y-4 text-xs">
                <form onSubmit={handleLoginSubmit} className="space-y-3">
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">Password</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-sm shadow"
                  >
                    Sign In with Encrypted Session
                  </button>
                </form>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="font-bold text-gray-600">
                    1-Tap Instant Dedicated Demo Account Sign-In (Password: <code>SwkRent2026!</code>):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {(
                      [
                        { email: 'tenant@uaepass.ae', label: 'Tenant · Executive (A. Vance)' },
                        { email: 'expat@swk.rent', label: 'Tenant · New Expat 30d Bridge' },
                        { email: 'landlord@swk.rent', label: 'Landlord · Direct Tier 1 (Dr. Khalid)' },
                        { email: 'familyoffice@swk.rent', label: 'Landlord · Family Office 1-Cheque' },
                        { email: 'advisor@swk.rent', label: 'Agent · SWK Advisor (M. Haseeb)' },
                        { email: 'partner@apexcrest.ae', label: 'Agent · A2A Partner Broker' },
                        { email: 'developer@selectgroup.ae', label: 'Developer · Select Group BTR' },
                        { email: 'admin@swk.rent', label: 'SWK Admin · ORN 51517 Master' },
                      ] as const
                    ).map(item => (
                      <button
                        key={item.email}
                        type="button"
                        onClick={() => {
                          void handleDemoAccountLogin(item.email)
                        }}
                        className="p-2 rounded-lg bg-[#FBF8F1] hover:bg-[#F4EFE3] border border-[#D6B46C]/50 text-left font-semibold"
                      >
                        <div className="text-[#17191C] font-bold">{item.label}</div>
                        <div className="text-[10px] text-gray-500">{item.email}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignupSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">Select Your UAE Rental Role</label>
                  <select
                    value={signupRole}
                    onChange={e => setSignupRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold bg-[#FBF8F1]"
                  >
                    <option value="TENANT">TENANT — Verified Tenant / Expat Renter</option>
                    <option value="LANDLORD">LANDLORD — Property Owner (Owner360)</option>
                    <option value="AGENT">AGENT — RERA Broker / A2A Partner</option>
                    <option value="DEVELOPER">DEVELOPER — Institutional / BTR Handover Desk</option>
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">Full Name</label>
                    <input
                      value={signupFullName}
                      onChange={e => setSignupFullName(e.target.value)}
                      placeholder="e.g. Tariq Al Maktoum"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">UAE Mobile / WhatsApp</label>
                    <input
                      value={signupPhone}
                      onChange={e => setSignupPhone(e.target.value)}
                      placeholder="+971 50 123 4567"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={e => setSignupEmail(e.target.value)}
                      placeholder="you@company.ae"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-gray-600 block mb-1 font-semibold">Password (min 8 chars + number)</label>
                    <input
                      type="password"
                      value={signupPassword}
                      onChange={e => setSignupPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">
                    Emirates ID or New Expat Passport No. (UAE PASS)
                  </label>
                  <input
                    value={signupEmiratesId}
                    onChange={e => setSignupEmiratesId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                  />
                </div>

                {signupRole === 'AGENT' && (
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-[#FBF8F1] border border-[#D6B46C]">
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">RERA Broker BRN *</label>
                      <input
                        value={signupReraBrn}
                        onChange={e => setSignupReraBrn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-gray-600 block mb-1 font-semibold">Agency RERA ORN *</label>
                      <input
                        value={signupReraOrn}
                        onChange={e => setSignupReraOrn(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                        required
                      />
                    </div>
                  </div>
                )}

                {signupRole === 'LANDLORD' && (
                  <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#D6B46C]">
                    <label className="text-gray-600 block mb-1 font-semibold">
                      DLD Title Deed / Abu Dhabi Mulkiya Reference *
                    </label>
                    <input
                      value={signupTitleDeed}
                      onChange={e => setSignupTitleDeed(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">
                    Employer / Agency / Developer Organization
                  </label>
                  <input
                    value={signupCompany}
                    onChange={e => setSignupCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-sm shadow"
                >
                  Complete Verification & Join First 1,000 MVP Users
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: FULL UNIT DETAIL, 50-POINT SNAGGING & AUTOPILOT DRAWER
         ============================================================ */}
      {detailUnit && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 border border-[#B89040] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-[#17625F]">
                  {detailUnit.unitCode} · Title Deed {detailUnit.titleDeedNo} · Makani {detailUnit.makaniNo}
                </span>
                <h3 className="text-xl font-extrabold">
                  {detailUnit.buildingName} · Unit #{detailUnit.unitNo}
                </h3>
              </div>
              <button onClick={() => setDetailUnit(null)} className="p-1 text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {detailUnit.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={detailUnit.buildingName}
                  className="h-40 w-full object-cover rounded-xl border border-gray-200"
                />
              ))}
            </div>

            <div className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] space-y-2 text-xs">
              <div className="font-bold text-sm text-[#17191C]">
                Pre-Move-In 50-Point Snagging & Deposit Protection Vault
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-white border border-gray-200">
                  ✓ AC Supply Temp: <strong>18.4°C Verified</strong>
                </div>
                <div className="p-2 rounded bg-white border border-gray-200">
                  ✓ Water Pressure & Heater: <strong>Passed</strong>
                </div>
                <div className="p-2 rounded bg-white border border-gray-200">
                  ✓ Marble/Tile & Paint: <strong>52 Timestamped Photos</strong>
                </div>
              </div>
              <p className="text-[11px] text-gray-600">
                Last Bi-Annual Anti-Partition Inspection: <strong>{detailUnit.lastBiAnnualInspectionDate}</strong> · Landlord: <strong>{detailUnit.landlordName}</strong>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  const u = detailUnit
                  setDetailUnit(null)
                  setViewingModalUnit(u)
                }}
                className="py-3 rounded-xl border border-[#17191C] text-[#17191C] font-bold text-xs"
              >
                Book Instant Viewing ({detailUnit.keyCustody})
              </button>
              <button
                onClick={() => {
                  const u = detailUnit
                  setDetailUnit(null)
                  openOfferModal(u)
                }}
                className="py-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs"
              >
                Make 1-Click Digital Offer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 1: 1-CLICK DIGITAL OFFER & UAE LEGAL PAYMENT GUARD
         ============================================================ */}
      {offerModalUnit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 sm:p-6 border border-[#B89040] shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-[#9E7628]">
                  Loopholes #4, #9 & #10 Solved · Binding 48-Hour Unit Lock
                </span>
                <h3 className="text-lg sm:text-xl font-extrabold">
                  1-Click Digital Rental Offer · {offerModalUnit.buildingName} #{offerModalUnit.unitNo}
                </h3>
              </div>
              <button onClick={() => setOfferModalUnit(null)} className="p-1 text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>

            {(() => {
              const previewCost = calculateTrueRentalCost(
                {
                  ...offerModalUnit,
                  annualRent1Cheque: offerAmount,
                  annualRent2Cheques: offerAmount,
                  annualRent4Cheques: offerAmount,
                  annualRent12Monthly: offerAmount,
                },
                offerCheques,
              )
              return (
                <div className="p-4 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] space-y-2 text-xs">
                  <div className="flex justify-between font-bold text-sm">
                    <span>True Monthly All-In Cost:</span>
                    <span className="text-[#17625F]">{aed(previewCost.trueMonthlyAllInOperatingCostAed)} / mo</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5DEC9]">
                    <div>
                      <span className="text-gray-500 block">1st Rent Payment</span>
                      <strong>{aed(previewCost.upfrontFirstRentPaymentAed)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Security Deposit</span>
                      <strong>{aed(previewCost.securityDepositAed)}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Fee + VAT + Ejari</span>
                      <strong>
                        {aed(
                          previewCost.agencyOrPlatformFeeAed +
                            previewCost.agencyFeeVatAed +
                            previewCost.ejariRegistrationFeeAed,
                        )}
                      </strong>
                    </div>
                  </div>
                </div>
              )
            })()}

            <form onSubmit={submitDigitalOffer} className="space-y-3 text-xs">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">Tenant Full Name (UAE PASS)</label>
                  <input
                    value={offerTenantName}
                    onChange={e => setOfferTenantName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">WhatsApp / UAE Mobile</label>
                  <input
                    value={offerTenantPhone}
                    onChange={e => setOfferTenantPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">Offered Annual Rent (AED)</label>
                  <input
                    type="number"
                    value={offerAmount}
                    onChange={e => setOfferAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-gray-600 block mb-1 font-semibold">Cheque / Payment Split</label>
                  <select
                    value={offerCheques}
                    onChange={e => setOfferCheques(Number(e.target.value) as ChequeOption)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                  >
                    <option value={1}>1 Cheque</option>
                    <option value={2}>2 Cheques</option>
                    <option value={4}>4 Cheques</option>
                    <option value={12}>12 Monthly (UAEDDS / RNPL)</option>
                    <option value={30}>30-Day Bridge-to-Ejari (New Expat)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-600 block mb-1 font-semibold">
                  Strictly Legal UAE Payment Channel (ORN 51517 Guard)
                </label>
                <select
                  value={offerPaymentChannel}
                  onChange={e => setOfferPaymentChannel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                >
                  {PERMITTED_UAE_RENTAL_PAYMENT_CHANNELS.map(ch => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-gray-600 font-semibold">Payment Notes / Account Verification</label>
                  <button
                    type="button"
                    onClick={() => setOfferDestinationNote('Transfer to agent personal bank account IBAN')}
                    className="text-[11px] text-red-700 underline font-semibold"
                  >
                    Test Rogue Agent Personal Account Block
                  </button>
                </div>
                <input
                  value={offerDestinationNote}
                  onChange={e => setOfferDestinationNote(e.target.value)}
                  placeholder="Optional reference note (Personal advisor accounts are strictly blocked)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-sm shadow-lg"
              >
                Submit Binding Offer & Lock Unit for 48 Hours (AED 2,000 Escrow Hold)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL 2: INSTANT GPS / SMART-LOCK VIEWING DISPATCH
         ============================================================ */}
      {viewingModalUnit && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 border border-[#B89040] shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-[#17625F]">
                  Loopholes #6 & #7 Solved · Key Custody & Live GPS
                </span>
                <h3 className="text-lg font-extrabold">
                  Book Instant Viewing · {viewingModalUnit.buildingName} #{viewingModalUnit.unitNo}
                </h3>
              </div>
              <button onClick={() => setViewingModalUnit(null)} className="p-1 text-gray-400 hover:text-black">
                <X size={20} />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] text-xs space-y-1">
              <div className="font-bold text-[#17191C]">
                Key Custody Status: <span className="text-[#17625F]">{viewingModalUnit.keyCustody}</span>
              </div>
              <div className="text-gray-600">
                Vault Tag: <strong>{viewingModalUnit.keyVaultTag}</strong> · Assigned RERA Advisor:{' '}
                <strong>{viewingModalUnit.advisorName} ({viewingModalUnit.advisorBrn})</strong>
              </div>
            </div>

            <form onSubmit={submitInstantViewing} className="space-y-3 text-xs">
              <div>
                <label className="text-gray-600 block mb-1 font-semibold">Your Name</label>
                <input
                  value={viewingName}
                  onChange={e => setViewingName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 font-semibold">Mobile / WhatsApp</label>
                <input
                  value={viewingPhone}
                  onChange={e => setViewingPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                />
              </div>
              <div>
                <label className="text-gray-600 block mb-1 font-semibold">Preferred Viewing Slot</label>
                <select
                  value={viewingSlot}
                  onChange={e => setViewingSlot(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 font-semibold"
                >
                  <option value="Today · Within 60 Mins (Instant Key Dispatch)">
                    Today · Within 60 Mins (Instant Key Dispatch)
                  </option>
                  <option value="Today · 5:30 PM GST (After Work Slot)">
                    Today · 5:30 PM GST (After Work Slot)
                  </option>
                  <option value="Tomorrow · 11:00 AM GST">Tomorrow · 11:00 AM GST</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#17191C] text-[#D6B46C] font-extrabold text-sm"
              >
                Dispatch Key & Lock GPS Viewing Slot
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
