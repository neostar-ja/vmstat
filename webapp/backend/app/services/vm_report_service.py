from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List
from datetime import datetime
import json

class VMReportService:
    @staticmethod
    def get_full_report(db: Session, vm_uuid: str, start_date: str, end_date: str, interval: str) -> Dict[str, Any]:
        """
        Retrieves the complete VM Intelligence Center report.
        """
        
        # This will be populated with all 6 categories of data
        result = {
            "snapshot": {},
            "performance": {"timeseries": []},
            "capacity": {},
            "optimization": {},
            "health": {},
            "operations": []
        }
        
        # 1. Snapshot (Basic Info + Current Usage)
        basic_info_query = text("""
            SELECT 
                vm.vm_uuid,
                vm.name,
                vm.power_state,
                g.group_name,
                h.host_name,
                vm.cpu_cores,
                vm.memory_total_mb,
                vm.storage_total_mb,
                vm.os_name
            FROM sangfor.vm_master vm
            LEFT JOIN sangfor.vm_group_master g ON vm.group_id = g.group_id
            LEFT JOIN sangfor.host_master h ON vm.host_id = h.host_id
            WHERE vm.vm_uuid = CAST(:vm_uuid AS uuid)
        """)
        basic_row = db.execute(basic_info_query, {"vm_uuid": vm_uuid}).fetchone()
        
        if not basic_row:
            return None # Return None if VM not found
            
        result["snapshot"] = {
            "vm_uuid": str(basic_row[0]),
            "vm_name": basic_row[1],
            "power_state": basic_row[2],
            "group_name": basic_row[3],
            "host_name": basic_row[4],
            "vcpu": basic_row[5],
            "vram_mb": basic_row[6],
            "disk_total_gb": round(basic_row[7] / 1024.0, 2) if basic_row[7] else 0,
            "os_name": basic_row[8]
        }
        
        # Get Latest Metrics for Snapshot Data
        snapshot_metrics = text("""
            SELECT 
                cpu_ratio * 100 as cpu_percent,
                memory_ratio * 100 as memory_percent,
                storage_ratio * 100 as disk_percent
            FROM metrics.vm_metrics
            WHERE vm_uuid = CAST(:vm_uuid AS uuid)
            ORDER BY collected_at DESC
            LIMIT 1
        """)
        snap_metric_row = db.execute(snapshot_metrics, {"vm_uuid": vm_uuid}).fetchone()
        if snap_metric_row:
            result["snapshot"]["cpu_usage_pct"] = round(snap_metric_row[0], 2)
            result["snapshot"]["memory_usage_pct"] = round(snap_metric_row[1], 2)
            result["snapshot"]["disk_usage_pct"] = round(snap_metric_row[2], 2)
        else:
            result["snapshot"]["cpu_usage_pct"] = 0
            result["snapshot"]["memory_usage_pct"] = 0
            result["snapshot"]["disk_usage_pct"] = 0

        # 2. Performance (Timeseries based on interval)
        if interval == 'day':
            # Use daily aggregates
            perf_query = text("""
                SELECT 
                    date::text as ts,
                    cpu_avg_percent as cpu_usage,
                    memory_avg_percent as memory_usage,
                    disk_avg_percent as disk_usage,
                    network_in_total_mb as net_rx,
                    network_out_total_mb as net_tx
                FROM vmreport.vm_resource_daily
                WHERE vm_uuid = CAST(:vm_uuid AS uuid)
                AND date >= CAST(:start_date AS date)
                AND date <= CAST(:end_date AS date)
                ORDER BY date ASC
            """)
        else:
            # Use raw metrics for hour/detailed
            perf_query = text("""
                SELECT 
                    date_trunc('hour', collected_at)::text as ts,
                    AVG(cpu_ratio * 100) as cpu_usage,
                    AVG(memory_ratio * 100) as memory_usage,
                    AVG(storage_ratio * 100) as disk_usage,
                    AVG(network_in_bytes / 1024.0 / 1024.0) as net_rx,
                    AVG(network_out_bytes / 1024.0 / 1024.0) as net_tx
                FROM metrics.vm_metrics
                WHERE vm_uuid = CAST(:vm_uuid AS uuid)
                AND collected_at >= CAST(:start_date AS timestamp)
                AND collected_at <= CAST(:end_date AS timestamp)
                GROUP BY 1
                ORDER BY 1 ASC
            """)
            
        perf_rows = db.execute(perf_query, {
            "vm_uuid": vm_uuid,
            "start_date": start_date,
            "end_date": end_date
        }).fetchall()
        
        result["performance"]["timeseries"] = [
            {
                "timestamp": row[0],
                "cpu_usage": round(row[1], 2) if row[1] else 0,
                "memory_usage": round(row[2], 2) if row[2] else 0,
                "disk_usage": round(row[3], 2) if row[3] else 0,
                "network_rx": round(row[4], 2) if row[4] else 0,
                "network_tx": round(row[5], 2) if row[5] else 0
            } for row in perf_rows
        ]

        # 3. Capacity
        cap_query = text("""
            SELECT 
                projection_type,
                current_usage_percent,
                growth_rate_per_day,
                days_until_full,
                estimated_full_date
            FROM vmreport.vm_capacity_projection
            WHERE vm_uuid = CAST(:vm_uuid AS uuid)
            AND projected_at >= NOW() - INTERVAL '24 hours'
        """)
        cap_rows = db.execute(cap_query, {"vm_uuid": vm_uuid}).fetchall()
        for row in cap_rows:
            result["capacity"][row[0]] = {
                "current_usage": float(row[1]),
                "growth_rate": float(row[2]),
                "days_until_full": row[3],
                "estimated_full_date": str(row[4]) if row[4] else None
            }

        # 4. Optimization & Health (from vm_health_score)
        health_query = text("""
            SELECT 
                health_score,
                risk_level,
                issues,
                recommendations,
                is_over_provisioned,
                is_idle
            FROM vmreport.vm_health_score
            WHERE vm_uuid = CAST(:vm_uuid AS uuid)
            ORDER BY evaluated_at DESC
            LIMIT 1
        """)
        health_row = db.execute(health_query, {"vm_uuid": vm_uuid}).fetchone()
        if health_row:
            result["health"] = {
                "score": health_row[0],
                "risk_level": health_row[1],
                "issues": health_row[2] if health_row[2] else []
            }
            result["optimization"] = {
                "is_over_provisioned": health_row[4],
                "is_idle": health_row[5],
                "recommendations": health_row[3] if health_row[3] else []
            }
            
        # 5. Operations / Audit Logs
        # Fetching basic operations logic or returning empty for now
        # To be expanded if there's a specific table for start/stop logs
        
        return result
