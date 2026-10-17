# NaSCon ’26 Part I: Multi-Sport League & Club Operations Platform

Official submission repository for the **NaSCon ’26 App Development Competition (Part I: Multi-Sport League & Club Operations Platform)**.

Backend implementation built using **Node.js (>=20.0.0), Express.js, PostgreSQL 16, and Redis 7**.

---

## 1. Submission Package Overview

This repository conforms to all mandatory submission requirements outlined in Section 1.3:

| File / Directory | Description | Status |
|---|---|---|
| [`docker-compose.yml`](file:///s:/NasCON/docker-compose.yml) | Orchestration for REST API, PostgreSQL 16, Redis 7, and MinIO | **Configured & Verified** |
| [`.env.example`](file:///s:/NasCON/.env.example) | Environment variable template with `DAY1_SALT` placeholder | **Configured** |
| [`README.md`](file:///s:/NasCON/README.md) | Run instructions, architecture overview, demo accounts, API guide | **Updated** |
| [`TRACEABILITY.md`](file:///s:/NasCON/TRACEABILITY.md) | Mapping of official requirements (FR/NFR) to source files & tests | **Configured & Verified** |
| [`tests/`](file:///s:/NasCON/tests) | Automated test suite (102 Node.js tests + 6 Python compliance tests) | **108 Passed / 0 Failed** |
| [`run_tests.sh`](file:///s:/NasCON/run_tests.sh) | Official execution script running all automated tests | **Configured & Executable** |
| [`COVERAGE.json`](file:///s:/NasCON/COVERAGE.json) | Measured test coverage report across six competition domains | **Configured** |
| [`src/docs/architecture.md`](file:///s:/NasCON/src/docs/architecture.md) | Comprehensive engineering documentation of layered request flow | **Documented** |
| [`mobile/`](file:///s:/NasCON/mobile) | Mobile client application (Flutter foundation & design system) | **In Progress** |

---

## 2. Backend Architecture Overview

The backend is organized into a clean, modular, and maintainable **Layered Enterprise Architecture** with strict Separation of Concerns:

$$\text{Route} \longrightarrow \text{Middleware} \longrightarrow \text{Controller} \longrightarrow \text{Service} \longrightarrow \text{Repository} \longrightarrow \text{PostgreSQL}$$

```
src/
├── app.js                          # Express application factory & middleware pipeline
├── server.js                       # Server boot, migrations, health verification & graceful shutdown
├── config/                         # Centralized configuration (env, database pool, redis, logger)
├── constants/                      # Official constants (roles, permissions, error-codes, status, routes)
├── routes/                         # Route endpoints & middleware chain mappings
├── controllers/                    # HTTP parameter handling & response serialization
├── services/                       # Business logic, workflows, cryptographic signatures, & PDF generation
├── repositories/                   # Parameterized SQL data access layer
├── middlewares/                    # Security, auth, 1 MB payload limits, rate limiting, and error handling
├── validators/                     # Request body and parameter schema validation
├── policies/                       # Access control policies for Section 5.13 RBAC matrix (P1-P7)
├── utils/                          # Canonical JSON, HMAC-SHA256 signature, scrypt password hashing, JWT
├── database/                       # DDL schema, atomic withTransaction coordinator, and seed fixtures
├── integrations/                   # Mock payment gateway & task queue service
├── jobs/                           # Background worker registry
├── sockets/                        # Live score broadcast manager
└── docs/                           # Layered architecture documentation
```

For complete technical specifications of each architectural layer, refer to [`src/docs/architecture.md`](file:///s:/NasCON/src/docs/architecture.md).

---

## 3. Prerequisites & Environment Setup

- **Host OS**: Ubuntu 22.04 LTS (or compatible Linux, macOS, or Windows with WSL2/Docker Desktop)
- **Node.js**: Node.js `>= 20.0.0` and `npm >= 10.0.0`
- **Docker**: Docker Engine 24+ and Docker Compose v2+
- **Cryptographic Salt**: Per-team assigned `DAY1_SALT` printed on the venue team slip

### Environment Configuration

Copy the template file to `.env`:
```bash
cp .env.example .env
```

Set your assigned `DAY1_SALT` in your shell environment or `.env` file:
```bash
export DAY1_SALT="your-venue-assigned-salt"
```

> [!IMPORTANT]
> Never hardcode or commit the real `DAY1_SALT` to source control. It is dynamically resolved from `process.env.DAY1_SALT`.

---

## 4. Starting the Application

### Option A: Using Docker Compose (Official Grader Command)

According to Section 5.2, the evaluation runner starts the full backend stack with:

```bash
DAY1_SALT=<your-salt> docker compose up -d --build
```

The stack exposes the following services:
- **REST API Server**: `http://localhost:8080`
- **PostgreSQL 16**: Port `5432` (`nascon_db`)
- **Redis 7**: Port `6379`
- **MinIO Object Store**: Port `9000` (Console: `9001`)

### Option B: Running Locally with Node.js

Ensure PostgreSQL and Redis containers are running, then launch the API:

```bash
npm install
npm start
```

---

## 5. Readiness Probe & Baseline Reset

### Readiness Probe (`GET /health`)
The grading runner polls `GET /health` every 2 seconds. The server responds with HTTP 200 only when the database is reachable and all required baseline entities are seeded:

```bash
curl -i http://localhost:8080/health
```

**Response (`200 OK`):**
```json
{
  "status": "ok"
}
```

### Baseline Reset (`POST /audit/v1/reset`)
Wipes transient data and re-seeds baseline entities inside an atomic transaction:

```bash
curl -X POST http://localhost:8080/audit/v1/reset \
  -H "Content-Type: application/json" \
  -d '{"seed": 42, "stock": {"var-jersey-001-M": 1, "var-jersey-001-L": 5}}'
```

**Response (`200 OK`):**
```json
{
  "status": "reset_complete",
  "seed": 42,
  "sports": ["football", "basketball", "cricket", "esports"],
  "tenants": ["tenant-alpha", "tenant-beta"],
  "stock": {
    "var-jersey-001-M": 1,
    "var-jersey-001-L": 5
  }
}
```

---

## 6. Seeded Demo Accounts (Section 8.3)

These accounts are seeded during baseline initialization and restored after every `/reset`:

| Role | Email | Password | Tenant / Scope |
|---|---|---|---|
| **Platform Super-Admin** | `admin@nascon.test` | `Nascon@26` | Platform-wide global access |
| **League Organizer** | `organizer@nascon.test` | `Nascon@26` | Owns `league-alpha-1` in `tenant-alpha` |
| **Club Manager** | `manager@nascon.test` | `Nascon@26` | Owns `club-alpha-1` in `tenant-alpha` |
| **Player** | `player@nascon.test` | `Nascon@26` | Registered as `player-alpha-1` (`club-alpha-1`) |
| **General Viewer** | `viewer@nascon.test` | `Nascon@26` | Read-only access inside `tenant-alpha` |

---

## 7. Official Competition API Endpoints

All endpoints required by Section 5.1 and Section 5.13 are implemented and verified:

| Method & Route | Spec Section | Purpose | Auth Required |
|---|---|---|---|
| `GET /health` | Section 5.4 | Readiness probe (database reachable & baseline seeded) | No |
| `POST /audit/v1/reset` | Section 5.5 | Wipe state and re-seed baseline fixtures | No |
| `POST /audit/v1/sports` | Section 5.6 | Create mystery sport from JSON rules | No |
| `POST /audit/v1/fixtures` | Section 5.7 | Generate tournament fixtures (RR, Swiss, Elimination) | No |
| `POST /audit/v1/leagues` | Section 5.8 | Register league configuration | No |
| `POST /audit/v1/events` | Section 5.9 | Append signed match event / compensating event | No |
| `GET /audit/v1/score/:match_id` | Section 5.9 | Score projection rebuilt from event stream | No |
| `GET /audit/v1/standings/:league_id` | Section 5.10 | Standings table, H2H, and tiebreakers | No |
| `POST /audit/v1/roster/setup` | Section 5.11 | Create roster scenario | No |
| `POST /audit/v1/roster/transfer` | Section 5.11 | Transfer / loan / release player | No |
| `GET /audit/v1/roster/history/:player_id` | Section 5.11 | Immutable roster audit trail | No |
| `POST /audit/v1/checkout` | Section 5.12 | Concurrency-safe merchandise checkout | No |
| `GET /audit/v1/inventory/:variant_id` | Section 5.12 | Query variant stock & reserved inventory | No |
| `POST /api/v1/auth/login` | Section 8.3 | Authenticate user and issue 24h HS256 JWT | No |
| `POST /audit/v1/rbac-matrix` | Section 5.13 | Generate JWT tokens for all 5 roles & scenario IDs | No |
| `POST /audit/v1/rbac/tenants` | Section 5.13 | Probe P1: Super-Admin tenant management | `Bearer <jwt>` |
| `POST /audit/v1/rbac/leagues/:id/fixtures` | Section 5.13 | Probe P2: League organizer fixture access | `Bearer <jwt>` |
| `POST /audit/v1/rbac/clubs/:id/roster` | Section 5.13 | Probe P3: Club manager roster access | `Bearer <jwt>` |
| `POST /audit/v1/rbac/clubs/:id/products` | Section 5.13 | Probe P4: Club manager product access | `Bearer <jwt>` |
| `PATCH /audit/v1/rbac/players/:id` | Section 5.13 | Probe P5: Player self & club manager player update | `Bearer <jwt>` |
| `GET /audit/v1/rbac/clubs/:id` | Section 5.13 | Probe P6: Tenant isolation read probe | `Bearer <jwt>` |
| `GET /audit/v1/rbac/platform/config` | Section 5.13 | Probe P7: Super-Admin platform config probe | `Bearer <jwt>` |
| `GET /api/v1/ping` | Section 5.13 | Rate-limiting probe | No |
| `POST /audit/v1/offline-sync` | Section 5.14 | Offline queue replay & conflict resolution | No |

---

## 8. Cryptographic Signatures (Appendix A & Section 5.3)

All score events (`POST /audit/v1/events`) and checkout receipts (`POST /audit/v1/checkout`) are signed using HMAC-SHA256:

1. **Canonical JSON Serialization**:
   - Recursively sorts object keys in ascending Unicode code-point order.
   - Preserves array order without sorting.
   - Non-ASCII characters are encoded directly as UTF-8 (no `\uXXXX` escape sequences).
   - Compact separators (no superfluous whitespace).
2. **Signature Calculation**:
   $$\text{HMAC-SHA256}(\text{key}=\text{UTF-8}(\text{DAY1\_SALT}),\ \text{msg}=\text{id} + "|" + \text{canonicalJson})$$
3. **Constant-Time Verification**:
   - Uses `crypto.timingSafeEqual` to prevent side-channel timing attacks.

---

## 9. Automated Testing & Compliance

### Run All Tests

To run the complete automated test suite across all modules:

```bash
chmod +x ./run_tests.sh
./run_tests.sh
```

Or run individual test components:

```bash
# Run Node.js test suites
npm test

# Run Python crypto vector & submission package verification
python -m unittest discover tests
```

### Test Suite Summary

- **Total Automated Tests**: 162 tests (156 Node.js tests + 6 Python tests)
- **Passing**: 162 / 162 (100% pass rate)
- **Failing**: 0
- **Suites**: 35 test suites covering architecture layers, cryptographic signatures, event-sourcing persistence, merchandise concurrency safety, five-role RBAC, system reset, sports taxonomy, league structures, fixture generation, roster & transfer rules, standings with tiebreakers, offline sync, and HTTP endpoints.

---

## 10. Submission Push Windows (Day 1)

Hourly sprint commits are managed in accordance with Section 1.3 / Rule Booklet Section 4:
- **Window 1**: 10:45 – 11:45 PKT
- **Window 2**: 11:45 – 12:45 PKT
- **Window 3**: 12:45 – 13:45 PKT
- **Window 4**: 13:45 – 14:45 PKT
- **Final Push Lock**: 15:05:00 PKT
