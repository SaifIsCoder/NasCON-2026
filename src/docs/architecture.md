# NaSCon ’26 Backend Architecture Documentation

This document describes the clean, modular enterprise architecture implemented for the **NaSCon ’26 App Development Competition Backend (Part I: Multi-Sport League & Club Operations Platform)** built on Node.js, Express.js, PostgreSQL 16, and Redis 7.

---

## 1. High-Level Architectural Pattern

The backend follows a strict **Layered Architecture** adhering to Separation of Concerns (SoC) and the Single Responsibility Principle (SRP):

```
HTTP Request
     │
     ▼
┌────────────────────────────────────────────────────────┐
│                      Route Layer                       │
│  (HTTP methods, URL paths, middleware chains, router)  │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Middleware Layer                     │
│  (Authentication, RBAC Guard, Tenant Isolation,        │
│   Validation, 1MB Payload Limit, Rate Limiting)        │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Controller Layer                     │
│  (Read request, invoke services, return HTTP status)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                    Service Layer                       │
│  (Domain business rules, workflows, signatures, PDF)   │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼                           ▼
┌───────────────────────────┐ ┌──────────────────────────┐
│     Repository Layer      │ │   External Integration   │
│  (Parameterized SQL, DB)  │ │  (Mock Payment, Sockets) │
└──────────────┬────────────┘ └──────────────────────────┘
               │
               ▼
┌────────────────────────────────────────────────────────┐
│              PostgreSQL 16 Database                    │
│   (Atomic Transactions, Constraints, Row Locks)        │
└────────────────────────────────────────────────────────┘
```

---

## 2. Request Flow: Step-by-Step

Every incoming client request follows this deterministic pipeline:

```
Route → Middleware → Controller → Service → Repository → PostgreSQL
```

1. **Route Layer (`src/routes/`)**:
   - Matches the requested HTTP verb and URI path (e.g. `POST /audit/v1/checkout`).
   - Attaches route-specific middleware chains and delegates execution to the controller handler.
   - Contains zero business logic, zero SQL queries, and zero direct persistence logic.

2. **Middleware Layer (`src/middlewares/`)**:
   - **Request ID (`request-id.middleware.js`)**: Injects and passes `X-Request-Id` for request tracking.
   - **Rate Limiting (`rate-limit.middleware.js`)**: Limits `/api/v1/*` to 100 requests per 10s per IP while exempting `/health` and `/audit/v1/*` per Section 5.3.
   - **Payload Limiting (`payload-limit.middleware.js`)**: Rejects requests larger than 1 MB with `413 PAYLOAD_TOO_LARGE` and catches malformed JSON with `400 VALIDATION_ERROR`.
   - **Authentication (`authenticate.middleware.js`)**: Validates Bearer JWT tokens with strict HS256 algorithm enforcement; rejects expired, malformed, tampered, or `alg: none` tokens with `401 UNAUTHENTICATED`.
   - **Role Authorization (`authorize-role.middleware.js`)**: Guards routes by requiring specific roles; super-admin automatically bypasses.
   - **Tenant Isolation (`tenant-isolation.middleware.js`)**: Enforces strict multi-tenant boundaries; non-super-admins attempting cross-tenant access receive `403 FORBIDDEN`.

3. **Controller Layer (`src/controllers/`)**:
   - Extracts validated parameters, query parameters, request body, and authenticated user context (`req.user`).
   - Delegates domain work to the appropriate Service method.
   - Serializes the service return value into the exact required HTTP status code and JSON response body.
   - Catches unhandled errors and passes them to `next(err)` to reach the centralized error handler.

4. **Service Layer (`src/services/`)**:
   - Encapsulates domain logic and business rules:
     - Event-sourced scoring, sequence increments, and compensating events (`events.service.js`).
     - Concurrency-safe inventory reservations and signed PDF receipt generation (`checkout.service.js`).
     - System health checks and atomic baseline reset (`health.service.js`, `reset.service.js`).
     - Session tokens and RBAC probe evaluations (`auth.service.js`, `rbac.service.js`).
     - Tournaments, fixtures, leagues, standings, and rosters (`fixtures.service.js`, etc.).
   - Orchestrates transactions, validators, policies, repositories, and cryptographic signatures.
   - Completely decoupled from Express request/response objects, enabling straightforward unit testing.

5. **Repository Layer (`src/repositories/`)**:
   - Encapsulates all SQL statements and database interactions.
   - Uses strict parameterized queries (`$1, $2, ...`) to eliminate SQL injection vulnerabilities.
   - Accepts an optional transaction `client` so queries can participate in atomic transactions.

