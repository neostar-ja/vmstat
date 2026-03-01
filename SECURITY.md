# Security Guidelines - Sangfor SCP VMStat

## 🔒 Security Improvements Implemented

This project has been reviewed and secured before being published to GitHub. The following security measures have been implemented:

### 1. Removed Hardcoded Credentials
All hardcoded passwords, database credentials, and API keys have been removed from the source code and moved to environment variables.

**Files that were secured:**
- `check_and_ingest.py` - Removed database credentials
- `apply_alarm_migration.py` - Removed database credentials  
- `query_db_direct.py` - Removed database credentials
- `webapp/backend/app/check_pw.py` - Removed test password

### 2. Environment Variables
All sensitive configuration is now managed through environment variables. See `.env.example` for the complete list of required variables.

**Required Environment Variables:**
```bash
# Database
pgSQL_HOST=your_host
pgSQL_HOST_PORT=your_port
pgSQL_DBNAME=your_database
pgSQL_USERNAME=your_username
pgSQL_PASSWORD=your_password

# Sangfor API
SCP_IP=your_sangfor_ip
SCP_USERNAME=your_sangfor_username
SCP_PASSWORD=your_sangfor_password
SCP_TOKEN=your_api_token

# Security
SECRET_KEY=your_secret_key_here
```

### 3. .gitignore Protection
The `.gitignore` file has been configured to prevent sensitive files from being committed:
- Environment files (`.env`, `.env.*`)
- SSL certificates and keys
- Data output files (JSON, CSV)
- Database dumps
- Logs

## 🚀 Setup Instructions

### Initial Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/apirak-ja/vmstat.git
   cd vmstat
   ```

2. **Create your environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and fill in your actual credentials:**
   ```bash
   nano .env  # or use your preferred editor
   ```

4. **Generate a secure SECRET_KEY for production:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```
   Copy the output and set it as your `SECRET_KEY` in `.env`

5. **Set proper permissions on the .env file:**
   ```bash
   chmod 600 .env
   ```

## ⚠️ Security Best Practices

### For Developers

1. **NEVER commit sensitive data:**
   - Always check files before committing with `git diff`
   - Use `git status` to verify what will be committed
   - Never disable `.gitignore` rules

2. **Use environment variables:**
   - All credentials must be in `.env` file
   - Never hardcode passwords in source code
   - Use `os.getenv()` to read environment variables

3. **Rotate credentials regularly:**
   - Change database passwords periodically
   - Rotate API tokens
   - Update SECRET_KEY when necessary

4. **Review before pushing:**
   ```bash
   # Check what will be committed
   git status
   git diff --staged
   
   # Search for potential secrets
   git grep -i password
   git grep -i secret
   git grep -i api_key
   ```

### For Production Deployment

1. **Use strong passwords:**
   - Minimum 16 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Avoid common words or patterns

2. **Secure your .env file:**
   ```bash
   chmod 600 .env
   chown app_user:app_group .env
   ```

3. **Use HTTPS/SSL:**
   - Always use SSL certificates in production
   - Configure proper CORS origins
   - Use secure cookies for sessions

4. **Database security:**
   - Use separate database users with minimal privileges
   - Enable SSL for database connections
   - Regular backups and security patches

5. **Monitor and audit:**
   - Enable application logging
   - Monitor for suspicious activities
   - Regular security audits

## 🔍 Security Checklist

Before deploying or pushing code, verify:

- [ ] No passwords in source code
- [ ] No API keys in source code  
- [ ] No hardcoded IP addresses (use env vars)
- [ ] `.env` file is in `.gitignore`
- [ ] `.env.example` has no real credentials
- [ ] SSL certificates are not committed
- [ ] Data files with sensitive info are ignored
- [ ] SECRET_KEY is strong and unique
- [ ] Database credentials are secure
- [ ] CORS origins are properly configured

## 📞 Reporting Security Issues

If you discover a security vulnerability, please:
1. **DO NOT** open a public GitHub issue
2. Contact the maintainers privately
3. Provide detailed information about the vulnerability
4. Allow time for the issue to be addressed before public disclosure

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Best Practices](https://python.readthedocs.io/en/latest/library/security_warnings.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)

---

**Last Updated:** March 1, 2026  
**Version:** 1.0.0
