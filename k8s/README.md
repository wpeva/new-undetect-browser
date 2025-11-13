# Kubernetes Deployment Guide

## Session 12: Kubernetes Cluster Setup
**Level 7 - Distributed Architecture**

This directory contains comprehensive Kubernetes configurations for deploying the Antidetect Browser in a production environment with auto-scaling, high availability, and cloud provider support.

---

## 📁 File Structure

```
k8s/
├── namespace.yaml              # Namespace isolation
├── deployment.yaml             # Browser pool deployment
├── service.yaml                # Load balancer configuration
├── statefulset.yaml            # Redis & PostgreSQL
├── autoscaler.yaml             # Horizontal pod autoscaling
├── configmap.yaml              # Application configuration
├── secrets-template.yaml       # Secrets template
├── ingress.yaml                # External access & SSL/TLS
├── pvc.yaml                    # Persistent volumes
├── deploy-aws.sh               # AWS EKS deployment
├── deploy-digitalocean.sh      # DigitalOcean DOKS deployment
├── deploy-gcp.sh               # GCP GKE deployment
└── README.md                   # This file
```

---

## 🎯 Features

### ✅ Core Components
- **Browser Pool Deployment**: 10 replicas (configurable 5-100)
- **Redis StatefulSet**: 3 replicas with persistence
- **PostgreSQL StatefulSet**: 1 replica with 100GB storage
- **Horizontal Pod Autoscaler**: CPU/Memory based scaling
- **Load Balancer**: Session affinity & health checks
- **Ingress Controller**: SSL/TLS termination with Let's Encrypt
- **Persistent Volumes**: Browser profiles & data storage

### 🚀 Auto-Scaling
- **Min Replicas**: 5 pods
- **Max Replicas**: 100 pods
- **CPU Target**: 70% utilization
- **Memory Target**: 80% utilization
- **Scale Up**: 100% in 30 seconds (max 5 pods)
- **Scale Down**: 50% in 60 seconds (with 5min stabilization)

### 🔒 Security
- Non-root containers
- Read-only root filesystem
- Seccomp profiles
- Network policies
- Secrets management
- SSL/TLS encryption

### 📊 Monitoring
- Prometheus metrics
- Health checks (liveness/readiness/startup)
- Resource limits
- Logging

---

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes Cluster** (v1.24+)
2. **kubectl** CLI tool
3. **helm** (v3+) - for some installations
4. **Cloud CLI** (optional):
   - AWS: `aws-cli`, `eksctl`
   - DigitalOcean: `doctl`
   - GCP: `gcloud`

### Step 1: Build Docker Image

First, build and push your Docker image:

```bash
# Build image
docker build -t antidetect-cloud:latest .

# Tag for registry
docker tag antidetect-cloud:latest your-registry/antidetect-cloud:latest

# Push to registry
docker push your-registry/antidetect-cloud:latest
```

### Step 2: Create Secrets

```bash
# Copy template
cp k8s/secrets-template.yaml k8s/secrets.yaml

# Generate random secrets
JWT_SECRET=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 32)
REDIS_PASSWORD=$(openssl rand -base64 32)

# Create secrets using kubectl
kubectl create namespace antidetect
kubectl create secret generic app-secret \
  --from-literal=jwt-secret="$JWT_SECRET" \
  -n antidetect

kubectl create secret generic db-secret \
  --from-literal=username="antidetect_user" \
  --from-literal=password="$DB_PASSWORD" \
  --from-literal=connection-string="postgresql://antidetect_user:$DB_PASSWORD@postgresql-service:5432/antidetect" \
  -n antidetect

kubectl create secret generic redis-secret \
  --from-literal=password="$REDIS_PASSWORD" \
  -n antidetect
```

### Step 3: Deploy to Kubernetes

