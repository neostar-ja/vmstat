"""
Keycloak SSO Router
Handles Keycloak configuration, OAuth PKCE login flow, and user management.
Adapted from ecc800 implementation for sangfor_scp (sync SQLAlchemy + raw SQL).
"""
import secrets
import hashlib
import base64
import json as json_module
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field
from jose import jwt as jose_jwt

from ..database import get_db
from ..config import get_settings
from ..utils.auth import get_current_user, require_role

router = APIRouter(prefix="/auth/keycloak", tags=["Keycloak SSO"])
logger = logging.getLogger(__name__)
settings = get_settings()

# In-memory OAuth state storage (state -> {code_verifier, expires_at})
_oauth_states = {}


# ============ Pydantic Schemas ============

class AllowedUser(BaseModel):
    username: str
    role: str = "viewer"


class KeycloakConfigCreate(BaseModel):
    is_enabled: bool = False
    server_url: Optional[str] = None
    realm: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: Optional[str] = None
    scope: str = "openid profile email"
    default_role: str = "viewer"
    auto_create_user: bool = True
    sync_user_info: bool = True
    allowed_users: list = Field(default_factory=list)


class KeycloakConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    server_url: Optional[str] = None
    realm: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: Optional[str] = None
    scope: Optional[str] = None
    default_role: Optional[str] = None
    auto_create_user: Optional[bool] = None
    sync_user_info: Optional[bool] = None
    allowed_users: Optional[list] = None


class KeycloakCallbackRequest(BaseModel):
    code: str
    state: str


# ============ Helper Functions ============

def _get_config(db: Session):
    """Get the single Keycloak config row."""
    result = db.execute(text("""
        SELECT id, is_enabled, server_url, realm, client_id, client_secret,
               redirect_uri, scope, default_role, auto_create_user, sync_user_info,
               allowed_users, updated_by, created_at, updated_at
        FROM webapp.keycloak_config
        LIMIT 1
    """))
    return result.fetchone()