6. **PostgreSQL Database (`src/database/` & `src/config/database.js`)**:
   - Executes ACID transactions with explicit `BEGIN`, `COMMIT`, `ROLLBACK`.
   - Enforces database constraints: `CHECK (stock >= 0)`, unique constraints, and row-level locks (`SELECT ... FOR UPDATE`) to prevent race conditions during concurrent checkouts.

---

## 3. Directory Structure

```
src/
├── app.js                          # Express application factory & middleware pipeline
├── server.js                       # Server startup, migration runner, & graceful shutdown
│
├── config/                         # Centralized configuration
│   ├── env.js                      # Centralized environment variable loader
│   ├── database.js                 # PostgreSQL Pool & migration runner
│   ├── redis.js                    # Redis client & cache abstraction
│   └── logger.js                   # Safe structured logger (suppresses credentials)
│
├── constants/                      # Reusable system constants
│   ├── app.constants.js            # Default timeouts, limits, currency, discount codes
│   ├── error-codes.constants.js    # Official Appendix B error codes
│   ├── http-status.constants.js    # Standard HTTP status code constants
│   ├── permissions.constants.js    # Domain & probe permission identifiers
│   ├── roles.constants.js          # Five official roles (super_admin, etc.)
│   └── routes.constants.js         # Canonical endpoint routes
│
├── routes/                         # Route definitions & endpoint mappings
│   ├── index.js                    # Central router aggregating all sub-routes
│   ├── health.routes.js            # GET /health
│   ├── reset.routes.js             # POST /audit/v1/reset
│   ├── auth.routes.js              # POST /api/v1/auth/login, GET /api/v1/ping
│   ├── sports.routes.js            # POST /audit/v1/sports
│   ├── fixtures.routes.js          # POST /audit/v1/fixtures
│   ├── leagues.routes.js           # POST /audit/v1/leagues
│   ├── events.routes.js            # POST /audit/v1/events
│   ├── scores.routes.js            # GET /audit/v1/score/:match_id
│   ├── standings.routes.js         # GET /audit/v1/standings/:league_id
│   ├── roster.routes.js            # POST /audit/v1/roster/*, GET /audit/v1/roster/*
│   ├── checkout.routes.js          # POST /audit/v1/checkout
│   ├── inventory.routes.js         # GET /audit/v1/inventory/:variant_id
│   ├── rbac.routes.js              # POST /audit/v1/rbac-matrix, /audit/v1/rbac/*
│   └── offline-sync.routes.js      # POST /audit/v1/offline-sync
│
├── controllers/                    # HTTP request & response handlers
│   ├── health.controller.js
│   ├── reset.controller.js
│   ├── auth.controller.js
│   ├── sports.controller.js
│   ├── fixtures.controller.js
│   ├── leagues.controller.js
│   ├── events.controller.js
│   ├── scores.controller.js
│   ├── standings.controller.js
│   ├── roster.controller.js
│   ├── checkout.controller.js
│   ├── inventory.controller.js
│   ├── rbac.controller.js
│   └── offline-sync.controller.js
│
├── services/                       # Business logic & domain orchestration
│   ├── health.service.js
│   ├── reset.service.js
│   ├── auth.service.js
│   ├── token.service.js
│   ├── sports.service.js
│   ├── fixtures.service.js
│   ├── leagues.service.js
│   ├── events.service.js
│   ├── scoring.service.js
│   ├── standings.service.js
│   ├── roster.service.js
│   ├── checkout.service.js
│   ├── inventory.service.js
│   ├── rbac.service.js
│   └── offline-sync.service.js
│
├── repositories/                   # Database data access layer (parameterized SQL)
│   ├── user.repository.js
│   ├── tenant.repository.js
│   ├── sport.repository.js
│   ├── league.repository.js
│   ├── fixture.repository.js
│   ├── event.repository.js
│   ├── roster.repository.js
│   ├── inventory.repository.js
│   ├── order.repository.js
│   └── rbac.repository.js
│
├── middlewares/                    # Request interception & security guards
│   ├── authenticate.middleware.js
│   ├── authorize-role.middleware.js
│   ├── authorize-permission.middleware.js
│   ├── tenant-isolation.middleware.js
│   ├── validate-request.middleware.js
│   ├── not-found.middleware.js
│   ├── error-handler.middleware.js
│   ├── request-id.middleware.js
│   ├── rate-limit.middleware.js
│   └── payload-limit.middleware.js
│
├── validators/                     # Request payload & parameter validators
│   ├── auth.validator.js
│   ├── reset.validator.js
│   ├── events.validator.js
│   ├── checkout.validator.js
│   ├── sports.validator.js
│   ├── fixtures.validator.js
│   ├── leagues.validator.js
│   ├── roster.validator.js
│   ├── rbac.validator.js
│   └── offline-sync.validator.js
│
├── policies/                       # Access control & authorization policies
│   ├── rbac.policy.js              # Section 5.13 Probes P1-P7 matrix evaluation
│   ├── tenant.policy.js            # Multi-tenant boundary checks
│   ├── roster.policy.js            # Club manager & player profile update rules
│   └── league.policy.js            # League organizer ownership rules
│
├── utils/                          # Reusable helper utilities
│   ├── api-error.js                # Custom ApiError with status and error code
│   ├── api-response.js             # Standardized response formatters
│   ├── async-handler.js            # Express Promise rejection wrapper
│   ├── canonical-json.util.js      # Unicode code-point sorting canonical JSON
│   ├── signature.util.js           # HMAC-SHA256 signature generator & verifier
│   ├── password.util.js            # Salted scrypt password hashing & timing-safe check
│   ├── jwt.util.js                 # HS256 JWT generator and validator
│   ├── date.util.js                # ISO date formatting utilities
│   └── pagination.util.js          # Limit/offset parsing helper
│
├── database/                       # Database utilities & migration assets
│   ├── schema.sql                  # PostgreSQL table definitions & initial baseline
│   ├── transactions.js             # Atomic withTransaction coordinator
│   └── seed-runner.js              # Baseline seed fixtures & wipe routines
│
├── integrations/                   # External service gateways
│   ├── payment/
│   │   └── mock-payment.gateway.js # Mock card processor (tok_success, tok_declined)
│   └── queue/
│       └── queue.service.js        # Background job queue dispatcher
│
├── jobs/                           # Background scheduled workers
│   └── index.js                    # Worker initialization & task handlers
│
├── sockets/                        # Real-time WebSocket handlers
│   └── index.js                    # Live match score broadcast manager
│
└── docs/                           # Architecture and engineering documentation
    └── architecture.md             # This document
```

