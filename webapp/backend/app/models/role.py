"""
Role and Permission models for RBAC
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class Role(Base):
    """Role definition with permissions"""
    __tablename__ = "roles"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    description = Column(Text)
    level = Column(Integer, default=1)  # Higher = more permissions
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Permission(Base):
    """Individual permission definition"""
    __tablename__ = "permissions"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    category = Column(String(50))  # users, vms, system, reports
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RolePermission(Base):
    """Many-to-many relationship between roles and permissions"""
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("webapp.roles.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("webapp.permissions.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
