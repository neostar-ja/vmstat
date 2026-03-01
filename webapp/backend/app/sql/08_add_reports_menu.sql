-- ============================================================
-- Add Reports Menu Item
-- ============================================================

-- Insert Reports menu item (order 55 = after alarms at 50)
INSERT INTO webapp.menu_items (name, display_name, path, menu_type, icon, "order", is_visible)
VALUES ('reports', 'รายงาน', '/reports', 'menu', 'Assessment', 55, true)
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    path = EXCLUDED.path,
    icon = EXCLUDED.icon,
    "order" = EXCLUDED."order",
    is_visible = EXCLUDED.is_visible;

-- Grant permissions for all roles
-- Admin: full access
INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
SELECT r.id, m.id, true, true, true
FROM webapp.roles r, webapp.menu_items m
WHERE r.name = 'admin' AND m.name = 'reports'
ON CONFLICT (role_id, menu_item_id)
DO UPDATE SET can_view = true, can_edit = true, can_delete = true;

-- Manager: view and edit
INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
SELECT r.id, m.id, true, true, false
FROM webapp.roles r, webapp.menu_items m
WHERE r.name = 'manager' AND m.name = 'reports'
ON CONFLICT (role_id, menu_item_id)
DO UPDATE SET can_view = true, can_edit = true, can_delete = false;

-- Viewer: view only
INSERT INTO webapp.role_menu_permissions (role_id, menu_item_id, can_view, can_edit, can_delete)
SELECT r.id, m.id, true, false, false
FROM webapp.roles r, webapp.menu_items m
WHERE r.name = 'viewer' AND m.name = 'reports'
ON CONFLICT (role_id, menu_item_id)
DO UPDATE SET can_view = true, can_edit = false, can_delete = false;
