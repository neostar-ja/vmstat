"""
AI Prediction Service - Prophet-based Datastore Capacity Forecasting
"""
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import text

logger = logging.getLogger(__name__)

# Try to import Prophet (optional dependency)
try:
    from prophet import Prophet
    PROPHET_AVAILABLE = True
except ImportError:
    PROPHET_AVAILABLE = False
    logger.warning("Prophet not installed. AI Prediction will use Linear Regression fallback.")


class AIPredictionService:
    """Service for AI-based capacity prediction using Prophet or Linear Regression"""
    
    def __init__(self, db: Session):
        self.db = db
        
    def get_historical_data(self, datastore_id: str, days: int = 90) -> pd.DataFrame:
        """Fetch historical usage data for a datastore"""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        
        query = text("""
            SELECT 
                -- Cast to timestamp without timezone to avoid tz-aware datetimes
                (time_bucket('1 day', collected_at) AT TIME ZONE 'UTC')::timestamp AS ds,
                AVG(used_mb) as y,
                AVG(total_mb) as total_mb
            FROM metrics.datastore_metrics
            WHERE datastore_id = :id
              AND collected_at >= :start_time
              AND collected_at <= :end_time
            GROUP BY ds
            ORDER BY ds ASC
        """)
        
        result = self.db.execute(query, {
            "id": datastore_id,
            "start_time": start_time,
            "end_time": end_time
        }).fetchall()
        
        if not result:
            return pd.DataFrame()
        
        data = []
        for row in result:
            data.append({
                'ds': row.ds,
                'y': float(row.y) if row.y else 0,
                'total_mb': float(row.total_mb) if row.total_mb else 0
            })
        
        return pd.DataFrame(data)
    
    def train_and_predict(
        self, 
        datastore_id: str, 
        historical_days: int = 90,
        forecast_days: int = 90
    ) -> Dict[str, Any]:
        """
        Train Prophet model and predict future capacity usage
        
        Returns:
            - forecast: List of predicted values with confidence intervals
            - summary: Risk analysis summary
            - seasonality: Weekly pattern data
        """
        # Get historical data
        df = self.get_historical_data(datastore_id, historical_days)
        
        # Minimum 3 days of data required for basic prediction
        min_days = 3
        if df.empty or len(df) < min_days:
            return {
                "success": False,
                "error": "insufficient_data",
                "message": f"ต้องการข้อมูลอย่างน้อย {min_days} วัน (มีอยู่ {len(df)} วัน)",
                "data_points": len(df)
            }
        
        # Debug: log PROPHET availability and raw df info
        logger.warning("PROPHET_AVAILABLE=%s", PROPHET_AVAILABLE)
        try:
            logger.warning("raw df columns=%s", df.columns.tolist())
            logger.warning("raw ds sample types=%s", [type(x).__name__ for x in df['ds'].head().tolist()])
        except Exception:
            logger.warning("raw df sampling failed")

        # Get current capacity
        total_capacity_mb = df['total_mb'].iloc[-1] if not df.empty else 0
        current_used_mb = df['y'].iloc[-1] if not df.empty else 0
        
        # Prepare data for Prophet
        prophet_df = df[['ds', 'y']].copy()
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'])
        # Ensure timezone-naive datetimes (Prophet expects naive datetimes without tz info)
        # Normalize to tz-naive pandas datetime64[ns] (Prophet requires tz-naive datetimes)
        prophet_df['ds'] = pd.to_datetime(prophet_df['ds'], utc=True).dt.tz_convert('UTC').dt.tz_localize(None)
        
        if PROPHET_AVAILABLE:
            return self._predict_with_prophet(
                prophet_df, 
                forecast_days, 
                total_capacity_mb, 
                current_used_mb
            )
        else:
            return self._predict_with_linear_regression(
                prophet_df, 
                forecast_days, 
                total_capacity_mb, 
                current_used_mb
            )
    
    def _predict_with_prophet(
        self, 
        df: pd.DataFrame, 
        forecast_days: int,
        total_capacity_mb: float,
        current_used_mb: float
    ) -> Dict[str, Any]:
        """Use Prophet for forecasting"""
        try:
            # Initialize Prophet model
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=False,
                changepoint_prior_scale=0.05,
                interval_width=0.95
            )
            
            # Debugging: log ds types and samples to troubleshoot timezone issues
            try:
                logger.info("prophet_df dtypes: %s", df.dtypes.to_dict())
                logger.info("prophet_df ds dtype: %s", str(df['ds'].dtype))
                logger.info("prophet_df sample ds values: %s", df['ds'].head().tolist())
            except Exception:
                logger.info("prophet_df: <failed to stringify>")
            
            # Fit model
            model.fit(df)
            
            # Create future dataframe
            future = model.make_future_dataframe(periods=forecast_days, freq='D')
            
            # Predict
            forecast = model.predict(future)
            
            # Ensure forecast ds is timezone-naive
            import pandas.api.types as ptypes
            if 'ds' in forecast.columns:
                # Normalize to tz-naive pandas datetime64[ns]
                forecast['ds'] = pd.to_datetime(forecast['ds'], utc=True).dt.tz_convert('UTC').dt.tz_localize(None)

            # Extract components
            components = model.predict_seasonal_components(future)
            # Debug: log components columns and sample
            try:
                logger.warning("components columns=%s", components.columns.tolist())
                logger.warning("components sample=%s", components.head().to_dict())
            except Exception:
                logger.warning("components: <failed to stringify>")

            # If components does not include 'ds' but forecast has 'ds', align them by position
            if 'ds' not in components.columns and 'ds' in forecast.columns and len(forecast) >= len(components):
                components = components.reset_index(drop=True)
                components['ds'] = forecast['ds'].reset_index(drop=True).iloc[:len(components)].values

            # Normalize components ds if present
            if 'ds' in components.columns:
                components['ds'] = pd.to_datetime(components['ds'], utc=True).dt.tz_convert('UTC').dt.tz_localize(None)

            days_until_full = None
            risk_score = 0
            predicted_full_date = None  # Ensure variable is defined even if capacity is not reached in forecast
            
            # Find when yhat exceeds capacity
            future_forecast = forecast[forecast['ds'] > df['ds'].max()]
            for idx, row in future_forecast.iterrows():
                if row['yhat'] >= total_capacity_mb:
                    predicted_full_date = row['ds'].isoformat()
                    days_until_full = (row['ds'] - datetime.now()).days
                    break
            
            # Calculate risk score (0-100)
            if days_until_full is not None:
                if days_until_full <= 30:
                    risk_score = 100  # Critical
                elif days_until_full <= 90:
                    risk_score = 75   # Warning
                elif days_until_full <= 180:
                    risk_score = 50   # Caution
                else:
                    risk_score = 25   # Safe
            else:
                risk_score = 10  # Very Safe
            
            # Calculate growth rate
            recent_forecast = forecast.tail(forecast_days)
            if len(recent_forecast) >= 2:
                growth_rate = (recent_forecast['yhat'].iloc[-1] - recent_forecast['yhat'].iloc[0]) / forecast_days
            else:
                growth_rate = 0

            # Sanity-check growth rate against a simple linear slope from historical data
            try:
                hist_df = df.copy()
                hist_df['x'] = range(len(hist_df))
                n = len(hist_df)
                sum_x = hist_df['x'].sum()
                sum_y = hist_df['y'].sum()
                sum_xy = (hist_df['x'] * hist_df['y']).sum()
                sum_xx = (hist_df['x'] ** 2).sum()
                denominator = n * sum_xx - sum_x * sum_x
                if denominator != 0:
                    lr_slope = (n * sum_xy - sum_x * sum_y) / denominator
                else:
                    lr_slope = 0
            except Exception:
                lr_slope = 0

            # If Prophet predicts an implausible growth (e.g., >10x linear slope and >1GB/day),
            # fall back to linear slope for growth rate and recompute predicted_full_date accordingly.
            if lr_slope is not None and lr_slope != 0:
                if (abs(growth_rate) > abs(lr_slope) * 10 and growth_rate > 1000):
                    logger.warning("Prophet growth_rate (%s) is implausible compared to linear slope (%s). Falling back to linear slope.", growth_rate, lr_slope)
                    growth_rate = lr_slope
                    # In this case, we consider the Prophet full-date estimate untrusted and clear it.
                    predicted_full_date = None
                    days_until_full = None
                    risk_score = 10
                    # Do not attempt to recompute a precise full date from the tiny linear slope (it would be astronomically far in future)
                    # Users should rely on linear growth_rate and 'Very Safe' risk level instead

            
            # Cross-check predicted_full_date with linear estimate
            try:
                if growth_rate > 0:
                    est_days_to_full = int((total_capacity_mb - current_used_mb) / growth_rate)
                    logger.warning("est_days_to_full=%s, days_until_full=%s, growth_rate=%s", est_days_to_full, days_until_full, growth_rate)
                    if days_until_full is not None and est_days_to_full is not None and abs(days_until_full - est_days_to_full) > 365:
                        logger.warning("Predicted_full_date days_until_full (%s) disagrees with linear estimate (%s); clearing predicted date.", days_until_full, est_days_to_full)
                        predicted_full_date = None
                        days_until_full = None
                        risk_score = 10
            except Exception:
                logger.warning("Failed to compute est_days_to_full", exc_info=True)
                pass

            # Detect anomalies using residuals
            historical_forecast = forecast[forecast['ds'] <= df['ds'].max()]
            merged = df.merge(historical_forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']], on='ds')
            merged['residual'] = merged['y'] - merged['yhat']
            
            # Anomaly if outside confidence interval
            anomalies = merged[(merged['y'] > merged['yhat_upper']) | (merged['y'] < merged['yhat_lower'])]
            
            # Weekly seasonality data
            weekly_pattern = []
            if 'weekly' in components.columns and 'ds' in components.columns:
                # Get average by day of week
                components['dow'] = components['ds'].dt.dayofweek
                weekly_avg = components.groupby('dow')['weekly'].mean()
                day_names = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
                for dow, val in weekly_avg.items():
                    weekly_pattern.append({
                        "day": day_names[dow],
                        "effect": round(float(val), 2)
                    })
            else:
                # Components did not include 'ds' or weekly seasonality
                weekly_pattern = []

            
            # Prepare response
            forecast_data = []
            for _, row in forecast.iterrows():
                forecast_data.append({
                    "ds": row['ds'].isoformat(),
                    "yhat": round(float(row['yhat']), 2),
                    "yhat_lower": round(float(row['yhat_lower']), 2),
                    "yhat_upper": round(float(row['yhat_upper']), 2),
                    "trend": round(float(row['trend']), 2),
                    "is_forecast": row['ds'] > df['ds'].max()
                })
            
            # Historical data with actual values
            actual_data = []
            for _, row in df.iterrows():
                actual_data.append({
                    "ds": row['ds'].isoformat(),
                    "actual": round(float(row['y']), 2)
                })
            
            logger.warning("FINAL prediction: predicted_full_date=%s, days_until_full=%s, risk_score=%s, growth_rate=%s", predicted_full_date, days_until_full, risk_score, growth_rate)
            return {
                "success": True,
                "model": "prophet",
                "datastore_id": str(df['ds'].iloc[0]) if not df.empty else None,
                "forecast_date": datetime.utcnow().isoformat(),
                "historical_days": len(df),
                "forecast_days": forecast_days,
                "capacity": {
                    "total_mb": round(total_capacity_mb, 2),
                    "current_used_mb": round(current_used_mb, 2),
                    "current_percent": round((current_used_mb / total_capacity_mb * 100), 1) if total_capacity_mb > 0 else 0
                },
                "prediction": {
                    "predicted_full_date": predicted_full_date,
                    "days_until_full": days_until_full,
                    "risk_score": risk_score,
                    "risk_level": self._get_risk_level(risk_score),
                    "growth_rate_mb_per_day": round(growth_rate, 2)
                },
                "forecast": forecast_data,
                "actual": actual_data,
                "seasonality": {
                    "weekly": weekly_pattern
                },
                "anomalies": [
                    {
                        "date": row['ds'].isoformat(),
                        "actual_mb": round(float(row['y']), 2),
                        "expected_mb": round(float(row['yhat']), 2),
                        "deviation_mb": round(float(row['residual']), 2)
                    }
                    for _, row in anomalies.iterrows()
                ]
            }
            
        except Exception as e:
            logger.exception("Prophet prediction error")
            return {
                "success": False,
                "error": "prediction_failed",
                "message": str(e)
            }
    
    def _predict_with_linear_regression(
        self, 
        df: pd.DataFrame, 
        forecast_days: int,
        total_capacity_mb: float,
        current_used_mb: float
    ) -> Dict[str, Any]:
        """Fallback to Linear Regression when Prophet is not available"""
        try:
            # Prepare data
            df = df.copy()
            df['x'] = range(len(df))
            
            # Linear regression
            n = len(df)
            sum_x = df['x'].sum()
            sum_y = df['y'].sum()
            sum_xy = (df['x'] * df['y']).sum()
            sum_xx = (df['x'] ** 2).sum()
            
            denominator = n * sum_xx - sum_x * sum_x
            if denominator != 0:
                slope = (n * sum_xy - sum_x * sum_y) / denominator
                intercept = (sum_y - slope * sum_x) / n
            else:
                slope = 0
                intercept = sum_y / n if n > 0 else 0
            
            # Calculate residuals for confidence interval
            df['predicted'] = slope * df['x'] + intercept
            df['residual'] = df['y'] - df['predicted']
            std_residual = df['residual'].std()
            
            # Generate forecast
            last_x = df['x'].max()
            last_date = df['ds'].max()
            
            forecast_data = []
            
            # Historical data
            for _, row in df.iterrows():
                yhat = slope * row['x'] + intercept
                forecast_data.append({
                    "ds": row['ds'].isoformat(),
                    "yhat": round(float(yhat), 2),
                    "yhat_lower": round(float(yhat - 1.96 * std_residual), 2),
                    "yhat_upper": round(float(yhat + 1.96 * std_residual), 2),
                    "trend": round(float(yhat), 2),
                    "is_forecast": False
                })
            
            # Future predictions
            predicted_full_date = None
            days_until_full = None
            
            for i in range(1, forecast_days + 1):
                x = last_x + i
                ds = last_date + timedelta(days=i)
                yhat = slope * x + intercept
                
                forecast_data.append({
                    "ds": ds.isoformat(),
                    "yhat": round(float(yhat), 2),
                    "yhat_lower": round(float(yhat - 1.96 * std_residual), 2),
                    "yhat_upper": round(float(yhat + 1.96 * std_residual), 2),
                    "trend": round(float(yhat), 2),
                    "is_forecast": True
                })
                
                # Check if capacity exceeded
                if yhat >= total_capacity_mb and predicted_full_date is None:
                    predicted_full_date = ds.isoformat()
                    days_until_full = i
            
            # Calculate risk score
            if days_until_full is not None:
                if days_until_full <= 30:
                    risk_score = 100
                elif days_until_full <= 90:
                    risk_score = 75
                elif days_until_full <= 180:
                    risk_score = 50
                else:
                    risk_score = 25
            else:
                risk_score = 10
            
            # Detect anomalies
            df['zscore'] = (df['residual'] - df['residual'].mean()) / std_residual if std_residual > 0 else 0
            anomalies = df[abs(df['zscore']) > 2]
            
            # Actual data
            actual_data = []
            for _, row in df.iterrows():
                actual_data.append({
                    "ds": row['ds'].isoformat(),
                    "actual": round(float(row['y']), 2)
                })
            
            return {
                "success": True,
                "model": "linear_regression",
                "forecast_date": datetime.utcnow().isoformat(),
                "historical_days": len(df),
                "forecast_days": forecast_days,
                "capacity": {
                    "total_mb": round(total_capacity_mb, 2),
                    "current_used_mb": round(current_used_mb, 2),
                    "current_percent": round((current_used_mb / total_capacity_mb * 100), 1) if total_capacity_mb > 0 else 0
                },
                "prediction": {
                    "predicted_full_date": predicted_full_date,
                    "days_until_full": days_until_full,
                    "risk_score": risk_score,
                    "risk_level": self._get_risk_level(risk_score),
                    "growth_rate_mb_per_day": round(slope, 2)
                },
                "forecast": forecast_data,
                "actual": actual_data,
                "seasonality": {
                    "weekly": []  # Linear regression doesn't capture seasonality
                },
                "anomalies": [
                    {
                        "date": row['ds'].isoformat(),
                        "actual_mb": round(float(row['y']), 2),
                        "expected_mb": round(float(row['predicted']), 2),
                        "deviation_mb": round(float(row['residual']), 2)
                    }
                    for _, row in anomalies.iterrows()
                ],
                "note": "Using Linear Regression (Prophet not available)"
            }
            
        except Exception as e:
            logger.exception("Linear regression prediction error")
            return {
                "success": False,
                "error": "prediction_failed",
                "message": str(e)
            }
    
    def _get_risk_level(self, score: int) -> str:
        """Convert risk score to human-readable level"""
        if score >= 90:
            return "critical"
        elif score >= 70:
            return "warning"
        elif score >= 40:
            return "caution"
        else:
            return "safe"


# Singleton-like function for easy access
def get_ai_prediction(db: Session, datastore_id: str, historical_days: int = 90, forecast_days: int = 90) -> Dict[str, Any]:
    """
    Get AI prediction for a datastore
    
    Args:
        db: Database session
        datastore_id: Datastore ID
        historical_days: Number of days of historical data to use
        forecast_days: Number of days to forecast
    
    Returns:
        Prediction results dictionary
    """
    service = AIPredictionService(db)
    return service.train_and_predict(datastore_id, historical_days, forecast_days)
