#!/bin/bash
echo "==============================================="
echo "🔍 Monitoring Login Attempts (Press Ctrl+C to stop)"
echo "==============================================="
echo ""
echo "Please try to login from the web interface now..."
echo ""

docker logs -f vmstat-backend 2>&1 | grep --line-buffered -E "(🔐|❌|✅|Login|401|Unauthorized)"
