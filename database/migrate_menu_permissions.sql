-- ============================================================
-- Migration: Menu-Based Permission System for Sangfor SCP
-- Creates menu_items and role_menu_permissions tables
-- ============================================================

-- 1. Create menu_items table
CREATE TABLE IF NOT EXISTS webapp.menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    path VARCHAR(255) NOT NULL,
    icon VARCHAR(50),
    parent_id INTEGER REFERENCES webapp.menu_items(id) ON DELETE SET NULL,
    menu_type VARCHAR(20) DEFAULT 'menu',  -- menu, tab, page
    "order" INTEGER DEFAULT 0,
    is_visible BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_menu_items_order ON webapp.menu_items("order");
CREATE INDEX IF NOT EXISTS idx_menu_items_parent ON webapp.menu_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_type ON webapp.menu_items(menu_type);

-- 2. Create role_menu_permissions table
CREATE TABLE IF NOT EXISTS webapp.role_menu_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES webapp.roles(id) ON DELETE CASCADE,
    menu_item_id INTEGER NOT NULL REFERENCES webapp.menu_items(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT TRUE,
    can_edit BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_menu_unique 
    ON webapp.role_menu_permissions(role_id, menu_item_id);

-- 3. Insert default menu items
INSERT INTO webapp.menu_items (name, display_name, path, icon, parent_id, menu_type, "order", is_visible, description) VALUES
-- Main menus
('dashboard',        'Dashboard',         '/',              'Dashboard',              NULL, 'menu', 1,  true, 'หน้าแดชบอร์ดหลัก'),
('vms',              'Virtual Machines',   '/vms',           'Computer',               NULL, 'menu', 2,  true, 'รายการ VM ทั้งหมด'),
('groups',           'Groups',             '/groups',        'Group',                  NULL, 'menu', 3,  true, 'กลุ่ม VM'),
('hosts',            'Hosts',              '/hosts',         'Dns',                    NULL, 'menu', 4,  true, 'เครื่อง Host'),
('datastores',       'DataStores',         '/datastores',    'Storage',                NULL, 'menu', 5,  true, 'ที่เก็บข้อมูล'),
('alarms',           'Alarms',             '/alarms',        'Warning',                NULL, 'menu', 6,  true, 'การแจ้งเตือน'),
-- Admin menus
('admin_users',      'User Management',    '/admin/users',    'AdminPanelSettings',    NULL, 'menu', 10, true, 'จัดการผู้ใช้งาน'),
('admin_settings',   'System Settings',    '/admin/settings', 'Settings',              NULL, 'menu', 11, true, 'ตั้งค่าระบบ'),
('admin_sync',       'Sync Setting',       '/admin/sync',     'Sync',                  NULL, 'menu', 12, true, 'ตั้งค่าการซิงค์'),
('profile',          'Profile',            '/profile',        'Person',                NULL, 'menu', 20, true, 'โปรไฟล์ผู้ใช้')
ON CONFLICT (name) DO NOTHING;

-- 4. Insert VM Detail tabs (parent = vms)
INSERT INTO webapp.menu_items (name, display_name, path, icon, parent_id, menu_type, "order", is_visible, description)
SELECT tab_name, tab_display, tab_path, tab_icon, m.id, 'tab', tab_order, true, tab_desc
FROM webapp.menu_items m
CROSS JOIN (VALUES
    ('vm_detail_overview',     'VM Overview',      '/vms/:id',              'Visibility',   1, 'รายละเอียด VM'),
    ('vm_detail_performance',  'VM Performance',   '/vms/:id/performance',  'Speed',        2, 'ประสิทธิภาพ VM'),
    ('vm_detail_storage',      'VM Storage',       '/vms/:id/storage',      'Storage',      3, 'พื้นที่เก็บข้อมูล VM'),
    ('vm_detail_networks',     'VM Networks',      '/vms/:id/networks',     'Lan',          4, 'เครือข่าย VM'),
    ('vm_detail_alarms',       'VM Alarms',        '/vms/:id/alarms',       'Warning',      5, 'การแจ้งเตือน VM'),
    ('vm_detail_raw',          'VM Raw Data',      '/vms/:id/raw',          'Code',         6, 'ข้อมูลดิบ VM')
) AS tabs(tab_name, tab_display, tab_path, tab_icon, tab_order, tab_desc)
WHERE m.name = 'vms'
ON CONFLICT (name) DO NOTHING;

-- 5. Insert DataStore Detail tabs (parent = datastores)
INSERT INTO webapp.menu_items (name, display_name, path, icon, parent_id, menu_type, "order", is_visible, description)
SELECT tab_name, tab_display, tab_path, tab_icon, m.id, 'tab', tab_order, true, tab_desc
FROM webapp.menu_items m
CROSS JOIN (VALUES
    ('ds_detail_overview',   'DS Overview',       '/datastores/:id',              'Visibility',      1, 'รายละเอียด DataStore'),
    ('ds_detail_charts',     'DS Charts',         '/datastores/:id/charts',       'Assessment',      2, 'กราฟ DataStore'),
    ('ds_detail_prediction', 'DS AI Prediction',  '/datastores/:id/prediction',   'TrendingUp',      3, 'การพยากรณ์ AI')
) AS tabs(tab_name, tab_display, tab_path, tab_icon, tab_order, tab_desc)
WHERE m.name = 'datastores'
ON CONFLICT (name) DO NOTHING;

-- 6. Set default permissions for existing roles
-- Admin (level=100) → all access
INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
SELECT r.id, m.id, true, true, true
FROM webapp.roles r, webapp.menu_items m
WHERE r.name = 'admin'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Manager (level=50) → all except admin pages
INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
SELECT r.id, m.id,
    CASE WHEN m.name LIKE 'admin_%' THEN false ELSE true END,
    CASE WHEN m.name LIKE 'admin_%' THEN false ELSE true END,
    false
FROM webapp.roles r, webapp.menu_items m
WHERE r.name = 'manager'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Viewer (level=10) → view-only main pages, no admin
INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
SELECT r.id, m.id,
    CASE WHEN m.name LIKE 'admin_%' THEN false ELSE true END,
    false,
    false
FROM webapp.roles r, webapp.menu_items m
WHERE r.name = 'viewer'
ON CONFLICT (role_id, menu_item_id) DO NOTHING;

-- Done
SELECT 'Migration complete: ' || count(*) || ' menu items, ' || 
       (SELECT count(*) FROM webapp.role_menu_permissions) || ' permissions created'
FROM webapp.menu_items;
