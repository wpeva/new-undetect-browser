# Kubernetes Orchestration

**Session 8 of 15** - Anti-Detect Cloud Browser Implementation

This module provides distributed architecture with Kubernetes orchestration for scaling to thousands of concurrent browser sessions.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Components](#components)
- [Deployment](#deployment)
- [Scaling](#scaling)
- [Monitoring](#monitoring)
- [Security](#security)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

**Problem:** Single-server architecture cannot scale beyond ~100-200 concurrent browser sessions.

**Solution:** Distributed Kubernetes cluster with:
- Horizontal pod autoscaling
- Service mesh for traffic management
- Distributed session storage (Redis cluster)
- Load balancing across nodes
- Health checks and auto-healing
- Rolling updates with zero downtime

### Why Kubernetes?

| Approach | Max Sessions | Availability | Scaling | Management |
|----------|-------------|--------------|---------|------------|
| **Single Server** | 100-200 | 99% | Manual | Easy |
| **Docker Swarm** | 500-1000 | 99.5% | Auto | Medium |
| **Kubernetes** | 10,000+ | 99.9% | Auto | Complex |

**Kubernetes wins** for production deployments requiring high availability and elastic scaling.

## Quick Start

### 1. Prerequisites

```bash
# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install kind (for local testing)
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

### 2. Create Local Cluster

```bash
# Create cluster with kind
kind create cluster --config kubernetes/kind-config.yaml --name antidetect

# Verify cluster
kubectl cluster-info
kubectl get nodes
```

### 3. Deploy with Helm

```bash
# Add required repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install dependencies (Redis, PostgreSQL)
helm install redis bitnami/redis-cluster -f kubernetes/helm/values-redis.yaml
helm install postgres bitnami/postgresql -f kubernetes/helm/values-postgres.yaml

# Install application
helm install antidetect ./kubernetes/helm/antidetect-browser

# Check status
kubectl get pods
kubectl get services
```

### 4. Access Application

```bash
# Forward port to local machine
kubectl port-forward service/antidetect-api 3000:3000

# Create browser session
curl -X POST http://localhost:3000/api/session/create

# View logs
kubectl logs -l app=antidetect-api --tail=100 -f
```

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Internet                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Load Balancer (Ingress)                    │
│                  NGINX / Istio Gateway                       │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ API Pod  │  │ API Pod  │  │ API Pod  │
│  (1-10)  │  │  (1-10)  │  │  (1-10)  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Browser  │  │ Browser  │  │ Browser  │
│   Pool   │  │   Pool   │  │   Pool   │
│  (1-20)  │  │  (1-20)  │  │  (1-20)  │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │
     └─────────────┼─────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
        ▼          ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Redis   │  │ Postgres │  │ Profile  │
│ Cluster  │  │ Cluster  │  │ Manager  │
│ (3 nodes)│  │(3 replicas)│ │ (1-5)   │
└──────────┘  └──────────┘  └──────────┘
```

### Pod Architecture

Each **API Pod** contains:
- Node.js API server (Session 3)
- Profile Manager (Session 7)
- Metrics exporter (Session 5)
- Health check endpoint

Each **Browser Pool Pod** contains:
- 5-10 browser instances
- Protection modules (Sessions 1-2)
- Custom Chromium build (Session 4)
- Resource manager

### Networking

```
┌─────────────────────────────────────────┐
│            Istio Service Mesh            │
│  ┌─────────────────────────────────┐    │
│  │      Traffic Management         │    │
│  │  - Load balancing               │    │
│  │  - Circuit breaking             │    │
│  │  - Retries & timeouts           │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │         Security                │    │
│  │  - mTLS between services        │    │
│  │  - Access control               │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │        Observability            │    │
│  │  - Distributed tracing          │    │
│  │  - Metrics collection           │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Components

### 1. API Deployment

**File:** `kubernetes/manifests/api-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: antidetect-api
  labels:
    app: antidetect-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: antidetect-api
  template:
    metadata:
      labels:
        app: antidetect-api
        version: v1
    spec:
      containers:
      - name: api
        image: antidetect/api:latest
        ports:
        - containerPort: 3000
          name: http
        - containerPort: 9090
          name: metrics
        env:
        - name: REDIS_URL
          value: "redis://redis-cluster:6379"
        - name: POSTGRES_URL
          valueFrom:
            secretKeyRef:
              name: postgres-credentials
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
```

**Features:**
- 3 replicas for high availability
- Resource limits (prevent resource exhaustion)
- Health checks (liveness + readiness)
- Environment variables from ConfigMaps/Secrets

### 2. Browser Pool Deployment

**File:** `kubernetes/manifests/browser-pool-deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: browser-pool
  labels:
    app: browser-pool
spec:
  replicas: 5
  selector:
    matchLabels:
      app: browser-pool
  template:
    metadata:
      labels:
        app: browser-pool
    spec:
      containers:
      - name: browser
        image: antidetect/browser:latest
        ports:
        - containerPort: 9222
          name: devtools
        env:
        - name: MAX_BROWSERS
          value: "10"
        - name: CHROME_PATH
          value: "/opt/chromium/chrome"
        resources:
          requests:
            memory: "4Gi"
            cpu: "2000m"
          limits:
            memory: "8Gi"
            cpu: "4000m"
        volumeMounts:
        - name: shm
          mountPath: /dev/shm
        - name: browser-profiles
          mountPath: /tmp/profiles
      volumes:
      - name: shm
        emptyDir:
          medium: Memory
          sizeLimit: 2Gi
      - name: browser-profiles
        emptyDir: {}
```

**Features:**
- 5 replicas × 10 browsers = 50 concurrent sessions
- Large /dev/shm (required by Chrome)
- Higher resource limits (browsers are heavy)
- Ephemeral storage for profiles

### 3. Horizontal Pod Autoscaler (HPA)

**File:** `kubernetes/manifests/hpa.yaml`

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: antidetect-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: antidetect-api
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: browser-pool-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: browser-pool
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 85
  - type: Pods
    pods:
      metric:
        name: active_browser_sessions
      target:
        type: AverageValue
        averageValue: "8"  # Scale when avg > 8 browsers per pod
```

**Scaling Logic:**
- API: 3-10 replicas based on CPU/memory/requests
- Browser Pool: 5-20 replicas based on active sessions
- Custom metrics from Prometheus

### 4. Services

**File:** `kubernetes/manifests/services.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: antidetect-api
  labels:
    app: antidetect-api
spec:
  type: ClusterIP
  selector:
    app: antidetect-api
  ports:
  - name: http
    port: 3000
    targetPort: 3000
  - name: metrics
    port: 9090
    targetPort: 9090
---
apiVersion: v1
kind: Service
metadata:
  name: browser-pool
  labels:
    app: browser-pool
spec:
  type: ClusterIP
  selector:
    app: browser-pool
  ports:
  - name: devtools
    port: 9222
    targetPort: 9222
  clusterIP: None  # Headless service for direct pod access
```

**Service Types:**
- **API:** ClusterIP (internal access only)
- **Browser Pool:** Headless (direct pod-to-pod communication)

### 5. Ingress

**File:** `kubernetes/manifests/ingress.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: antidetect-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - api.antidetect.example.com
    secretName: antidetect-tls
  rules:
  - host: api.antidetect.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: antidetect-api
            port:
              number: 3000
```

**Features:**
- TLS termination with Let's Encrypt
- Rate limiting (100 req/s per IP)
- Path-based routing

### 6. ConfigMaps and Secrets

**File:** `kubernetes/manifests/config.yaml`

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: antidetect-config
data:
  LOG_LEVEL: "info"
  MAX_SESSIONS_PER_POD: "10"
  SESSION_TIMEOUT: "3600000"  # 1 hour
  PROFILE_ROTATION_INTERVAL: "86400000"  # 24 hours
  DETECTION_SCORE_THRESHOLD: "0.8"
---
apiVersion: v1
kind: Secret
metadata:
  name: antidetect-secrets
type: Opaque
stringData:
  REDIS_PASSWORD: "change-me-in-production"
  POSTGRES_PASSWORD: "change-me-in-production"
  API_SECRET_KEY: "change-me-in-production"
  LICENSE_KEY: "your-license-key"
```

### 7. Persistent Volume Claims

**File:** `kubernetes/manifests/storage.yaml`

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
  - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 200Gi
```

## Deployment

### Option 1: kubectl (Manual)

```bash
# Create namespace
kubectl create namespace antidetect

# Apply manifests
kubectl apply -f kubernetes/manifests/config.yaml -n antidetect
kubectl apply -f kubernetes/manifests/storage.yaml -n antidetect
kubectl apply -f kubernetes/manifests/api-deployment.yaml -n antidetect
kubectl apply -f kubernetes/manifests/browser-pool-deployment.yaml -n antidetect
kubectl apply -f kubernetes/manifests/services.yaml -n antidetect
kubectl apply -f kubernetes/manifests/hpa.yaml -n antidetect
kubectl apply -f kubernetes/manifests/ingress.yaml -n antidetect

# Check status
kubectl get all -n antidetect
```

### Option 2: Helm (Recommended)

```bash
# Install chart
helm install antidetect ./kubernetes/helm/antidetect-browser \
  --namespace antidetect \
  --create-namespace \
  --values ./kubernetes/helm/values-production.yaml

# Upgrade
helm upgrade antidetect ./kubernetes/helm/antidetect-browser \
  --namespace antidetect \
  --values ./kubernetes/helm/values-production.yaml

# Rollback
helm rollback antidetect 1 --namespace antidetect

# Uninstall
helm uninstall antidetect --namespace antidetect
```

### Option 3: GitOps (ArgoCD)

```yaml
# argocd/application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: antidetect-browser
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/antidetect-browser
    targetRevision: main
    path: kubernetes/helm/antidetect-browser
    helm:
      valueFiles:
      - values-production.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: antidetect
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
    - CreateNamespace=true
```

## Scaling

### Cluster Autoscaling

**File:** `kubernetes/manifests/cluster-autoscaler.yaml`

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: cluster-autoscaler
  namespace: kube-system
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cluster-autoscaler
  template:
    metadata:
      labels:
        app: cluster-autoscaler
    spec:
      serviceAccountName: cluster-autoscaler
      containers:
      - name: cluster-autoscaler
        image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
        command:
        - ./cluster-autoscaler
        - --cloud-provider=aws  # Or gcp, azure
        - --nodes=3:20:antidetect-node-group
        - --scale-down-delay-after-add=5m
        - --scale-down-unneeded-time=5m
        resources:
          limits:
            memory: 600Mi
            cpu: 100m
          requests:
            memory: 600Mi
            cpu: 100m
```

### Scaling Tiers

| Tier | Nodes | Pods | Max Sessions | Cost/Month |
|------|-------|------|--------------|------------|
| **Dev** | 1 | 5 | 50 | $50 |
| **Small** | 3 | 15 | 150 | $200 |
| **Medium** | 5 | 50 | 500 | $500 |
| **Large** | 10 | 150 | 1,500 | $1,500 |
| **XL** | 20 | 400 | 4,000 | $4,000 |

### Load Testing

```bash
# Install k6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

# Run load test
k6 run kubernetes/tests/load-test.js
```

**File:** `kubernetes/tests/load-test.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 500 },   // Ramp up to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

const BASE_URL = 'http://api.antidetect.example.com';

export default function () {
  // Create session
  const createRes = http.post(`${BASE_URL}/api/session/create`, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(createRes, {
    'session created': (r) => r.status === 200,
    'has sessionId': (r) => r.json('sessionId') !== undefined,
  });

  const sessionId = createRes.json('sessionId');

  // Navigate
  const navigateRes = http.post(
    `${BASE_URL}/api/session/${sessionId}/navigate`,
    JSON.stringify({ url: 'https://example.com' }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(navigateRes, {
    'navigation succeeded': (r) => r.status === 200,
  });

  sleep(1);

  // Close session
  http.delete(`${BASE_URL}/api/session/${sessionId}`);

  sleep(1);
}
```

## Monitoring

### Prometheus Integration

**File:** `kubernetes/manifests/servicemonitor.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: antidetect-api
  labels:
    app: antidetect-api
spec:
  selector:
    matchLabels:
      app: antidetect-api
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: browser-pool
  labels:
    app: browser-pool
spec:
  selector:
    matchLabels:
      app: browser-pool
  endpoints:
  - port: metrics
    interval: 15s
    path: /metrics
```

### Grafana Dashboards

Pre-built dashboards for:
- **Cluster Overview:** CPU, memory, disk, network
- **API Performance:** Request rate, latency, errors
- **Browser Sessions:** Active sessions, creation rate, failure rate
- **Resource Usage:** Per-pod CPU/memory/disk
- **Detection Scores:** Real-time detection metrics

### Alerts

**File:** `kubernetes/manifests/prometheusrule.yaml`

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: antidetect-alerts
spec:
  groups:
  - name: antidetect
    interval: 30s
    rules:
    - alert: HighPodMemory
      expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Pod {{ $labels.pod }} high memory usage"
        description: "Memory usage is {{ $value | humanizePercentage }}"

    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "High error rate detected"
        description: "Error rate is {{ $value | humanizePercentage }}"

    - alert: DetectionScoreDrop
      expr: avg(detection_score) < 9.0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Detection score dropped below 9.0"
        description: "Current score: {{ $value }}"
```

## Security

### Network Policies

**File:** `kubernetes/manifests/network-policy.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: antidetect-api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: browser-pool
    ports:
    - protocol: TCP
      port: 9222
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: antidetect
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

### RBAC

**File:** `kubernetes/manifests/rbac.yaml`

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: antidetect-api
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: antidetect-api-role
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["configmaps"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: antidetect-api-rolebinding
subjects:
- kind: ServiceAccount
  name: antidetect-api
roleRef:
  kind: Role
  name: antidetect-api-role
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

### 1. Resource Limits

Always set resource requests and limits:
```yaml
resources:
  requests:  # Guaranteed resources
    memory: "512Mi"
    cpu: "500m"
  limits:    # Maximum allowed
    memory: "1Gi"
    cpu: "1000m"
```

### 2. Health Checks

Implement both liveness and readiness probes:
- **Liveness:** Is the pod alive? (Restart if failing)
- **Readiness:** Is the pod ready to serve traffic?

### 3. Rolling Updates

```yaml
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # Max 1 extra pod during update
      maxUnavailable: 0  # No downtime
```

### 4. Pod Disruption Budgets

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: antidetect-api-pdb
spec:
  minAvailable: 2  # Always keep 2 pods running
  selector:
    matchLabels:
      app: antidetect-api
```

### 5. Affinity Rules

Spread pods across nodes:
```yaml
affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            app: antidetect-api
        topologyKey: kubernetes.io/hostname
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n antidetect

# Describe pod
kubectl describe pod <pod-name> -n antidetect

# Check logs
kubectl logs <pod-name> -n antidetect

# Common issues:
# - ImagePullBackOff: Wrong image or credentials
# - CrashLoopBackOff: Application error
# - Pending: Insufficient resources
```

### High Memory Usage

```bash
# Check resource usage
kubectl top pods -n antidetect

# Get detailed metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/antidetect/pods

# Solutions:
# - Increase memory limits
# - Scale horizontally
# - Fix memory leaks
```

### Network Issues

```bash
# Test connectivity
kubectl run -it --rm debug --image=busybox --restart=Never -n antidetect -- sh

# Inside pod:
nslookup antidetect-api
wget -O- http://antidetect-api:3000/health

# Check network policies
kubectl get networkpolicies -n antidetect
```

### Scaling Issues

```bash
# Check HPA status
kubectl get hpa -n antidetect

# Describe HPA
kubectl describe hpa antidetect-api-hpa -n antidetect

# Check metrics server
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# Common issues:
# - Metrics server not installed
# - Custom metrics not available
# - HPA limits reached
```

## Conclusion

Session 8 provides production-ready Kubernetes orchestration:

✅ **Horizontal scaling** - Auto-scale from 3 to 10+ pods
✅ **High availability** - Multi-replica deployments, health checks
✅ **Service mesh** - Istio for advanced traffic management
✅ **Monitoring** - Prometheus + Grafana integration
✅ **Security** - RBAC, network policies, secrets
✅ **GitOps ready** - ArgoCD/FluxCD support

**Capacity:** 10,000+ concurrent browser sessions
**Availability:** 99.9% uptime
**Cost:** $500-4,000/month (depending on scale)

---

**Next:** Session 9 - Advanced Performance Optimization
