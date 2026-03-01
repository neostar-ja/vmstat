-- ============================================================
-- Sangfor SCP Database - Full Installation Script
-- 
-- Run this script to install the complete database schema
-- This combines all individual SQL files in the correct order
-- ============================================================

-- Usage (from command line):
-- psql -h <host> -p <port> -U postgres -f install.sql
-- 
-- Or if database already exists:
-- psql -h <host> -p <port> -U apirak -d sangfor_scp -f install.sql

\echo '============================================================'
\echo 'Sangfor SCP Database Installation'
\echo 'Starting installation...'
\echo '============================================================'

-- Check if we're connected to the right database
\echo ''
\echo 'Current database:'
SELECT current_database();

-- Include schema files in order
\echo ''
\echo '>>> Creating schemas...'
CREATE SCHEMA IF NOT EXISTS sangfor;
CREATE SCHEMA IF NOT EXISTS metrics;
CREATE SCHEMA IF NOT EXISTS analytics;

\echo ''
\echo '>>> Loading static tables (02_static_tables.sql)...'
\i schema/02_static_tables.sql

\echo ''
\echo '>>> Loading metrics tables (03_metrics_tables.sql)...'
\i schema/03_metrics_tables.sql

\echo ''
\echo '>>> Loading functions (04_functions.sql)...'
\i schema/04_functions.sql

\echo ''
\echo '>>> Loading views (05_views.sql)...'
\i schema/05_views.sql

\echo ''
\echo '>>> Loading maintenance procedures (06_maintenance.sql)...'
\i schema/06_maintenance.sql

\echo ''
\echo '>>> Loading Grafana views (07_grafana_views.sql)...'
\i schema/07_grafana_views.sql

\echo ''
\echo '>>> Loading datastore dashboard settings (14_datastore_dashboard.sql)...'
\i schema/14_datastore_dashboard.sql

\echo ''
\echo '============================================================'
\echo 'Installation Complete!'
\echo '============================================================'

-- Show summary
\echo ''
\echo '>>> Tables created:'
SELECT schemaname, count(*) as table_count 
FROM pg_tables 
WHERE schemaname IN ('sangfor', 'metrics', 'analytics')
GROUP BY schemaname
ORDER BY schemaname;

\echo ''
\echo '>>> Functions created:'
SELECT n.nspname as schema, count(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname IN ('sangfor', 'metrics', 'analytics')
GROUP BY n.nspname
ORDER BY n.nspname;

\echo ''
\echo '>>> Views created:'
SELECT schemaname, count(*) as view_count 
FROM pg_views 
WHERE schemaname IN ('sangfor', 'metrics', 'analytics')
GROUP BY schemaname
ORDER BY schemaname;

\echo ''
\echo 'Done!'
