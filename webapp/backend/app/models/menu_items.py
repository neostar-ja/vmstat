"""
Menu Item and Role Menu Permission models for RBAC Menu System
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base


class MenuItem(Base):
    """Menu/Page/Tab items in the system"""
    __tablename__ = "menu_items"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    path = Column(String(255), nullable=False)
    icon = Column(String(50))
    parent_id = Column(Integer, ForeignKey("webapp.menu_items.id", ondelete="SET NULL"), nullable=True)
    menu_type = Column(String(20), default="menu")  # menu, tab, page
    order = Column(Integer, default=0)
    is_visible = Column(Boolean, default=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    parent = relationship("MenuItem", remote_side=[id], backref="children")
    role_permissions = relationship("RoleMenuPermission", back_populates="menu_item", cascade="all, delete-orphan")


class RoleMenuPermission(Base):
    """Role-to-MenuItem permission mapping"""
    __tablename__ = "role_menu_permissions"
    __table_args__ = {"schema": "webapp"}
    
    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("webapp.roles.id", ondelete="CASCADE"), nullable=False)
    menu_item_id = Column(Integer, ForeignKey("webapp.menu_items.id", ondelete="CASCADE"), nullable=False)
    can_view = Column(Boolean, default=True)
    can_edit = Column(Boolean, default=False)
    can_delete = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    menu_item = relationship("MenuItem", back_populates="role_permissions")
