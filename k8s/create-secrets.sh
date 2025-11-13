#!/bin/bash

# ==================================
# Create Kubernetes Secrets
# Helper script to generate and create secrets
# ==================================

set -e

NAMESPACE="${NAMESPACE:-antidetect}"

echo "========================================="
echo "Creating Kubernetes Secrets"
echo "Namespace: $NAMESPACE"
echo "========================================="

# Generate random secrets
echo "Generating secrets..."
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)
DB_USER="antidetect_user"
DB_NAME="antidetect"

# Create namespace if it doesn't exist
kubectl create namespace $NAMESPACE --dry-run=client -o yaml | kubectl apply -f -

# Create application secret
echo "Creating app-secret..."
kubectl create secret generic app-secret \
  --from-literal=jwt-secret="$JWT_SECRET" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Create database secret
echo "Creating db-secret..."
kubectl create secret generic db-secret \
  --from-literal=username="$DB_USER" \
  --from-literal=password="$DB_PASSWORD" \
  --from-literal=connection-string="postgresql://$DB_USER:$DB_PASSWORD@postgresql-service:5432/$DB_NAME" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Create Redis secret
echo "Creating redis-secret..."
kubectl create secret generic redis-secret \
  --from-literal=password="$REDIS_PASSWORD" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

# Optional: Create TLS secret (self-signed)
if [ "$CREATE_TLS" = "true" ]; then
  echo "Creating TLS certificate..."
  DOMAIN="${DOMAIN:-antidetect.example.com}"

  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /tmp/tls.key -out /tmp/tls.crt \
    -subj "/CN=$DOMAIN/O=Antidetect/C=US"

  kubectl create secret tls tls-secret \
    --cert=/tmp/tls.crt \
    --key=/tmp/tls.key \
    -n $NAMESPACE \
    --dry-run=client -o yaml | kubectl apply -f -

  rm -f /tmp/tls.key /tmp/tls.crt
  echo "TLS secret created!"
fi

echo ""
echo "========================================="
echo "Secrets created successfully!"
echo "========================================="
echo ""
echo "Generated credentials:"
echo "  JWT_SECRET: $JWT_SECRET"
echo "  DB_USER: $DB_USER"
echo "  DB_PASSWORD: $DB_PASSWORD"
echo "  REDIS_PASSWORD: $REDIS_PASSWORD"
echo ""
echo "IMPORTANT: Save these credentials securely!"
echo ""
echo "Verify secrets:"
echo "  kubectl get secrets -n $NAMESPACE"
echo ""
echo "========================================="
