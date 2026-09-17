# SALTY — Web Console

Marine-operations console for **fishermen**, **researchers**, and **coastal
operators**. One Next.js app, three role-aware surfaces, built on live INCOIS,
Open-Meteo and NOAA ERDDAP data with an NVIDIA NIM tool-calling marine agent
behind it.

| | |
| --- | --- |
| **Live app** | **https://salty-three.vercel.app** |
| **Backend API** | not publicly deployed — run from the backend repo on `:8010` |
| **Frontend repo** | https://github.com/Ruthwik000/SaltyAI |
| **Backend repo** | https://github.com/Ruthwik000/SaltyAI-Backend |
| **Stack** | Next.js 16 (App Router) · React 19 · Tailwind v4 · MapLibre GL · Framer Motion |

---

## Architecture

The console never talks to an upstream ocean service directly from the browser.
Everything crosses one of two server-side boundaries: **Next.js route handlers**
(for public geo/weather APIs and same-origin INCOIS proxying) or the **Python
data API** (for anything that needs modelling, ERDDAP querying, or the AI agent).

```
┌──────────────────────────────────────────────────────────────────────┐
│  BROWSER                                                             │
│                                                                      │
│  Role gate ──▶ /app  ─────────────────────────────────────────────┐  │
│  (fisherman · researcher · operator, persisted in localStorage)   │  │
│                                                                   │  │
│  Dashboard · Map · Fishing zones · Risk · Vessel · Weather         │  │
│  Alerts · Geofencing · Lost fisherman (SAR) · Research · AI agent  │  │
└───────────────┬───────────────────────────────────┬───────────────┘  │
                │                                   │                  │
                │ same-origin fetch                 │ fetch            │
                ▼                                   ▼                  │
┌───────────────────────────────┐   ┌──────────────────────────────────┐
│  NEXT.JS ROUTE HANDLERS       │   │  PYTHON DATA API                 │
│  app/api/*  (server-side)     │   │  NEXT_PUBLIC_SALTY_API_URL       │
│                               │   │                                  │
│  /conditions  /forecast       │   │  /api/health                     │
│  /tides       /storms         │   │  /api/alerts                     │
│  /hazards     /pfz            │   │  /api/fisherman/conditions       │
│  /market      /ocean-color    │   │  /api/fisherman/zones            │
│  /erddap/*                    │   │  /api/fisherman/forecast         │
│  /incois/wms                  │   │  /api/fisherman/risk/assess      │
│  /incois/frame/*  (iframe)    │   │  /api/fisherman/trip/{start,     │
│  /incois/osf-config           │   │        <id>/ping, <id>/end}      │
│                               │   │  /api/operations/fleet           │
│  Purpose: CORS + key hiding,  │   │  /api/operations/sar/predict     │
│  response normalisation,      │   │  /api/research/{catalog,         │
│  same-origin INCOIS embed     │   │        timeseries,frames,frame}  │
│                               │   │  /api/ai/query  /api/llm/chat    │
└───────────────┬───────────────┘   └──────────────┬───────────────────┘
                │                                  │
                ▼                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│  UPSTREAM DATA SOURCES                                               │
│                                                                      │
│  INCOIS      Ocean State Forecast · THREDDS WMS/NCSS · PFZ GeoServer │
│              · SARAT hazard alerts · EEZ WFS                         │
│  Open-Meteo  marine (waves, tides) · forecast (wind, storms, air)    │
│  NOAA        CoastWatch ERDDAP griddap (ocean colour, time series)   │
│  CMFRI       FishWatch landing-price page                            │
│  NVIDIA NIM  tool-calling marine agent (via Python API only)         │
└──────────────────────────────────────────────────────────────────────┘
```

### Why two backends

| Concern | Handled by | Reason |
| --- | --- | --- |
| Public REST (Open-Meteo, ERDDAP, GeoServer) | Next.js route handlers | Keeps keys server-side, fixes CORS, normalises shapes at the edge — no Python hop needed |
| INCOIS OSF app embed | `app/api/incois/frame/[...path]` | Rewrites the official app through a same-origin proxy so it can be iframed with its own Leaflet controls intact |
| Risk scoring, SAR drift, predictions | Python data API | Needs the modelling code in `backend/` (`risk_features`, `prediction_models`, `route_client`) |
| AI marine agent | Python data API | NIM tool-calling loop runs server-side against live ERDDAP tools |