```bash
cd k8s

# Create namespace
kubectl apply -f namespace.yaml

# Deploy infrastructure
kubectl apply -f configmap.yaml
kubectl apply -f pvc.yaml
kubectl apply -f statefulset.yaml

# Wait for databases
kubectl wait --for=condition=ready pod -l app=redis -n antidetect --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgresql -n antidetect --timeout=300s

# Deploy application
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f autoscaler.yaml

# Optional: Deploy ingress (requires ingress controller)
kubectl apply -f ingress.yaml
```

### Step 4: Verify Deployment

```bash
# Check pods
kubectl get pods -n antidetect

# Check services
kubectl get svc -n antidetect

# Check HPA
kubectl get hpa -n antidetect

# Get external IP
kubectl get svc browser-pool-service -n antidetect

# View logs
kubectl logs -f deployment/browser-pool -n antidetect
```

---

## ☁️ Cloud Provider Deployments

### AWS EKS

```bash
# Set environment variables
export CLUSTER_NAME="antidetect-cluster"
export AWS_REGION="us-east-1"
export NODE_TYPE="t3.xlarge"
export MIN_NODES=3
export MAX_NODES=20

# Run deployment script
cd k8s
./deploy-aws.sh
```

**Requirements:**
- AWS CLI configured
- eksctl installed
- kubectl installed
- IAM permissions for EKS, EC2, ELB

### DigitalOcean DOKS

```bash
# Set environment variables
export CLUSTER_NAME="antidetect-cluster"
export DO_REGION="nyc3"
export NODE_SIZE="s-4vcpu-8gb"
export MIN_NODES=3
export MAX_NODES=20

# Run deployment script
cd k8s
./deploy-digitalocean.sh
```

**Requirements:**
- DigitalOcean account
- doctl installed and authenticated
- kubectl installed

### Google Cloud GKE

```bash
# Set environment variables
export CLUSTER_NAME="antidetect-cluster"
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"
export GCP_ZONE="us-central1-a"
export MACHINE_TYPE="n1-standard-4"
export MIN_NODES=3
export MAX_NODES=20

# Run deployment script
cd k8s
./deploy-gcp.sh
```

**Requirements:**
- Google Cloud account
- gcloud CLI installed and authenticated
- kubectl installed
- Project with billing enabled

---

## 📊 Resource Requirements

### Per Browser Pod
- **CPU**: 2 cores (request), 4 cores (limit)
- **Memory**: 4GB (request), 8GB (limit)
- **Storage**: 10GB ephemeral

### Redis Pod
- **CPU**: 500m (request), 1 core (limit)
- **Memory**: 1GB (request), 2GB (limit)
- **Storage**: 20GB persistent

### PostgreSQL Pod
- **CPU**: 1 core (request), 2 cores (limit)
- **Memory**: 2GB (request), 4GB (limit)
- **Storage**: 100GB persistent

### Minimum Cluster Requirements
- **Nodes**: 3-5 nodes
- **Total CPU**: 10+ cores
- **Total Memory**: 32GB+
- **Total Storage**: 200GB+

---

## 🔧 Configuration

### Environment Variables

Edit `k8s/configmap.yaml` to configure:

```yaml
data:
  node-env: "production"
  port: "3000"
  max-concurrent-browsers: "50"
  browser-timeout: "300000"
  enable-auth: "true"
  cors-origin: "*"
```

### Scaling Parameters

Edit `k8s/autoscaler.yaml`:

```yaml
spec:
  minReplicas: 5      # Minimum pods
  maxReplicas: 100    # Maximum pods
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        averageUtilization: 70  # CPU target
```

### Resource Limits

Edit `k8s/deployment.yaml`:

```yaml
resources:
  requests:
    memory: "4Gi"
    cpu: "2000m"
  limits:
    memory: "8Gi"
    cpu: "4000m"
```

---

## 🌐 Ingress & SSL/TLS

### Install Cert-Manager

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Install Nginx Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace
```

### Configure Domain

1. Update `k8s/ingress.yaml` with your domain:

```yaml
spec:
  tls:
  - hosts:
    - antidetect.yourdomain.com
    secretName: tls-secret
  rules:
  - host: antidetect.yourdomain.com
