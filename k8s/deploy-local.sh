#!/bin/bash

# ==================================
# Local Kubernetes Deployment Script
# Deploy to minikube or kind
# ==================================

set -e

NAMESPACE="antidetect"

echo "========================================="
echo "Local Kubernetes Deployment Script"
echo "========================================="

# Check prerequisites
echo "Checking prerequisites..."
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found. Please install it."; exit 1; }

# Check if cluster is running
if ! kubectl cluster-info &> /dev/null; then
    echo "No Kubernetes cluster found!"
    echo "Please start minikube or kind:"
    echo "  minikube start --cpus=4 --memory=8192"
    echo "  OR"
    echo "  kind create cluster --name antidetect"
    exit 1
fi

echo "Kubernetes cluster found!"
kubectl cluster-info

# Create namespace
echo "Creating namespace..."
kubectl apply -f namespace.yaml

# Create secrets
echo "Creating secrets..."
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

kubectl create secret generic app-secret \
  --from-literal=jwt-secret="$JWT_SECRET" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic db-secret \
  --from-literal=username="antidetect_user" \
  --from-literal=password="$DB_PASSWORD" \
  --from-literal=connection-string="postgresql://antidetect_user:$DB_PASSWORD@postgresql-service:5432/antidetect" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret generic redis-secret \
  --from-literal=password="$REDIS_PASSWORD" \
  -n $NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo "Secrets created successfully!"

# Deploy infrastructure
echo "Deploying infrastructure..."
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f statefulset.yaml

# Wait for databases
echo "Waiting for databases to be ready..."
kubectl wait --for=condition=ready pod -l app=redis -n $NAMESPACE --timeout=300s || true
kubectl wait --for=condition=ready pod -l app=postgresql -n $NAMESPACE --timeout=300s || true

# Deploy application
echo "Deploying application..."
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f autoscaler.yaml

# Wait for deployment
echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/browser-pool -n $NAMESPACE || true

# Get status
echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Check pod status:"
kubectl get pods -n $NAMESPACE
echo ""
echo "Check services:"
kubectl get svc -n $NAMESPACE
echo ""
echo "To access the service:"
echo "  kubectl port-forward svc/browser-pool-service 3000:80 -n $NAMESPACE"
echo ""
echo "Then open: http://localhost:3000"
echo ""
echo "View logs:"
echo "  kubectl logs -f deployment/browser-pool -n $NAMESPACE"
echo ""
echo "Credentials:"
echo "  JWT_SECRET: $JWT_SECRET"
echo "  DB_PASSWORD: $DB_PASSWORD"
echo "  REDIS_PASSWORD: $REDIS_PASSWORD"
echo ""
echo "========================================="
