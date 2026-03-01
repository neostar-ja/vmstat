"""
Sync V2 Service Module
Complete redesign of sync system
"""

from .service import SyncServiceV2
from .sangfor_client import SangforClient
from .db_handler import SyncDbHandler
from .scheduler import SyncScheduler

# Create singleton instance lazily
_sync_service_instance = None

def get_sync_service():
    global _sync_service_instance
    if _sync_service_instance is None:
        _sync_service_instance = SyncServiceV2()
    return _sync_service_instance

# For backward compatibility
sync_service_v2 = property(lambda self: get_sync_service())

__all__ = [
    'SyncServiceV2',
    'SangforClient',
    'SyncDbHandler',
    'SyncScheduler',
    'get_sync_service'
]
