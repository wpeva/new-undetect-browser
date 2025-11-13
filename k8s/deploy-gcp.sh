#!/bin/bash

# ==================================
# GCP GKE Deployment Script
# Deploy Antidetect Browser to Google Cloud
# ==================================

set -e

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-antidetect-cluster}"
PROJECT_ID="${GCP_PROJECT_ID:-your-project-id}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
MACHINE_TYPE="${MACHINE_TYPE:-n1-standard-4}"
MIN_NODES="${MIN_NODES:-3}"
MAX_NODES="${MAX_NODES:-20}"
NAMESPACE="antidetect"

echo "========================================="
echo "GCP GKE Deployment Script"
echo "========================================="
echo "Cluster: $CLUSTER_NAME"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Zone: $ZONE"
echo "Machine Type: $MACHINE_TYPE"
echo "Min Nodes: $MIN_NODES"
echo "Max Nodes: $MAX_NODES"
echo "========================================="

# Check prerequisites
echo "Checking prerequisites..."
command -v gcloud >/dev/null 2>&1 || { echo "gcloud CLI not found. Please install it."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found. Please install it."; exit 1; }

# Set project
echo "Setting GCP project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable monitoring.googleapis.com

# Create GKE cluster
echo "Creating GKE cluster..."
gcloud container clusters create $CLUSTER_NAME \
  --zone $ZONE \
  --num-nodes $MIN_NODES \
  --machine-type $MACHINE_TYPE \
  --enable-autoscaling \
  --min-nodes $MIN_NODES \
  --max-nodes $MAX_NODES \
  --enable-autorepair \
  --enable-autoupgrade \
  --enable-stackdriver-kubernetes \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
  --workload-pool=$PROJECT_ID.svc.id.goog \
  --enable-shielded-nodes \
  --shielded-secure-boot \
  --shielded-integrity-monitoring

# Get cluster credentials
echo "Getting cluster credentials..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# Install metrics server (usually pre-installed on GKE)
echo "Ensuring metrics server is available..."
kubectl get deployment metrics-server -n kube-system || \
  kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install cert-manager
echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
echo "Waiting for cert-manager..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

# Install Nginx Ingress Controller
echo "Installing Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer

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

# Update storage class for GCP
echo "Creating GCP storage class..."
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io
parameters:
  type: pd-ssd
  replication-type: regional-pd
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
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
echo "Project: $PROJECT_ID"
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
echo "GCP Console:"
echo "https://console.cloud.google.com/kubernetes/clusters/details/$ZONE/$CLUSTER_NAME/details?project=$PROJECT_ID"
echo ""
echo "========================================="
