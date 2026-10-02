# UK BRRR / BTL model review

Reviewed 2 October 2026. Scope: the pre-redesign calculator in `index.html` / extracted `calculator.js`; recommendations supplied to the implementation agent, not a certification of the subsequently edited app. Application files were not edited by this reviewer.

## Conclusion

The central model is useful: distinguish cash needed before refinance, cash released after repaying the first loan, and cash remaining invested. Keep that distinction. Interest-only debt, cash-versus-capitalised fees, and cash-on-cash using remaining investor cash are sound when their assumptions are explicit. The main problems are misleading SDLT choices, overconfident refinance assumptions, and omitted holding/exit costs—not a need for a much larger underwriting tool.

The simplest useful version has three strategies, four headline outputs, and expandable detail:

- Cash / purchase BTL / BRRR.
- Headline: cash required before refinance, cash left after refinance, monthly cashflow before tax, cash-on-cash return. Adapt the first two to non-BRRR strategies.
- Main inputs: purchase price, refurb budget, after-works value, rent, financing LTV/rate and ownership/SDLT category.
- Expandable: transaction costs, operating assumptions, purchase mortgage, fees and holding costs; yields and rate scenarios are secondary.

## Must fix

### 1. SDLT choices must match a rental-property calculator

FTB relief requires intending to occupy the property as the buyer's only or main residence [S2]. Therefore remove it from a pure BTL model. An individual's first/only rental property is not automatically an additional property, but it does not qualify for FTB relief simply because the buyer has never owned before [S1–S3]. The `main` option should not invite users to claim replacement-main-residence treatment for a rental purchase.

Suggested choices:

- **Personal — additional residential property**
- **Personal — only residential property (standard rates)**
- **Ltd / SPV — qualifying property rental business assumed**

Suggested hint: “Additional-property treatment can depend on properties owned worldwide, joint buyers and spouses. This selection does not check your eligibility.” Existing saved `ftb` cases should be migrated visibly to ordinary personal rates, not silently retain relief.

Ordinary residential bands and the 5-percentage-point additional-property uplift agree with the current GOV.UK guidance. The higher-rate purchase threshold is **£40,000 or more**, not strictly above £40,000 [S1, S3].

The corporate higher-threshold rate is **17%, not 15%**, for relevant purchases over £500,000; qualifying property rental business relief is conditional [S4]. It is not a matter of selecting the “optimal” tax regime. Avoid expanding into a full corporate relief engine. Say: “Company estimate assumes qualifying property-rental-business relief where required; special corporate rules are not assessed.” Display a conditional note for company purchases above £500,000 and link S4.

For ordinary freehold purchases, the nonresident surcharge also has a £40,000-or-more threshold. The original function incorrectly charged 2% on smaller purchases [S5]. Leasehold premium/rent rules are different: either support them explicitly or scope the automatic SDLT estimate to an ordinary single-dwelling freehold purchase. Scotland's and Wales's taxes are not modelled; “UK” should not obscure “SDLT: England & Northern Ireland”.

### 2. Remove the inaccurate residence explanation

The company rule is not “nonresident if any shareholder/controller fails 183 days”, nor “UK resident if every shareholder passes”. Relevant UK-resident companies are assessed using close-company, non-UK-control and excluded-company conditions [S5, S6]. Do not implement those tests through one day-count hint.

Suggested checkbox: **Non-resident SDLT surcharge applies (+2%)**.

Suggested hint: “Use the SDLT-specific residence and company-control tests. This is not nationality or ordinary tax residence.” Link S5.

For individuals, the immediate return normally looks at presence before purchase; a later refund can depend on a qualifying continuous 365-day period within the prescribed before/after window. “Become UK resident within 12 months” is not a complete statement of that test [S5, S7]. Keep detailed residency guidance out of the compact interface.

### 3. Refinance is a target, not confirmed funding

The existing `DUV × LTV` calculation is an assumed cash advance. Rent-based lender affordability can constrain borrowing even when a high valuation supports the target LTV. Accord publishes different ICR/stress rules for taxpayer category, fixed period and capital-raising versus straight-switch refinance. Landbay's published categories/stress rates differ [L2, L4]. Therefore **do not hardcode 125% / 145% or one stress rate as universal UK eligibility**.

