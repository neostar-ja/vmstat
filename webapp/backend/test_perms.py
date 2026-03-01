import sys
import os
sys.path.insert(0, '/opt/code/sangfor_scp/webapp/backend')
from app.database import SessionLocal
from app.routers.auth import _get_user_menu_permissions

db = SessionLocal()
perms = _get_user_menu_permissions(db, "admin")
for p in perms:
    print(p['menu_name'], p['can_view'])
