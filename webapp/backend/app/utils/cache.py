from functools import wraps
from typing import Any, Callable
import time
from cachetools import TTLCache

# In-memory cache for dashboard summary to prevent frequent db queries
# maxsize=10, ttl=60 (keep cache for 60 seconds)
dashboard_cache = TTLCache(maxsize=10, ttl=60)

def cache_response(ttl_seconds: int = 60, maxsize: int = 100):
    cache = TTLCache(maxsize=maxsize, ttl=ttl_seconds)
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> Any:
            # Create a cache key from function name and arguments
            # Note: We exclude 'db' and 'current_user' from the cache key as they are dynamic but the result might be global logic
            key_kwargs = {k: v for k, v in kwargs.items() if k not in ['db', 'current_user']}
            cache_key = f"{func.__name__}_{hash(frozenset(key_kwargs.items()))}"
            
            if cache_key in cache:
                return cache[cache_key]
                
            result = await func(*args, **kwargs)
            cache[cache_key] = result
            return result
        return wrapper
    return decorator
