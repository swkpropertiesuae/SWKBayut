import React, { useEffect, useState } from 'react'
import {
  ArrowUpRight,
  Building2,
  KeyRound,
  Lock,
  Navigation,
  Radio,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Unlock,
} from 'lucide-react'
import {
  type AuthUser,
  type BuildingProfile,
  type ChequeOption,
  type FieldDutySession,
  type RentalUnit,
  type UserRole,
  RBAC_ACTION_CATALOG,
  ROLE_CAPABILITIES,
  ROLE_LANDING_PORTALS,
  UAE_COMMUNITY_GUIDES,
  UAE_RENTAL_WORKFLOW_STAGES,
  calculateTrueRentalCost,
  canRoleExecuteAction,
} from '@shared/uae-rental-rules'

const aed = (n: number) => `AED ${Math.round(n || 0).toLocaleString('en-US')}`

export type NavTabId =
  | 'landing'
  | 'role-portal'
  | 'marketplace'
  | 'buildings'
  | 'superhub'
  | 'workflow'
  | 'shield'
  | 'partners'
  | 'auth'

interface LandingPortalViewProps {
  effectiveRole: UserRole
  currentUser: AuthUser | null
  units: RentalUnit[]
  buildings: BuildingProfile[]
  chequeMode: ChequeOption
  onNavigateTab: (tab: NavTabId) => void
  onSelectRoleAndNavigate: (role: UserRole, targetTab: NavTabId) => void
  onFilterCommunity: (communityName: string, emirate: 'All' | 'Dubai' | 'Abu Dhabi') => void
  onOpenOfferModal: (unit: RentalUnit) => void
  onOpenViewingModal: (unit: RentalUnit) => void
  onOpenAuthModal: (mode: 'signin' | 'signup') => void
}

