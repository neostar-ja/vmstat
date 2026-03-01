"""
Materialized View Refresh Service
Auto-refresh analytics.mv_vm_overview every 5 minutes to keep data fresh
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from sqlalchemy import text
from ..database import SessionLocal

logger = logging.getLogger(__name__)


class MaterializedViewRefresher:
    """Service to periodically refresh materialized views"""
    
    def __init__(self, interval_minutes: int = 5):
        self.interval_minutes = interval_minutes
        self.running = False
        self._task = None
    
    async def start(self):
        """Start the refresh scheduler"""
        if self.running:
            logger.warning("Materialized view refresher already running")
            return
        
        self.running = True
        self._task = asyncio.create_task(self._refresh_loop())
        logger.info(f"🔄 Materialized view refresher started (interval: {self.interval_minutes}min)")
    
    async def stop(self):
        """Stop the refresh scheduler"""
        self.running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("⏹️  Materialized view refresher stopped")
    
    async def _refresh_loop(self):
        """Main refresh loop"""
        while self.running:
            try:
                await asyncio.sleep(self.interval_minutes * 60)  # Convert to seconds
                
                if not self.running:
                    break
                
                await self.refresh_now()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in refresh loop: {e}", exc_info=True)
                # Continue running even if one refresh fails
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def refresh_now(self):
        """Manually trigger a refresh"""
        logger.info("🔄 Refreshing materialized views ...")

        db = SessionLocal()
        try:
            # 1. Main VM overview MV (used by VMList, VMDetail)
            db.execute(text("REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.mv_vm_overview"))
            db.commit()
            logger.info("   ✅ mv_vm_overview refreshed")

            # 2. Dashboard summary MV (used by Dashboard consolidated endpoint)
            try:
                # Use regular REFRESH (not CONCURRENTLY) - MV is small, lock is brief
                db.execute(text("REFRESH MATERIALIZED VIEW analytics.mv_dashboard_summary"))
                db.commit()
                logger.info("   ✅ mv_dashboard_summary refreshed")
            except Exception as e:
                db.rollback()
                logger.warning(f"   ⚠️  mv_dashboard_summary not available (run migration): {e}")

            # 3. Top consumers MV (used by Dashboard Top CPU/Memory)
            try:
                # Use regular REFRESH (not CONCURRENTLY) - MV is small, lock is brief
                db.execute(text("REFRESH MATERIALIZED VIEW analytics.mv_top_consumers"))
                db.commit()
                logger.info("   ✅ mv_top_consumers refreshed")
            except Exception as e:
                db.rollback()
                logger.warning(f"   ⚠️  mv_top_consumers not available (run migration): {e}")

            logger.info("✅ All materialized views refreshed successfully")

        except Exception as e:
            logger.error(f"❌ Failed to refresh materialized views: {e}", exc_info=True)
            db.rollback()
        finally:
            db.close()


# Global instance
_refresher: MaterializedViewRefresher | None = None


def get_refresher() -> MaterializedViewRefresher:
    """Get the global refresher instance"""
    global _refresher
    if _refresher is None:
        _refresher = MaterializedViewRefresher(interval_minutes=5)
    return _refresher


async def start_refresher():
    """Start the refresher service"""
    refresher = get_refresher()
    await refresher.start()


async def stop_refresher():
    """Stop the refresher service"""
    refresher = get_refresher()
    await refresher.stop()


@asynccontextmanager
async def refresher_lifespan():
    """Context manager for use with FastAPI lifespan"""
    await start_refresher()
    try:
        yield
    finally:
        await stop_refresher()
