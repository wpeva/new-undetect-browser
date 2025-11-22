#!/bin/bash

# ==================================
# DigitalOcean DOKS Deployment Script
# Deploy Antidetect Browser to DigitalOcean
# ==================================

set -e

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-antidetect-cluster}"
REGION="${DO_REGION:-nyc3}"
NODE_SIZE="${NODE_SIZE:-s-4vcpu-8gb}"
MIN_NODES="${MIN_NODES:-3}"
MAX_NODES="${MAX_NODES:-20}"
NAMESPACE="antidetect"

echo "========================================="
echo "DigitalOcean DOKS Deployment Script"
echo "========================================="
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"
echo "Node Size: $NODE_SIZE"
echo "Min Nodes: $MIN_NODES"
echo "Max Nodes: $MAX_NODES"
echo "========================================="

# Check prerequisites
echo "Checking prerequisites..."
command -v doctl >/dev/null 2>&1 || { echo "doctl not found. Please install it."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found. Please install it."; exit 1; }

# Authenticate with DigitalOcean
echo "Authenticating with DigitalOcean..."
doctl auth init

# Create DOKS cluster
echo "Creating DOKS cluster..."
doctl kubernetes cluster create $CLUSTER_NAME \
  --region $REGION \
  --version latest \
  --node-pool "name=worker-pool;size=$NODE_SIZE;count=$MIN_NODES;auto-scale=true;min-nodes=$MIN_NODES;max-nodes=$MAX_NODES" \
  --wait

# Get cluster credentials
echo "Getting cluster credentials..."
doctl kubernetes cluster kubeconfig save $CLUSTER_NAME

# Install metrics server (usually pre-installed on DOKS)
echo "Installing metrics server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml || true

# Install cert-manager
echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
echo "Waiting for cert-manager..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

# Install Nginx Ingress Controller (optimized for DO)
echo "Installing Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-enable-proxy-protocol"="true" \
  --set controller.service.annotations."service\.beta\.kubernetes\.io/do-loadbalancer-protocol"="http"

# Wait for ingress controller
echo "Waiting for Ingress Controller..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s

# Create namespace
echo "Creating namespace..."
kubectl apply -f namespace.yaml

# Create secrets
echo "Creating secrets..."
if [ -f "secrets.yaml" ]; then
  kubectl apply -f secrets.yaml
else
  echo "WARNING: secrets.yaml not found. Please create it from secrets-template.yaml"
fi

# Update storage class for DigitalOcean
echo "Creating DigitalOcean storage class..."
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "false"
provisioner: dobs.csi.digitalocean.com
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
EOF

# Deploy application
echo "Deploying application..."
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f statefulset.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f autoscaler.yaml
kubectl apply -f ingress.yaml

# Wait for deployments
echo "Waiting for deployments to be ready..."
kubectl wait --for=condition=available --timeout=600s deployment/browser-pool -n $NAMESPACE || true
kubectl wait --for=condition=ready --timeout=600s statefulset/redis -n $NAMESPACE || true
kubectl wait --for=condition=ready --timeout=600s statefulset/postgresql -n $NAMESPACE || true

# Get external IP
echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"
echo ""
echo "Get Load Balancer IP:"
echo "kubectl get svc browser-pool-service -n $NAMESPACE"
echo ""
echo "Get Ingress IP:"
echo "kubectl get ingress -n $NAMESPACE"
echo ""
echo "Check pod status:"
echo "kubectl get pods -n $NAMESPACE"
echo ""
echo "View logs:"
echo "kubectl logs -f deployment/browser-pool -n $NAMESPACE"
echo ""
echo "DigitalOcean Dashboard:"
echo "https://cloud.digitalocean.com/kubernetes/clusters/$CLUSTER_NAME"
echo ""
echo "========================================="
