# SWK Rent (`swk.rent`): Master Business & Product Plan for a Dedicated UAE Rental Ecosystem
**Operated by SWK Properties L.L.C. (RERA ORN `51517`) · Connected via External OS REST API (`/api/os-api/*`)**

> [!IMPORTANT]
> **Strategic Advantage:** Traditional classifieds portals are **disconnected advertising boards**. They only sell leads and have zero visibility or control over what happens *after* a tenant clicks "WhatsApp." **SWK Rent (`https://swk.rent`)** is a transactional, API-integrated UAE Rental Ecosystem combining Title-Deed Deduplication, True Monthly Cost Transparency, 7-Stage Deal Workflows, BTR FIFO Anti-Cannibalization Queues, and a 90-Day RERA Decree 43 Renewal Shield.

---

## 1. 18 Real-World UAE Rental Loopholes Solved by `swk.rent`

| # | Real-World UAE Scenario / Loophole | How `swk.rent` Solves It |
| :--- | :--- | :--- |
| **1** | **Bait-and-Switch Ghost Listings** | **API-Locked Availability State:** The moment a holding deposit or Ejari is active, the unit auto-locks to `Offer Locked (48h)` or `Ejari Active / Rented`. |
| **2** | **15 Duplicate Ads for the Same Apartment** | **Building-First, Unit-Deduplicated Architecture:** Deduplicated by Makani + Building + Unit No + Title Deed. |
| **3** | **District Cooling / Chiller Trap** | **Mandatory Utility & Chiller Intelligence:** Every building stores structured chiller (`Chiller Free`, `Empower`, `Tabreed`) and DEWA estimates inside the True Monthly Cost engine. |
| **4** | **Unlisted Cheque Price Inflation** | **Dynamic Cheque-Tier Pricing Matrix:** Interactive toggle for `1 Cheque`, `2 Cheques`, `4 Cheques`, and `12x Monthly (UAEDDS/RNPL)`. |
| **5** | **Commute & Traffic Blindness** | **Rush-Hour Commute & Summer Shade Walkability Engine:** Filter by 8:30 AM commute time to DIFC, Media City, Business Bay, and ADGM. |
| **6** | **Who Actually Has the Key?** | **Live Key Custody Badge (`In SWK Vault` / `Smart Lock Instant`):** Synced via OS REST API & Webhooks (`/api/os-api/webhook`). |
| **7** | **Fake Viewing Attendance** | **GPS-Verified Viewing Check-In:** Native Android & iOS field verification logs exact viewing timestamps for landlords. |
| **8** | **A2A Co-Brokering Commission Disputes** | **Protected A2A Mandate Registry:** Locks `50% Partner / 25% SWK / 25% Advisor` commission splits with a 7-day lead protection certificate. |
| **9** | **WhatsApp Offer Chaos & Gazumping** | **1-Click Digital Offer & 48-Hour Unit Lock:** Structured offer workflow with `AED 2,000` corporate escrow reservation. |
| **10** | **Rogue Personal Account Scam** | **Hard UAE Payment Guard:** Blocks personal advisor IBANs or cash requests; enforces corporate escrow, Title-Deed matched Landlord IBAN, or UAEDDS. |
| **11** | **Unfair Security Deposit Deductions** | **50-Point Timestamped Move-In Snagging Vault:** Geo-tagged photo score locked at Stage 6 before move-in. |
| **12** | **AED 500 Maintenance Grey Zone** | **Automated UAE Maintenance Classifier:** Minor wear (`< AED 500`) assigned to Tenant; major/structural (`>= AED 500`) routed to Landlord SLA. |
| **13** | **Illegal Rent Hikes & Missed 90-Day Notice** | **Automated RERA Decree 43 & Law 33 of 2008 Shield:** Enforces the 90-day notice rule and 0%/5%/10%/15%/20% RERA slab caps. |
| **14** | **Bounced PDC Cheques** | **PDC Cheque Vault + RNPL Bounce Shield:** Converts upcoming cheques to UAEDDS/RNPL monthly installments before a bank bounce occurs. |
| **15** | **Illegal Re-Listing After Eviction Notice** | **24-Month DLD Eviction Watchdog:** Monitors Title Deeds for illegal re-listing after personal-use/sale eviction notices. |
| **16** | **New Expat Catch-22 (Pending Emirates ID)** | **30-Day New Expat Bridge-to-Ejari:** Move in immediately on passport + employment offer letter, auto-converting to 12-month Ejari once EID issues. |
| **17** | **Unlicensed Partition / Subletting Risk** | **Bi-Annual Visual Asset Inspections:** Scheduled occupancy & condition verification synced to Owner360. |
| **18** | **Move-In Gate Pass & Utility Sequencing** | **Stage 7 Automated Move-In NOC QR Pass:** Verifies Ejari + DEWA + Chiller and issues an OA Security QR Gate Pass (`NOC-PASS-*`). |

---

## 2. API-First External OS Integration Architecture

`swk.rent` communicates with external property management or CRM operating systems strictly via REST APIs and webhooks:

- **Outbound & Pull Sync (`src/server/os-api-client.ts`):**
  - `GET /api/os-api/status`
  - `POST /api/os-api/config`
  - `POST /api/os-api/sync-inventory`
- **Inbound Real-Time Webhook (`POST /api/os-api/webhook`):**
  - Accepts `UNIT_STATUS_UPDATED`, `RENT_UPDATED`, and `KEY_VAULT_VERIFIED` events from `https://api.os.swk.rent`.