export const LandingPortalView: React.FC<LandingPortalViewProps> = ({
  effectiveRole,
  currentUser,
  units,
  buildings,
  chequeMode,
  onNavigateTab,
  onSelectRoleAndNavigate,
  onFilterCommunity,
  onOpenOfferModal,
  onOpenViewingModal,
  onOpenAuthModal,
}) => {
  const [selectedPortalRole, setSelectedPortalRole] = useState<UserRole>(effectiveRole || 'TENANT')

  useEffect(() => {
    setSelectedPortalRole(effectiveRole)
  }, [effectiveRole])

  const portalList = Object.values(ROLE_LANDING_PORTALS)
  const activePortalConfig = ROLE_LANDING_PORTALS[selectedPortalRole] || ROLE_LANDING_PORTALS.TENANT

  return (
    <div className="space-y-8">
      {/* ============================================================
          1. FLAGSHIP PUBLIC HERO BANNER (WEB + ANDROID + iOS)
         ============================================================ */}
      <section className="swk-obsidian-card text-white rounded-3xl p-5 sm:p-8 lg:p-10 border border-[#B89040]/50 shadow-2xl relative overflow-hidden">
        <div className="grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#B89040]/20 border border-[#D6B46C]/40 text-[#D6B46C] text-xs font-extrabold">
              <Sparkles size={14} />
              <span>SWK RENT · RERA ORN 51517 · UAE FULL-STACK WEBAPP & NATIVE ANDROID (`ae.swk.rent`)</span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              The UAE’s First Zero-Fake-Listing,{' '}
              <span className="text-[#D6B46C]">True-Monthly-Cost Rental OS.</span>
            </h1>

            <p className="text-xs sm:text-base text-gray-300 leading-relaxed max-w-3xl">
              Every apartment and villa on <strong className="text-white">swk.rent</strong> is deduplicated by{' '}
              <strong className="text-[#D6B46C]">DLD Title Deed, Trakheesi Permit, ADREC Madhmoun QR, and Physical Key Custody</strong>.
              Built with strict 5-Role Access Control (Tenant, Landlord, RERA Agent, Developer, Admin), 1-Tap UAE PASS & Android Biometric Sign-In, and a 7-Stage Deal & Escrow Pipeline.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                onClick={() => onNavigateTab('marketplace')}
                className="px-5 py-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 hover:opacity-95 transition"
              >
                <Search size={16} />
                Explore Verified Rentals ({units.length} Live Mandates)
              </button>

              <button
                onClick={() => onNavigateTab('role-portal')}
                className="px-5 py-3 rounded-xl bg-[#17625F] hover:bg-[#124e4b] text-white font-extrabold text-xs sm:text-sm border border-emerald-400/40 shadow-lg flex items-center gap-2 transition"
              >
                <ShieldCheck size={16} />
                Open Role Access & RBAC Command Center
              </button>

              <button
                onClick={() => onOpenAuthModal('signin')}
                className="px-4 py-3 rounded-xl bg-[#22262B] hover:bg-white/10 text-[#D6B46C] font-bold text-xs sm:text-sm border border-[#D6B46C]/40 flex items-center gap-2 transition"
              >
                <KeyRound size={15} />
                {currentUser ? `Signed In: ${currentUser.fullName}` : 'Sign In / 8 Demo Personas'}
              </button>
            </div>

            {/* Instant Trust & Regulatory Badges */}
            <div className="pt-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-[#111315]/90 border border-white/10">
                <div className="text-[#D6B46C] font-extrabold text-base sm:text-lg">100% Title Deed</div>
                <div className="text-gray-400 text-[11px]">Zero Duplicate / Bait Ads</div>
              </div>
              <div className="p-3 rounded-xl bg-[#111315]/90 border border-white/10">
                <div className="text-emerald-400 font-extrabold text-base sm:text-lg">AED 2,999 Flat</div>
                <div className="text-gray-400 text-[11px]">Direct-to-Landlord Tier 1</div>
              </div>
              <div className="p-3 rounded-xl bg-[#111315]/90 border border-white/10">
                <div className="text-[#D6B46C] font-extrabold text-base sm:text-lg">AED 0 XML Sync</div>
                <div className="text-gray-400 text-[11px]">Zero Broker Portal Tax</div>
              </div>
              <div className="p-3 rounded-xl bg-[#111315]/90 border border-white/10">
                <div className="text-emerald-400 font-extrabold text-base sm:text-lg">5 Roles · 14 Gates</div>
                <div className="text-gray-400 text-[11px]">Full RBAC & 7-Stage Pipeline</div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Role Quick-Launch Card */}
          <div className="lg:col-span-5 bg-[#111315] rounded-2xl p-4 sm:p-5 border border-[#B89040]/40 space-y-3.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D6B46C]">
                  Role-Based Portal Selector
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-white">
                  Choose Your UAE Rental Persona
                </h2>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-bold">
                Active: {effectiveRole}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {portalList.map(portal => (
                <button
                  key={portal.role}
                  onClick={() => setSelectedPortalRole(portal.role)}
                  className={`py-2 px-1.5 rounded-xl text-center font-extrabold text-[11px] transition border ${
                    selectedPortalRole === portal.role
                      ? 'swk-gold-gradient text-[#17191C] border-[#D6B46C] shadow-md'
                      : 'bg-[#17191C] text-gray-300 border-white/10 hover:border-[#D6B46C]/50'
                  }`}
                >
                  {portal.role}
                </button>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-[#17191C] border border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-[#D6B46C]">{activePortalConfig.badge}</div>
              <div className="text-sm sm:text-base font-extrabold text-white leading-snug">
                {activePortalConfig.headline}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{activePortalConfig.subheadline}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-[#22262B] border border-white/5">
                  <div className="text-[10px] text-gray-400">{activePortalConfig.heroMetricLabel}</div>
                  <div className="text-xs font-extrabold text-[#D6B46C]">{activePortalConfig.heroMetricValue}</div>
                </div>
                <div className="p-2 rounded-lg bg-[#22262B] border border-white/5">
                  <div className="text-[10px] text-gray-400">Primary Demo Account</div>
                  <div className="text-xs font-extrabold text-emerald-400 truncate">
                    {activePortalConfig.primaryDemoEmail}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={() =>
                  onSelectRoleAndNavigate(
                    activePortalConfig.role,
                    activePortalConfig.defaultWorkspaceTab as NavTabId,
                  )
                }
                className="py-2.5 px-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow flex items-center justify-center gap-1.5"
              >
                <span>Enter {activePortalConfig.role} Portal</span>
                <ArrowUpRight size={14} />
              </button>
              <button
                onClick={() => onSelectRoleAndNavigate(activePortalConfig.role, 'role-portal')}
                className="py-2.5 px-3 rounded-xl bg-[#22262B] hover:bg-white/10 text-white border border-[#D6B46C]/40 font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <ShieldCheck size={14} className="text-[#D6B46C]" />
                <span>{activePortalConfig.role} RBAC Matrix</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          2. DEDICATED 5-ROLE LANDING PORTALS DEEP-DIVE
         ============================================================ */}
      <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E5DEC9] shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#9E7628]">
              Dedicated Landing Pages for Every Stakeholder
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#17191C]">
              5 Tailored UAE Rental Portals · 1 Unified Title-Deed Ledger
            </h2>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {portalList.map(p => (
              <button
                key={p.role}
                onClick={() => setSelectedPortalRole(p.role)}
                className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition border ${
                  selectedPortalRole === p.role
                    ? 'bg-[#17191C] text-[#D6B46C] border-[#B89040]'
                    : 'bg-[#FBF8F1] text-gray-700 border-[#E5DEC9] hover:border-[#B89040]'
                }`}
              >
                {p.role} Portal
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5 items-stretch">
          <div className="lg:col-span-5 p-5 rounded-2xl bg-[#17191C] text-white border border-[#B89040]/40 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <span className="inline-block px-2.5 py-1 rounded-full bg-[#B89040]/20 text-[#D6B46C] text-[11px] font-bold">
                {activePortalConfig.badge}
              </span>
              <h3 className="text-xl font-extrabold text-white">{activePortalConfig.headline}</h3>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
                {activePortalConfig.subheadline}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#22262B] border border-white/10">
                <div className="text-[11px] text-gray-400">{activePortalConfig.heroMetricLabel}</div>
                <div className="text-sm font-extrabold text-[#D6B46C] mt-0.5">
                  {activePortalConfig.heroMetricValue}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#22262B] border border-white/10">
                <div className="text-[11px] text-gray-400">Verification Gate</div>
                <div className="text-xs font-extrabold text-emerald-400 mt-0.5">
                  {ROLE_CAPABILITIES[activePortalConfig.role].verifyRequirement}
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={() =>
                  onSelectRoleAndNavigate(
                    activePortalConfig.role,
                    activePortalConfig.defaultWorkspaceTab as NavTabId,
                  )
                }
                className="flex-1 py-3 px-4 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs text-center shadow"
              >
                Activate {activePortalConfig.role} Persona & Enter Workspace →
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 grid sm:grid-cols-2 gap-3.5">
            {activePortalConfig.pillars.map((pillar, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-[#FBF8F1] border border-[#E5DEC9] flex flex-col justify-between space-y-2"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="w-7 h-7 rounded-lg bg-[#17191C] text-[#D6B46C] font-extrabold text-xs flex items-center justify-center">
                      0{idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-[#17625F] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      ORN 51517 Verified
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#17191C]">{pillar.title}</h4>
                  <p className="text-xs text-gray-600 leading-relaxed">{pillar.desc}</p>
                </div>
                <div className="pt-2 border-t border-[#E5DEC9]/80 flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#7C5D1E]">Role: {activePortalConfig.role}</span>
                  <button
                    onClick={() => onSelectRoleAndNavigate(activePortalConfig.role, 'role-portal')}
                    className="font-extrabold text-[#17191C] hover:text-[#9E7628] underline"
                  >
                    Inspect RBAC Gate →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          3. UAE PRIME RENTAL COMMUNITY GUIDES (DUBAI & ABU DHABI)
         ============================================================ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#17625F]">
              Verified Chiller, Commute & RERA Index Intelligence
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#17191C]">
              UAE Prime Rental Community Guides (Dubai & Abu Dhabi)
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('buildings')}
            className="px-4 py-2 rounded-xl bg-[#17191C] text-[#D6B46C] font-bold text-xs flex items-center gap-1.5"
          >
            <Building2 size={14} />
            Explore Canonical Building Profiles ({buildings.length} Towers)
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {UAE_COMMUNITY_GUIDES.map(guide => (
            <div
              key={guide.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#E5DEC9] shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 overflow-hidden bg-[#17191C]">
                  <img
                    src={guide.image}
                    alt={guide.name}
                    className="w-full h-full object-cover opacity-90 hover:scale-105 transition duration-500"
                  />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#17191C]/90 text-[#D6B46C] text-[10px] font-extrabold border border-[#B89040]/40">
                    {guide.emirate} · {guide.verifiedUnitsCount} Units
                  </div>
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-emerald-900/90 text-emerald-200 text-[10px] font-bold">
                    DIFC: {guide.difcCommuteMins} mins
                  </div>
                </div>

                <div className="p-4 space-y-2.5">
                  <h3 className="font-extrabold text-base text-[#17191C]">{guide.name}</h3>
                  <p className="text-xs text-gray-600 line-clamp-2">{guide.tagline}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#FBF8F1] p-2.5 rounded-xl border border-[#E5DEC9]">
                    <div>
                      <span className="text-[10px] text-gray-500 block">Avg 1BR Rent</span>
                      <strong className="text-[#17191C]">{aed(guide.avg1BrRentAed)}/yr</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block">Avg 2BR Rent</span>
                      <strong className="text-[#17191C]">{aed(guide.avg2BrRentAed)}/yr</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-600 flex items-center gap-1.5">
                    <Sparkles size={12} className="text-[#9E7628] shrink-0" />
                    <span className="truncate">{guide.chillerProfile}</span>
                  </div>
                  <div className="text-[11px] text-[#17625F] font-semibold truncate">
                    🚇 {guide.metroAccess}
                  </div>
                </div>
              </div>

              <div className="p-4 pt-0">
                <button
                  onClick={() =>
                    onFilterCommunity(
                      guide.name.split(' ')[0]!,
                      guide.emirate === 'Abu Dhabi' ? 'Abu Dhabi' : 'Dubai',
                    )
                  }
                  className="w-full py-2 rounded-xl bg-[#17191C] hover:bg-black text-[#D6B46C] font-extrabold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <span>View Verified Units in {guide.name.split(' (')[0]}</span>
                  <ArrowUpRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          4. FEATURED VERIFIED RESIDENCES PREVIEW
         ============================================================ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#9E7628]">
              Zero-Fake-Listing Guarantee · Live Key Custody
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#17191C]">
              Featured Title-Deed Verified Residences
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('marketplace')}
            className="px-4 py-2 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow"
          >
            Open Full Marketplace & True Cost Filter →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {units.slice(0, 3).map(u => {
            const cost = calculateTrueRentalCost(u, chequeMode)
            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl overflow-hidden border border-[#E5DEC9] shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-44 bg-[#17191C]">
                    <img
                      src={u.images[0]}
                      alt={u.buildingName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-[#17191C]/90 text-[#D6B46C] text-[10px] font-extrabold">
                      {u.unitCode} · {u.chillerProvider}
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#17625F] text-white text-[10px] font-bold">
                      {u.keyCustody}
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="text-xs font-bold text-[#9E7628]">{u.community}</div>
                    <h3 className="font-extrabold text-base text-[#17191C]">
                      {u.buildingName} · Unit #{u.unitNo}
                    </h3>
                    <div className="text-xs text-gray-600">
                      {u.bedrooms} BR · {u.bathrooms} Bath · {u.areaSqft} sqft · {u.viewType}
                    </div>
                    <div className="p-3 rounded-xl bg-[#FBF8F1] border border-[#E5DEC9] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-gray-500 block">Headline Annual Rent</span>
                        <strong className="text-sm text-[#17191C]">{aed(cost.annualHeadlineRent)}/yr</strong>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#17625F] font-bold block">True Monthly All-In</span>
                        <strong className="text-sm text-[#17625F]">
                          {aed(cost.trueMonthlyAllInOperatingCostAed)}/mo
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenViewingModal(u)}
                    className="py-2 rounded-xl border border-[#17191C] text-[#17191C] font-bold text-xs hover:bg-gray-50"
                  >
                    Instant GPS Viewing
                  </button>
                  <button
                    onClick={() => onOpenOfferModal(u)}
                    className="py-2 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow"
                  >
                    1-Click Offer Lock
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============================================================
          5. NATIVE ANDROID (`ae.swk.rent`) & iOS APP SHOWCASE + DEVELOPER PARTNERS
         ============================================================ */}
      <section className="swk-obsidian-card text-white rounded-3xl p-5 sm:p-7 border border-[#B89040]/40 space-y-6">
        <div className="grid lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <Smartphone size={14} />
              Native Android APK (`ae.swk.rent`) & iOS App Included in Repository
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold">
              Full-Stack Native Android Bridge + Foreground GPS Viewing Escort
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              The <code className="text-[#D6B46C]">android/</code> native application bundles the production web workspace via{' '}
              <code className="text-[#D6B46C]">WebViewAssetLoader</code> with a hardened JavaScript bridge (
              <code className="text-[#D6B46C]">window.SwkAndroidBridge</code>), native Android BiometricPrompt unlock, Foreground Service GPS Key-Vault Escort (<code className="text-[#D6B46C]">SwkDutyLocationService</code>), and live launcher icon switching.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                onClick={() => onNavigateTab('role-portal')}
                className="px-4 py-2.5 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow flex items-center gap-1.5"
              >
                <Radio size={14} />
                Open Native Android & Live GPS Escort Console →
              </button>
              <button
                onClick={() => onNavigateTab('auth')}
                className="px-4 py-2.5 rounded-xl bg-[#22262B] text-white border border-white/15 font-bold text-xs"
              >
                Test Biometric & 1-Tap UAE PASS Sign-In
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#111315] border border-white/10 space-y-1">
              <div className="text-[#D6B46C] font-extrabold">Android BiometricPrompt</div>
              <p className="text-[11px] text-gray-400">
                Hardware-backed fingerprint / face authentication for UAE PASS & Escrow approvals.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111315] border border-white/10 space-y-1">
              <div className="text-emerald-400 font-extrabold">Live GPS Viewing Escort</div>
              <p className="text-[11px] text-gray-400">
                Foreground location service streams verified coordinates while keys are checked out of SWK Vault.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111315] border border-white/10 space-y-1">
              <div className="text-[#D6B46C] font-extrabold">Dual Launcher Icons</div>
              <p className="text-[11px] text-gray-400">
                Switch between Primary Emblem + SWK and Alternate Matte Gold Wordmark from inside the app.
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#111315] border border-white/10 space-y-1">
              <div className="text-emerald-400 font-extrabold">Offline + Live API Hybrid</div>
              <p className="text-[11px] text-gray-400">
                Works 100% standalone inside the APK or synced live to the Fastify SQLite server.
              </p>
            </div>
          </div>
        </div>

        {/* UAE Institutional Developer Partner Logos */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[11px] uppercase tracking-widest text-gray-400 font-bold">
            Integrated BTR & Tower Handover Developers:
          </span>
          <div className="flex flex-wrap items-center gap-6 opacity-85">
            {[
              { name: 'Emaar', src: '/media/developers/emaar.svg' },
              { name: 'Aldar', src: '/media/developers/aldar.svg' },
              { name: 'Sobha', src: '/media/developers/sobha.svg' },
              { name: 'Meraas', src: '/media/developers/meraas.svg' },
              { name: 'Nakheel', src: '/media/developers/nakheel.svg' },
              { name: 'Damac', src: '/media/developers/damac.svg' },
            ].map(dev => (
              <img
                key={dev.name}
                src={dev.src}
                alt={dev.name}
                className="h-6 sm:h-7 w-auto object-contain brightness-200 contrast-125"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

interface RoleAccessCommandCenterProps {
  effectiveRole: UserRole
  currentUser: AuthUser | null
  demoUsers: AuthUser[]
  units: RentalUnit[]
  fieldDutySessions: FieldDutySession[]
  appIconVariant: 'emblem' | 'wordmark'
  onQuickRoleSwitch: (role: UserRole) => void
  onDemoAccountLogin: (email: string) => void
  onNavigateTab: (tab: NavTabId) => void
  onSwitchAppIconVariant: (variant: 'emblem' | 'wordmark') => void
  onStartFieldDuty: (unitId: number, deviceId: string, batteryPct: number, networkType: string) => Promise<void>
  onPingFieldDutyBatch: (sessionId: number) => Promise<void>
  onEndFieldDuty: (sessionId: number) => Promise<void>
  onTriggerBiometricSignIn: () => void
  serverUrl: string
  onSaveServerUrl: (url: string) => void
}

export const RoleAccessCommandCenter: React.FC<RoleAccessCommandCenterProps> = ({
  effectiveRole,
  currentUser,
  demoUsers,
  units,
  fieldDutySessions,
  appIconVariant,
  onQuickRoleSwitch,
  onDemoAccountLogin,
  onNavigateTab,
  onSwitchAppIconVariant,
  onStartFieldDuty,
  onPingFieldDutyBatch,
  onEndFieldDuty,
  onTriggerBiometricSignIn,
  serverUrl,
  onSaveServerUrl,
}) => {
  const [selectedDutyUnitId, setSelectedDutyUnitId] = useState<number>(units[0]?.id ?? 1)
  const [serverUrlInput, setServerUrlInput] = useState(serverUrl)
  const [nativeDeviceInfo, setNativeDeviceInfo] = useState<{
    isNativeBridgeDetected: boolean
    deviceId: string
    deviceName: string
    osVersion: string
    batteryPct: number
    networkType: string
    biometricSupported: boolean
    dutyServiceRunning: boolean
  }>({
    isNativeBridgeDetected: false,
    deviceId: 'SWK-AND-WEB-SIMULATOR-51517',
    deviceName: 'SWK Rent Hybrid Web/Android Runtime',
    osVersion: 'Android 15 (API 35) / WebView Bridge Ready',
    batteryPct: 96,
    networkType: '5G Standalone / Wi-Fi 6E',
    biometricSupported: true,
    dutyServiceRunning: false,
  })

  useEffect(() => {
    try {
      const w = window as any
      if (w.SwkAndroidBridge) {
        const idJson = JSON.parse(w.SwkAndroidBridge.getDeviceIdentityJson?.() || '{}')
        const telJson = JSON.parse(w.SwkAndroidBridge.getTelemetryJson?.() || '{}')
        setNativeDeviceInfo({
          isNativeBridgeDetected: true,
          deviceId: idJson.device_id || 'SWK-AND-NATIVE',
          deviceName: idJson.device_name || 'Android Device',
          osVersion: idJson.os_version || 'Android',
          batteryPct: Number(telJson.battery_pct) > 0 ? Number(telJson.battery_pct) : 95,
          networkType: telJson.network_type || '5G',
          biometricSupported: Boolean(idJson.biometric_supported),
          dutyServiceRunning: Boolean(telJson.duty_service_running),
        })
      }
    } catch {
      // keep web simulator defaults
    }
  }, [fieldDutySessions])

  const roleCap = ROLE_CAPABILITIES[effectiveRole]
  const grantedCount = RBAC_ACTION_CATALOG.filter(a => a.allowedRoles.includes(effectiveRole)).length

  return (
    <div className="space-y-6">
      {/* ============================================================
          1. ACTIVE ROLE IDENTITY & 5-ROLE / 8-PERSONA COMMAND BAR
         ============================================================ */}
      <section className="swk-obsidian-card text-white rounded-3xl p-5 sm:p-7 border border-[#B89040]/50 shadow-xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B89040]/20 border border-[#D6B46C]/40 text-[#D6B46C] text-xs font-extrabold">
              <ShieldCheck size={14} />
              <span>5-ROLE ACCESS CONTROL (RBAC) & NATIVE ANDROID COMMAND CENTER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">
              Active Role: <span className="text-[#D6B46C]">{roleCap.label}</span> ({effectiveRole})
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-3xl">{roleCap.subtitle}</p>
          </div>

          <div className="bg-[#111315] p-4 rounded-2xl border border-white/10 text-xs space-y-1.5 min-w-[260px]">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Signed-In Identity:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                UAE PASS Verified
              </span>
            </div>
            <div className="font-extrabold text-sm text-white">
              {currentUser ? currentUser.fullName : `Demo ${effectiveRole} Session`}
            </div>
            <div className="text-gray-400">
              {currentUser?.email || 'Switch any of the 8 demo personas below'}
            </div>
            <div className="pt-1 flex items-center justify-between border-t border-white/10 text-[11px]">
              <span className="text-[#D6B46C] font-bold">
                RBAC Capabilities: {grantedCount} / {RBAC_ACTION_CATALOG.length} Granted
              </span>
              <button
                onClick={() => onNavigateTab('auth')}
                className="underline text-emerald-300 font-bold"
              >
                Account Studio →
              </button>
            </div>
          </div>
        </div>

        {/* 1-Tap Role Switcher Bar */}
        <div className="pt-3 border-t border-white/10 space-y-2.5">
          <div className="text-xs font-bold text-[#D6B46C] uppercase tracking-wider">
            Instant 5-Role Access Switcher (Updates All 14 RBAC Gates & 7-Stage Deal Permissions Live):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['TENANT', 'LANDLORD', 'AGENT', 'DEVELOPER', 'ADMIN'] as UserRole[]).map(r => {
              const active = effectiveRole === r
              const count = RBAC_ACTION_CATALOG.filter(a => a.allowedRoles.includes(r)).length
              return (
                <button
                  key={r}
                  onClick={() => onQuickRoleSwitch(r)}
                  className={`p-3 rounded-xl text-left transition border ${
                    active
                      ? 'swk-gold-gradient text-[#17191C] border-[#D6B46C] shadow-lg font-extrabold'
                      : 'bg-[#111315] text-gray-300 border-white/10 hover:border-[#D6B46C]/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold">{r}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/20 font-bold">
                      {count}/14 Gates
                    </span>
                  </div>
                  <div className="text-[11px] opacity-85 truncate mt-0.5">
                    {ROLE_CAPABILITIES[r].label}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 8 Dedicated Demo Accounts Quick-Switch Strip */}
        <div className="pt-2 space-y-2">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Or Switch Directly Into Any of the 8 Pre-Seeded UAE Demo Personas:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {demoUsers.slice(0, 8).map(u => {
              const isCurrent = currentUser?.email === u.email
              return (
                <button
                  key={u.id}
                  onClick={() => onDemoAccountLogin(u.email)}
                  className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between gap-2 ${
                    isCurrent
                      ? 'bg-[#17625F] text-white border-emerald-300 shadow'
                      : 'bg-[#22262B] text-gray-200 border-white/10 hover:border-[#D6B46C]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-extrabold truncate">{u.fullName}</div>
                    <div className="text-[10px] opacity-80 truncate">
                      [{u.role}] · {u.email}
                    </div>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 rounded bg-black/30 text-[#D6B46C] text-[10px] font-bold">
                    {isCurrent ? 'Active' : 'Switch'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================================
          2. 14-ACTION RBAC PERMISSION MATRIX & LIVE ACCESS VERIFIER
         ============================================================ */}
      <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E5DEC9] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#9E7628]">
              Server-Enforced & Client-Verified RBAC Guard
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#17191C]">
              14-Action Role Permission Matrix for <span className="text-[#17625F]">{effectiveRole}</span>
            </h2>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-[#FBF8F1] border border-[#D6B46C] text-xs font-extrabold text-[#17191C]">
            {grantedCount} Permitted · {RBAC_ACTION_CATALOG.length - grantedCount} Restricted for {effectiveRole}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {RBAC_ACTION_CATALOG.map(item => {
            const allowed = canRoleExecuteAction(effectiveRole, item.action)
            return (
              <div
                key={item.action}
                className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 transition ${
                  allowed
                    ? 'bg-[#FBF8F1] border-emerald-500/50 shadow-sm'
                    : 'bg-gray-50 border-gray-200 opacity-85'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-[#17191C] text-[#D6B46C]">
                      {item.category}
                    </span>
                    {allowed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold">
                        <Unlock size={11} /> GRANTED ({effectiveRole})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-extrabold">
                        <Lock size={11} /> RESTRICTED
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-[#17191C]">{item.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                </div>

                <div className="pt-2 border-t border-gray-200/80 space-y-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-[10px] text-gray-500 font-semibold mr-1">Permitted Roles:</span>
                    {item.allowedRoles.map(r => (
                      <span
                        key={r}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          r === effectiveRole
                            ? 'bg-[#17625F] text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {r}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => onNavigateTab(item.recommendedTab as NavTabId)}
                      className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                        allowed
                          ? 'bg-[#17191C] text-[#D6B46C] hover:bg-black'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      <span>
                        {allowed ? `Open in ${item.recommendedTab.toUpperCase()} →` : `Switch to ${item.allowedRoles[0]} to Execute`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============================================================
          3. 7-STAGE WORKFLOW SIGN-OFF AUTHORITY BY ROLE
         ============================================================ */}
      <section className="bg-white rounded-3xl p-5 sm:p-7 border border-[#E5DEC9] shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#17625F]">
              End-to-End UAE Tenancy Pipeline Governance
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-[#17191C]">
              7-Stage Deal Workflow Sign-Off Matrix for {effectiveRole}
            </h2>
          </div>
          <button
            onClick={() => onNavigateTab('workflow')}
            className="px-4 py-2 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow"
          >
            Open Live 7-Stage Deal Pipeline →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
          {UAE_RENTAL_WORKFLOW_STAGES.map(st => {
            const canSign = st.allowedRolesToAdvance.includes(effectiveRole)
            return (
              <div
                key={st.stage}
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2 text-xs ${
                  canSign
                    ? 'bg-emerald-50/70 border-emerald-400'
                    : 'bg-gray-50 border-gray-200 opacity-75'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-[#17191C]">Stage {st.stage}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                        canSign ? 'bg-emerald-700 text-white' : 'bg-gray-300 text-gray-700'
                      }`}
                    >
                      {canSign ? 'CAN SIGN' : 'VIEW ONLY'}
                    </span>
                  </div>
                  <div className="font-extrabold text-[#17191C] leading-snug">{st.shortTitle}</div>
                  <p className="text-[11px] text-gray-600">{st.deliverableBadge}</p>
                </div>
                <div className="pt-2 border-t border-gray-200 text-[10px] text-gray-500">
                  Roles: <strong>{st.allowedRolesToAdvance.join(', ')}</strong>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ============================================================
          4. NATIVE ANDROID APP (`ae.swk.rent`) & LIVE GPS VIEWING ESCORT CONSOLE
         ============================================================ */}
      <section className="swk-obsidian-card text-white rounded-3xl p-5 sm:p-7 border border-[#B89040]/50 shadow-xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold mb-1">
              <Smartphone size={14} />
              <span>
                {nativeDeviceInfo.isNativeBridgeDetected
                  ? 'Connected to Native Android WebView Bridge (window.SwkAndroidBridge)'
                  : 'Hybrid Web + Android Bridge Simulator Active (ae.swk.rent)'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold">
              Native Android Hardware Bridge & Foreground GPS Viewing Escort
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onTriggerBiometricSignIn}
              className="px-4 py-2 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow flex items-center gap-1.5"
            >
              <KeyRound size={14} />
              Trigger Android Biometric Unlock
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-5">
          {/* Device Telemetry & Launcher Icon / Server Config */}
          <div className="lg:col-span-5 bg-[#111315] p-4 rounded-2xl border border-white/10 space-y-4 text-xs">
            <div className="font-extrabold text-sm text-[#D6B46C] flex items-center justify-between">
              <span>Android Device Telemetry (`SwkNativePlugin.java`)</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                ORN 51517 Enforced
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#17191C] border border-white/10">
                <span className="text-[10px] text-gray-400 block">Device Identity</span>
                <strong className="text-white font-mono text-[11px]">{nativeDeviceInfo.deviceId}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#17191C] border border-white/10">
                <span className="text-[10px] text-gray-400 block">Hardware Model</span>
                <strong className="text-white text-[11px]">{nativeDeviceInfo.deviceName}</strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#17191C] border border-white/10">
                <span className="text-[10px] text-gray-400 block">Battery & Network</span>
                <strong className="text-emerald-400 text-[11px]">
                  {nativeDeviceInfo.batteryPct}% · {nativeDeviceInfo.networkType}
                </strong>
              </div>
              <div className="p-2.5 rounded-xl bg-[#17191C] border border-white/10">
                <span className="text-[10px] text-gray-400 block">Biometric Hardware</span>
                <strong className="text-[#D6B46C] text-[11px]">
                  {nativeDeviceInfo.biometricSupported ? 'BIOMETRIC_STRONG Ready' : 'PIN Fallback'}
                </strong>
              </div>
            </div>

            {/* Launcher Icon Variant Switcher */}
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="font-bold text-gray-300">
                Native Android & iOS Home-Screen Launcher Icon Variant:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSwitchAppIconVariant('emblem')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                    appIconVariant === 'emblem'
                      ? 'bg-[#B89040]/25 border-[#D6B46C] text-white font-bold'
                      : 'bg-[#17191C] border-white/10 text-gray-400'
                  }`}
                >
                  <img
                    src="/brand/app-icons/Emblem_and_SWK/Android/Google-Play-512.png"
                    alt="Emblem"
                    className="w-8 h-8 rounded-lg"
                  />
                  <div>
                    <div className="text-xs font-extrabold">Emblem + SWK</div>
                    <div className="text-[10px] opacity-80">Default Adaptive</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onSwitchAppIconVariant('wordmark')}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                    appIconVariant === 'wordmark'
                      ? 'bg-[#B89040]/25 border-[#D6B46C] text-white font-bold'
                      : 'bg-[#17191C] border-white/10 text-gray-400'
                  }`}
                >
                  <img
                    src="/brand/app-icons/SWK_Wordmark/Android/Google-Play-512.png"
                    alt="Wordmark"
                    className="w-8 h-8 rounded-lg"
                  />
                  <div>
                    <div className="text-xs font-extrabold">SWK Wordmark</div>
                    <div className="text-[10px] opacity-80">Executive Alias</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Remote Server URL Configuration */}
            <div className="pt-2 border-t border-white/10 space-y-1.5">
              <label className="text-gray-300 font-bold block">
                Android Hybrid Server Endpoint (`SwkNativePlugin.setServerUrl`):
              </label>
              <div className="flex gap-2">
                <input
                  value={serverUrlInput}
                  onChange={e => setServerUrlInput(e.target.value)}
                  placeholder="https://swk.rent or http://10.0.2.2:8090"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#17191C] border border-white/15 text-white text-xs"
                />
                <button
                  type="button"
                  onClick={() => onSaveServerUrl(serverUrlInput)}
                  className="px-3 py-2 rounded-xl bg-[#17625F] text-white font-extrabold text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live Foreground GPS Viewing Escort Dispatch (`SwkDutyLocationService`) */}
          <div className="lg:col-span-7 bg-[#111315] p-4 rounded-2xl border border-white/10 space-y-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  SwkDutyLocationService.java · Foreground GPS Telemetry
                </span>
                <h3 className="text-base font-extrabold text-white">
                  Live Key-Vault GPS Viewing Escort Sessions ({fieldDutySessions.length})
                </h3>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-[#D6B46C]">
                RBAC Gate: AGENT or ADMIN
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#17191C] border border-white/10 grid sm:grid-cols-12 gap-2.5 items-end">
              <div className="sm:col-span-7">
                <label className="text-gray-400 block mb-1 font-semibold">
                  Select Key-Vault Unit for GPS Viewing Escort
                </label>
                <select
                  value={selectedDutyUnitId}
                  onChange={e => setSelectedDutyUnitId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-[#22262B] border border-white/15 text-white font-semibold"
                >
                  {units.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.unitCode} · {u.buildingName} #{u.unitNo} ({u.keyVaultTag || 'SWK-VAULT'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-5">
                <button
                  type="button"
                  onClick={() =>
                    void onStartFieldDuty(
                      selectedDutyUnitId,
                      nativeDeviceInfo.deviceId,
                      nativeDeviceInfo.batteryPct,
                      nativeDeviceInfo.networkType,
                    )
                  }
                  className="w-full py-2.5 px-3 rounded-xl swk-gold-gradient text-[#17191C] font-extrabold text-xs shadow flex items-center justify-center gap-1.5"
                >
                  <Navigation size={14} />
                  Start Android GPS Viewing Escort
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {fieldDutySessions.map(sess => (
                <div
                  key={sess.id}
                  className="p-3.5 rounded-xl bg-[#17191C] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[#D6B46C]">{sess.sessionCode}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          sess.status === 'ACTIVE_GPS_ESCORT'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : 'bg-gray-700 text-gray-300'
                        }`}
                      >
                        {sess.status}
                      </span>
                      <span className="text-gray-400 text-[11px]">Key: {sess.keyVaultTag}</span>
                    </div>
                    <div className="font-bold text-white">{sess.assignedLocation}</div>
                    <div className="text-[11px] text-gray-400">
                      Advisor: <strong className="text-gray-200">{sess.agentName}</strong> · Device:{' '}
                      <code>{sess.deviceId}</code> · GPS: {sess.lastLat.toFixed(4)}, {sess.lastLng.toFixed(4)} (±
                      {sess.accuracyM}m · {sess.pointsCount} pts)
                    </div>
                  </div>

                  {sess.status === 'ACTIVE_GPS_ESCORT' && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => void onPingFieldDutyBatch(sess.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#22262B] hover:bg-white/15 text-emerald-300 border border-emerald-400/30 font-bold text-[11px]"
                      >
                        + Push GPS Fix
                      </button>
                      <button
                        type="button"
                        onClick={() => void onEndFieldDuty(sess.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#17625F] hover:bg-[#124e4b] text-white font-bold text-[11px]"
                      >
                        Verify & End Escort
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