---

## 4. Cryptographic Security & Signatures

- **Canonical JSON (`src/utils/canonical-json.util.js`)**: Recursively sorts object keys in ascending Unicode code-point order, encodes non-ASCII characters directly in UTF-8, and formats numbers and booleans concisely.
- **HMAC-SHA256 (`src/utils/signature.util.js`)**: Signs payloads using `DAY1_SALT` loaded from `env.DAY1_SALT`. Signatures are computed over `id + "|" + canonicalJson` and verified in constant time (`crypto.timingSafeEqual`) to prevent timing side-channel attacks.
- **Password Hashing (`src/utils/password.util.js`)**: Uses random 16-byte salt and `scryptSync` (derived key length 64) with timing-safe comparison. Plaintext passwords are never stored.

---

## 5. Concurrency & Transaction Safety

1. **Transactional Checkout (`src/services/checkout.service.js`)**:
   - Executes inside `withTransaction(...)`.
   - Acquires row-level locks on requested variants (`SELECT ... FOR UPDATE`) to eliminate race conditions (NFR-3).
   - Validates that stock is sufficient before updating.
   - Enforces the database constraint `CHECK (stock >= 0)`.
   - If payment fails (`tok_declined`), rolls back the transaction completely, releasing all locks without partial mutations.

2. **Event Sourcing (`src/services/events.service.js`)**:
   - Executes inside `withTransaction(...)`.
   - Idempotent: duplicate `event_id` with identical body returns stored response with HTTP 200.
   - State transition validation (`match_init` -> `match_start` -> `in_progress` -> `match_end` -> `completed`).
   - Append-only sequence numbers calculated atomically (`COALESCE(MAX(sequence), 0) + 1`).
   - Compensating events immutably link to their target event without modifying existing event records.

---

## 6. Backward Compatibility Bridges

To preserve compatibility with existing automated test suites and external consumer scripts, lightweight re-export bridges are maintained:
- `src/db/index.js` → `src/config/database.js`
- `src/utils/signature.js` → `src/utils/signature.util.js`
- `src/middleware/auth.js` → `src/middlewares/authenticate.middleware.js`, `authorize-role.middleware.js`, `tenant-isolation.middleware.js`
- `src/modules/system/system.service.js` → `src/services/health.service.js`, `reset.service.js`, `src/database/seed-runner.js`
- `src/modules/events/event.service.js` → `src/services/events.service.js`, `src/services/scoring.service.js`
- `src/modules/store/checkout.service.js` → `src/services/checkout.service.js`, `src/services/inventory.service.js`
- `src/modules/auth/auth.service.js` → `src/services/auth.service.js`, `src/services/rbac.service.js`, `src/services/token.service.js`
- `backend/src/utils/signature.js` → `src/utils/signature.js`
