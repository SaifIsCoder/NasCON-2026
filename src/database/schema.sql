-- Schema migrations tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(64) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenants (Section 5.5)
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sports (Section 5.5, 5.6)
CREATE TABLE IF NOT EXISTS sports (
    sport_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    scoring_model VARCHAR(32) NOT NULL,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leagues (Section 5.5, 5.7)
CREATE TABLE IF NOT EXISTS leagues (
    league_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    sport_id VARCHAR(64) REFERENCES sports(sport_id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clubs (Section 5.5)
CREATE TABLE IF NOT EXISTS clubs (
    club_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Players (Section 5.5, 5.11)
CREATE TABLE IF NOT EXISTS players (
    player_id VARCHAR(64) PRIMARY KEY,
    club_id VARCHAR(64) REFERENCES clubs(club_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users & RBAC (Section 5.5, 5.13, 8.3)
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) REFERENCES tenants(tenant_id) ON DELETE SET NULL,
    league_id VARCHAR(64) REFERENCES leagues(league_id) ON DELETE SET NULL,
    club_id VARCHAR(64) REFERENCES clubs(club_id) ON DELETE SET NULL,
    player_id VARCHAR(64) REFERENCES players(player_id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure plaintext passwords are never stored
ALTER TABLE users DROP COLUMN IF EXISTS password_plain;

-- Discounts (Section 5.5, 5.12)
CREATE TABLE IF NOT EXISTS discounts (
    code VARCHAR(64) PRIMARY KEY,
    percent INT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Reset State & Metadata (Section 5.5)
CREATE TABLE IF NOT EXISTS audit_reset_state (
    id INT PRIMARY KEY DEFAULT 1,
    seed INT NOT NULL DEFAULT 42,
    reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

-- ============================================================
-- Section 5.11 Roster, Transfers, Loans & History
-- ============================================================

-- Roster scenario league configuration
CREATE TABLE IF NOT EXISTS roster_leagues (
    league_id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    sport_id VARCHAR(64),
    transfer_open DATE,
    transfer_close DATE,
    max_squad_size INT,
    required_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Roster squads within a scenario league
CREATE TABLE IF NOT EXISTS roster_squads (
    league_id VARCHAR(64) NOT NULL,
    squad_id VARCHAR(64) NOT NULL,
    club_id VARCHAR(64),
    tenant_id VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (league_id, squad_id)
);

-- Current registration state of a player within a scenario league
CREATE TABLE IF NOT EXISTS roster_registrations (
    league_id VARCHAR(64) NOT NULL,
    player_id VARCHAR(64) NOT NULL,
    name VARCHAR(255),
    position VARCHAR(64),
    squad_id VARCHAR(64),
    parent_squad_id VARCHAR(64),
    role VARCHAR(32),
    registration_type VARCHAR(32),
    start_date DATE,
    loan_end_date DATE,
    on_loan BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (league_id, player_id)
);

-- Immutable roster audit trail (append-only)
CREATE TABLE IF NOT EXISTS roster_audit (
    id SERIAL PRIMARY KEY,
    audit_id VARCHAR(64) NOT NULL,
    league_id VARCHAR(64) NOT NULL,
    player_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    from_squad_id VARCHAR(64),
    to_squad_id VARCHAR(64),
    effective_date DATE,
    state VARCHAR(48),
    who VARCHAR(128),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    why TEXT,
    entry JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_roster_audit_player ON roster_audit(player_id);

-- Roster transfer request idempotency store
CREATE TABLE IF NOT EXISTS roster_transfer_requests (
    request_id VARCHAR(64) PRIMARY KEY,
    league_id VARCHAR(64),
    request_body JSONB NOT NULL,
    response JSONB NOT NULL,
    status_code INT NOT NULL DEFAULT 201,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- In-progress matches for the transfer deferral edge case
CREATE TABLE IF NOT EXISTS roster_live_matches (
    league_id VARCHAR(64) NOT NULL,
    match_id VARCHAR(64) NOT NULL,
    home_squad_id VARCHAR(64),
    away_squad_id VARCHAR(64),
    PRIMARY KEY (league_id, match_id)
);

-- ============================================================
-- Section 5.14 Offline Sync processed-action dedup
-- ============================================================
CREATE TABLE IF NOT EXISTS offline_sync_actions (
    device_id VARCHAR(64) NOT NULL,
    action_id VARCHAR(64) NOT NULL,
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (device_id, action_id)
);

-- Initial Baseline Data (Section 5.5, 8.3)
INSERT INTO tenants (tenant_id, name) VALUES
('tenant-alpha', 'Alpha Sports'),
('tenant-beta', 'Beta Athletics')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO sports (sport_id, name, scoring_model, config) VALUES 
('football', 'Football', 'event', '{"sport_id":"football","name":"Football","scoring_model":"event","periods":{"count":2,"duration_minutes":45},"scoring_events":{"goal":{"points":1}},"draw_allowed":true,"overtime":{"policy":"none"},"tie_break_order":["h2h_points","h2h_diff","overall_diff","scored","fair_play","draw_lots"],"roster":{"min_squad_size":11,"max_squad_size":25,"required_positions":{"gk":1}}}'::jsonb),
('basketball', 'Basketball', 'event', '{"sport_id":"basketball","name":"Basketball","scoring_model":"event","periods":{"count":4,"duration_minutes":12},"scoring_events":{"free_throw":{"points":1},"two_pointer":{"points":2},"three_pointer":{"points":3}},"draw_allowed":false,"overtime":{"policy":"extra_time","duration_minutes":5},"tie_break_order":["h2h_points","h2h_diff","overall_diff","scored","fair_play","draw_lots"],"roster":{"min_squad_size":5,"max_squad_size":15,"required_positions":{}}}'::jsonb),
('cricket', 'Cricket', 'innings', '{"sport_id":"cricket","name":"Cricket","scoring_model":"innings","periods":{"innings_per_team":1,"overs_per_innings":20,"balls_per_over":6,"wickets_per_innings":10},"scoring_events":{"dot_ball":{"runs":0,"legal_ball":true,"wicket":false},"single":{"runs":1,"legal_ball":true,"wicket":false},"two":{"runs":2,"legal_ball":true,"wicket":false},"four":{"runs":4,"legal_ball":true,"wicket":false},"six":{"runs":6,"legal_ball":true,"wicket":false},"wide":{"runs":1,"legal_ball":false,"wicket":false},"no_ball":{"runs":1,"legal_ball":false,"wicket":false},"wicket":{"runs":0,"legal_ball":true,"wicket":true}},"draw_allowed":true,"overtime":{"policy":"super_over"},"tie_break_order":["h2h_points","h2h_diff","overall_diff","scored","fair_play","draw_lots"],"roster":{"min_squad_size":11,"max_squad_size":18,"required_positions":{"wicketkeeper":1}}}'::jsonb),
('esports', 'Esports', 'round', '{"sport_id":"esports","name":"Esports","scoring_model":"round","periods":{"best_of":3},"scoring_events":{"round_win":{"rounds":1}},"draw_allowed":false,"overtime":{"policy":"none"},"tie_break_order":["h2h_points","h2h_diff","overall_diff","scored","fair_play","draw_lots"],"roster":{"min_squad_size":5,"max_squad_size":8,"required_positions":{}}}'::jsonb)
ON CONFLICT (sport_id) DO NOTHING;

INSERT INTO products (product_id, tenant_id, name) VALUES 
('prod-jersey-001', 'tenant-alpha', 'Alpha Match Jersey')
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO product_variants (variant_id, product_id, name, price_minor, currency, stock, reserved) VALUES 
('var-jersey-001-M', 'prod-jersey-001', 'Alpha Match Jersey M', 450000, 'PKR', 1, 0),
('var-jersey-001-L', 'prod-jersey-001', 'Alpha Match Jersey L', 450000, 'PKR', 5, 0)
ON CONFLICT (variant_id) DO NOTHING;

INSERT INTO discounts (code, percent, active) VALUES 
('WELCOME10', 10, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO leagues (league_id, tenant_id, sport_id, name) VALUES 
('league-alpha-1', 'tenant-alpha', 'football', 'Alpha League 1'),
('league-alpha-2', 'tenant-alpha', 'football', 'Alpha League 2'),
('league-beta-1', 'tenant-beta', 'football', 'Beta League 1')
ON CONFLICT (league_id) DO NOTHING;

INSERT INTO clubs (club_id, tenant_id, name) VALUES 
('club-alpha-1', 'tenant-alpha', 'Alpha Club 1'),
('club-alpha-2', 'tenant-alpha', 'Alpha Club 2'),
('club-beta-1', 'tenant-beta', 'Beta Club 1')
ON CONFLICT (club_id) DO NOTHING;

INSERT INTO players (player_id, club_id, tenant_id, name, position) VALUES 
('player-alpha-1', 'club-alpha-1', 'tenant-alpha', 'Alpha Player 1', 'Forward'),
('player-alpha-2', 'club-alpha-2', 'tenant-alpha', 'Alpha Player 2', 'Midfielder'),
('player-beta-1', 'club-beta-1', 'tenant-beta', 'Beta Player 1', 'Defender')
ON CONFLICT (player_id) DO NOTHING;

INSERT INTO users (user_id, email, password_hash, role, tenant_id, league_id, club_id, player_id) VALUES 
('usr-admin-001', 'admin@nascon.test', 'a1b2c3d4e5f60718:06bcf565672be00a8ba8403516a50fa2632f3f5e256bc63f32166846ff1b34d55c2cdd71a85871663dd00d863e290f9f2f67a4b442440298d90690f708182749', 'super_admin', null, null, null, null),
('usr-org-001', 'organizer@nascon.test', 'a1b2c3d4e5f60718:06bcf565672be00a8ba8403516a50fa2632f3f5e256bc63f32166846ff1b34d55c2cdd71a85871663dd00d863e290f9f2f67a4b442440298d90690f708182749', 'league_organizer', 'tenant-alpha', 'league-alpha-1', null, null),
('usr-mgr-001', 'manager@nascon.test', 'a1b2c3d4e5f60718:06bcf565672be00a8ba8403516a50fa2632f3f5e256bc63f32166846ff1b34d55c2cdd71a85871663dd00d863e290f9f2f67a4b442440298d90690f708182749', 'club_manager', 'tenant-alpha', null, 'club-alpha-1', null),
('usr-player-001', 'player@nascon.test', 'a1b2c3d4e5f60718:06bcf565672be00a8ba8403516a50fa2632f3f5e256bc63f32166846ff1b34d55c2cdd71a85871663dd00d863e290f9f2f67a4b442440298d90690f708182749', 'player', 'tenant-alpha', null, null, 'player-alpha-1'),
('usr-viewer-001', 'viewer@nascon.test', 'a1b2c3d4e5f60718:06bcf565672be00a8ba8403516a50fa2632f3f5e256bc63f32166846ff1b34d55c2cdd71a85871663dd00d863e290f9f2f67a4b442440298d90690f708182749', 'viewer', 'tenant-alpha', null, null, null)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO audit_reset_state (id, seed) VALUES (1, 42)
ON CONFLICT (id) DO NOTHING;
