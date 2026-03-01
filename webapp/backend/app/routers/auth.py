"""
Authentication Router
"""
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel

from ..database import get_db
from ..config import get_settings
from ..schemas import Token, UserLogin, UserResponse, UserCreate
from ..utils.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_user,
    require_role,
    get_user_permissions,
    get_current_user_with_permissions
)
from ..utils.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


def _get_user_menu_permissions(db: Session, role_name: str) -> list:
    """Fetch menu permissions for a user based on their role."""
    is_admin = role_name == "admin"
    result = db.execute(
        text("""
            SELECT 
                m.id as menu_item_id, m.name as menu_name,
                m.display_name as menu_display_name, m.path as menu_path,
                m.menu_type, m.icon as menu_icon, m.parent_id, m."order",
                COALESCE(rmp.can_view, false) as can_view,
                COALESCE(rmp.can_edit, false) as can_edit,
                COALESCE(rmp.can_delete, false) as can_delete
            FROM webapp.menu_items m
            LEFT JOIN webapp.roles r ON r.name = :role
            LEFT JOIN webapp.role_menu_permissions rmp ON rmp.menu_item_id = m.id AND rmp.role_id = r.id
            WHERE m.is_visible = true
            ORDER BY m."order", m.id
        """),
        {"role": role_name}
    )
    perms = []
    for row in result.fetchall():
        perms.append({
            "menu_item_id": row.menu_item_id,
            "menu_name": row.menu_name,
            "menu_display_name": row.menu_display_name,
            "menu_path": row.menu_path,
            "menu_type": row.menu_type,
            "menu_icon": row.menu_icon,
            "parent_id": row.parent_id,
            "order": row.order,
            "can_view": True if is_admin else row.can_view,
            "can_edit": True if is_admin else row.can_edit,
            "can_delete": True if is_admin else row.can_delete,
        })
    return perms


def _validate_password_strength(password: str) -> None:
    """ตรวจสอบความซับซ้อนของรหัสผ่าน"""
    errors = []
    if len(password) < 8:
        errors.append("อย่างน้อย 8 ตัวอักษร")
    if not any(c.isupper() for c in password):
        errors.append("ตัวพิมพ์ใหญ่อย่างน้อย 1 ตัว (A-Z)")
    if not any(c.islower() for c in password):
        errors.append("ตัวพิมพ์เล็กอย่างน้อย 1 ตัว (a-z)")
    if not any(c.isdigit() for c in password):
        errors.append("ตัวเลขอย่างน้อย 1 ตัว (0-9)")
    if not any(c in "!@#$%^&*()_+-=[]{}|;':,./<>?" for c in password):
        errors.append("อักขระพิเศษอย่างน้อย 1 ตัว เช่น !@#$%")
    if errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"รหัสผ่านต้องประกอบด้วย: {', '.join(errors)}"
        )


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class LoginResponse(BaseModel):
    """Extended login response with user info"""
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login")
@limiter.limit("10/minute")  # ป้องกัน Brute Force: max 10 ครั้ง/นาที ต่อ IP
async def login(request: Request, user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token with user info."""
    result = db.execute(
        text("""
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.password_hash, u.is_active,
                   r.display_name as role_display_name, r.level as role_level
            FROM webapp.users u
            LEFT JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
            WHERE u.username = :username
        """),
        {"username": user_data.username}
    )
    user = result.fetchone()

    # ใช้ error message เดียวกันทั้งหมด เพื่อป้องกัน Username Enumeration
    _invalid_cred_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        raise _invalid_cred_exc

    if not user.is_active:
        # บอกว่า account ถูก disable แต่ไม่ยืนยันว่า username มีอยู่
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Please contact administrator."
        )

    if not verify_password(user_data.password, user.password_hash):
        raise _invalid_cred_exc
    
    # Get user permissions
    permissions = get_user_permissions(db, user.id)
    
    # Create access token with role info
    access_token = create_access_token(
        data={
            "sub": user.username, 
            "user_id": user.id, 
            "role": user.role,
            "role_level": user.role_level or 0
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Log successful login
    try:
        db.execute(
            text("""
                INSERT INTO webapp.audit_logs (user_id, username, action, details)
                VALUES (:user_id, :username, 'login', 'User logged in successfully')
            """),
            {"user_id": user.id, "username": user.username}
        )
        db.commit()
    except Exception:
        pass  # Don't fail login if audit logging fails
    
    # Get menu permissions for frontend
    menu_perms = _get_user_menu_permissions(db, user.role)
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "role_display_name": user.role_display_name or user.role.title(),
            "role_level": user.role_level or 0,
            "permissions": list(permissions),
            "menu_permissions": menu_perms
        }
    }


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile with permissions."""
    result = db.execute(
        text("""
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active, u.created_at,
                   r.display_name as role_display_name, r.level as role_level
            FROM webapp.users u
            LEFT JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
            WHERE u.id = :id
        """),
        {"id": current_user["id"]}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get permissions
    permissions = get_user_permissions(db, user.id)
    
    # Get menu permissions
    menu_perms = _get_user_menu_permissions(db, user.role)
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "role_display_name": user.role_display_name or user.role.title(),
        "role_level": user.role_level or 0,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "permissions": list(permissions),
        "menu_permissions": menu_perms
    }


@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user's password."""
    # Validate new password - ตรวจสอบ complexity
    _validate_password_strength(request.new_password)
    
    # Get current password hash
    result = db.execute(
        text("SELECT password_hash FROM webapp.users WHERE id = :id"),
        {"id": current_user["id"]}
    )
    user = result.fetchone()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify current password
    if not verify_password(request.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    new_hash = get_password_hash(request.new_password)
    db.execute(
        text("UPDATE webapp.users SET password_hash = :hash, updated_at = NOW() WHERE id = :id"),
        {"hash": new_hash, "id": current_user["id"]}
    )
    db.commit()
    
    return {"message": "Password changed successfully"}


@router.post("/register", response_model=UserResponse)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Register new user (Admin only)."""
    # Check if username exists
    result = db.execute(
        text("SELECT id FROM webapp.users WHERE username = :username OR email = :email"),
        {"username": user_data.username, "email": user_data.email}
    )
    if result.fetchone():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already exists"
        )
    
    # Create user - ตรวจสอบ password strength
    _validate_password_strength(user_data.password)
    password_hash = get_password_hash(user_data.password)
    db.execute(
        text("""
            INSERT INTO webapp.users (username, email, password_hash, full_name, role)
            VALUES (:username, :email, :password_hash, :full_name, :role)
        """),
        {
            "username": user_data.username,
            "email": user_data.email,
            "password_hash": password_hash,
            "full_name": user_data.full_name,
            "role": user_data.role
        }
    )
    db.commit()
    
    # Return created user
    result = db.execute(
        text("SELECT id, username, email, full_name, role, is_active, created_at FROM webapp.users WHERE username = :username"),
        {"username": user_data.username}
    )
    return result.fetchone()