### Request path, end to end

```
User picks role + location
        │
        ▼
Client component (components/**)
        │
        ▼
lib/*-api.js  ──▶  API_BASE (Python)      or      /api/* (Next.js handler)
        │                                                  │
        │                                                  ▼
        │                                          upstream fetch + validate
        ▼                                                  │
   normalized JSON  ◀───────────────────────────────────────┘
        │
        ▼
Render: map layers · metric cards · charts · alerts · agent answer
```

Every response carries its source status. When a service is unavailable the UI
says so — it does not substitute remembered values for measured ones.

---

## Directory map

```
app/
  page.jsx                 landing + role/phone entry
  login/                   role selection
  app/                     the console (role-aware shell)
    page.jsx               dashboard
    map/                   INCOIS OSF embed + SALTY research map
    fishing-zones/         PFZ catalogue and comparison
    risk/  vessel/         trip risk assessment, trip tracking
    weather/  alerts/      marine conditions, hazard alerts
    geofencing/            restricted-zone proximity controls
    lost-fisherman/        SAR drift workflow
    research/              ERDDAP console, charts, exports
    ai-agent/              marine assistant
  api/                     server-side route handlers (see architecture)

components/
  dashboard/  fisherman/  research/  operator/  map/   role-specific views
  ui/                     Radix + CVA primitives
  shared/                 page header, stat card, status pill

lib/
  api.js  fisherman-api.js  operations-api.js  research-api.js   API clients
  erddap.js  incois-layers.js  marine-live.js  marine-data.js    data layer
  risk-model.js  geo.js  trip-store.js  sar-store.js             domain logic
  marine-context.jsx  i18n.jsx  use-*.js                         state + hooks
```

---

## Getting started

```bash
npm install
cp .env.example .env.local   # then set NEXT_PUBLIC_SALTY_API_URL
npm run dev                  # http://localhost:3000
```

### Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SALTY_API_URL` | yes | `http://127.0.0.1:8010` | Base URL of the Python data API |

Run the backend from the
[backend repo](https://github.com/Ruthwik000/SaltyAI-Backend):

```bash
python backend/api_server.py    # serves on :8010
```

Or point the UI at a hosted instance:

```bash
NEXT_PUBLIC_SALTY_API_URL=https://your-backend-host npm run dev
```

### Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint (`eslint-config-next`) |

---

## Roles

| Role | Surfaces |
| --- | --- |
| **Fisherman** | Dashboard, PFZ fishing zones, trip risk + safety, vessel/trip tracking, AI agent, voice call-agent launch |
| **Researcher** | INCOIS forecast map, SALTY research map with WMS layer inspection, ERDDAP console, historical charts/exports, AI research mode |
| **Operator** | Operations/fleet map, alerts and disasters, SAR lost-fisherman workflow, geofencing, forecast map |

Role and location live in `localStorage` and drive `components/role-gate.jsx`,
the shell navigation, and which data clients each page calls.

---

## Deployment

**Frontend** — live at **https://salty-three.vercel.app**, deployed on Vercel
(project `salty`). `main` auto-deploys. Set `NEXT_PUBLIC_SALTY_API_URL` in the
Vercel project's environment variables so the build points at a reachable
backend rather than `localhost`.

**Backend** — [`SaltyAI-Backend`](https://github.com/Ruthwik000/SaltyAI-Backend).
It binds `0.0.0.0:$PORT`, so it runs unchanged on any container host (Render,
Railway, Fly, Cloud Run). Until it is hosted, the pages that depend on it — risk
assessment, trip tracking, SAR drift, the ERDDAP research console and the AI
agent — need the backend running locally on `:8010`. The pages served entirely
by the Next.js route handlers (map, weather, tides, storms, hazards, PFZ,
ocean colour, market) work on the live deployment on their own.
