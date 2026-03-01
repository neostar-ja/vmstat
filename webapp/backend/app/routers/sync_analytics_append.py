
@router.get("/datastores/{datastore_id}/analytics")
async def get_datastore_analytics(
    datastore_id: str,
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed analytics for a datastore:
    - Growth Trend (Linear Regression)
    - Predictive Exhaustion (Days until full)
    - Volatility (Standard Deviation)
    """
    from sqlalchemy import text
    from datetime import datetime, timedelta
    import math

    end_time = datetime.utcnow()
    start_time = end_time - timedelta(days=days)

    # 1. Fetch daily usage data
    query = text("""
        SELECT 
            time_bucket('1 day', collected_at) AS bucket,
            AVG(total_mb) as avg_total_mb,
            AVG(used_mb) as avg_used_mb
        FROM metrics.datastore_metrics
        WHERE datastore_id = :id
          AND collected_at >= :start_time
          AND collected_at <= :end_time
        GROUP BY bucket
        ORDER BY bucket ASC
    """)

    result = db.execute(query, {
        "id": datastore_id,
        "start_time": start_time,
        "end_time": end_time
    }).fetchall()

    if not result or len(result) < 2:
        return {
            "data": {
                "datastore_id": datastore_id,
                "insufficient_data": True,
                "message": "Need at least 2 days of data for analytics"
            }
        }

    # Prepare data for calculations
    data_points = []
    total_capacity_mb = 0
    current_used_mb = 0
    
    # Calculate daily changes
    daily_changes = []
    previous_used = None

    for i, row in enumerate(result):
        used = float(row.avg_used_mb) if row.avg_used_mb else 0
        total = float(row.avg_total_mb) if row.avg_total_mb else 0
        
        # Keep latest capacity
        if i == len(result) - 1:
            total_capacity_mb = total
            current_used_mb = used

        # For regression: x = day index, y = used_mb
        data_points.append((i, used))
        
        # Daily change
        if previous_used is not None:
            change = used - previous_used
            daily_changes.append(change)
        previous_used = used

    # 2. Linear Regression (Least Squares)
    # y = mx + c
    n = len(data_points)
    sum_x = sum(p[0] for p in data_points)
    sum_y = sum(p[1] for p in data_points)
    sum_xy = sum(p[0] * p[1] for p in data_points)
    sum_xx = sum(p[0] * p[0] for p in data_points)

    if (n * sum_xx - sum_x * sum_x) != 0:
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x)
        intercept = (sum_y - slope * sum_x) / n
    else:
        slope = 0
        intercept = sum_y / n

    growth_rate_mb_per_day = slope

    # 3. Predictive Exhaustion
    days_until_full = None
    predicted_full_date = None
    
    if growth_rate_mb_per_day > 0:
        remaining_mb = total_capacity_mb - current_used_mb
        days_until_full = remaining_mb / growth_rate_mb_per_day
        if days_until_full < 3650:  # Cap at 10 years
            predicted_full_date = (end_time + timedelta(days=days_until_full)).isoformat()

    # 4. Volatility (Standard Deviation of Daily Changes)
    volatility_score = 0
    anomaly_days = []
    
    if daily_changes:
        mean_change = sum(daily_changes) / len(daily_changes)
        variance = sum((x - mean_change) ** 2 for x in daily_changes) / len(daily_changes)
        std_dev = math.sqrt(variance)
        volatility_score = std_dev

        # Find anomalies (change > 2 * std_dev)
        # We match changes back to dates (daily_changes index i corresponds to result index i+1)
        limit = 2 * std_dev if std_dev > 0 else 0
        if limit > 0:
            for i, change in enumerate(daily_changes):
                if abs(change - mean_change) > limit:
                    date_idx = i + 1
                    if date_idx < len(result):
                         anomaly_days.append({
                             "date": result[date_idx].bucket.isoformat(),
                             "change_mb": change,
                             "deviation": round(abs(change - mean_change) / std_dev, 1)
                         })

    return {
        "data": {
            "datastore_id": datastore_id,
            "period_days": days,
            "current_usage": {
                "total_mb": total_capacity_mb,
                "used_mb": current_used_mb,
                "free_mb": total_capacity_mb - current_used_mb,
                "percent": round((current_used_mb / total_capacity_mb * 100), 2) if total_capacity_mb > 0 else 0
            },
            "growth_trend": {
                "rate_mb_per_day": round(growth_rate_mb_per_day, 2),
                "direction": "increasing" if slope > 1 else ("decreasing" if slope < -1 else "stable"),
                "r_squared": 0 # Not calculating R^2 for simplicity
            },
            "prediction": {
                "days_until_full": round(days_until_full, 1) if days_until_full else None,
                "estimated_full_date": predicted_full_date
            },
            "volatility": {
                "score": round(volatility_score, 2), # StdDev of daily changes
                "anomalies": anomaly_days
            },
            "points": [
                {
                    "date": result[i].bucket.isoformat(),
                    "actual_used_mb": round(p[1], 2),
                    "trend_used_mb": round(slope * p[0] + intercept, 2)
                }
                for i, p in enumerate(data_points)
            ]
        }
    }
