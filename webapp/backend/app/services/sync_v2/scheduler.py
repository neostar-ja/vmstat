"""
Sync Scheduler
APScheduler-based job scheduling for automatic sync
"""

import logging
import threading
from typing import Optional, Callable
from datetime import datetime, timedelta
from uuid import UUID

logger = logging.getLogger(__name__)


class SyncScheduler:
    """
    Scheduler for automatic sync jobs
    Uses threading for lightweight scheduling
    """
    
    def __init__(self, sync_callback: Callable[[], None]):
        self.sync_callback = sync_callback
        self._running = False
        self._interval_minutes = 5
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._last_run_at: Optional[datetime] = None
        self._next_run_at: Optional[datetime] = None
        self._total_runs = 0
        self._successful_runs = 0
        self._failed_runs = 0
    
    @property
    def is_running(self) -> bool:
        return self._running
    
    @property
    def interval_minutes(self) -> int:
        return self._interval_minutes
    
    @property
    def status(self) -> dict:
        return {
            "is_running": self._running,
            "interval_minutes": self._interval_minutes,
            "last_run_at": self._last_run_at.isoformat() if self._last_run_at else None,
            "next_run_at": self._next_run_at.isoformat() if self._next_run_at else None,
            "total_runs": self._total_runs,
            "successful_runs": self._successful_runs,
            "failed_runs": self._failed_runs
        }
    
    def start(self, interval_minutes: int = 5) -> dict:
        """Start the scheduler"""
        if self._running:
            return {"success": False, "message": "Scheduler already running"}
        
        self._interval_minutes = interval_minutes
        self._running = True
        self._stop_event.clear()
        
        # Calculate next run
        self._next_run_at = datetime.utcnow() + timedelta(minutes=interval_minutes)
        
        # Start scheduler thread
        self._thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self._thread.start()
        
        logger.info(f"🚀 Scheduler started with {interval_minutes} minute interval")
        
        return {
            "success": True,
            "message": f"Scheduler started with {interval_minutes} minute interval",
            "next_run_at": self._next_run_at.isoformat()
        }
    
    def stop(self) -> dict:
        """Stop the scheduler"""
        if not self._running:
            return {"success": False, "message": "Scheduler not running"}
        
        self._running = False
        self._stop_event.set()
        self._next_run_at = None
        
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        
        logger.info("🛑 Scheduler stopped")
        
        return {"success": True, "message": "Scheduler stopped"}
    
    def _run_scheduler(self):
        """Background scheduler loop"""
        while self._running and not self._stop_event.is_set():
            try:
                # Wait for interval
                wait_seconds = self._interval_minutes * 60
                
                # Use stop event with timeout for graceful shutdown
                if self._stop_event.wait(timeout=wait_seconds):
                    break  # Stop event was set
                
                if not self._running:
                    break
                
                # Execute sync
                logger.info("⏰ Scheduled sync triggered")
                self._last_run_at = datetime.utcnow()
                self._total_runs += 1
                
                try:
                    self.sync_callback()
                    self._successful_runs += 1
                except Exception as e:
                    logger.error(f"Scheduled sync failed: {e}")
                    self._failed_runs += 1
                
                # Calculate next run
                self._next_run_at = datetime.utcnow() + timedelta(minutes=self._interval_minutes)
                
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
    
    def update_interval(self, interval_minutes: int) -> dict:
        """Update scheduler interval"""
        self._interval_minutes = interval_minutes
        
        if self._running:
            # Restart with new interval
            self.stop()
            return self.start(interval_minutes)
        
        return {
            "success": True,
            "message": f"Interval updated to {interval_minutes} minutes"
        }
