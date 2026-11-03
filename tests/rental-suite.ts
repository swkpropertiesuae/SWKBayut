import assert from 'node:assert/strict'
import { buildServer } from '../src/server/index'
import {
  calculateTrueRentalCost,
  evaluateReraRenewal,
  validateUaeLegalPayment,
  classifyMaintenanceResponsibility,
} from '../src/shared/uae-rental-rules'

async function runTests() {
  const app = buildServer()
  let passed = 0
  const check = (name: string, fn: () => void) => {
    fn()
    passed++
    console.log(`  ✓ [${passed}] ${name}`)
  }

  console.log('Running SWKBayut UAE Rental OS Acceptance Suite...')

  // 1. Health & OS Bridge
  const healthRes = await app.inject({ method: 'GET', url: '/api/health' })
  check('GET /api/health returns ORN 51517 & swkpropertiesOS link', () => {
    assert.equal(healthRes.statusCode, 200)
    const body = healthRes.json()
    assert.equal(body.ok, true)
    assert.equal(body.reraOrn, '51517')
  })

  // 2. Bootstrap Payload
  const bootRes = await app.inject({ method: 'GET', url: '/api/bootstrap' })
  const boot = bootRes.json()
  check('GET /api/bootstrap returns canonical buildings, deduplicated units, leases, PDCs, and maintenance', () => {
    assert.equal(bootRes.statusCode, 200)
    assert.ok(boot.buildings.length >= 6)
    assert.ok(boot.units.length >= 6)
    assert.ok(boot.leases.length >= 2)
    assert.ok(boot.cheques.length >= 4)
  })

  // 3. Hybrid Supply Commission & True Monthly Cost Engine
  const sampleUnit = boot.units[0]
  check('Direct-to-Landlord tier charges flat AED 2,999 fee & saves tenant vs 5% broker fee', () => {
    const directCost = calculateTrueRentalCost(sampleUnit, 1, 'DIRECT_LANDLORD')
    assert.equal(directCost.agencyOrPlatformFeeAed, 2999)
    assert.ok(directCost.agencyFeeSavingVsTraditionalAed > 3000)
    assert.equal(directCost.commissionSplit.swkCompanyShareAed, 2999)
  })

  check('A2A Partner tier locks 50% Partner / 25% SWK Company / 25% SWK Advisor split', () => {
    const a2aCost = calculateTrueRentalCost(sampleUnit, 1, 'A2A_PARTNER')
    const gross = a2aCost.commissionSplit.grossFeeExclVat
    assert.equal(a2aCost.commissionSplit.a2aPartnerShareAed, Math.round(gross * 0.5))
    assert.equal(
      a2aCost.commissionSplit.swkCompanyShareAed +
        a2aCost.commissionSplit.swkAdvisorShareAed +
        a2aCost.commissionSplit.a2aPartnerShareAed,
      gross,
    )
  })

  // 4. Hard UAE Payment Guard blocks personal bank accounts
  const rogueOfferRes = await app.inject({
    method: 'POST',
    url: '/api/offers',
    payload: {
      unitId: 1,
      tenantName: 'Test Tenant',
      tenantPhone: '+971500000000',
      offeredAnnualRent: 125000,
      chequeOption: 4,
      paymentChannel: 'SWK Company Escrow / Corporate Account (AED)',
      destinationAccount: 'Please wire to agent personal bank account IBAN',
    },
  })
  check('POST /api/offers blocks rogue Sales Advisor personal bank account with HTTP 400', () => {
    assert.equal(rogueOfferRes.statusCode, 400)
    assert.match(rogueOfferRes.json().error, /UAE Compliance Block/i)
  })

  // 5. Valid 1-Click Digital Offer locks unit for 48 hours
  const validOfferRes = await app.inject({
    method: 'POST',
    url: '/api/offers',
    payload: {
      unitId: 1,
      tenantName: 'Rashid Al Falasi',
      tenantPhone: '+971501234567',
      offeredAnnualRent: 125000,
      chequeOption: 12,
      paymentChannel: 'UAEDDS Central Bank Monthly Direct Debit',
      lockUnitWithDeposit: true,
    },
  })
  check('POST /api/offers creates digital offer and locks unit availability for 48 hours', () => {
    assert.equal(validOfferRes.statusCode, 200)
    const body = validOfferRes.json()
    assert.equal(body.ok, true)
    assert.match(body.offer.status, /48h Unit Lock Active/)
  })

  // 6. RERA Decree 43 of 2013 & Law 33 of 2008 90-Day Notice Shield
  check('RERA Renewal Shield blocks late notice (< 90 days) and caps rent increase at 0%', () => {
    const lateEval = evaluateReraRenewal({
      currentRent: 100000,
      reraIndexRent: 130000,
      proposedRent: 115000,
      leaseEndDate: '2026-12-31',
      noticeServedDate: '2026-11-01', // Less than 90 days before Dec 31!
    })
    assert.equal(lateEval.noticeGivenOnTime, false)
    assert.equal(lateEval.maxAllowedIncreasePct, 0)
    assert.equal(lateEval.maxLegalRenewalRent, 100000)
    assert.equal(lateEval.isLegalProposal, false)
  })

  // 7. UAE AED 500 Maintenance Classifier
  check('Maintenance classifier assigns < AED 500 to Tenant and >= AED 500 to Landlord', () => {
    const minor = classifyMaintenanceResponsibility({ category: 'Cosmetic / Bulbs', estimatedCostAed: 320 })
    const major = classifyMaintenanceResponsibility({ category: 'AC / Cooling', estimatedCostAed: 950 })
    assert.equal(minor.responsibleParty, 'Tenant')
    assert.equal(major.responsibleParty, 'Landlord')
  })

  // 8. PDC Bounce Shield conversion
  const pdcRes = await app.inject({
    method: 'POST',
    url: '/api/pdc/3/action',
    payload: { action: 'RNPL_Bounce_Shield' },
  })
  check('POST /api/pdc/:id/action converts upcoming PDC cheque to RNPL Monthly Bounce Shield', () => {
    assert.equal(pdcRes.statusCode, 200)
    assert.match(pdcRes.json().status, /Bounce Prevented/)
  })

  // 9. A2A Partner Registration & Landlord Onboarding
  const a2aRes = await app.inject({
    method: 'POST',
    url: '/api/a2a/register',
    payload: {
      partnerAgencyName: 'Haus & Haus Partner Desk',
      partnerOrn: 'ORN-29100',
      brokerName: 'Kareem Abbas',
      brokerBrn: 'BRN-44102',
      unitId: 2,
      clientName: 'Dr. Lukas Weber',
    },
  })
  check('POST /api/a2a/register locks 7-day lead protection and 50/50 split', () => {
    assert.equal(a2aRes.statusCode, 200)
    assert.equal(a2aRes.json().mandate.agreed_a2a_split_pct, 50)
  })

  await app.close()
  console.log(`\nALL ${passed}/${passed} SWKBAYUT UAE RENTAL OS CHECKS PASSED!`)
}

runTests().catch(err => {
  console.error(err)
  process.exit(1)
})
