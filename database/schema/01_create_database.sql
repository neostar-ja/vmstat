-- ============================================================
-- Sangfor SCP Database Creation Script
-- Database: sangfor_scp
-- 
-- Description: Creates the database for Sangfor HCI VM monitoring
-- Compatible with: PostgreSQL 12+ (Native Partitioning)
-- TimescaleDB Ready: Can be upgraded to TimescaleDB in future
-- ============================================================

-- Run this as superuser or user with CREATEDB privilege
-- Before running, connect to postgres database first

-- Drop database if exists (optional, uncomment if needed)
-- DROP DATABASE IF EXISTS sangfor_scp;

-- Create the database
CREATE DATABASE sangfor_scp
    WITH 
    OWNER = apirak
    ENCODING = 'UTF8'
    LC_COLLATE = 'en_US.UTF-8'
    LC_CTYPE = 'en_US.UTF-8'
    TEMPLATE = template0
    CONNECTION LIMIT = -1;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE sangfor_scp TO apirak;

-- Connect to the new database
\c sangfor_scp

-- Create schema for organization
CREATE SCHEMA IF NOT EXISTS sangfor;
CREATE SCHEMA IF NOT EXISTS metrics;
CREATE SCHEMA IF NOT EXISTS analytics;

-- Grant usage on schemas
GRANT USAGE ON SCHEMA sangfor TO apirak;
GRANT USAGE ON SCHEMA metrics TO apirak;
GRANT USAGE ON SCHEMA analytics TO apirak;

-- Set default schema
ALTER ROLE apirak SET search_path TO sangfor, metrics, analytics, public;

COMMENT ON DATABASE sangfor_scp IS 'Sangfor SCP HCI Virtual Machine Monitoring Database';
COMMENT ON SCHEMA sangfor IS 'Static/Master data for VMs, Hosts, Storage, Networks';
COMMENT ON SCHEMA metrics IS 'Time-series metrics data with partitioning';
COMMENT ON SCHEMA analytics IS 'Aggregated analytics and materialized views';
