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
  PERMITTED_UAE_RENTAL_PAYMENT_CHANNELS,
  calculatePortalSavingsVsCompetitors,
  calculateTrueRentalCost,
  evaluateReraRenewal,
} from '@shared/uae-rental-rules'

type ActiveTab = 'marketplace' | 'buildings' | 'superhub' | 'shield' | 'partners'

const aed = (n: number) => `AED ${Math.round(n || 0).toLocaleString('en-US')}`

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

  const refreshData = async () => {
    try {
      const res = await fetch('/api/bootstrap')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      showNotice('err', e?.message || 'Failed to load SWKBayut OS data')
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
    const pitch = [
      `✨ *SWK Verified Rental Pitch (${u.unitCode})*`,
      `🏢 *${u.buildingName} · Unit #${u.unitNo}* (${u.community})`,
      `🛏 ${u.bedrooms === 0 ? 'Studio' : `${u.bedrooms} BR`} · ${u.bathrooms} Bath · ${u.areaSqft} sqft · ${u.furnishing}`,
      `💰 *Headline Rent:* ${aed(cost.annualHeadlineRent)}/yr (${chequeMode === 12 ? '12 Monthly UAEDDS' : `${chequeMode} Cheques`})`,
      `📊 *True Monthly All-In:* ${aed(cost.trueMonthlyAllInOperatingCostAed)}/mo (Includes Chiller: ${u.chillerProvider}, DEWA & 5% Muni)`,
      `🔑 *Viewing:* ${u.keyCustody} | 🚇 DIFC: ${bld?.commuteDifcMins ?? 18} mins`,
      `🛡 *DLD Permit:* #${u.trakheesiPermitNo} | Protected 50/50 A2A & RERA Shield`,
      `👉 Book Instant GPS Viewing or Lock Unit for 48h on SWKBayut`,
    ].join('\n')
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(pitch)
    }
    showNotice('ok', `Client WhatsApp Pitch Deck copied for ${u.buildingName} #${u.unitNo} (with BRN Commission Lock)!`)
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

  const submitDigitalOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!offerModalUnit) return
    const res = await fetch('/api/offers', {
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
      `48-Hour Unit Lock Activated for ${offerModalUnit.buildingName} #${offerModalUnit.unitNo}! Landlord notified via Owner360.`,
    )
    setOfferModalUnit(null)
    await refreshData()
  }

  const submitInstantViewing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!viewingModalUnit) return
    const res = await fetch('/api/viewings', {
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
    const res = await fetch(`/api/developer-pools/${poolId}/reserve`, { method: 'POST' })
    if (res.ok) {
      showNotice(
        'ok',
        'FIFO Unit Reserved! Next unit in developer queue automatically released at protected RERA floor rent.',
      )
      await refreshData()
    }
  }

  const submitDeveloperPool = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/developer-pools', {
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
    if (res.ok) {
      showNotice('ok', 'Developer Bulk Handover BTR Pool Activated with FIFO Anti-Cannibalization Queue!')
      await refreshData()
    }
  }

  const submitTenantBrief = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/reverse-briefs', {
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
    if (res.ok) {
      showNotice('ok', 'Verified Tenant Brief Broadcasted! Holding agents & landlords can now bid down.')
      await refreshData()
    }
  }

  const handleBidOnTenantBrief = async (brief: VerifiedTenantBrief) => {
    const nextBid = Math.round((brief.bestBidRentAed ?? brief.maxAnnualBudgetAed) * 0.97)
    const res = await fetch(`/api/reverse-briefs/${brief.id}/bid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bidRentAed: nextBid,
        unitLabel: 'SWK Verified Chiller-Free Mandate',
      }),
    })
    if (res.ok) {
      showNotice('ok', `Winning Landlord Bid Placed at ${aed(nextBid)}/yr! Tenant & Agent notified.`)
      await refreshData()
    }
  }

  const submitCrmImport = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/crm-sync/import', {
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
    if (res.ok) {
      showNotice(
        'ok',
        `Imported ${crmUnitsCount} verified units at AED 0 cost — saving ${aed(json.savings.annualPortalSavingsAed)}/yr vs traditional portals!`,
      )
      await refreshData()
    }
  }

  const submitGatePass = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/gate-pass/generate', {
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
    if (res.ok) {
      showNotice('ok', 'Smart Building OA Move-In Security QR Gate Pass Issued!')
      await refreshData()
    }
  }

  const handlePdcAction = async (id: number, action: 'Cleared' | 'Deposited' | 'RNPL_Bounce_Shield') => {
    const res = await fetch(`/api/pdc/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) {
      showNotice(
        'ok',
        action === 'RNPL_Bounce_Shield'
          ? 'Cheque converted to 12-Month UAEDDS / RNPL Split — Bounce Prevented!'
          : `Cheque marked as ${action}`,
      )
      await refreshData()
    }
  }

  const handleOfferDecision = async (id: number, decision: 'Accepted — Ejari Issued' | 'Declined — Unit Unlocked') => {
    const res = await fetch(`/api/offers/${id}/decision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    })
    if (res.ok) {
      showNotice('ok', `Offer status updated: ${decision}`)
      await refreshData()
    }
  }

  const submitMaintenance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!maintIssue.trim()) return
    const res = await fetch('/api/maintenance', {
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
    if (res.ok) {
      showNotice('ok', `Ticket logged: ${json.classification.ruleExplanation}`)
      setMaintIssue('')
      await refreshData()
    }
  }

  const submitA2aRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/a2a/register', {
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
    if (res.ok) {
      showNotice('ok', '7-Day A2A Lead Protection & 50/50 Commission Split Certificate Locked!')
      await refreshData()
    }
  }

  const submitLandlordOnboarding = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/landlord/onboard', {
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
    if (res.ok) {
      showNotice('ok', 'Landlord Title Deed & UAE PASS Verified! Mandate synced with Owner360.')
      await refreshData()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F1] text-[#17191C] pb-20 md:pb-6">
      {/* Top Luxury SWK Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#17191C] text-white border-b border-[#B89040]/30 shadow-lg">
        <div className="max-w-[1640px] mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src="/brand/logo-png/swk-logo-gold-512.png"
              alt="SWK Properties LLC"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-contain bg-[#22252A] p-1 border border-[#B89040]/40"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-base sm:text-lg text-white">SWKBayut</span>
                <span className="text-[10px] sm:text-[11px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#B89040]/20 text-[#D6B46C] border border-[#B89040]/40 font-semibold">
                  ORN 51517 · Web + Android
                </span>
              </div>
              <p className="hidden sm:block text-xs text-gray-400">
                Zero Credit-Burn · BTR Developer Queue · Reverse Tenant Auction · True Monthly Cost · RERA Shield
              </p>
            </div>
          </div>

          {/* Desktop 5-Module Switcher */}
          <nav className="hidden md:flex flex-wrap items-center gap-1.5 bg-[#22262B] p-1.5 rounded-xl border border-white/10">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
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
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'buildings'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building2 size={14} />
              2. Tower Directory
            </button>
            <button
              onClick={() => setActiveTab('superhub')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'superhub'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-[#D6B46C] hover:text-white bg-[#B89040]/10 border border-[#B89040]/30'
              }`}
            >
              <Rocket size={14} />
              3. Agent, Dev & OA Super-Hub
            </button>
            <button
              onClick={() => setActiveTab('shield')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'shield'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ShieldCheck size={14} />
              4. RERA & PDC Shield
            </button>
            <button
              onClick={() => setActiveTab('partners')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'partners'
                  ? 'swk-gold-gradient text-[#17191C] shadow'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Handshake size={14} />
              5. Landlords & A2A
            </button>
          </nav>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (100% Mobile-Friendly Interface) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#17191C] text-white border-t border-[#B89040]/40 grid grid-cols-5 py-1.5 px-1 shadow-2xl">
        {(
          [
            { id: 'marketplace', label: 'Rentals', icon: Search },
            { id: 'buildings', label: 'Towers', icon: Building2 },
            { id: 'superhub', label: 'Agent/Dev', icon: Rocket },
            { id: 'shield', label: 'Shield', icon: ShieldCheck },
            { id: 'partners', label: 'A2A/Owner', icon: Handshake },
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
              <Icon size={17} />
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
                    Zero Duplicate Ads · AED 0 Broker Listing Cost · Android App (`ae.swkproperties.bayut`) Ready
                  </div>
                  <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                    Every Unit Deduplicated by Title Deed.{' '}
                    <span className="text-[#D6B46C]">Every Dirham Calculated Upfront.</span>
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                    Backed live by <strong className="text-white">SWK Properties OS</strong>. Filter by 8:30 AM rush-hour commute, toggle 1–12x Monthly UAEDDS payments, or tap <strong className="text-[#D6B46C]">"WhatsApp Client Pitch"</strong> to share a watermark-free BRN-protected deal sheet in 1 second.
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
                    On SWKBayut, RERA-verified agencies, developers, and property managers sync their <strong className="text-white">PropSpace, Propertybase, Bitrix24, Pixxi, or SWK OS</strong> XML feeds for <strong className="text-emerald-400">AED 0 upfront</strong>. You only share commission or pay a flat transaction fee when a lease actually closes.
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
                        <span className="text-gray-400 block">Bayut / PF Annual Credit Spend</span>
                        <strong className="text-lg text-red-400 line-through">
                          {aed(livePortalSavings.traditionalPortalAnnualCostAed)}/yr
                        </strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">SWKBayut Listing Cost</span>
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
                      When a new tower hands over 200 units, individual owners listing simultaneously on Bayut crash rents by 15%. Our FIFO Engine shows only <strong>3 units per layout at a time</strong> at a locked RERA/Developer floor rent and auto-releases the next unit upon booking!
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
                    Verify Title Deed via DLD & Publish to SWKBayut + Owner360
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
                    Synced with SWK Properties OS (`https://github.com/swkpropertiesuae/swkpropertiesOS`)
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
      </main>

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
