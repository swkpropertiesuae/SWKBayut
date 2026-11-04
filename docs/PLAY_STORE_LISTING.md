# Google Play Store & Apple App Store Listing Kit — SWK Rent (`ae.swk.rent`)

## 1. App Identity & Package Metadata
- **Primary Web Domain:** `https://swk.rent`
- **Android Application ID:** `ae.swk.rent`
- **iOS Bundle Identifier:** `ae.swk.rent`
- **Deep-Link Scheme:** `swkrent://open`
- **Version Code / Version Name:** `100` / `1.0.0`
- **Target SDK / Compile SDK:** `34` (Android 14+ compliant)
- **Developer / Legal Entity:** **SWK Properties L.L.C.** (RERA ORN `51517`, Dubai, UAE)
- **Category:** House & Home / Real Estate
- **Content Rating:** Everyone (`PEGI 3` / `ESRB Everyone`)

---

## 2. Google Play Store & App Store Copy (Copy-Paste Ready)

### App Name (Max 30 chars)
`SWK Rent: UAE Verified Rentals`

### Short Description (Max 80 chars)
`Zero duplicate UAE rentals, True Monthly Cost, 12x payments & RERA Rent Shield.`

### Full Description (Max 4000 chars)
**SWK Rent (`swk.rent`)** is the UAE's Dedicated Verified Rental Marketplace & Tenancy Super-App, built by **SWK Properties L.L.C. (RERA ORN 51517)**.

Unlike traditional classifieds portals where tenants scroll through 15 duplicate listings of the same apartment and face surprise chiller bills, **SWK Rent** connects every listing via live REST APIs to verified Title Deeds, DLD Trakheesi permits, and physical Key Vaults:

**FOR TENANTS:**
• **Zero Duplicate Ads:** Every apartment is deduplicated by Building, Unit Number, Makani, Title Deed, and DLD Trakheesi Madmoun QR permit.
• **True Monthly All-In Cost Calculator:** See your real monthly cost upfront—including Base Rent, Chiller (Chiller-Free vs. Empower/Tabreed), DEWA, 5% Municipality Housing Fee, and exact Move-In Cash Required.
• **Flexible Cheque & 12x Monthly Payments:** Toggle between 1, 2, 4 cheques, 12 Monthly Payments (UAEDDS/RNPL), or our 30-Day New Expat Bridge Pass (move in before your Emirates ID is issued).
• **Direct-to-Landlord Savings:** Rent Direct-to-Landlord units for a flat AED 2,999 digital execution fee—saving up to 70% compared to standard 5% broker commissions.
• **Instant GPS & Smart-Lock Viewings:** Book 60-minute instant viewings on units where SWK holds the verified physical key in the vault.
• **90-Day RERA Decree 43 Renewal Shield:** Automatically blocks illegal rent increases and late notices (< 90 days) under Dubai Law No. 33 of 2008.

**FOR AGENTS, DEVELOPERS & PROPERTY MANAGERS:**
• **AED 0 Listing Credit Burn:** Sync PropSpace, Propertybase, Bitrix24, Pixxi, or External OS REST API feeds for free.
• **Developer BTR & Bulk Handover FIFO Queue:** Release only 3 units per layout at a time at a locked floor rent to prevent investor price wars during new tower handovers.
• **Reverse Rental Auction:** Bid directly on UAE-PASS verified corporate tenants who already have cheques ready.
• **Protected 50/50 A2A Split & 1-Tap WhatsApp Pitch:** Share watermark-free client pitch links with your RERA BRN commission split automatically locked.

---

## 3. Building the Play Store `.aab` Bundle, Signed `.apk` & iOS Assets

### Automatic Cloud Build (GitHub Actions)
Every push to `main` triggers `.github/workflows/android-apk.yml`, which compiles the web bundle, syncs it into `android/app/src/main/assets/public`, and builds the Android APK/AAB.

### Local Build Commands
```bash
npm run mobile:sync      # Builds web app & syncs into Android + iOS native bundles
npm run android:apk      # Builds android/app/build/outputs/apk/debug/app-debug.apk
npm run android:aab      # Builds Google Play Store release bundle (.aab)
```

---

## 4. Data Safety & Permissions Declaration
- **`ACCESS_FINE_LOCATION` / `FOREGROUND_SERVICE_LOCATION`:** Used exclusively during active, user-initiated GPS property viewing check-ins so tenants and landlords have verified proof of viewing attendance. No background tracking occurs when a viewing session is closed.
- **`USE_BIOMETRIC` / `NSFaceIDUsageDescription`:** Used for local device unlock when accessing smart-lock passcodes or signing digital rental offers.
- **`CAMERA` / `NSCameraUsageDescription`:** Used on-demand when capturing 50-point move-in/move-out snagging photos or scanning Trakheesi/Reception QR codes.
