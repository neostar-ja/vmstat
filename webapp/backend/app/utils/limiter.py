"""
Shared Rate Limiter instance for use across all routers
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Global limiter instance - referenced by main.py and routers
limiter = Limiter(key_func=get_remote_address)
