# SWKBayut — UAE Verified Rental Marketplace & Tenancy OS

<p align="center">
  <img src="public/brand/logo-png/swk-logo-gold-512.png" alt="SWK Properties LLC" width="160" />
</p>

**UAE's First Operating-System-Backed Dedicated Rental Platform** — built for **SWK Properties L.L.C.** (RERA ORN `51517`) and synchronized with **[SWK Properties OS](https://github.com/swkpropertiesuae/swkpropertiesOS)**.

---

## 🎯 Why SWKBayut Exists: Closing the 18 UAE Rental Market Loopholes

Traditional UAE property portals (Bayut, Property Finder, Dubizzle) are **disconnected advertising boards**. They sell listing credits to brokers and have zero control over physical keys, GPS viewing attendance, cheque vaults, Ejari execution, or deposit returns.

**SWKBayut** connects the public consumer rental search directly to an active **Real Estate Operating System**:

1. **Zero Duplicate Ads (Canonical Building & Title-Deed Deduplication):** Every unit is indexed by **Building + Unit No. + Makani + Title Deed + Trakheesi Madmoun QR**. When a 48-hour offer lock or Ejari is active, the unit auto-locks in 1 second—eliminating bait-and-switch ghost listings.
2. **True Monthly All-In Cost Engine:** Every card dynamically calculates:
   - Headline Rent across `1 Cheque`, `2 Cheques`, `4 Cheques`, `12 Monthly (UAEDDS/RNPL)`, or `30-Day New Expat Bridge Pass` (for newly arrived expats awaiting Emirates ID).
   - Building-specific **Chiller** (`Chiller Free`, `Empower`, `Tabreed`), **DEWA**, and **5% Municipality Fee** estimates.
   - Exact Move-In Cash Required (`Security Deposit + Commission/Flat Fee + Ejari AED 220 + DEWA/Chiller Deposits`).
3. **Hybrid Supply & Commission Model:**
   - **SWK Exclusive / Managed (`5%`):** Physical key held in SWK Vault (`SWK-KEY-*`), `50% SWK Company / 50% Sales Advisor` split.
   - **Verified A2A Partner Network (`5%`):** External RERA brokers register their ORN/BRN + client for a 7-day protection lock and automated `50% Partner / 25% SWK Company / 25% SWK Advisor` split.
   - **Direct-to-Landlord Self-Serve (`Flat AED 2,999`):** UAE PASS + Title-Deed verified landlords list for `AED 0` and tenants save up to `70%` on agency fees.
4. **Instant GPS & Smart-Lock Viewings:** Live key custody tracking (`In SWK Vault` / `Smart Lock Instant`) + `SWK ONE Android` GPS dispatch.
5. **1-Click Binding Digital Offer & Hard UAE Payment Guard:** Replaces chaotic WhatsApp haggling with a formal digital offer, `AED 2,000` escrow holding deposit, and a **Hard Server Compliance Gate** that blocks any transfer to a Sales Advisor's personal bank account (`400 Bad Request`).
6. **Post-Lease Tenancy Shield:**
   - **90-Day RERA Decree 43 & Law 33 of 2008 Renewal Shield:** Automatically flags illegal rent hikes or late notices (`< 90 days`).
   - **PDC Cheque Vault & RNPL Bounce Shield:** Lets tenants convert an upcoming cheque to a monthly UAEDDS/RNPL split before it bounces.
   - **UAE `AED 500` Maintenance Classifier:** Automatically routes `< AED 500` minor wear to Tenant and `>= AED 500` major/structural repairs to Landlord in `Owner360`.
   - **50-Point Timestamped Snagging & 24-Month Eviction Watchdog:** Protects security deposits and monitors against illegal re-listing after "personal use" evictions.

---

## 🚀 Quick Start

```bash
npm run dev          # Starts API (:8090) + Web (:5175)
npm run typecheck    # TypeScript validation (0 errors)
npm run build        # Production Web + Server bundle
npm test             # Run 9/9 UAE Rental OS acceptance checks
```
