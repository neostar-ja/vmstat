-- ============================================================
-- RBAC Schema Enhancement for VMStat Application
-- Roles, Permissions, and User Management
-- ============================================================

-- Create roles table
CREATE TABLE IF NOT EXISTS webapp.roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1,  -- Higher = more permissions
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_roles_name ON webapp.roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_level ON webapp.roles(level);

-- Create permissions table
CREATE TABLE IF NOT EXISTS webapp.permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category VARCHAR(50),  -- users, vms, system, reports
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON webapp.permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_category ON webapp.permissions(category);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS webapp.role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES webapp.roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES webapp.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON webapp.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON webapp.role_permissions(permission_id);

-- Add role_id column to users table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'webapp' AND table_name = 'users' AND column_name = 'role_id') THEN
        ALTER TABLE webapp.users ADD COLUMN role_id INTEGER REFERENCES webapp.roles(id);
    END IF;
END $$;

-- ============================================================
-- Insert Default Roles
-- ============================================================

INSERT INTO webapp.roles (name, display_name, description, level) VALUES
    ('admin', 'Administrator', 'Full system access with all permissions', 100),
    ('manager', 'Manager', 'Can manage VMs and view reports', 50),
    ('viewer', 'Viewer', 'Read-only access to VMs and dashboards', 10)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    level = EXCLUDED.level;

-- ============================================================
-- Insert Default Permissions
-- ============================================================

INSERT INTO webapp.permissions (name, description, category) VALUES
    -- User Management
    ('users.view', 'View user list and profiles', 'users'),
    ('users.create', 'Create new users', 'users'),
    ('users.update', 'Update user information', 'users'),
    ('users.delete', 'Delete or deactivate users', 'users'),
    ('users.reset_password', 'Reset user passwords', 'users'),
    ('users.manage_roles', 'Assign roles to users', 'users'),
    
    -- VM Management
    ('vms.view', 'View VM list and details', 'vms'),
    ('vms.metrics', 'View VM metrics and performance data', 'vms'),
    ('vms.power', 'Control VM power state (start/stop/restart)', 'vms'),
    ('vms.snapshot', 'Create and manage VM snapshots', 'vms'),
    ('vms.migrate', 'Migrate VMs between hosts', 'vms'),
    ('vms.configure', 'Modify VM configuration', 'vms'),
    
    -- Host Management
    ('hosts.view', 'View host list and details', 'hosts'),
    ('hosts.metrics', 'View host metrics and performance', 'hosts'),
    ('hosts.manage', 'Manage host settings', 'hosts'),
    
    -- System Administration
    ('system.settings', 'View and modify system settings', 'system'),
    ('system.sync', 'Manage data synchronization', 'system'),
    ('system.database', 'Database management operations', 'system'),
    ('system.audit', 'View audit logs', 'system'),
    ('system.backup', 'Backup and restore operations', 'system'),
    
    -- Reports & Dashboard
    ('reports.view', 'View reports and dashboards', 'reports'),
    ('reports.export', 'Export reports to file', 'reports'),
    ('reports.create', 'Create custom reports', 'reports'),
    
    -- Alarms
    ('alarms.view', 'View alarms and alerts', 'alarms'),
    ('alarms.acknowledge', 'Acknowledge alarms', 'alarms'),
    ('alarms.configure', 'Configure alarm rules', 'alarms')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    category = EXCLUDED.category;

-- ============================================================
-- Assign Permissions to Roles
-- ============================================================

-- Clear existing role permissions and re-insert
DELETE FROM webapp.role_permissions;

-- Admin gets all permissions
INSERT INTO webapp.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM webapp.roles r, webapp.permissions p
WHERE r.name = 'admin';

-- Manager permissions
INSERT INTO webapp.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM webapp.roles r, webapp.permissions p
WHERE r.name = 'manager'
AND p.name IN (
    'users.view',
    'vms.view', 'vms.metrics', 'vms.power', 'vms.snapshot',
    'hosts.view', 'hosts.metrics',
    'reports.view', 'reports.export',
    'alarms.view', 'alarms.acknowledge'
);

