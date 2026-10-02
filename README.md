# BTL Calculator

Kompaktowy kalkulator inwestycji pod wynajem: Cash, Standard BTL i BRRR. Jasny interfejs, wyniki na żywo, szczegółowe koszty w rozwijanych sekcjach.

**Aplikacja:** https://mrpawelcz.github.io/btl-calc/

## Model

- Podstawowe dane: cena, remont, wartość po remoncie i czynsz. Docelowe finansowanie interest-only, LTV od ceny zakupu (BTL) lub wartości po remoncie (BRRR).
- Osobno: potrzebna gotówka przed refinansowaniem, wypłata po spłacie pierwszego kredytu i kapitał pozostający w inwestycji.
- Cashflow miesięczny/roczny przed podatkiem; cash-on-cash z dodatniego pozostawionego kapitału, w przeciwnym razie `N/A`.
- Test oprocentowania: stawka użytkownika, +1 pp, +2 pp. Próg czynszu pokrywającego modelowane koszty. To nie test zdolności kredytowej banku.
- Opcjonalnie pierwszy BTL, odsetki do momentu refinansowania, koszty utrzymania przed najmem/refinansowaniem oraz ERC/exit fee. Brak modelu bridging i odsetek rolowanych.
- Zapis w przeglądarce, link z danymi, druk/PDF. Zachowana zgodność starych linków i zapisanych wartości zerowych.

## Definicje finansowe

`C` = wszystkie koszty płatne gotówką: zakup, remont, SDLT, koszty transakcji, gotówkowe opłaty kredytowe, koszty utrzymania, odsetki pierwszego kredytu i jego koszty wyjścia.
`A1`, `A2` = skapitalizowane opłaty pierwszego i końcowego kredytu; `B1`, `B2` = bazowe kwoty tych kredytów (rzeczywista gotówka, bez kapitalizowanych opłat).

```text
Total project cost = C + A1 + A2
First loan balance = B1 + A1
Final loan balance = B2 + A2

BRRR cash before refinance = C − B1
Refinance after repaying first loan = B2 − (B1 + A1)
Cash left invested = cash before refinance − refinance after first loan
                  = total project cost − final loan balance

Standard BTL cash required = C − B2
Cash purchase cash required = C
```

Nieużywane elementy finansowania są zerowane według strategii. Całkowity koszt projektu obejmuje obie opłaty niezależnie od sposobu ich finansowania. Kapitalizowanie opłaty nie zwiększa gotówki wypłaconej inwestorowi; zwiększa saldo i odsetki. Raty interest-only nie spłacają kapitału.

Model konserwatywnie zakłada finansowanie wszystkich wprowadzonych kosztów gotówkowych przed wpływem refinansowania, bez odliczania wcześniejszego czynszu. Nie jest to datowany harmonogram płatności. Ujemne wpływy z refinansowania oznaczają dopłatę, a ujemny pozostawiony kapitał — odzyskanie wkładu i dodatkową wypłatę.

```text
Monthly interest = final loan balance × rate / 12
Operating costs = rent × (management + maintenance + voids)
                + insurance + company costs + other monthly costs
Cashflow = rent − operating costs − monthly interest
Cash-on-cash = annual cashflow / positive cash left invested
Break-even rent = (monthly interest + fixed operating costs)
                / (1 − management% − maintenance% − voids%)
```

Stopy i udziały w powyższych wzorach zapisane są jako ułamki. Management jest konserwatywnie liczone od pełnego czynszu ofertowego; należy wpisać opłatę z VAT, jeśli ma zastosowanie. Rezerwy na pustostany i utrzymanie to założenia budżetowe. Cashflow roczny oznacza stabilny rok najmu, nie pierwsze 12 miesięcy od zakupu. Podatek dochodowy/corporation tax, przyszłe refinansowania i sprzedaż nie są modelowane. Pozostawiona gotówka nie jest równoznaczna z wartością kapitału w nieruchomości.

## SDLT i refinansowanie

Automatyczny SDLT obejmuje zwykły zakup jednego mieszkalnego freehold w Anglii lub Irlandii Północnej. Nie obejmuje szkockiego LBTT ani walijskiego LTT, złożonych transakcji, leasehold i wyjątków podatkowych.

- Prywatna jedyna nieruchomość: standardowe stawki; dodatkowa nieruchomość: HRAD. Kwalifikacja uwzględnia m.in. inne nieruchomości, współkupujących i małżonków — aplikacja nie przeprowadza tego testu.
- FTB relief usunięto z wyboru: wymaga zamiaru zamieszkania jako only/main residence, nie dotyczy czystego BTL. Stare ustawienie `ftb` jest migrowane z komunikatem do standardowych stawek `main`.
- Ltd/SPV: zakładamy spełnienie warunków ulgi dla property rental business tam, gdzie jest wymagana; nie modelujemy automatycznie wszystkich przypadków szczególnej stawki 17%.
- Nonresident: checkbox oznacza uprzednio ustalone zastosowanie dopłaty, nie prosty test obywatelstwa. Dla obsługiwanego zwykłego freehold próg dopłaty to cena co najmniej £40,000.
- Docelowe LTV nie jest ofertą kredytową: wycena, test pokrycia czynszem, okres posiadania i kryteria banku mogą ograniczyć finansowanie. Pierwszy BTL wymaga akceptowalnego dla banku stanu nieruchomości; nie zastępuje bridging.

**Przegląd i źródła:** [UK BRRR / BTL model review](docs/brrr-review-2026-10-02.md), 02.10.2026. Oficjalne objaśnienia GOV.UK/HMRC oraz opublikowane kryteria Accord/Landbay; raport rozdziela potwierdzone informacje od założeń i zakresu niezweryfikowanego. Nie jest audytem tekstu ustawy ani indywidualną decyzją podatkową lub kredytową.

## Pliki i uruchomienie

Statyczny frontend, bez zależności i procesu build:

- `index.html` — interfejs i dostępne pola.
- `styles.css` — jasny, responsywny układ i druk.
- `calculator.js` — obliczenia, walidacja, stan i linki.
- `tests/finance.test.cjs` — testy rzeczywistego skryptu z minimalnym DOM.
- `index.backup-pl.html` — archiwum, nie bieżąca wersja.

```bash
python3 -m http.server 8765
# http://localhost:8765/
```

## Testy

Node.js 18+, bez instalowania zależności:

```bash
node --test tests/finance.test.cjs
```

Pokrycie: strategie, kapitał, opłaty, holding/exit costs, granice SDLT, scenariusze, zapis/odczyt i zgodność starszych linków, zera, Unicode i uszkodzone dane. Generyczna funkcja SDLT zachowuje historyczną gałąź FTB dla testów; UI BTL jej nie udostępnia.

## Licencja

MIT
