"""
Sangfor SCP Database Package

This package provides:
- Database schema for PostgreSQL
- Data ingestion from Sangfor SCP API
- Live query interface for real-time data
- Analytics and dashboard support
"""

from .ingest import SangforDataIngester, DatabaseConnection
from .live_query import SangforLiveQuery, SangforAPIClient

__all__ = [
    'SangforDataIngester',
    'DatabaseConnection', 
    'SangforLiveQuery',
    'SangforAPIClient'
]
