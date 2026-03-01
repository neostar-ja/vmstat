#!/bin/bash
set -e

# Directory for SSL certs
SSL_DIR="frontend/ssl"
mkdir -p $SSL_DIR

echo "🔐 Generating Self-Signed SSL Certificates for 10.251.150.222..."

# Generate private key and certificate in one go
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout $SSL_DIR/server.key \
  -out $SSL_DIR/server.crt \
  -subj "/C=TH/ST=Bangkok/L=Bangkok/O=Sangfor/OU=IT/CN=10.251.150.222" \
  -addext "subjectAltName=IP:10.251.150.222"

echo "✅ Certificates created in $SSL_DIR"
echo "   - server.key (Private Key)"
echo "   - server.crt (Public Certificate)"

# Set permissions
chmod 600 $SSL_DIR/server.key
chmod 644 $SSL_DIR/server.crt