-- Viewer permissions
INSERT INTO webapp.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM webapp.roles r, webapp.permissions p
WHERE r.name = 'viewer'
AND p.name IN (
    'vms.view', 'vms.metrics',
    'hosts.view', 'hosts.metrics',
    'reports.view',
    'alarms.view'
);

-- ============================================================
-- Create 3 Default Users with Different Roles
-- ============================================================

-- Password hashes generated with bcrypt for:
-- admin_user: Admin@2026!
-- manager_user: Manager@2026!
-- viewer_user: Viewer@2026!

-- First, update role_id for existing users based on role column
UPDATE webapp.users SET role_id = (SELECT id FROM webapp.roles WHERE name = webapp.users.role);

-- Insert admin user
INSERT INTO webapp.users (username, email, password_hash, full_name, role, role_id, is_active)
SELECT 
    'admin_user',
    'admin@vmstat.local',
    '$2b$12$LQv3c1yqBwHLPMFTQjhOXeQDOjpQwXNIB3fQ8yJqOmDIiIzVmPJnK',
    'System Administrator',
    'admin',
    (SELECT id FROM webapp.roles WHERE name = 'admin'),
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM webapp.users WHERE username = 'admin_user');

-- Insert manager user
INSERT INTO webapp.users (username, email, password_hash, full_name, role, role_id, is_active)
SELECT 
    'manager_user',
    'manager@vmstat.local',
    '$2b$12$rYpZgqHFMqP8x.nMvFpKhOLQnxqOmDIiIzVmPJnK3fQ8yJqOmDIi',
    'VM Manager',
    'manager',
    (SELECT id FROM webapp.roles WHERE name = 'manager'),
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM webapp.users WHERE username = 'manager_user');

-- Insert viewer user
INSERT INTO webapp.users (username, email, password_hash, full_name, role, role_id, is_active)
SELECT 
    'viewer_user',
    'viewer@vmstat.local',
    '$2b$12$xqOmDIiIzVmPJnK3fQ8yJqOmDIiIzVmPJnKLQv3c1yqBwHLPMFTQ',
    'Report Viewer',
    'viewer',
    (SELECT id FROM webapp.roles WHERE name = 'viewer'),
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM webapp.users WHERE username = 'viewer_user');

-- ============================================================
-- Create View for User Permissions
-- ============================================================

CREATE OR REPLACE VIEW webapp.v_user_permissions AS
SELECT 
    u.id AS user_id,
    u.username,
    u.email,
    u.full_name,
    r.name AS role_name,
    r.display_name AS role_display_name,
    r.level AS role_level,
    p.name AS permission_name,
    p.description AS permission_description,
    p.category AS permission_category
FROM webapp.users u
JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
JOIN webapp.role_permissions rp ON r.id = rp.role_id
JOIN webapp.permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE;

-- ============================================================
-- Function to check if user has permission
-- ============================================================

CREATE OR REPLACE FUNCTION webapp.has_permission(
    p_user_id INTEGER,
    p_permission_name VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM webapp.v_user_permissions 
        WHERE user_id = p_user_id 
        AND permission_name = p_permission_name
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Function to get user role level
-- ============================================================

CREATE OR REPLACE FUNCTION webapp.get_user_role_level(
    p_user_id INTEGER
) RETURNS INTEGER AS $$
DECLARE
    role_lvl INTEGER;
BEGIN
    SELECT r.level INTO role_lvl
    FROM webapp.users u
    JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
    WHERE u.id = p_user_id;
    
    RETURN COALESCE(role_lvl, 0);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA webapp TO apirak;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA webapp TO apirak;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA webapp TO apirak;

COMMENT ON TABLE webapp.roles IS 'User roles for RBAC';
COMMENT ON TABLE webapp.permissions IS 'Available system permissions';
COMMENT ON TABLE webapp.role_permissions IS 'Role-permission mapping';
