# Australian FIRE Calculator

Work out when you can stop working — as an Australian tax resident, with super
and everything outside it modelled separately.

A single self-contained HTML file: no build step, no dependencies, no network
calls. Open it from disk or publish it to GitHub Pages and it behaves
identically. Every setting lives in the page URL, so a copied link reproduces
the exact scenario.

Design system and interaction patterns are shared with its siblings,
[investment-growth-calculator](https://github.com/raghu-nayak/investment-calc)
and [au-leverage-calculator](https://github.com/raghu-nayak/au-leverage-calculator);
the colour scheme comes from [mortgage.monster](https://mortgage.monster/).
The feature set draws on [engaging-data's FIRE
calculator](https://engaging-data.com/fire-calculator/) (percentile fan,
savings rate, cash-flow streams), the [Super Calcs retirement income
simulator](https://supercalcs.com.au/ris9/mst/graphs) (stochastic outcomes),
[Capitalmind's planner](https://plan.capitalmindwealth.com/) (goal-based cash
flows), and [AustralianSuper's projection
calculator](https://www.australiansuper.com/education-advice/calculators/super-projection-calculator)
(super, drawdown and the age pension together).

## Run it locally

Double-click `index.html`, or:

```sh
open index.html          # macOS
xdg-open index.html      # Linux
start index.html         # Windows
```

Nothing to install, no server to start — charts included, everything is inline,
so `file://` behaves exactly like `https://`.

## Publish to GitHub Pages

**On a new repo**

```sh
gh repo create au-fire-calculator --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/au-fire-calculator/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

It lands at `https://<user>.github.io/au-fire-calculator/`. The first build
takes a minute; poll it with:

```sh
gh api repos/{owner}/au-fire-calculator/pages --jq .status   # building -> built
```

## Why an Australian one

Generic FIRE calculators assume you can reach all of your money. In Australia
you cannot: **super is preserved until age 60**. Retire at 52 and eight years of
living costs have to come out of the part of your portfolio that sits outside
super — the **bridge**. A plan can hold together on total assets and still fail,
because the wrong bucket runs dry first. That failure has its own name in this
tool, and its own message.

The other things a generic calculator gets wrong here: contributions taxed at
15% going in, earnings taxed at 15% while accumulating and at nothing in
retirement phase, a minimum drawdown that forces money out from 60, a
distribution yield taxed every year outside super while capital growth is not,
franking credits that come back as cash, and an age pension that is means
tested twice and starts at 67.

## What it models

Rates and thresholds are the published figures for the **2026-27** income year,
indexed to inflation for every later year.

| | |
|---|---|
| Income tax | Resident rate scale, Medicare levy with its low-income shade-in, LITO, and SAPTO from 67 |
| Super in | SG at 12% up to the maximum contribution base, salary sacrifice as a fixed amount or as whatever fills the cap each year, 15% contributions tax, Division 293 above $250,000, excess concessional contributions added back with a 15% offset |
| Super earnings | 15% while accumulating, nil once the balance supports a retirement-phase pension after 60 |
| Super out | Preservation age 60, tax-free from a taxed source, minimum drawdown 4% rising to 14% by 95 |
| Outside super | Distribution yield taxed as income each year and reinvested, refundable franking credits, capital growth untaxed until sold, then a 50% CGT discount at your marginal rate |
| Age pension | From 67, assets and income (deemed) tests both applied and the lower payment wins, home exempt, homeowner and non-homeowner thresholds |
| Returns | One expected return before fees, or a separate one for super and for outside super, each with its own fee |
| Household | Single or couple — couple switches the pension rates and thresholds, splits investment income 50/50, and taxes each salary separately against its own caps |

**Mechanics.** One pass per year, in actual dollars, in this order: earn,
contribute, work out the tax, see what is short, sell what is needed, then
credit growth on the opening balance plus half the year's flows. Selling shares
realises a capital gain, which raises the tax, which raises the amount you have
to sell — so the year is solved as a small fixed point that runs until the
figure stops moving.

Every dollar figure, threshold, cap and pension rate is indexed to inflation,
which makes **Today's money** a straight deflation of the same numbers rather
than a second model. Turn off *Assume tax thresholds keep pace with inflation*
and you get bracket creep instead: on the defaults it costs about $300,000 of
lifetime tax.

## What you get

- **The earliest age that works** — solved by re-running the whole plan for
  every candidate retirement age, not by a withdrawal-rate shortcut. The 4% rule
  is shown alongside it, for contrast.
- **Your money, year by year** — a stacked area of super and outside super, with
  the milestones (the year you stop, 60, 67) marked, the peak labelled, and the
  age the money runs out flagged in red.
- **If you stopped working at a different age** — one range bar per candidate
  age, running from that age to the age the money lasts. The hatch is the part
  of the plan that goes unfunded.
- **What you live on after you stop** — every dollar of retirement income traced
  to its source, with what you spend as a reference line. The band between the
  two is tax, or franking credits coming back.
- **If markets misbehave** — the plan re-run against 1,000 return sequences
  drawn from your expected return and volatility, as a percentile fan plus a
  success rate. Fixed seed, so the same inputs always give the same fan.
- **Every year of the plan** as a table, and the same detail as CSV.
- **Fill the cap** — a toggle that makes the salary sacrifice a standing
  instruction instead of an amount, worked out again every year. Employer super
  grows faster than the cap does, so the room left for a sacrifice shrinks as you
  go: no single figure can fill the cap now and still fit in fifteen years.

## Things worth knowing

- **The projection is not a prediction.** Steady average returns are not how
  markets work; that is what the fan chart is for. A plan that needs the median
  outcome to hold has no margin in it.
- **The success rate uses a normal distribution**, not historical sequences. It
  captures volatility and sequence risk, not fat tails or mean reversion.
- **Separate returns move together.** Give super and outside super different
  expected returns and a simulated year still hands both the same deviation —
  one market, two allocations. Correlation is not a setting.
- **The concessional cap warning watches every year, not just the first.** A
  fixed sacrifice sized against today's employer contributions can breach the cap
  a decade later, because pay rises above inflation while the cap only follows
  inflation. The chip names the year and the amount, in today's money. *Fill the
  cap* avoids the problem rather than warning about it.
- **Employer super alone is never in excess.** The maximum contribution base is
  legislated as the concessional cap divided by the SG rate, so SG from one
  employer tops out 40 cents under the cap. An excess can only come from a
  sacrifice — or from a second employer, which is out of scope.
- **The age pension figure is an estimate**, not an assessment. It counts your
  super and your outside-super portfolio as assessable assets, and nothing else
  — no car, no contents, no investment property.
- **Nothing leaves your browser.** State lives in the URL hash and
  `localStorage`. Reset restores the defaults but keeps your theme and display
  basis.
- **On a phone, a chart readout stays put** when you lift your finger, until you tap
  somewhere else — a touch pointer is destroyed on release, so hiding on `pointerleave`
  the way a mouse does would wipe the readout the tap had just asked for.
- Keyboard: focus any chart and use the arrow keys (up/down on the retirement-age
  chart), Home/End, Escape. Shift steps five at a time.
- **Up and down nudge any number field** by exactly what its own slider moves,
  with Shift for ten of those, so the thumb and the number can never drift apart
  — a range input snaps whatever you assign it onto its step grid, and a
  half-notch nudge would leave the thumb pointing at a figure the field isn't
  showing. A field with no slider falls back to $500, a year, or 0.1 of a point.
  The step lands on a multiple of itself, so 96,300 goes to 97,500 rather than
  98,800.

## Out of scope

Your home, mortgage and offset; investment property and negative gearing;
HECS/HELP; private health cover; insurance inside super; non-concessional and
downsizer contributions; carry-forward of unused cap; the transfer balance cap
and the tax on the excess; the Work Bonus and rent assistance; and any change of
mind at 48.

## Customising

Everything lives in `index.html`:

- `AU` — every rate, threshold and cap, in one object with the income year on it.
  Updating for a new financial year is editing that block.
- `DEFAULTS` / `LIMITS` — what the form starts at and how far each input goes.
- `STEPS` — how far one press of an arrow key moves a field that has no slider.
  A field with a slider takes the slider's own `step`.
- `:root` design tokens — the palette, for both themes. Series colours are
  stepped to clear the OKLCH lightness band, chroma floor, CVD and contrast
  checks on both chart surfaces.
- `MC_PATHS` — how many simulated markets the fan uses.
- `APP_VERSION` — the version shown in the footer and written into the CSV
  header. The footer also carries it as a literal so it still prints on a page
  whose script never ran, and a test holds the two to the same figure. Bump it
  in the same commit as the change it describes: patch for wording, styling or a
  corrected figure, minor for a new input, mode or chart, major for a change that
  makes an existing shared link read differently.

## Tests

The engine between the `engine:start` and `engine:end` markers is pure — no DOM,
no globals, no display logic — so it can be pulled out of the page and run in
node:

```sh
node test.js index.html
```

92 assertions: the resident rate scale against hand-worked figures, LITO and
SAPTO through their tapers, the Medicare levy shade-in and its senior threshold,
Division 293, the minimum drawdown steps, the age pension under both tests at
once, and the projection itself — one row a year plus a closing point, super
untouched before preservation age, retiring later leaving more, a plan that
cannot be paid for reporting the year it failed, filling the cap never breaching
it, and the Monte Carlo drawing the same fan from the same seed every time.

One of them pins a quirk worth knowing rather than rediscovering: every
threshold here is indexed with inflation except the $250,000 Division 293 one,
which is true to the law — it has not moved since 2017 — and means a salary that
merely keeps pace eventually reaches it on its own.

## Disclaimer

General information and education only — **not financial, superannuation or tax
advice**, and not a prediction. Results are hypothetical illustrations built
from the figures you enter, assuming steady average returns and unchanging law.
Provided "as is" with no warranty of any kind; no responsibility or liability is
accepted for any error, omission or loss arising from reliance on these figures.
Verify against the [ATO](https://www.ato.gov.au/) and [Services
Australia](https://www.servicesaustralia.gov.au/), and seek advice from a
licensed professional before acting. The full disclaimer is in the page footer.

