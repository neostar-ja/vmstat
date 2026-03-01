# Sangfor SCP VMStat - Virtual Machine Statistics & Management Platform

A comprehensive virtual machine monitoring and management platform for Sangfor SCP (Sangfor Cloud Platform) with modern web interface, real-time analytics, and AI-powered predictions.

## 🚀 Features

### Core Capabilities
- **Real-time VM Monitoring** - Track CPU, memory, disk, and network usage
- **Host Management** - Monitor physical hosts and resource allocation
- **Datastore Analytics** - Storage capacity planning with AI predictions
- **Alarm & Alert System** - Unified alarm monitoring and notifications
- **Executive Dashboard** - High-level insights for decision makers
- **Reports & Analytics** - Comprehensive reporting system
- **Mobile Responsive** - Optimized for mobile devices

### Advanced Features
- **AI-Powered Predictions** - Prophet-based forecasting for datastore capacity
- **Role-Based Access Control (RBAC)** - Secure multi-user access with roles
- **REST API** - Full-featured API for integrations
- **Auto Sync** - Scheduled synchronization with Sangfor SCP
- **Operation Logs** - Audit trail for all VM operations

## 📋 Prerequisites

- **Python 3.8+**
- **Node.js 18+** (for frontend)
- **PostgreSQL 14+**
- **Sangfor SCP** platform with API access

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/apirak-ja/vmstat.git
cd vmstat
```

### 2. Configure Environment Variables
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your credentials
nano .env
```

**Important:** Fill in all required variables in `.env`:
- Database credentials (PostgreSQL)
- Sangfor SCP API credentials
- Secret key for JWT authentication
- CORS origins

See [SECURITY.md](SECURITY.md) for detailed security setup instructions.

### 3. Database Setup
```bash
# Create database and schema
cd database
psql -U postgres -f schema/01_create_database.sql
psql -U postgres -d sangfor_scp -f schema/02_static_tables.sql
psql -U postgres -d sangfor_scp -f schema/03_metrics_tables.sql

# Or use the automated script
python -m database.ingest --init
```

### 4. Backend Setup
```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r database/requirements.txt
cd webapp/backend
pip install -r requirements.txt

# Start backend server
python -m app.main
```

Backend will run on `http://localhost:8000`

### 5. Frontend Setup
```bash
cd webapp/frontend

# Install dependencies
npm install

# Development mode
npm run dev

# Production build
npm run build
npm run preview
```

Frontend will run on `http://localhost:3345`

## 🔄 Data Synchronization

### Manual Sync
```bash
# Sync all data from Sangfor SCP
python connect.py

# Sync specific components
python connect_hosts.py
python connect_datastore.py
python connect_alarm.py
```

### Automatic Sync
Enable automatic synchronization in `.env`:
```bash
SYNC_AUTO_START=True
SYNC_INTERVAL_MINUTES=5
```

The backend will automatically sync data from Sangfor SCP at specified intervals.

## 🏗️ Project Structure

```
sangfor_scp/
├── database/              # Database schema and data ingestion
│   ├── schema/           # SQL schema files
│   ├── ingest.py         # Data ingestion module
│   └── requirements.txt
├── webapp/
│   ├── backend/          # FastAPI backend
│   │   ├── app/         # Application modules
│   │   │   ├── main.py
│   │   │   ├── config.py
│   │   │   ├── routers/
│   │   │   └── utils/
│   │   └── requirements.txt
│   └── frontend/         # React + TypeScript frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   └── services/
│       └── package.json
├── document/             # Documentation
├── connect*.py           # Sangfor API connector scripts
├── .env.example          # Environment variables template
├── .gitignore
├── SECURITY.md          # Security guidelines
└── README.md
```

## 🔐 Security

**IMPORTANT:** This project requires proper security configuration before deployment.

- All credentials are managed via environment variables
- Never commit `.env` file to version control
- Use strong passwords and rotate them regularly
- Enable SSL/HTTPS in production
- Follow the guidelines in [SECURITY.md](SECURITY.md)

## 📱 API Documentation

Once the backend is running, access the interactive API documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

### Example API Usage

```bash
# Login and get JWT token
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# Get VM list
curl "http://localhost:8000/sync/vms" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get AI prediction for datastore
curl "http://localhost:8000/sync/datastores/123/ai-prediction" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 👥 User Roles

The system supports role-based access control:

- **Super Admin** (Level 100) - Full system access
- **Admin** (Level 80) - VM management and monitoring
- **Operator** (Level 50) - VM operations only
- **Viewer** (Level 30) - Read-only access

## 📊 Key Features Details

### Executive Dashboard
- Overview of infrastructure health
- Resource utilization trends
- Cost analysis and optimization
- Quick access to critical metrics

### Alarm System
- Real-time alarm monitoring
- Multi-source alarm aggregation
- Custom alert thresholds
- Email/notification integration

### AI Predictions
- Prophet-based time series forecasting
- Datastore capacity planning
- Anomaly detection
- Seasonal pattern analysis

### Reports
- Scheduled report generation
- Customizable templates
- Export to PDF/Excel
- Email distribution

## 🛠️ Development

### Running Tests
```bash
# Backend tests
cd webapp/backend
pytest

# Frontend tests
cd webapp/frontend
npm test
```

### Code Quality
```bash
# Python linting
flake8 .
black .

# TypeScript checking
npm run lint
npm run type-check
```

## 📝 Documentation

Comprehensive documentation is available in the `document/` folder:

- [Comprehensive Manual](document/COMPREHENSIVE_MANUAL.md)
- [Alarm System Guide](document/ALARM_SYSTEM_GUIDE.md)
- [Executive Dashboard Guide](document/EXECUTIVE_DASHBOARD_GUIDE.md)
- [Datastore Dashboard Guide](document/DATASTORE_DASHBOARD_GUIDE.md)
- [Host Management Guide](document/HOST_MANAGEMENT_QUICK_GUIDE_TH.md)

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Ensure tests pass
5. Submit a pull request

## 📜 License

This project is proprietary software. All rights reserved.

## 👨‍💻 Author

**Apirak Jampamoon**
- GitHub: [@apirak-ja](https://github.com/apirak-ja)

## 🙏 Acknowledgments

- Sangfor Technologies for the SCP platform
- Prophet library for time series forecasting
- FastAPI and React communities

## 📞 Support

For issues and questions:
- Open an issue on GitHub
- Check existing documentation
- Review [SECURITY.md](SECURITY.md) for security concerns

---

**⚠️ Security Notice:** Always review and secure your deployment before exposing to production. Never commit sensitive credentials to version control.

**Version:** 1.0.0  
**Last Updated:** March 1, 2026
