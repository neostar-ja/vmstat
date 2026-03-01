#!/usr/bin/env python3
"""
Sangfor SCP Scheduler

Schedule periodic data collection from Sangfor SCP API.
Can run as a daemon or scheduled task.

Usage:
    python scheduler.py --interval 300  # Run every 5 minutes
    python scheduler.py --once          # Run once and exit
"""

import argparse
import json
import os
import signal
import sys
import time
from datetime import datetime
from typing import Any, Dict

from dotenv import load_dotenv

from database.ingest import SangforDataIngester
from database.live_query import SangforLiveQuery

# Load environment variables
load_dotenv()


class SangforScheduler:
    """
    Scheduler for periodic data collection.
    """
    
    def __init__(self, interval_seconds: int = 300):
        self.interval = interval_seconds
        self.running = False
        self.ingester = SangforDataIngester()
        self.live_query = SangforLiveQuery()
        
        # Setup signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        print(f"\nReceived signal {signum}, shutting down...")
        self.running = False
    
    def collect_once(self) -> Dict[str, Any]:
        """
        Perform a single data collection.
        
        Returns:
            Collection statistics
        """
        print(f"\n[{datetime.now().isoformat()}] Starting data collection...")
        
        try:
            # Get data from API
            vms = self.live_query.get_all_vms()
            
            if not vms:
                return {"error": "Failed to fetch VMs from API"}
            
            # Prepare data structure
            data = {
                "metadata": {
                    "timestamp": datetime.now().isoformat(),
                    "total_servers": len(vms),
                    "source": f"Sangfor SCP ({os.getenv('SCP_IP', 'unknown')})",
                    "generated_by": "scheduler.py"
                },
                "servers": vms
            }
            
            # Ingest data
            stats = self.ingester.ingest_data(data)
            
            print(f"[{datetime.now().isoformat()}] Collection complete:")
            print(f"  - Batch ID: {stats['batch_id']}")
            print(f"  - Total VMs: {stats['total_vms']}")
            print(f"  - Inserted: {stats['vms_inserted']}")
            print(f"  - Updated: {stats['vms_updated']}")
            print(f"  - Metrics: {stats['metrics_inserted']}")
            print(f"  - Alarms: {stats['alarms_inserted']}")
            
            if stats['errors']:
                print(f"  - Errors: {len(stats['errors'])}")
            
            return stats
            
        except Exception as e:
            error_msg = f"Collection failed: {str(e)}"
            print(f"[{datetime.now().isoformat()}] {error_msg}")
            return {"error": error_msg}
    
    def run(self):
        """
        Run the scheduler continuously.
        """
        self.running = True
        print(f"Sangfor SCP Scheduler started")
        print(f"Collection interval: {self.interval} seconds ({self.interval / 60:.1f} minutes)")
        print("Press Ctrl+C to stop\n")
        
        while self.running:
            # Collect data
            self.collect_once()
            
            # Wait for next interval
            if self.running:
                print(f"\nNext collection in {self.interval} seconds...")
                
                # Use a loop to check running flag more frequently
                for _ in range(self.interval):
                    if not self.running:
                        break
                    time.sleep(1)
        
        print("Scheduler stopped")


def main():
    parser = argparse.ArgumentParser(
        description="Sangfor SCP Data Collection Scheduler"
    )
    parser.add_argument(
        "--interval", "-i",
        type=int,
        default=300,
        help="Collection interval in seconds (default: 300 = 5 minutes)"
    )
    parser.add_argument(
        "--once", "-o",
        action="store_true",
        help="Run once and exit"
    )
    parser.add_argument(
        "--json", "-j",
        action="store_true",
        help="Output results as JSON"
    )
    
    args = parser.parse_args()
    
    scheduler = SangforScheduler(interval_seconds=args.interval)
    
    if args.once:
        stats = scheduler.collect_once()
        if args.json:
            print(json.dumps(stats, indent=2, default=str))
        sys.exit(0 if "error" not in stats else 1)
    else:
        scheduler.run()


if __name__ == "__main__":
    main()
