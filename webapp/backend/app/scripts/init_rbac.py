"""
Initialize RBAC System - Create roles, permissions, and default users
This script reads configuration from environment variables (.env file)
"""
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from passlib.context import CryptContext
import psycopg2
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    # Try current directory
    load_dotenv()

# Password context for hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_db_connection():
    """Create database connection from environment variables"""
    host = os.getenv("pgSQL_HOST", os.getenv("DB_HOST", "localhost"))
    port = os.getenv("pgSQL_HOST_PORT", os.getenv("DB_PORT", "5432"))
    dbname = os.getenv("pgSQL_DBNAME", os.getenv("DB_NAME", "sangfor_scp"))
    user = os.getenv("pgSQL_USERNAME", os.getenv("DB_USER", "postgres"))
    password = os.getenv("pgSQL_PASSWORD", os.getenv("DB_PASSWORD", ""))
    
    print(f"Connecting to database: {host}:{port}/{dbname} as {user}")
    
    conn = psycopg2.connect(
        host=host,
        port=port,
        dbname=dbname,
        user=user,
        password=password
    )
    return conn


def create_schema(conn):
    """Create webapp schema if not exists"""
    with conn.cursor() as cur:
        cur.execute("CREATE SCHEMA IF NOT EXISTS webapp;")
    conn.commit()
    print("✅ Schema webapp created/verified")


def create_roles_table(conn):
    """Create roles table"""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS webapp.roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                level INTEGER DEFAULT 1,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_roles_name ON webapp.roles(name);
        """)
    conn.commit()
    print("✅ Roles table created/verified")


def create_permissions_table(conn):
    """Create permissions table"""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS webapp.permissions (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                description TEXT,
                category VARCHAR(50),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_permissions_name ON webapp.permissions(name);
        """)
    conn.commit()
    print("✅ Permissions table created/verified")


def create_role_permissions_table(conn):
    """Create role_permissions junction table"""
    with conn.cursor() as cur:
        cur.execute("""
            CREATE TABLE IF NOT EXISTS webapp.role_permissions (
                id SERIAL PRIMARY KEY,
                role_id INTEGER REFERENCES webapp.roles(id) ON DELETE CASCADE,
                permission_id INTEGER REFERENCES webapp.permissions(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, permission_id)
            );
            CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON webapp.role_permissions(role_id);
        """)
    conn.commit()
    print("✅ Role permissions table created/verified")


