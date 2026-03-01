"""
Authentication utilities - JWT and password handling with RBAC
"""
from datetime import datetime, timedelta
from typing import Optional, List, Set
from functools import lru_cache
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..config import get_settings
from ..database import get_db

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Role hierarchy for simple role-based checks
ROLE_HIERARCHY = {
    "admin": 100,
    "manager": 50,
    "viewer": 10
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated user from JWT token."""
    token = credentials.credentials
    payload = decode_token(token)
    
    username: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Verify user exists and is active
    result = db.execute(
        text("SELECT id, username, email, full_name, role, is_active FROM webapp.users WHERE id = :id"),
        {"id": user_id}
    )
    user = result.fetchone()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role
    }


def require_role(required_role: str):
    """Decorator to require specific role."""
    async def role_checker(current_user: dict = Depends(get_current_user)):
        role_hierarchy = {"admin": 3, "manager": 2, "viewer": 1}
        user_level = role_hierarchy.get(current_user["role"], 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        return current_user
    return role_checker


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin role for access."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


async def require_manager(current_user: dict = Depends(get_current_user)) -> dict:
    """Require manager or admin role for access."""
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Manager access required"
        )
    return current_user


def get_user_permissions(db: Session, user_id: int) -> Set[str]:
    """Get all permissions for a user from the database."""
    result = db.execute(
        text("""
            SELECT DISTINCT p.name
            FROM webapp.users u
            JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
            JOIN webapp.role_permissions rp ON r.id = rp.role_id
            JOIN webapp.permissions p ON rp.permission_id = p.id
            WHERE u.id = :user_id AND u.is_active = TRUE
        """),
        {"user_id": user_id}
    )
    return {row[0] for row in result.fetchall()}


def require_permission(required_permission: str):
    """Decorator to require specific permission."""
    async def permission_checker(
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Admin always has all permissions
        if current_user["role"] == "admin":
            return current_user
        
        # Check if user has the required permission
        permissions = get_user_permissions(db, current_user["id"])
        if required_permission not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission} required"
            )
        return current_user
    return permission_checker


def require_any_permission(required_permissions: List[str]):
    """Decorator to require any of the specified permissions."""
    async def permission_checker(
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Admin always has all permissions
        if current_user["role"] == "admin":
            return current_user
        
        # Check if user has any of the required permissions
        permissions = get_user_permissions(db, current_user["id"])
        if not permissions.intersection(set(required_permissions)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: one of {required_permissions} required"
            )
        return current_user
    return permission_checker


def require_all_permissions(required_permissions: List[str]):
    """Decorator to require all specified permissions."""
    async def permission_checker(
        current_user: dict = Depends(get_current_user),
        db: Session = Depends(get_db)
    ):
        # Admin always has all permissions
        if current_user["role"] == "admin":
            return current_user
        
        # Check if user has all required permissions
        permissions = get_user_permissions(db, current_user["id"])
        missing = set(required_permissions) - permissions
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: missing {list(missing)}"
            )
        return current_user
    return permission_checker


async def get_current_user_with_permissions(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    """Get current authenticated user with permissions included."""
    token = credentials.credentials
    payload = decode_token(token)
    
    username: str = payload.get("sub")
    user_id: int = payload.get("user_id")
    
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    # Get user with role info
    result = db.execute(
        text("""
            SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
                   r.display_name as role_display_name, r.level as role_level
            FROM webapp.users u
            LEFT JOIN webapp.roles r ON u.role_id = r.id OR u.role = r.name
            WHERE u.id = :id
        """),
        {"id": user_id}
    )
    user = result.fetchone()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Get permissions
    permissions = get_user_permissions(db, user_id)
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "role_display_name": user.role_display_name or user.role.title(),
        "role_level": user.role_level or ROLE_HIERARCHY.get(user.role, 0),
        "permissions": list(permissions)
    }
