# TRACEABILITY MATRIX: NaSCon ’26 Part I

This document provides complete traceability from official requirements (Functional Requirements `FR-*` and Non-Functional Requirements `NFR-*`) to implemented source files, automated tests, and implementation verification status.

---

## 1. Functional Requirements Traceability

| Requirement ID | Requirement Summary | Specification Section | Implementation Files | Test Files | Current Status |
|---|---|---|---|---|---|
| **FR-1.1** | Multi-Sport Taxonomy & Event-Sourced Scoring: support arbitrary sports via JSON config (`POST /audit/v1/sports`), 3 scoring models (event, innings, round), append-only signed event stream with compensating events. | Section 3, Section 5.6, Section 5.9 | `src/services/sports.service.js`, `src/services/events.service.js`, `src/utils/signature.util.js` | `tests/persistence.integration.test.js`, `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-1.2** | League & Tournament Setup: single-stage leagues, multi-division structures, promotion/relegation, season scoping (`POST /audit/v1/leagues`). | Section 3, Section 5.8 | `src/services/leagues.service.js`, `src/routes/leagues.routes.js` | `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-1.3** | Match & Fixture Scheduling: custom round-robin (single/double with circle method, byes), Swiss-system, single & double elimination (bracket reset GF2), conflict detection, match state machine (`POST /audit/v1/fixtures`). | Section 3, Section 5.7 | `src/services/fixtures.service.js`, `src/routes/fixtures.routes.js` | `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-1.4** | Automated Standings & Tables: points tables, configurable tie-breakers (H2H points, mini-league diff, overall diff, scored, fair-play, seeded draw_lots), playoff qualification status (`GET /audit/v1/standings/{league_id}`). | Section 3, Section 5.10 | `src/services/standings.service.js`, `src/routes/standings.routes.js` | `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-2.1** | Club Profiles & Tenant Isolation: club portal, home venue coordinates, staff, multi-tenant strict isolation. | Section 3, Section 5.11, Section 5.13 | `src/policies/tenant.policy.js`, `src/middlewares/tenant-isolation.middleware.js` | `tests/auth_rbac.test.js`, `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-2.2** | Roster & Player Registry: add, transfer, loan with auto-return, release; transfer window enforcement, squad size limits, role assignments, immutable audit trail (`POST /audit/v1/roster/transfer`, `GET /audit/v1/roster/history/{player_id}`). | Section 3, Section 5.11 | `src/services/roster.service.js`, `src/routes/roster.routes.js` | `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-2.3** | Integrated Merchandise Store: catalogue with variants, scheduled pricing, discount codes (`WELCOME10`), concurrency-safe checkout (`POST /audit/v1/checkout`), mock gateway, signed PDF receipts (`GET /audit/v1/inventory/{variant_id}`). | Section 3, Section 5.12 | `src/services/checkout.service.js`, `src/repositories/inventory.repository.js` | `tests/persistence.integration.test.js`, `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **FR-5.1** | Five-Tier Role-Based Access Control: Super-Admin, League Organizer, Club Manager, Player, Viewer; tenant isolation; JWT authentication; authorization matrix (`POST /audit/v1/rbac-matrix`, `/audit/v1/rbac/*`). | Section 3, Section 5.13 | `src/services/auth.service.js`, `src/services/rbac.service.js`, `src/middlewares/authenticate.middleware.js` | `tests/auth_rbac.test.js`, `tests/architecture_layers.test.js` | **Implemented & Verified** |

---

## 2. Non-Functional Requirements Traceability

| Requirement ID | Requirement Summary | Minimum Acceptance Bar | Implementation Files | Test Files | Current Status |
|---|---|---|---|---|---|
| **NFR-3** | Concurrency Correctness | Last 1 unit of stock bought by 20 simultaneous buyers yields exactly 1 success and 0 negative inventory. | `src/services/checkout.service.js`, `src/repositories/inventory.repository.js` | `tests/persistence.integration.test.js` | **Implemented & Verified** |
| **NFR-4** | Offline Tolerance | Mobile app caches fixtures, standings, profiles; offline scoring & roster actions queue locally and sync with conflict resolution (`POST /audit/v1/offline-sync`). | `src/services/offline-sync.service.js`, `mobile/` | `tests/architecture_layers.test.js` | **Implemented & Verified** |
| **NFR-5** | Performance & Latency | Every request <= 5s, reset <= 10s, 20-request burst <= 10s. Exempt from rate limiting on `/audit/v1/*`. | `src/server.js`, `src/app.js` | `tests/server.test.js` | **Implemented & Verified** |
| **NFR-6** | Security & Cryptographic Integrity | OWASP Top 10, HMAC-SHA256 signature verification with `DAY1_SALT` on events and receipts, rate limiting on `/api/v1/*` (100 req/10s per IP). | `src/utils/signature.util.js`, `src/middlewares/rate-limit.middleware.js` | `tests/signature.test.js`, `tests/test_crypto_vectors.py` | **Implemented & Verified** |
| **NFR-7** | Stack Reproducibility | Single command `DAY1_SALT=<salt> docker compose up -d --build` brings up full backend on clean Linux host with `/health` returning HTTP 200 within 120s. | `docker-compose.yml`, `Dockerfile`, `src/server.js` | `tests/system.test.js`, `tests/test_submission_package.py` | **Implemented & Verified** |

---

## 3. Mandatory Autograder Wrapper Endpoint Mapping

| Method & Route | Specification Section | Purpose | Auth Required | Status |
|---|---|---|---|---|
| `GET /health` | Section 5.4 | Readiness probe (database reachable & baseline seeded) | No | **Implemented & Verified** (`src/services/health.service.js`, `tests/system.test.js`) |
| `POST /audit/v1/reset` | Section 5.5 | Wipe state and seed baseline data | No | **Implemented & Verified** (`src/services/reset.service.js`, `tests/system.test.js`) |
| `POST /audit/v1/sports` | Section 5.6 | Create mystery sport from JSON rules | No | **Implemented & Verified** (`src/services/sports.service.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/fixtures` | Section 5.7 | Generate tournament fixtures (RR, Swiss, Single, Double) | No | **Implemented & Verified** (`src/services/fixtures.service.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/leagues` | Section 5.8 | Register league configuration | No | **Implemented & Verified** (`src/services/leagues.service.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/events` | Section 5.9 | Append match event / compensating event | No | **Implemented & Verified** (`src/services/events.service.js`, `tests/persistence.integration.test.js`) |
| `GET /audit/v1/score/{match_id}` | Section 5.9 | Score projection rebuilt from event log | No | **Implemented & Verified** (`src/services/scoring.service.js`, `tests/persistence.integration.test.js`) |
| `GET /audit/v1/standings/{league_id}` | Section 5.10 | Standings table, H2H, playoff status | No | **Implemented & Verified** (`src/services/standings.service.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/roster/setup` | Section 5.11 | Create roster scenario | No | **Implemented & Verified** (`src/services/roster.service.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/roster/transfer` | Section 5.11 | Transfer / loan / release player | No | **Implemented & Verified** (`src/services/roster.service.js`, `tests/architecture_layers.test.js`) |
| `GET /audit/v1/roster/history/{player_id}` | Section 5.11 | Immutable roster audit trail | No | **Implemented & Verified** (`src/services/roster.service.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/checkout` | Section 5.12 | Concurrency-safe merchandise checkout | No | **Implemented & Verified** (`src/services/checkout.service.js`, `tests/persistence.integration.test.js`) |
| `GET /audit/v1/inventory/{variant_id}` | Section 5.12 | Query stock & reserved units | No | **Implemented & Verified** (`src/services/inventory.service.js`, `tests/persistence.integration.test.js`) |
| `POST /audit/v1/rbac-matrix` | Section 5.13 | Generate JWT tokens for all 5 roles & scenario IDs | No | **Implemented & Verified** (`src/services/rbac.service.js`, `tests/auth_rbac.test.js`) |
| `/audit/v1/rbac/*` (7 probe routes) | Section 5.13 | RBAC role & tenant boundary verification | Yes (`Bearer <jwt>`) | **Implemented & Verified** (`src/services/rbac.service.js`, `src/middlewares/authenticate.middleware.js`, `tests/auth_rbac.test.js`) |
| `GET /api/v1/ping` | Section 5.13 | Rate-limiting probe | No | **Implemented & Verified** (`src/routes/auth.routes.js`, `tests/architecture_layers.test.js`) |
| `POST /audit/v1/offline-sync` | Section 5.14 | Offline queue replay & conflict resolution | No | **Implemented & Verified** (`src/services/offline-sync.service.js`, `tests/architecture_layers.test.js`) |