def ensure_users_table(conn):
    """Ensure users table exists and has role_id column"""
    with conn.cursor() as cur:
        # Create users table if not exists
        cur.execute("""
            CREATE TABLE IF NOT EXISTS webapp.users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                full_name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'viewer',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Add role_id column if not exists
        cur.execute("""
            DO $$ 
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_schema = 'webapp' AND table_name = 'users' AND column_name = 'role_id') THEN
                    ALTER TABLE webapp.users ADD COLUMN role_id INTEGER REFERENCES webapp.roles(id);
                END IF;
            END $$;
        """)
    conn.commit()
    print("✅ Users table verified with role_id column")


def insert_default_roles(conn):
    """Insert default roles"""
    roles = [
        ("admin", "Administrator", "Full system access with all permissions", 100),
        ("manager", "Manager", "Can manage VMs and view reports", 50),
        ("viewer", "Viewer", "Read-only access to VMs and dashboards", 10),
    ]
    
    with conn.cursor() as cur:
        for name, display_name, description, level in roles:
            cur.execute("""
                INSERT INTO webapp.roles (name, display_name, description, level)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    description = EXCLUDED.description,
                    level = EXCLUDED.level;
            """, (name, display_name, description, level))
    conn.commit()
    print("✅ Default roles inserted")


def insert_default_permissions(conn):
    """Insert default permissions"""
    permissions = [
        # User Management
        ("users.view", "View user list and profiles", "users"),
        ("users.create", "Create new users", "users"),
        ("users.update", "Update user information", "users"),
        ("users.delete", "Delete or deactivate users", "users"),
        ("users.reset_password", "Reset user passwords", "users"),
        ("users.manage_roles", "Assign roles to users", "users"),
        
        # VM Management
        ("vms.view", "View VM list and details", "vms"),
        ("vms.metrics", "View VM metrics and performance data", "vms"),
        ("vms.power", "Control VM power state", "vms"),
        ("vms.snapshot", "Create and manage VM snapshots", "vms"),
        ("vms.migrate", "Migrate VMs between hosts", "vms"),
        ("vms.configure", "Modify VM configuration", "vms"),
        
        # Host Management
        ("hosts.view", "View host list and details", "hosts"),
        ("hosts.metrics", "View host metrics and performance", "hosts"),
        ("hosts.manage", "Manage host settings", "hosts"),
        
        # System Administration
        ("system.settings", "View and modify system settings", "system"),
        ("system.sync", "Manage data synchronization", "system"),
        ("system.database", "Database management operations", "system"),
        ("system.audit", "View audit logs", "system"),
        ("system.backup", "Backup and restore operations", "system"),
        
        # Reports & Dashboard
        ("reports.view", "View reports and dashboards", "reports"),
        ("reports.export", "Export reports to file", "reports"),
        ("reports.create", "Create custom reports", "reports"),
        
        # Alarms
        ("alarms.view", "View alarms and alerts", "alarms"),
        ("alarms.acknowledge", "Acknowledge alarms", "alarms"),
        ("alarms.configure", "Configure alarm rules", "alarms"),
    ]
    
    with conn.cursor() as cur:
        for name, description, category in permissions:
            cur.execute("""
                INSERT INTO webapp.permissions (name, description, category)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE SET
                    description = EXCLUDED.description,
                    category = EXCLUDED.category;
            """, (name, description, category))
    conn.commit()
    print("✅ Default permissions inserted")


def assign_role_permissions(conn):
    """Assign permissions to roles"""
    # Admin gets all permissions
    admin_permissions = None  # All permissions
    
    # Manager permissions
    manager_permissions = [
        "users.view",
        "vms.view", "vms.metrics", "vms.power", "vms.snapshot",
        "hosts.view", "hosts.metrics",
        "reports.view", "reports.export",
        "alarms.view", "alarms.acknowledge"
    ]
    
    # Viewer permissions
    viewer_permissions = [
        "vms.view", "vms.metrics",
        "hosts.view", "hosts.metrics",
        "reports.view",
        "alarms.view"
    ]
    
    with conn.cursor() as cur:
        # Clear existing role permissions
        cur.execute("DELETE FROM webapp.role_permissions;")
        
        # Admin gets all permissions
        cur.execute("""
            INSERT INTO webapp.role_permissions (role_id, permission_id)
            SELECT r.id, p.id
            FROM webapp.roles r, webapp.permissions p
            WHERE r.name = 'admin';
        """)
        
        # Manager permissions
        for perm in manager_permissions:
            cur.execute("""
                INSERT INTO webapp.role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM webapp.roles r, webapp.permissions p
                WHERE r.name = 'manager' AND p.name = %s
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            """, (perm,))
        
        # Viewer permissions
        for perm in viewer_permissions:
            cur.execute("""
                INSERT INTO webapp.role_permissions (role_id, permission_id)
                SELECT r.id, p.id
                FROM webapp.roles r, webapp.permissions p
                WHERE r.name = 'viewer' AND p.name = %s
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            """, (perm,))
    
    conn.commit()
    print("✅ Role permissions assigned")


def create_default_users(conn):
    """Create 3 default users with different roles"""
    users = [
        {
            "username": "admin_user",
            "email": "admin@vmstat.local",
            "password": "Admin@2026!",
            "full_name": "System Administrator",
            "role": "admin"
        },
        {
            "username": "manager_user",
            "email": "manager@vmstat.local",
            "password": "Manager@2026!",
            "full_name": "VM Manager",
            "role": "manager"
        },
        {
            "username": "viewer_user",
            "email": "viewer@vmstat.local",
            "password": "Viewer@2026!",
            "full_name": "Report Viewer",
            "role": "viewer"
        },
    ]
    
    with conn.cursor() as cur:
        for user in users:
            # Generate password hash
            password_hash = pwd_context.hash(user["password"])
            
            # Check if user exists
            cur.execute("SELECT id FROM webapp.users WHERE username = %s", (user["username"],))
            existing = cur.fetchone()
            
            if existing:
                # Update existing user
                cur.execute("""
                    UPDATE webapp.users SET
                        email = %s,
                        password_hash = %s,
                        full_name = %s,
                        role = %s,
                        role_id = (SELECT id FROM webapp.roles WHERE name = %s),
                        is_active = TRUE,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE username = %s
                """, (user["email"], password_hash, user["full_name"], 
                      user["role"], user["role"], user["username"]))
                print(f"   Updated user: {user['username']}")
            else:
                # Insert new user
                cur.execute("""
                    INSERT INTO webapp.users (username, email, password_hash, full_name, role, role_id, is_active)
                    VALUES (%s, %s, %s, %s, %s, 
                           (SELECT id FROM webapp.roles WHERE name = %s),
                           TRUE)
                """, (user["username"], user["email"], password_hash, 
                      user["full_name"], user["role"], user["role"]))
                print(f"   Created user: {user['username']}")
    
    conn.commit()
    print("✅ Default users created/updated")
    print("\n📋 User Credentials:")
    print("=" * 50)
    for user in users:
        print(f"   Username: {user['username']}")
        print(f"   Password: {user['password']}")
        print(f"   Role: {user['role']}")
        print("-" * 50)


def create_helper_views(conn):
    """Create helper views for RBAC"""
    with conn.cursor() as cur:
        cur.execute("""
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
        """)
        
        cur.execute("""
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
        """)
    
    conn.commit()
    print("✅ Helper views and functions created")


def verify_setup(conn):
    """Verify the RBAC setup"""
    print("\n🔍 Verification:")
    print("=" * 50)
    
    with conn.cursor() as cur:
        # Count roles
        cur.execute("SELECT COUNT(*) FROM webapp.roles")
        role_count = cur.fetchone()[0]
        print(f"   Roles: {role_count}")
        
        # Count permissions
        cur.execute("SELECT COUNT(*) FROM webapp.permissions")
        perm_count = cur.fetchone()[0]
        print(f"   Permissions: {perm_count}")
        
        # Count users
        cur.execute("SELECT COUNT(*) FROM webapp.users WHERE is_active = TRUE")
        user_count = cur.fetchone()[0]
        print(f"   Active Users: {user_count}")
        
        # Show role permission counts
        cur.execute("""
            SELECT r.name, COUNT(rp.id) as perm_count
            FROM webapp.roles r
            LEFT JOIN webapp.role_permissions rp ON r.id = rp.role_id
            GROUP BY r.name
            ORDER BY r.level DESC
        """)
        print("\n   Role Permissions:")
        for row in cur.fetchall():
            print(f"      {row[0]}: {row[1]} permissions")
        
        # Show users
        cur.execute("""
            SELECT username, role, email
            FROM webapp.users 
            WHERE is_active = TRUE
            ORDER BY role
        """)
        print("\n   Users:")
        for row in cur.fetchall():
            print(f"      {row[0]} ({row[1]}): {row[2]}")
    
    print("\n" + "=" * 50)


def main():
    """Main initialization function"""
    print("=" * 60)
    print("🚀 RBAC System Initialization")
    print("=" * 60)
    
    try:
        conn = get_db_connection()
        
        # Create tables
        create_schema(conn)
        create_roles_table(conn)
        create_permissions_table(conn)
        create_role_permissions_table(conn)
        ensure_users_table(conn)
        
        # Insert data
        insert_default_roles(conn)
        insert_default_permissions(conn)
        assign_role_permissions(conn)
        create_default_users(conn)
        create_helper_views(conn)
        
        # Verify
        verify_setup(conn)
        
        conn.close()
        print("\n✅ RBAC System initialized successfully!")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        raise


if __name__ == "__main__":
    main()