Suggested adjacent copy: “Target borrowing only. Lender valuation, rental stress test, ownership period and fee/LTV limits may reduce the loan.” A simple scenario tool need not simulate approval. If a later version adds a rental stress check, use user-confirmed stress rate and required ICR, and label it an illustration—not a lending decision.

Remove the universal “6 months min” statement. Accord specifically requires six months' ownership [L1]; that confirms one lender's policy, not a law or a market-wide rule. Suggested copy: “Refinance timing and valuation basis depend on the lender.” An example using six months is an assumption, not a guarantee.

The optional first BTL is not interchangeable with bridging/development finance. Accord requires a property suitable for immediate letting at valuation and does not hold retentions for works; Landbay also requires suitability for letting [L3, L4]. Suggested purchase-mortgage hint: “Only if the property and works are acceptable to your BTL lender. Bridging and rolled-up interest are not modelled.”

### 4. Include carrying costs and redemption charges without building a timeline engine

Two optional pound inputs, default zero, are sufficient:

- **Holding costs before refinance (£)**: council tax, utilities, insurance and other carrying costs not entered elsewhere; excludes first-loan interest calculated separately. Zero means none entered, not independently checked.
- **Early repayment / exit fees (£)**: shown for BRRR with a first mortgage. Enter the lender's ERC/redemption quote, not a guessed percentage.

Rename “Refurb period” to **Months until refinance**: purchase-loan interest runs until repayment, not only until building work finishes. The present model omits rent received before refinance, so say so explicitly. Avoid prompting a two-year fixed first loan as inherently suitable for a short holding period.

If all cash fees continue to be assumed paid before refinance proceeds, include exit fees consistently in that conservative funding total. Label the refinance line **Refinance after repaying first loan**, not a literal completion-statement payout after all fees. A precise dated cashflow schedule would allocate some fees at completion instead, but is not required for this compact version.

## Financial definitions to retain or clarify

Let `C` be all entered cash costs, including purchase/refurb/SDLT, cash-paid finance fees, holding costs and first-loan interest. Let `A1` and `A2` be capitalised first and final loan fees; `B1` and `B2` are base cash advances.

```text
Total project cost = C + A1 + A2
First debt at redemption = B1 + A1
Final loan balance = B2 + A2

BRRR cash before refinance = C − B1
Refinance after first debt = B2 − (B1 + A1)
Cash left invested = cash before refinance − refinance after first debt
                  = total project cost − final loan balance

Standard BTL cash required = C − B2
Cash purchase cash required = C
```

Unused strategy components are zero. Adding the final capitalised fee to **Total project cost** makes the cost measure consistent regardless of payment method; it must not increase the investor's cash requirement or cash advance. The original total excluded that fee. Interest-only monthly cost uses the full final balance including its capitalised fee. First-loan holding interest likewise uses its full debt balance. Capitalisation does not repay either fee.

Cash remaining invested is not property equity. Property equity would be property value minus outstanding debt and excludes sunk acquisition expenses. Neither measure is a realised gain.

Cash-on-cash is annual stable rental cashflow divided by positive investor cash remaining. For zero/negative cash remaining, **N/A** is correct; show cash recovered separately. Do not call an undefined ratio “infinite return” or “0%”. Annual cashflow means twelve months of stable letting, not the first calendar year after purchase. Negative refinance proceeds mean a funding shortfall, not zero proceeds.

## Operating-cost simplifications

- Rent less void allowance, maintenance reserve, management, insurance and recurring costs is a useful budget. Maintenance reserve is a planning allowance, not an assertion about when repairs are actually paid.
- Management currently applies to advertised gross rent, including the void allowance. This is conservative, not inherently an arithmetic error. Make the basis explicit and ask for the VAT-inclusive fee; do not imply it is charged only on collected rent. An alternative collected-rent formula would be a deliberate model change.
- Keep leasehold service charges/ground rent, licensing/safety checks and reletting expenses within clearly named existing monthly/custom costs. They need not all become separate inputs.
- Keep **before income / corporation tax** next to cashflow. Do not estimate personal tax by multiplying cashflow by a tax rate: HMRC describes finance-cost relief restrictions separately [S8]. Company versus individual ownership is not a tax comparison in this app.
- Remove universal “>15% is a good investment”, “always refinance”, fixed-rate equals a particular SONIA formula, and unsourced “typical” fee/SVR ranges. Positive cashflow is not an investment endorsement. A fixed-period input is at most informational unless a future refinance/exit schedule is modelled.
- Keep defaults explicitly illustrative. The original cash-purchase/refinance example at £135,000 purchase, £182,000 valuation and £995 rent produces approximately **£30.53/month pre-tax and 0.88% cash-on-cash**, using the original gross-rent management assumption and no additional holding/exit costs. It should not be presented as a recommended deal.