```

2. Update email in ClusterIssuer:

```yaml
spec:
  acme:
    email: admin@yourdomain.com
```

3. Apply ingress:

```bash
kubectl apply -f ingress.yaml
```

---

## 📈 Monitoring

### Prometheus Metrics

Access metrics endpoint:

```bash
kubectl port-forward svc/browser-pool-internal 3000:3000 -n antidetect
curl http://localhost:3000/metrics
```

### View Logs

```bash
# All pods
kubectl logs -f -l app=browser -n antidetect

# Specific pod
kubectl logs -f <pod-name> -n antidetect

# Previous instance
kubectl logs -f <pod-name> -n antidetect --previous
```

### Health Checks

```bash
# Check pod health
kubectl get pods -n antidetect

# Describe pod
kubectl describe pod <pod-name> -n antidetect

# Check events
kubectl get events -n antidetect --sort-by='.lastTimestamp'
```

---

## 🔄 Maintenance

### Update Application

```bash
# Update image
kubectl set image deployment/browser-pool \
  browser=antidetect-cloud:new-version \
  -n antidetect

# Watch rollout
kubectl rollout status deployment/browser-pool -n antidetect

# Rollback if needed
kubectl rollout undo deployment/browser-pool -n antidetect
```

### Scale Manually

```bash
# Scale deployment
kubectl scale deployment/browser-pool --replicas=20 -n antidetect

# Scale statefulset
kubectl scale statefulset/redis --replicas=5 -n antidetect
```

### Backup Database

```bash
# PostgreSQL backup
kubectl exec -it postgresql-0 -n antidetect -- \
  pg_dump -U antidetect_user antidetect > backup.sql

# Redis backup
kubectl exec -it redis-0 -n antidetect -- \
  redis-cli --rdb /data/backup.rdb
```

---

## 🐛 Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n antidetect

# Describe pod
kubectl describe pod <pod-name> -n antidetect

# Check events
kubectl get events -n antidetect

# Check logs
kubectl logs <pod-name> -n antidetect
```

### Out of Memory

```bash
# Check resource usage
kubectl top pods -n antidetect
kubectl top nodes

# Increase memory limits in deployment.yaml
```

### Storage Issues

```bash
# Check PVCs
kubectl get pvc -n antidetect

# Describe PVC
kubectl describe pvc <pvc-name> -n antidetect

# Check storage class
kubectl get storageclass
```

### Network Issues

```bash
# Check services
kubectl get svc -n antidetect

# Test internal connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n antidetect -- sh
# Inside pod: wget -O- http://browser-pool-internal:3000/health
```

---

## 🗑️ Cleanup

### Delete Application

```bash
kubectl delete -f k8s/deployment.yaml
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/autoscaler.yaml
kubectl delete -f k8s/statefulset.yaml
kubectl delete -f k8s/pvc.yaml
kubectl delete -f k8s/configmap.yaml
kubectl delete namespace antidetect
```

### Delete Cluster

**AWS:**
```bash
eksctl delete cluster --name antidetect-cluster --region us-east-1
```

**DigitalOcean:**
```bash
doctl kubernetes cluster delete antidetect-cluster
```

**GCP:**
```bash
gcloud container clusters delete antidetect-cluster --zone us-central1-a
```

---

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Horizontal Pod Autoscaler](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)
- [Ingress](https://kubernetes.io/docs/concepts/services-networking/ingress/)
- [cert-manager](https://cert-manager.io/docs/)

---

## 🎉 Result

You now have a production-ready Kubernetes cluster with:

✅ **Auto-scaling browser pool** (5-100 pods)
✅ **High availability** with Redis & PostgreSQL
✅ **Load balancing** with session affinity
✅ **SSL/TLS** with automatic certificate management
✅ **Monitoring** with health checks & metrics
✅ **Cloud provider support** (AWS/DO/GCP)
✅ **Persistent storage** for profiles & data

**Session 12 Complete!** 🎊
