# RevScope — ASC 606 Revenue Recognition Platform

Enterprise-grade revenue recognition calculator for B2B SaaS finance teams. Built for Harry Randhawa and finance operations professionals managing ASC 606 / IFRS 15 compliance.

## Features

- **Contract Portfolio** — Track all revenue contracts with customer, term, TCV, and status
- **Performance Obligation Management** — Define distinct goods/services per ASC 606 Step 2
- **Transaction Price Allocation** — Automatic relative-SSP allocation per ASC 606-10-32-28
- **Recognition Schedule** — Monthly recognition waterfall for ratable, milestone, and point-in-time methods
- **Portfolio Dashboard** — ARR, recognized YTD, deferred balance, and revenue waterfall chart
- **New Contract Wizard** — Create contracts with live allocation preview
- **Data Persistence** — All changes survive page refresh via localStorage

## Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** (custom design system)
- **React Router v6**
- **Recharts** (revenue waterfall chart)
- **date-fns** (recognition period calculations)
- **Sonner** (toast notifications)

## Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — portfolio metrics, revenue waterfall, recent contracts |
| `/contracts` | Contract list with search and status filters |
| `/contracts/new` | New contract form with live allocation preview |
| `/contracts/:id` | Contract detail — Obligations / Allocation / Schedule tabs |
| `/schedule` | Portfolio-level recognition schedule by period or contract |

## Setup

```bash
npm install
npm run dev      # Development server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build
```

## Demo Data

Six realistic B2B SaaS contracts are pre-loaded:

| Customer | TCV | Status |
|----------|-----|--------|
| Accenture Technology Solutions | $1,152,000 | Active |
| Goldman Sachs Asset Management | $848,000 | Active |
| Microsoft Corporation | $594,000 | Active |
| Deloitte Financial Advisory | $418,500 | Completed |
| JPMorgan Chase & Co. | $2,280,000 | Draft |
| Nike Inc. | $376,000 | Active |

Each contract has 2–4 performance obligations with varied recognition methods.

To reset all demo data to its original state, click **Reset Demo Data** in the sidebar.

## Limitations

- Authentication is not implemented — this is a frontend demo
- All data is stored in browser localStorage; no server or database
- Milestone completion dates can be edited but require page-level state changes in the current demo
- Currency is USD only

## Deployment

Configured for Vercel with client-side routing via `vercel.json`.
