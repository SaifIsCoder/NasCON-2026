# NaSCon ’26 Part I: Multi-Sport League & Club Operations Platform

Official submission repository for NaSCon ’26 App Dev Competition (Part I: Multi-Sport League & Club Operations Platform).

---

## 1. Submission Package Overview

This repository root contains the official submission deliverables required by Section 1.3 of the specification:

| File / Directory | Description | Status |
|---|---|---|
| `docker-compose.yml` | Backend container orchestration for API, PostgreSQL 16, Redis 7, MinIO | Configured |
| `.env.example` | Environment variable definitions with `DAY1_SALT` placeholder | Configured |
| `README.md` | Run instructions, architecture, demo accounts, and judging details | Configured |
| `TRACEABILITY.md` | Mapping of official FR/NFR IDs to source files and test vectors | Configured |
| `tests/` | Automated test suite directory | Configured |
| `run_tests.sh` | Official test execution script | Configured |
| `COVERAGE.json` | Measured test coverage report for six backend domains | Configured (0.0% unbuilt) |
| `mobile/` | Mobile application project directory | Configured |
| `mobile/release/app-release.apk` | Compiled Android APK | Pending application build |

---

## 2. Prerequisites & Environment Setup

- **Host OS**: Ubuntu 22.04 LTS (or compatible Linux / macOS / Windows with WSL2)
- **Docker**: Docker Engine 24+ and Docker Compose v2+
- **Salt**: Cryptographic per-team `DAY1_SALT` printed on the venue team slip

Copy the environment template before running locally:
```bash
cp .env.example .env
```
Set your team's assigned `DAY1_SALT` in your shell environment or `.env` file. Never commit `.env` or hardcode the salt.

---

## 3. Starting the Backend

According to Section 5.2, the grader starts the backend with:

```bash
DAY1_SALT=<your-salt> docker compose up -d --build
```

The stack runs self-hosted open-source services:
- **REST API**: `http://localhost:8080`
- **PostgreSQL 16**: Port `5432`
- **Redis 7**: Port `6379`
- **MinIO Object Store**: Port `9000` (Console: `9001`)

### Readiness Probe (`GET /health`)
The grading runner polls `GET /health` every 2 seconds. The server responds with HTTP 200 once the database is reachable and baseline data is seeded:

```bash
curl -i http://localhost:8080/health
```

Expected Response:
```json
{"status":"ok"}
```

---

## 4. Reset & Baseline Seeding (`POST /audit/v1/reset`)

Before each evaluation group, the grader calls the reset endpoint to wipe transient state and re-seed baseline fixtures:

```bash
curl -X POST http://localhost:8080/audit/v1/reset \
  -H "Content-Type: application/json" \
  -d '{"seed": 42, "stock": {"var-jersey-001-M": 1, "var-jersey-001-L": 5}}'
```

---

## 5. Demo Accounts (Section 8.3)

These accounts are seeded and available after system initialization and after every `/reset`:

| Role | Email | Password | Scope / Boundary |
|---|---|---|---|
| **Platform Super-Admin** | `admin@nascon.test` | `Nascon@26` | Platform-wide global access |
| **League Organizer** | `organizer@nascon.test` | `Nascon@26` | Owns `league-alpha-1` in `tenant-alpha` |
| **Club Manager** | `manager@nascon.test` | `Nascon@26` | Owns `club-alpha-1` in `tenant-alpha` |
| **Player** | `player@nascon.test` | `Nascon@26` | Registered as `player-alpha-1` (`club-alpha-1`) |
| **General Viewer** | `viewer@nascon.test` | `Nascon@26` | Read-only access inside `tenant-alpha` |

---

## 6. Running Automated Tests

To run the automated test suite and check code compliance:

```bash
chmod +x ./run_tests.sh
./run_tests.sh
```

---

## 7. Submission Checklist & Push Windows

Hourly commits are required during Day 1 Sprint (Section 1.3 / Rule Booklet Section 4):
- Window 1: 10:45 – 11:45 PKT
- Window 2: 11:45 – 12:45 PKT
- Window 3: 12:45 – 13:45 PKT
- Window 4: 13:45 – 14:45 PKT
- Final Push Lock: 15:05:00 PKT