def _config_to_dict(row) -> dict:
    """Convert a config row to dict."""
    if not row:
        return None
    return {
        "id": row.id,
        "is_enabled": row.is_enabled,
        "server_url": row.server_url,
        "realm": row.realm,
        "client_id": row.client_id,
        "client_secret": row.client_secret,
        "redirect_uri": row.redirect_uri,
        "scope": row.scope,
        "default_role": row.default_role,
        "auto_create_user": row.auto_create_user,
        "sync_user_info": row.sync_user_info,
        "allowed_users": row.allowed_users or [],
        "updated_by": row.updated_by,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


def _clean_expired_states():
    """Remove expired OAuth states."""
    now = datetime.utcnow()
    expired = [k for k, v in _oauth_states.items() if v["expires_at"] < now]
    for k in expired:
        del _oauth_states[k]


# ============ Config Endpoints ============

@router.get("/config")
async def get_keycloak_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Get Keycloak configuration (Admin only). Secret is masked."""
    row = _get_config(db)
    if not row:
        # Return default empty config instead of 404
        return {
            "id": None,
            "is_enabled": False,
            "server_url": "",
            "realm": "",
            "client_id": "vmstat",
            "client_secret": "",
            "redirect_uri": "",
            "scope": "openid profile email",
            "default_role": "viewer",
            "auto_create_user": True,
            "sync_user_info": True,
            "allowed_users": [],
            "updated_by": None,
            "created_at": None,
            "updated_at": None,
        }
    
    config = _config_to_dict(row)
    # Mask client_secret
    if config["client_secret"]:
        config["client_secret"] = "••••••••"
    return config


@router.get("/public-config")
async def get_keycloak_public_config(db: Session = Depends(get_db)):
    """Get public Keycloak config for login page (no auth required)."""
    row = _get_config(db)
    if not row:
        return {"is_enabled": False}
    
    if not row.is_enabled:
        return {"is_enabled": False}
    
    return {
        "is_enabled": True,
        "server_url": row.server_url,
        "realm": row.realm,
        "client_id": row.client_id,
        "redirect_uri": row.redirect_uri,
        "scope": row.scope,
    }


@router.post("/config", status_code=status.HTTP_201_CREATED)
async def create_or_update_keycloak_config(
    config_data: KeycloakConfigCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Create or update Keycloak config (Admin only)."""
    existing = _get_config(db)
    admin_username = current_user.get("username", "admin")
    allowed_users_json = json_module.dumps(config_data.allowed_users) if config_data.allowed_users else "[]"
    
    if existing:
        # Update - only update client_secret if provided, non-empty, and not masked
        if config_data.client_secret and config_data.client_secret != "••••••••":
            db.execute(text("""
                UPDATE webapp.keycloak_config SET
                    is_enabled = :is_enabled, server_url = :server_url,
                    realm = :realm, client_id = :client_id, client_secret = :client_secret,
                    redirect_uri = :redirect_uri, scope = :scope,
                    default_role = :default_role, auto_create_user = :auto_create_user,
                    sync_user_info = :sync_user_info, allowed_users = CAST(:allowed_users AS JSONB),
                    updated_by = :updated_by, updated_at = NOW()
                WHERE id = :id
            """), {
                "is_enabled": config_data.is_enabled,
                "server_url": config_data.server_url,
                "realm": config_data.realm,
                "client_id": config_data.client_id,
                "client_secret": config_data.client_secret,
                "redirect_uri": config_data.redirect_uri,
                "scope": config_data.scope,
                "default_role": config_data.default_role,
                "auto_create_user": config_data.auto_create_user,
                "sync_user_info": config_data.sync_user_info,
                "allowed_users": allowed_users_json,
                "updated_by": admin_username,
                "id": existing.id,
            })
        else:
            db.execute(text("""
                UPDATE webapp.keycloak_config SET
                    is_enabled = :is_enabled, server_url = :server_url,
                    realm = :realm, client_id = :client_id,
                    redirect_uri = :redirect_uri, scope = :scope,
                    default_role = :default_role, auto_create_user = :auto_create_user,
                    sync_user_info = :sync_user_info, allowed_users = CAST(:allowed_users AS JSONB),
                    updated_by = :updated_by, updated_at = NOW()
                WHERE id = :id
            """), {
                "is_enabled": config_data.is_enabled,
                "server_url": config_data.server_url,
                "realm": config_data.realm,
                "client_id": config_data.client_id,
                "redirect_uri": config_data.redirect_uri,
                "scope": config_data.scope,
                "default_role": config_data.default_role,
                "auto_create_user": config_data.auto_create_user,
                "sync_user_info": config_data.sync_user_info,
                "allowed_users": allowed_users_json,
                "updated_by": admin_username,
                "id": existing.id,
            })
    else:
        # Insert new
        db.execute(text("""
            INSERT INTO webapp.keycloak_config 
                (is_enabled, server_url, realm, client_id, client_secret,
                 redirect_uri, scope, default_role, auto_create_user, sync_user_info,
                 allowed_users, updated_by)
            VALUES (:is_enabled, :server_url, :realm, :client_id, :client_secret,
                    :redirect_uri, :scope, :default_role, :auto_create_user, :sync_user_info,
                    CAST(:allowed_users AS JSONB), :updated_by)
        """), {
            "is_enabled": config_data.is_enabled,
            "server_url": config_data.server_url,
            "realm": config_data.realm,
            "client_id": config_data.client_id,
            "client_secret": (config_data.client_secret if config_data.client_secret != "••••••••" else "") or "",
            "redirect_uri": config_data.redirect_uri,
            "scope": config_data.scope,
            "default_role": config_data.default_role,
            "auto_create_user": config_data.auto_create_user,
            "sync_user_info": config_data.sync_user_info,
            "allowed_users": allowed_users_json,
            "updated_by": admin_username,
        })
    
    db.commit()
    
    # Return updated config (masked secret)
    row = _get_config(db)
    config = _config_to_dict(row)
    if config["client_secret"]:
        config["client_secret"] = "••••••••"
    return config


@router.put("/config")
async def update_keycloak_config(
    config_data: KeycloakConfigUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Update specific fields of Keycloak config (Admin only)."""
    existing = _get_config(db)
    if not existing:
        raise HTTPException(status_code=404, detail="Keycloak config not found. Create it first.")
    
    # Build dynamic update
    update_fields = {}
    params = {"id": existing.id, "updated_by": current_user.get("username", "admin")}
    
    for field in ["is_enabled", "server_url", "realm", "client_id", "redirect_uri",
                  "scope", "default_role", "auto_create_user", "sync_user_info"]:
        value = getattr(config_data, field, None)
        if value is not None:
            update_fields[field] = f":{field}"
            params[field] = value
    
    # Handle client_secret (only update if non-empty and not masked)
    if config_data.client_secret and config_data.client_secret != "••••••••":
        update_fields["client_secret"] = ":client_secret"
        params["client_secret"] = config_data.client_secret
    
    # Handle allowed_users
    if config_data.allowed_users is not None:
        update_fields["allowed_users"] = "CAST(:allowed_users AS JSONB)"
        params["allowed_users"] = json_module.dumps(config_data.allowed_users)
    
    if not update_fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    set_clause = ", ".join(f"{k} = {v}" for k, v in update_fields.items())
    set_clause += ", updated_by = :updated_by, updated_at = NOW()"
    
    db.execute(text(f"UPDATE webapp.keycloak_config SET {set_clause} WHERE id = :id"), params)
    db.commit()
    
    row = _get_config(db)
    config = _config_to_dict(row)
    if config["client_secret"]:
        config["client_secret"] = "••••••••"
    return config


@router.delete("/config", status_code=status.HTTP_204_NO_CONTENT)
async def delete_keycloak_config(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Delete Keycloak config (Admin only)."""
    existing = _get_config(db)
    if not existing:
        raise HTTPException(status_code=404, detail="Keycloak config not found")
    
    db.execute(text("DELETE FROM webapp.keycloak_config WHERE id = :id"), {"id": existing.id})
    db.commit()


# ============ Connection Test ============

@router.post("/test-connection")
async def test_keycloak_connection(
    config_data: Optional[KeycloakConfigCreate] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """
    Test connectivity to Keycloak server (Admin only).
    If config_data is provided, uses it. Otherwise uses saved config.
    """
    if config_data:
        server_url = config_data.server_url
        realm = config_data.realm
    else:
        row = _get_config(db)
        if not row:
            raise HTTPException(status_code=404, detail="Keycloak config not found")
        server_url = row.server_url
        realm = row.realm
    
    if not server_url or not realm:
        raise HTTPException(status_code=400, detail="Server URL and Realm are required")
    
    try:
        well_known_url = f"{server_url}/realms/{realm}/.well-known/openid-configuration"
        
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.get(well_known_url)
            
            if response.status_code == 200:
                return {
                    "success": True,
                    "message": "เชื่อมต่อ Keycloak สำเร็จ",
                    "realm_info": response.json()
                }
            else:
                return {
                    "success": False,
                    "message": f"ล้มเหลว status {response.status_code}",
                    "error": response.text
                }
    except httpx.TimeoutException:
        return {"success": False, "message": "Connection timeout"}
    except Exception as e:
        return {"success": False, "message": f"Connection error: {str(e)}"}


# ============ OAuth PKCE Login Flow ============

@router.get("/login")
async def initiate_keycloak_login(db: Session = Depends(get_db)):
    """Initiate Keycloak PKCE login. Returns auth_url for frontend redirect."""
    row = _get_config(db)
    if not row or not row.is_enabled:
        raise HTTPException(status_code=400, detail="Keycloak SSO is not enabled")
    
    if not all([row.server_url, row.realm, row.client_id, row.redirect_uri]):
        raise HTTPException(status_code=400, detail="Keycloak configuration is incomplete")
    
    # Generate CSRF state
    state = secrets.token_urlsafe(32)
    
    # Generate PKCE code_verifier and code_challenge (S256)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge_bytes = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(code_challenge_bytes).rstrip(b"=").decode("ascii")
    
    # Store state + verifier (10 min TTL)
    _oauth_states[state] = {
        "code_verifier": code_verifier,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10),
    }
    _clean_expired_states()
    
    # Build Keycloak authorization URL
    from urllib.parse import urlencode
    auth_params = {
        "client_id": row.client_id,
        "redirect_uri": row.redirect_uri,
        "response_type": "code",
        "scope": row.scope or "openid profile email",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    auth_url = f"{row.server_url}/realms/{row.realm}/protocol/openid-connect/auth?{urlencode(auth_params)}"
    
    return {"auth_url": auth_url, "state": state}


@router.post("/callback")
async def keycloak_callback(
    callback_data: KeycloakCallbackRequest,
    db: Session = Depends(get_db)
):
    """Handle OAuth callback: exchange code for tokens, verify user, return local JWT."""
    logger.info(f"[CALLBACK] state={callback_data.state[:20]}...")
    
    # Verify state
    if callback_data.state not in _oauth_states:
        raise HTTPException(status_code=400, detail="Invalid or expired state")
    
    state_data = _oauth_states.pop(callback_data.state)
    code_verifier = state_data.get("code_verifier")
    
    # Get config
    row = _get_config(db)
    if not row or not row.is_enabled:
        raise HTTPException(status_code=400, detail="Keycloak SSO is not enabled")
    
    # Exchange authorization code for tokens
    token_url = f"{row.server_url}/realms/{row.realm}/protocol/openid-connect/token"
    token_data = {
        "grant_type": "authorization_code",
        "client_id": row.client_id,
        "client_secret": row.client_secret,
        "code": callback_data.code,
        "redirect_uri": row.redirect_uri,
    }
    if code_verifier:
        token_data["code_verifier"] = code_verifier
    
    try:
        async with httpx.AsyncClient(timeout=10.0, verify=False) as client:
            response = await client.post(token_url, data=token_data)
            
            if response.status_code != 200:
                logger.error(f"[CALLBACK] Token exchange failed: {response.text}")
                raise HTTPException(status_code=400, detail=f"Token exchange failed: {response.text}")
            
            tokens = response.json()
            
            # Decode ID token to get user info
            userinfo = None
            id_token = tokens.get("id_token")
            
            if id_token:
                try:
                    parts = id_token.split(".")
                    if len(parts) == 3:
                        payload = parts[1]
                        padding = 4 - len(payload) % 4
                        if padding != 4:
                            payload += "=" * padding
                        decoded = json_module.loads(base64.urlsafe_b64decode(payload))
                        userinfo = {
                            "sub": decoded.get("sub"),
                            "preferred_username": decoded.get("preferred_username"),
                            "email": decoded.get("email"),
                            "name": decoded.get("name"),
                            "given_name": decoded.get("given_name"),
                            "family_name": decoded.get("family_name"),
                        }
                except Exception as e:
                    logger.warning(f"[CALLBACK] Failed to decode id_token: {e}")
            
            # Fallback to userinfo endpoint
            if not userinfo or not userinfo.get("sub"):
                userinfo_url = f"{row.server_url}/realms/{row.realm}/protocol/openid-connect/userinfo"
                ui_response = await client.get(
                    userinfo_url,
                    headers={"Authorization": f"Bearer {tokens['access_token']}"}
                )
                if ui_response.status_code != 200:
                    raise HTTPException(status_code=400, detail=f"Failed to get user info: {ui_response.text}")
                userinfo = ui_response.json()
    
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Keycloak server timeout")
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Keycloak connection error: {str(e)}")
    
    # Extract user info
    keycloak_user_id = userinfo.get("sub")
    username = userinfo.get("preferred_username") or keycloak_user_id
    email = userinfo.get("email")
    full_name = userinfo.get("name") or f"{userinfo.get('given_name', '')} {userinfo.get('family_name', '')}".strip()
    
    logger.info(f"[CALLBACK] user={username}, email={email}")
    
    # Check allowed_users list
    allowed_users = row.allowed_users or []
    allowed_user = None
    for au in allowed_users:
        if isinstance(au, dict) and au.get("username", "").lower() == username.lower():
            allowed_user = au
            break
    
    if not allowed_user:
        raise HTTPException(
            status_code=403,
            detail=f"ผู้ใช้ '{username}' ไม่ได้รับอนุญาตให้เข้าสู่ระบบนี้ กรุณาติดต่อผู้ดูแลระบบ"
        )
    
    local_role = allowed_user.get("role", row.default_role or "viewer")
    
    # Find or create local user
    user_result = db.execute(
        text("SELECT id, username, email, full_name, role, is_active FROM webapp.users WHERE username = :username"),
        {"username": username}
    )
    user = user_result.fetchone()
    
    if user:
        if not user.is_active:
            raise HTTPException(status_code=403, detail="บัญชีผู้ใช้ถูกระงับ")
        
        # Sync user info if enabled
        if row.sync_user_info:
            db.execute(text("""
                UPDATE webapp.users SET 
                    email = COALESCE(:email, email),
                    full_name = COALESCE(:full_name, full_name),
                    role = :role,
                    updated_at = NOW()
                WHERE username = :username
            """), {"email": email, "full_name": full_name or None, "role": local_role, "username": username})
            db.commit()
            # Re-fetch
            user_result = db.execute(
                text("SELECT id, username, email, full_name, role, is_active FROM webapp.users WHERE username = :username"),
                {"username": username}
            )
            user = user_result.fetchone()
    else:
        # Auto-create user
        if row.auto_create_user:
            db.execute(text("""
                INSERT INTO webapp.users (username, email, password_hash, full_name, role, is_active)
                VALUES (:username, :email, 'keycloak_sso', :full_name, :role, TRUE)
            """), {
                "username": username,
                "email": email or f"{username}@keycloak",
                "full_name": full_name or username,
                "role": local_role,
            })
            db.commit()
            
            # Update role_id
            db.execute(text("""
                UPDATE webapp.users SET role_id = (SELECT id FROM webapp.roles WHERE name = :role)
                WHERE username = :username
            """), {"role": local_role, "username": username})
            db.commit()
            
            user_result = db.execute(
                text("SELECT id, username, email, full_name, role, is_active FROM webapp.users WHERE username = :username"),
                {"username": username}
            )
            user = user_result.fetchone()
        else:
            raise HTTPException(status_code=403, detail="User not found and auto-creation is disabled")
    
    # Get role info
    role_result = db.execute(
        text("SELECT display_name, level FROM webapp.roles WHERE name = :role"),
        {"role": user.role}
    )
    role_info = role_result.fetchone()
    
    # Get menu permissions
    from ..routers.auth import _get_user_menu_permissions
    menu_perms = _get_user_menu_permissions(db, user.role)
    
    # Get user permissions
    from ..utils.auth import get_user_permissions
    permissions = get_user_permissions(db, user.id)
    
    # Generate local JWT
    from ..utils.auth import create_access_token
    access_token = create_access_token(
        data={
            "sub": user.username,
            "user_id": user.id,
            "role": user.role,
            "role_level": role_info.level if role_info else 0,
            "auth_method": "keycloak",
        },
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Log SSO login
    try:
        db.execute(text("""
            INSERT INTO webapp.audit_logs (user_id, username, action, details)
            VALUES (:user_id, :username, 'keycloak_login', 'User logged in via Keycloak SSO')
        """), {"user_id": user.id, "username": user.username})
        db.commit()
    except Exception:
        pass
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "role_display_name": role_info.display_name if role_info else user.role.title(),
            "role_level": role_info.level if role_info else 0,
            "permissions": list(permissions),
            "menu_permissions": menu_perms,
        }
    }


# ============ Test User Login (Direct Access Grants) ============

@router.post("/test-user-login")
async def test_keycloak_user_login(
    credentials: dict,
    db: Session = Depends(get_db)
):
    """Test login with Keycloak username/password (Direct Access Grants)."""
    username = credentials.get("username")
    password = credentials.get("password")
    
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    
    row = _get_config(db)
    if not row or not row.is_enabled:
        raise HTTPException(status_code=400, detail="Keycloak SSO is not enabled")
    
    try:
        token_url = f"{row.server_url}/realms/{row.realm}/protocol/openid-connect/token"
        token_data = {
            "grant_type": "password",
            "client_id": row.client_id,
            "client_secret": row.client_secret,
            "username": username,
            "password": password,
            "scope": row.scope or "openid profile email",
        }
        
        async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
            token_response = await client.post(token_url, data=token_data)
            
            if token_response.status_code != 200:
                error_detail = token_response.json().get("error_description", "Invalid credentials")
                raise HTTPException(status_code=401, detail=f"Login failed: {error_detail}")
            
            token_json = token_response.json()
            access_token = token_json.get("access_token")
            
            # Get userinfo
            userinfo_url = f"{row.server_url}/realms/{row.realm}/protocol/openid-connect/userinfo"
            ui_response = await client.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if ui_response.status_code == 200:
                userinfo = ui_response.json()
                return {
                    "success": True,
                    "username": userinfo.get("preferred_username", username),
                    "email": userinfo.get("email"),
                    "full_name": userinfo.get("name"),
                    "message": "Login test successful",
                }
            else:
                return {
                    "success": True,
                    "username": username,
                    "message": "Login successful but cannot get user info",
                }
    
    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Keycloak server timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
