-- ============================================================
-- Webapp Schema for VMStat Application
-- User management and permissions
-- ============================================================

-- Create webapp schema
CREATE SCHEMA IF NOT EXISTS webapp;

-- Users table
CREATE TABLE IF NOT EXISTS webapp.users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'viewer',  -- admin, manager, viewer
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON webapp.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON webapp.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON webapp.users(role);

-- User VM Permissions table
CREATE TABLE IF NOT EXISTS webapp.user_vm_permissions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES webapp.users(id) ON DELETE CASCADE,
    vm_uuid UUID,           -- NULL = use group_id
    group_id UUID,          -- Assign by group
    permission_level VARCHAR(20) DEFAULT 'view',  -- view, manage
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON webapp.user_vm_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_vm ON webapp.user_vm_permissions(vm_uuid);
CREATE INDEX IF NOT EXISTS idx_user_permissions_group ON webapp.user_vm_permissions(group_id);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS webapp.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES webapp.users(id) ON DELETE SET NULL,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    details TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON webapp.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON webapp.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON webapp.audit_logs(created_at DESC);

-- System Settings table
CREATE TABLE IF NOT EXISTS webapp.settings (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES webapp.users(id)
);

-- User Sessions table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS webapp.user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES webapp.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON webapp.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON webapp.user_sessions(expires_at);

-- Update timestamp trigger for users
CREATE OR REPLACE FUNCTION webapp.update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_timestamp ON webapp.users;
CREATE TRIGGER trigger_update_user_timestamp
    BEFORE UPDATE ON webapp.users
    FOR EACH ROW
    EXECUTE FUNCTION webapp.update_user_timestamp();

-- Insert default admin user (password: admin123)
-- Password hash for 'admin123' using bcrypt
INSERT INTO webapp.users (username, email, password_hash, full_name, role)
VALUES (
    'admin', 
    'admin@example.com', 
    '$2b$12$KOBaSj6kx/jWLIvVmP0bNeJePO2ML7WOFmhT2Su4t8UJRJ0KN3IHi',
    'System Administrator',
    'admin'
) ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO webapp.settings (key, value, description) VALUES
    ('app_name', 'VMStat', 'Application display name'),
    ('session_timeout_minutes', '1440', 'Session timeout in minutes'),
    ('max_login_attempts', '5', 'Maximum failed login attempts before lockout'),
    ('password_min_length', '8', 'Minimum password length'),
    ('enable_audit_log', 'true', 'Enable audit logging')
ON CONFLICT (key) DO NOTHING;

-- Grant permissions to apirak user
GRANT ALL PRIVILEGES ON SCHEMA webapp TO apirak;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA webapp TO apirak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA webapp TO apirak;

COMMENT ON SCHEMA webapp IS 'VMStat web application user management';
COMMENT ON TABLE webapp.users IS 'Application users with roles';
COMMENT ON TABLE webapp.user_vm_permissions IS 'User-specific VM access permissions';
COMMENT ON TABLE webapp.audit_logs IS 'System audit trail';
COMMENT ON TABLE webapp.settings IS 'Application settings';
COMMENT ON TABLE webapp.user_sessions IS 'Active user sessions';

-- Datastore display preferences
CREATE TABLE IF NOT EXISTS webapp.user_datastore_prefs (
    user_id INTEGER REFERENCES webapp.users(id) ON DELETE CASCADE,
    datastore_id VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, datastore_id)
);

CREATE INDEX IF NOT EXISTS idx_datastore_prefs_user ON webapp.user_datastore_prefs(user_id);

COMMENT ON TABLE webapp.user_datastore_prefs IS 'User preferences for datastore display order';