## Source verification

Method: applied the evidence-first discipline of the `prawo-weryfikacja` skill. Its script covers Polish sources, not UK tax; UK assertions here were checked directly against official GOV.UK/HMRC pages. These are guidance/manual observations, not a legislative-text audit or an individual tax determination. All URLs below were retrieved and read on **2026-10-02**.

- **[S1] GOV.UK residential property rates** <https://www.gov.uk/stamp-duty-land-tax/residential-property-rates> — current ordinary/FTB rates; main-residence replacement and additional-property distinction.
- **[S2] HMRC SDLTM29805, content** <https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm29805> — relief requires intent to occupy as only/main residence. Relevant excerpt: “provided the purchaser intends to occupy the property as their only or main residence.”
- **[S3] GOV.UK higher rates, content** <https://www.gov.uk/guidance/stamp-duty-land-tax-buying-an-additional-residential-property> — £40,000 threshold; worldwide ownership, spouses/joint buyers and company treatment.
- **[S4] GOV.UK corporate bodies, content** <https://www.gov.uk/guidance/stamp-duty-land-tax-corporate-bodies> — 17% higher-threshold rate and conditional property-rental-business relief. Excerpt: “You must meet the conditions that apply for each relief.”
- **[S5] GOV.UK non-UK resident rates, content** <https://www.gov.uk/guidance/rates-of-stamp-duty-land-tax-for-non-uk-residents> — 2-percentage-point surcharge, freehold £40,000 threshold, leasehold differences, companies and refunds. Its illustrative FTB example contains an older £625,000 reference; current FTB thresholds were instead confirmed through S1/S2.
- **[S6] HMRC SDLTM09910, content** <https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09910> — close-company, non-UK-control and excluded-company conditions. The calculator does not determine those conditions.
- **[S7] HMRC SDLTM09880, content** <https://www.gov.uk/hmrc-internal-manuals/stamp-duty-land-tax-manual/sdltm09880> — individual SDLT presence test, return basis and later refunds.
- **[S8] GOV.UK residential landlord finance-cost relief, content** <https://www.gov.uk/guidance/changes-to-tax-relief-for-residential-landlords-how-its-worked-out-including-case-studies> — why simple cashflow is not taxable income. Historical case-study tax bands were not adopted.
- **[L1] Accord remortgaging criteria** <https://www.accordmortgages.com/btl/criteria/remortgaging> — six-month ownership requirement for that lender; not a universal rule.
- **[L2] Accord rental coverage criteria** <https://www.accordmortgages.com/btl/criteria/rental-coverage> — ICR/stress distinctions and lower of received/valuer rent.
- **[L3] Accord valuations criteria** <https://www.accordmortgages.com/btl/criteria/valuations> — immediate letting suitability and no retentions for works.
- **[L4] Landbay lending criteria** <https://www.landbay.co.uk/intermediaries/lending-criteria/> — current differing product/borrower ICR and stress rules; letting suitability.

### Not verified / outside scope

No borrower-specific lender decision, valuation, rent appraisal, title/tenure assessment, corporate relief eligibility, residence/control determination, ERC quotation or tax outcome was verified. No full SDLT engine for linked/multiple transactions, mixed-use land, leases, trusts or relief exceptions is proposed. Scotland/Wales acquisition taxes, bridging/rolled-up interest, amortising mortgages, future refinancing, sale proceeds, capital gains, ATED and portfolio underwriting are not modelled. The Mortgage Works criteria endpoints returned HTTP 403; no claim relies on them. No general assertion that every lender permits fees above its maximum LTV was verified.
