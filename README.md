# 🏠 BTL Calculator

Kalkulator rentowności nieruchomości pod wynajem (Buy-To-Let, UK).

**Live demo:** https://mrpawelcz.github.io/btl-calc/

## Funkcje

- **Strategie:** Cash, Standard BTL oraz BRRRR (domyślnie zakup gotówką, opcjonalnie pierwszy BTL przy zakupie).
- **Zakup:** cena, remont, automatyczne SDLT dla Anglii i Irlandii Północnej, legal, sourcing, PM fee, survey, własne koszty i DUV.
- **Mortgage BTL** (interest-only): LTV od ceny dla Standard BTL lub od DUV dla refinansowania BRRRR; opłaty kredytowe i opcjonalna kapitalizacja arrangement fee.
- **Cashflow:** rent, management, insurance, maintenance, voids, company costs i inne koszty.
- **Finansowanie BRRRR:** osobno gotówka do sfinansowania przed refinansowaniem, wpływ z refinansowania po spłacie pierwszego kredytu i kapitał pozostający w inwestycji.
- **KPI:** yield brutto/netto względem ceny i DUV oraz cash-on-cash return (poprzednio nazwany ROE). Przy kapitale <= 0 zwrot procentowy to `N/A`, a nie 0%.
- **Tabela scenariuszy** — wrażliwość cashflow i cash-on-cash na stopę procentową (3%-8%).
- Auto-zapis w localStorage + udostępnianie przez link z zakodowanymi danymi
- Wydruk / zapis PDF przez przeglądarkę.

## Wzory

```
Cash costs = Price + Refurb + StampDuty + Legal + Sourcing + PM Fee
           + Survey + Custom costs + opłaty kredytów płatne gotówką
           + odsetki pierwszego BTL w czasie remontu
Total Investment Cost = Cash costs + skapitalizowana opłata pierwszego BTL
Base final mortgage  = LTV% × baza (DUV dla BRRRR, Price dla Standard BTL)
Final loan balance   = Base final mortgage + skapitalizowana opłata końcowego BTL

BRRRR:
Cash before refinance = Cash costs − bazowy pierwszy kredyt
Net refinance proceeds = Base final mortgage − pełne saldo pierwszego kredytu
Cash left in deal      = Cash before refinance − Net refinance proceeds

Standard BTL: Cash required = Cash costs − Base final mortgage
Cash:         Cash required = Cash costs

Mortgage payment      = Final loan balance × stopa% / 12  (interest-only)
Koszty miesięczne     = MortgagePay + Mgmt%×Rent + Insurance + Maint%×Rent + Voids%×Rent + Company + Other
Cashflow              = Rent − Koszty miesięczne

Yield (DUV)   = (Rent × 12) / DUV
Yield (Price) = (Rent × 12) / Price
Net Yield     = (Rent − koszty operacyjne bez kredytu) × 12 / DUV lub Price
Cash-on-cash  = Cashflow roczny / kapitał zainwestowany × 100%
```

Kapitał zainwestowany oznacza kapitał pozostający po refinansowaniu w BRRRR albo własną gotówkę potrzebną w pozostałych strategiach. Skapitalizowana opłata pierwszego kredytu jest spłacana przy refinansowaniu. Skapitalizowana opłata końcowego kredytu pozostaje w jego saldzie: nie zwiększa gotówki wypłaconej inwestorowi i nie jest wliczana do pokazanego Total Investment Cost. Płatności interest-only nie spłacają kapitału ani tych opłat.

**Założenie finansowania:** wszystkie wprowadzone koszty gotówkowe, również opłaty refinansowania, są finansowane przed otrzymaniem wypłaty z refinansowania. Nie odliczamy czynszu otrzymanego przed refinansowaniem. To uproszczone zapotrzebowanie na finansowanie, nie harmonogram przepływów. Ujemne wpływy z refinansowania oznaczają konieczność dopłaty; ujemny pozostawiony kapitał oznacza odzyskanie wkładu oraz dodatkową wypłatę.

**Zakres wyników:** ustabilizowany najem przed podatkiem dochodowym / corporation tax. Roczny cashflow to 12 miesięcy takiego najmu, nie pierwszy rok od zakupu. Fixed period jest informacyjny; brak automatycznej kalkulacji ERC i przyszłych refinansowań.

## SDLT

Moduł dotyczy Anglii i Irlandii Północnej. Dla uprawnionych first-time buyers: 0% do £300,000, 5% od nadwyżki do ceny £500,000; przy cenie powyżej £500,000 cała transakcja wraca do standardowych progów. Wyboru ulgi należy dokonać tylko po ustaleniu uprawnienia.

Źródło: [oficjalne objaśnienie GOV.UK/HMRC](https://www.gov.uk/stamp-duty-land-tax/residential-property-rates), odczyt 02.10.2026. Zweryfikowano wskazane progi FTB, nie pełne warunki i wyjątki podatkowe dla każdej transakcji. To objaśnienie organu, nie audyt tekstu ustawy.

## Uruchomienie lokalne

```bash
python3 -m http.server 8765
# otwórz http://localhost:8765/
```

## Testy regresji

Bez zależności, Node.js 18+:

```bash
node --test tests/finance.test.cjs
```

Testy wykonują bieżący skrypt kalkulatora z minimalnym DOM: strategie finansowania, kapitalizowane opłaty, kapitał przed/po refinansowaniu, zwrot bez dodatniego mianownika i granice SDLT.

## Licencja

MIT
