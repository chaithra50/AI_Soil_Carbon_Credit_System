# AgriCarbon DAO

Carbon credit farming platform: farmers log two readings per farming cycle
(baseline before, completion after), a transparent formula-based engine turns
the soil-organic-carbon change into a score and credits, and companies buy
those credits on a marketplace. DAO governance, admin verification, document
storage, and optional blockchain anchoring round out the flow. Full detail on
what was actually built and why is in `agricarbon-dao-as-built-spec.md`
(the spec you provided) — this is the implementation of it.

## Quick start (Docker, recommended)

```bash
cp backend/.env.example backend/.env   # edit values if you have real API keys; safe to leave blank
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health / integration status: http://localhost:5000/api/health

With every credential left blank, the app still runs end to end:
- OTP codes **display directly in the verify-email screen** (and also print to the backend
  logs) instead of emailing — no inbox or log-hunting required for local development. Set
  `RESEND_API_KEY` to switch to real email; the on-screen code disappears automatically once
  email is configured.
- Documents save to a local volume with a SHA-256 hash instead of IPFS.
- Carbon cycles save to Mongo with `chain.status: "not_configured"` instead of writing to Polygon Amoy.
- Weather enrichment on readings returns `not_configured`.

## Quick start (without Docker)

Requires Node 20+ and a MongoDB instance (local or Atlas).

```bash
# Backend
cd backend
cp .env.example .env   # set MONGODB_URI at minimum
npm install
npm run dev             # http://localhost:5000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173, proxies /api to :5000
```

## Running the carbon-scoring unit tests

The scoring engine is a pure function with no external dependencies, so its
tests run with Node's built-in test runner — no install required:

```bash
cd backend
node --test tests/carbonScoring.test.js
```

Seven cases are covered: improvement, decline, missing baseline, missing
completion, reversed order, unmapped land, and unrecognized crop/method.

## Turning on real integrations

Each one is independent — set only the credentials you have:

| Integration | Env vars | Effect once set |
|---|---|---|
| Email OTP | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | OTPs actually email instead of logging to console |
| Documents | `WEB3_STORAGE_TOKEN` or `PINATA_JWT` | Uploads pin to IPFS instead of local disk |
| Blockchain | `POLYGON_AMOY_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `CARBON_REGISTRY_ADDRESS` | Cycles/votes write to `CarbonRegistry.sol` on Amoy |
| Weather | `OPENWEATHER_API_KEY` | Readings enrich with live rainfall/temp/humidity |

### Deploying the contract

```bash
cd backend
npx hardhat compile
npx hardhat run scripts/deploy.js --network amoy   # requires POLYGON_AMOY_RPC_URL + DEPLOYER_PRIVATE_KEY
# copy the printed address into CARBON_REGISTRY_ADDRESS in .env
```

## Project layout

```
backend/
  src/
    models/       Mongoose schemas (User, Farmer, Company, SensorReading, CarbonCycle, ...)
    services/      carbonScoring.js (pure, tested), emailService, ipfsService, blockchainService, weatherService
    routes/        one file per resource, all graceful-degradation aware
    sockets/        Socket.io auth + rooms (live reading feed, DAO feed)
    middleware/     JWT auth, role guard, central error handler
  contracts/        CarbonRegistry.sol
  tests/            carbonScoring.test.js (7 cases, runs on bare Node)
frontend/
  src/
    pages/           Landing, auth flow, farmer pages, company dashboard, marketplace, DAO, admin panel
    components/       Navbar, CycleTracker (ledger-stamp UI), ReadingForm, ProtectedRoute
    context/           AuthContext (JWT access token + httpOnly refresh cookie)
docker-compose.yml    Mongo + Mosquitto + backend + frontend
mosquitto/             optional MQTT broker config for the IoT simulator path
```

## The core model, in one paragraph

A farmer logs exactly one **baseline** reading before a cycle starts and one
**completion** reading after it ends. `computeCarbonScore(farmer, baseline,
completion)` — a pure function in `backend/src/services/carbonScoring.js` —
compares soil organic carbon between the two, applies IPCC-style per-hectare
conversion factors for the farmer's crop and method, and returns a score,
tons of CO2e stored, and credits earned (floored at zero on decline). Once
scored, both readings are marked used and the next baseline starts a new,
independent cycle. Nothing is averaged or estimated from in-between
`routine` readings — those exist only for the live dashboard feed.

## What's intentionally out of scope

Same as the spec: no trained ML ensemble (no real training data to train one
honestly), no PaddleOCR Aadhaar cross-check, no satellite vegetation
cross-check. The upload and scoring pipelines are structured so any of these
can be dropped in later without touching the rest of the system.
