#!/bin/bash

# ==================================
# AWS EKS Deployment Script
# Deploy Antidetect Browser to AWS
# ==================================

set -e

# Configuration
CLUSTER_NAME="${CLUSTER_NAME:-antidetect-cluster}"
REGION="${AWS_REGION:-us-east-1}"
NODE_TYPE="${NODE_TYPE:-t3.xlarge}"
MIN_NODES="${MIN_NODES:-3}"
MAX_NODES="${MAX_NODES:-20}"
NAMESPACE="antidetect"

echo "========================================="
echo "AWS EKS Deployment Script"
echo "========================================="
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"
echo "Node Type: $NODE_TYPE"
echo "Min Nodes: $MIN_NODES"
echo "Max Nodes: $MAX_NODES"
echo "========================================="

# Check prerequisites
echo "Checking prerequisites..."
command -v aws >/dev/null 2>&1 || { echo "AWS CLI not found. Please install it."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found. Please install it."; exit 1; }
command -v eksctl >/dev/null 2>&1 || { echo "eksctl not found. Please install it."; exit 1; }

# Create EKS cluster
echo "Creating EKS cluster..."
eksctl create cluster \
  --name $CLUSTER_NAME \
  --region $REGION \
  --version 1.28 \
  --nodegroup-name standard-workers \
  --node-type $NODE_TYPE \
  --nodes $MIN_NODES \
  --nodes-min $MIN_NODES \
  --nodes-max $MAX_NODES \
  --managed \
  --with-oidc \
  --ssh-access \
  --ssh-public-key ~/.ssh/id_rsa.pub \
  --enable-ssm

# Update kubeconfig
echo "Updating kubeconfig..."
aws eks update-kubeconfig --name $CLUSTER_NAME --region $REGION

# Install AWS Load Balancer Controller
echo "Installing AWS Load Balancer Controller..."
curl -o iam_policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.0/docs/install/iam_policy.json
aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam_policy.json || true

eksctl create iamserviceaccount \
  --cluster=$CLUSTER_NAME \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/AWSLoadBalancerControllerIAMPolicy \
  --override-existing-serviceaccounts \
  --approve

kubectl apply -k "github.com/aws/eks-charts/stable/aws-load-balancer-controller//crds?ref=master"

helm repo add eks https://aws.github.io/eks-charts
helm repo update
helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=$CLUSTER_NAME \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller

# Install EBS CSI Driver
echo "Installing EBS CSI Driver..."
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster $CLUSTER_NAME \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --override-existing-serviceaccounts

eksctl create addon --name aws-ebs-csi-driver --cluster $CLUSTER_NAME --force

# Install metrics server
echo "Installing metrics server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install cert-manager
echo "Installing cert-manager..."
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Wait for cert-manager to be ready
echo "Waiting for cert-manager..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/instance=cert-manager -n cert-manager --timeout=300s

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
kubectl wait --for=condition=available --timeout=600s deployment/browser-pool -n $NAMESPACE
kubectl wait --for=condition=ready --timeout=600s statefulset/redis -n $NAMESPACE
kubectl wait --for=condition=ready --timeout=600s statefulset/postgresql -n $NAMESPACE

# Get external IP
echo ""
echo "========================================="
echo "Deployment complete!"
echo "========================================="
echo ""
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"
echo ""
echo "Get Load Balancer URL:"
echo "kubectl get svc browser-pool-service -n $NAMESPACE"
echo ""
echo "Get Ingress URL:"
echo "kubectl get ingress -n $NAMESPACE"
echo ""
echo "Check pod status:"
echo "kubectl get pods -n $NAMESPACE"
echo ""
echo "View logs:"
echo "kubectl logs -f deployment/browser-pool -n $NAMESPACE"
echo ""
echo "========================================="
