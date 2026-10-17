-- ==============================================================================
-- NaSCon '26 PostgreSQL Database Schema
-- Defines tables for Match Event Sourcing and Store/Checkout Operations
-- ==============================================================================

-- Matches
CREATE TABLE IF NOT EXISTS matches (
    match_id VARCHAR(64) PRIMARY KEY,
    sport_id VARCHAR(64) NOT NULL,
    league_id VARCHAR(64),
    home_team_id VARCHAR(64) NOT NULL,
    away_team_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'upcoming',
    winner_team_id VARCHAR(64),
    tiebreak_winner_team_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only match events stream (Section 5.9)
CREATE TABLE IF NOT EXISTS match_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(64) UNIQUE NOT NULL,
    match_id VARCHAR(64) NOT NULL REFERENCES matches(match_id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL,
    sequence INT NOT NULL,
    payload JSONB NOT NULL,
    raw_body JSONB NOT NULL,
    signature VARCHAR(64) NOT NULL,
    compensated BOOLEAN NOT NULL DEFAULT FALSE,
    compensated_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_match_sequence UNIQUE (match_id, sequence)
);

CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);

-- Merchandise Products (Section 5.12)
CREATE TABLE IF NOT EXISTS products (
    product_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Merchandise Product Variants with strict non-negative stock constraint (NFR-3)
CREATE TABLE IF NOT EXISTS product_variants (
    variant_id VARCHAR(64) PRIMARY KEY,
    product_id VARCHAR(64) NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    price_minor INT NOT NULL,
    currency VARCHAR(8) NOT NULL DEFAULT 'PKR',
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    reserved INT NOT NULL DEFAULT 0 CHECK (reserved >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Checkout Orders & Signed Receipts (Section 5.12)
CREATE TABLE IF NOT EXISTS orders (
    order_id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'paid',
    currency VARCHAR(8) NOT NULL DEFAULT 'PKR',
    items JSONB NOT NULL,
    subtotal_minor INT NOT NULL,
    discount_minor INT NOT NULL DEFAULT 0,
    total_minor INT NOT NULL,
    discount_code VARCHAR(64),
    payment_info JSONB NOT NULL,
    receipt_payload JSONB NOT NULL,
    receipt_signature VARCHAR(64) NOT NULL,
    raw_request JSONB NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
