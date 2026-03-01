-- ============================================================
-- Data Store Dashboard Settings
-- 
-- Table for storing system-wide settings including dashboard preferences
-- ============================================================

-- System Settings Table (if not exists from other modules)
CREATE TABLE IF NOT EXISTS sangfor.system_settings (
    setting_key     VARCHAR(100) PRIMARY KEY,
    setting_value   TEXT,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sangfor.system_settings IS 'System-wide settings and configurations';
COMMENT ON COLUMN sangfor.system_settings.setting_key IS 'Unique setting identifier';
COMMENT ON COLUMN sangfor.system_settings.setting_value IS 'Setting value (can be JSON)';

-- Insert default datastore dashboard settings (empty by default)
INSERT INTO sangfor.system_settings (setting_key, setting_value, description)
VALUES ('datastore_dashboard_ids', '[]', 'Selected datastore IDs for dashboard display')
ON CONFLICT (setting_key) DO NOTHING;

-- Trigger for updated_at
CREATE TRIGGER trg_system_settings_timestamp 
BEFORE UPDATE ON sangfor.system_settings 
FOR EACH ROW EXECUTE FUNCTION sangfor.update_timestamp();
