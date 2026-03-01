-- ============================================================
-- Sync Settings Table
-- 
-- Store sync configuration in database instead of env variables
-- ============================================================

CREATE TABLE IF NOT EXISTS sangfor.sync_settings (
    id              SERIAL PRIMARY KEY,
    scp_ip          VARCHAR(50),
    scp_username    VARCHAR(100),
    scp_password    TEXT,  -- Should be encrypted in production
    sync_interval_minutes INT DEFAULT 5,
    scheduler_active BOOLEAN DEFAULT FALSE,
    auto_start      BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO sangfor.sync_settings (id, scp_ip, sync_interval_minutes, scheduler_active, auto_start)
VALUES (1, NULL, 5, FALSE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- Only allow one settings row
CREATE UNIQUE INDEX idx_sync_settings_singleton ON sangfor.sync_settings (id);

COMMENT ON TABLE sangfor.sync_settings IS 'Sync configuration - single row table (singleton pattern)';
COMMENT ON COLUMN sangfor.sync_settings.auto_start IS 'Auto-start scheduler on backend startup (should be FALSE - use Admin UI instead)';
