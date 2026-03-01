import api from './api';

export interface Datastore {
    datastore_id: string;
    name: string;
    description: string;
    az_id: string | null;
    az_name: string | null;
    type: string;
    status: string;
    total_mb: number;
    used_mb: number;
    free_mb: number;
    ratio: number;
    backup_enable: number;
    backup_total_mb: number;
    backup_used_mb: number;
    backup_ratio: number;
    archive_usable: number;
    shared: number;
    connected_hosts: number;
    storage_tag_id: string;
    target: string;
    read_byteps: number;
    write_byteps: number;
    max_read_byteps: number;
    max_write_byteps: number;
    is_active: boolean;
    first_seen_at: string | null;
    last_seen_at: string | null;
    updated_at: string | null;
}

export interface DatastoreStats {
    total_count: number;
    online_count: number;
    offline_count: number;
    total_storage_mb: number;
    total_used_mb: number;
    total_free_mb: number;
    usage_ratio: number;
    by_type: {
        type: string;
        count: number;
        total_mb: number;
        used_mb: number;
        free_mb: number;
    }[];
}

export interface DatastoreMetricPoint {
    timestamp: string;
    total_mb: number;
    used_mb: number;
    free_mb: number;
    ratio: number;
    read_byteps: number;
    write_byteps: number;
    connected_hosts: number;
    sample_count: number;
}

export interface DatastoreMetricsResponse {
    datastore_id: string;
    time_range: string;
    interval: string;
    metrics: DatastoreMetricPoint[];
    total_samples: number;
}

export const datastoresApi = {
    getAll: async (): Promise<{ data: Datastore[]; total: number }> => {
        const response = await api.get('/sync/datastores');
        return response.data;
    },

    getStats: async (): Promise<{ data: DatastoreStats }> => {
        const response = await api.get('/sync/datastores/stats');
        return response.data;
    },

    getById: async (id: string): Promise<{ data: Datastore }> => {
        const response = await api.get(`/sync/datastores/${id}`);
        return response.data;
    },

    getMetrics: async (id: string, timeRange: string = '1d', startDate?: string, endDate?: string): Promise<{ data: DatastoreMetricsResponse }> => {
        const params: any = { time_range: timeRange };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;

        const response = await api.get(`/sync/datastores/${id}/metrics`, {
            params
        });
        return response.data;
    },

    getAnalytics: async (id: string, days: number = 30): Promise<{ data: DatastoreAnalytics }> => {
        const response = await api.get(`/sync/datastores/${id}/analytics`, {
            params: { days }
        });
        return response.data;
    },

    getAIPrediction: async (id: string, historicalDays: number = 90, forecastDays: number = 90): Promise<{ data: AIPredictionResponse }> => {
        const response = await api.get(`/sync/datastores/${id}/ai-prediction`, {
            params: { 
                historical_days: historicalDays,
                forecast_days: forecastDays
            }
        });
        return response.data;
    }
};

export interface AIPredictionResponse {
    success: boolean;
    model?: string;
    error?: string;
    message?: string;
    forecast_date?: string;
    historical_days?: number;
    forecast_days?: number;
    capacity?: {
        total_mb: number;
        current_used_mb: number;
        current_percent: number;
    };
    prediction?: {
        predicted_full_date: string | null;
        days_until_full: number | null;
        risk_score: number;
        risk_level: 'critical' | 'warning' | 'caution' | 'safe';
        growth_rate_mb_per_day: number;
    };
    forecast?: {
        ds: string;
        yhat: number;
        yhat_lower: number;
        yhat_upper: number;
        trend: number;
        is_forecast: boolean;
    }[];
    actual?: {
        ds: string;
        actual: number;
    }[];
    seasonality?: {
        weekly: {
            day: string;
            effect: number;
        }[];
    };
    anomalies?: {
        date: string;
        actual_mb: number;
        expected_mb: number;
        deviation_mb: number;
    }[];
}

export interface DatastoreAnalytics {
    datastore_id: string;
    period_days: number;
    current_usage: {
        total_mb: number;
        used_mb: number;
        free_mb: number;
        percent: number;
    };
    growth_trend: {
        rate_mb_per_day: number;
        direction: 'increasing' | 'decreasing' | 'stable';
        r_squared: number;
    };
    prediction: {
        days_until_full: number | null;
        estimated_full_date: string | null;
    };
    volatility: {
        score: number;
        anomalies: {
            date: string;
            change_mb: number;
            deviation: number;
        }[];
    };
    points: {
        date: string;
        actual_used_mb: number;
        trend_used_mb: number;
    }[];
}

export default datastoresApi;

