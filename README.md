# 🏠 BTL Calculator

Kalkulator rentowności nieruchomości pod wynajem (Buy-To-Let, UK).

**Live demo:** https://mrpawelcz.github.io/btl-calc/

## Funkcje

- **Etap 1 — Zakup:** cena, remont, Stamp Duty (auto, konfigurowalne progi), legal, sourcing, PM fee, DUV
- **Mortgage BTL** (interest-only) z konfigurowalnym LTV i stopą, liczone od DUV lub ceny zakupu
- **Etap 2 — Cashflow:** rent, management %, insurance, maintenance, voids, inne koszty
- **Wyniki:** Total Investment Cost, Cash needed (wkład własny), cashflow miesięczny/roczny
- **KPI:** Yield brutto (na DUV i na cenie), ROE
- **Tabela scenariuszy** — wrażliwość ROE na stopę procentową (3%-8%)
- Auto-zapis w localStorage + udostępnianie przez link z zakodowanymi danymi

## Wzory

```
Total Investment Cost = Price + Refurb + StampDuty + Legal + Sourcing + PM Fee
Mortgage (loan)       = LTV% × baza (DUV lub Price)
Cash needed           = Total Investment Cost − Mortgage

Mortgage payment      = Mortgage × stopa% / 12  (interest-only)
Koszty miesięczne     = MortgagePay + Mgmt%×Rent + Insurance + Maint%×Rent + Voids%×Rent + Other
Cashflow              = Rent − Koszty miesięczne

Yield (DUV)   = (Rent × 12) / DUV
Yield (Price) = (Rent × 12) / Price
ROE           = (Cashflow roczny / Cash needed) × 100%
```

## Uruchomienie lokalne

```bash
python3 -m http.server 8765
# otwórz http://localhost:8765/
```

## Licencja

MIT
