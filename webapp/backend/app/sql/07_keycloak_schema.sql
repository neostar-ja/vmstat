-- ============================================================
-- Keycloak SSO Schema for VMStat Application
-- Keycloak Configuration and User Mapping
-- ============================================================

-- Create keycloak_config table (single row for SSO settings)
CREATE TABLE IF NOT EXISTS webapp.keycloak_config (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT FALSE,
    server_url VARCHAR(500),          -- e.g. https://keycloak.example.com
    realm VARCHAR(100),               -- e.g. WUH
    client_id VARCHAR(100),           -- e.g. vmstat
    client_secret VARCHAR(500),       -- Client secret from Keycloak
    redirect_uri VARCHAR(500),        -- e.g. https://host/vmstat/login
    scope VARCHAR(200) DEFAULT 'openid profile email',
    
    -- Role mapping settings
    default_role VARCHAR(50) DEFAULT 'viewer',
    
    -- User management settings
    auto_create_user BOOLEAN DEFAULT TRUE,   -- Auto-create local user on first SSO login
    sync_user_info BOOLEAN DEFAULT TRUE,     -- Sync email/name from Keycloak on each login
    
    -- Allowed users list (JSONB array of {username, role})
    allowed_users JSONB DEFAULT '[]'::jsonb,
    
    -- Audit
    updated_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_keycloak_config_enabled ON webapp.keycloak_config(is_enabled);

-- Create keycloak_user_mapping table
CREATE TABLE IF NOT EXISTS webapp.keycloak_user_mapping (
    id SERIAL PRIMARY KEY,
    keycloak_user_id VARCHAR(255) NOT NULL,
    keycloak_username VARCHAR(255) NOT NULL,
    keycloak_email VARCHAR(255),
    keycloak_full_name VARCHAR(255),
    local_role VARCHAR(50) NOT NULL DEFAULT 'viewer',  -- admin, manager, viewer
    is_enabled BOOLEAN DEFAULT TRUE,
    user_attributes JSONB,           -- Additional Keycloak user attributes
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_keycloak_user_mapping_user_id 
    ON webapp.keycloak_user_mapping(keycloak_user_id);
CREATE INDEX IF NOT EXISTS idx_keycloak_user_mapping_username 
    ON webapp.keycloak_user_mapping(keycloak_username);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA webapp TO apirak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA webapp TO apirak;

COMMENT ON TABLE webapp.keycloak_config IS 'Keycloak SSO configuration (single row)';
COMMENT ON TABLE webapp.keycloak_user_mapping IS 'Mapping between Keycloak users and local roles';
