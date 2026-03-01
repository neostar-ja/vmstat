"""
User model for authentication
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from ..database import Base

class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    role = Column(String(20), default="viewer")  # admin, manager, viewer
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserVMPermission(Base):
    __tablename__ = "user_vm_permissions"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    vm_uuid = Column(String(50), nullable=True)  # NULL = all VMs or use group
    group_id = Column(String(50), nullable=True)  # Assign by group
    permission_level = Column(String(20), default="view")  # view, manage
    created_at = Column(DateTime(timezone=True), server_default=func.now())
