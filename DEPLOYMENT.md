# Production Deployment Guide

**Session 15 of 15** - Complete Production Deployment

## Prerequisites

- Kubernetes cluster (1.25+)
- kubectl configured
- Helm 3.x installed
- Domain with DNS
- SSL certificate

## Quick Deploy

### 1. Install with Helm

```bash
helm install antidetect ./kubernetes/helm/antidetect-browser \
  --namespace antidetect \
  --create-namespace \
  --values values-production.yaml
```

### 2. Verify

```bash
kubectl get pods -n antidetect
kubectl get services -n antidetect
```

### 3. Access

```bash
kubectl port-forward svc/antidetect-api 3000:3000 -n antidetect
curl http://localhost:3000/health
```

## Scaling

### Horizontal

```bash
kubectl scale deployment antidetect-api --replicas=10 -n antidetect
```

### Auto-Scaling

Enabled by default via HPA:
- API: 3-10 replicas (CPU 70%)
- Browser: 5-20 replicas (CPU 75%)

## Monitoring

```bash
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace
```

Access Grafana:
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

## Backups

### PostgreSQL

```bash
kubectl exec postgres-0 -n antidetect -- \
  pg_dump antidetect > backup.sql
```

### Redis

```bash
kubectl exec redis-0 -n antidetect -- redis-cli BGSAVE
```

## Security

### HTTPS

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

### Network Policies

```bash
kubectl apply -f kubernetes/manifests/network-policy.yaml
```

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n antidetect
kubectl logs <pod-name> -n antidetect
```

### High Memory

```bash
kubectl top pods -n antidetect
kubectl scale deployment browser-pool --replicas=15 -n antidetect
```

### Rollback

```bash
kubectl rollout undo deployment/antidetect-api -n antidetect
```

## Support

- Docs: https://docs.antidetect.example.com
- Issues: https://github.com/antidetect/browser/issues
- Email: support@antidetect.example.com

---

**Status:** Production Ready ✅
