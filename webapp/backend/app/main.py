""" 
Sangfor VM Management API - Main Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from .utils.limiter import limiter

from .config import get_settings
from .routers import auth_router, vms_router, dashboard_router, admin_router, sync_router, metrics_router, alarms_router, hosts_router, menu_permissions_router, keycloak_router, admin_vms_router, vm_control_router, vmreport_router, vm_report_router
from .services.sync_service import sync_service
from .services.mv_refresher import get_refresher

settings = get_settings()



@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    print(f"🚀 Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print("ℹ️  Scheduler must be started from Admin Settings page")
    print("ℹ️  No auto-start from environment variables")
    
    # Start materialized view refresher
    print("🔄 Starting materialized view auto-refresh (5 min interval)...")
    try:
        refresher = get_refresher()
        await refresher.start()
        print("✅ Materialized view refresher started")
    except Exception as e:
        print(f"⚠️  Failed to start MV refresher: {e}")
    
    yield
    
    # Stop refresher on shutdown
    try:
        refresher = get_refresher()
        await refresher.stop()
    except Exception as e:
        print(f"⚠️  Error stopping MV refresher: {e}")
    
    # Stop scheduler on shutdown
    if sync_service._scheduler_running:
        sync_service.stop_scheduler()
    print("👋 Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="API for Sangfor SCP VM Management",
    root_path="/vmstat/api",  # For nginx proxy
    lifespan=lifespan
)

# Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(vms_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(sync_router)
app.include_router(metrics_router)
app.include_router(alarms_router)
app.include_router(hosts_router)
app.include_router(menu_permissions_router)
app.include_router(keycloak_router)
app.include_router(admin_vms_router)
app.include_router(vm_control_router)
app.include_router(vmreport_router)
app.include_router(vm_report_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "version": settings.APP_VERSION}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.APP_VERSION,
        "docs": "/vmstat/api/docs"
    }
