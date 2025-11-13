#!/bin/bash

# ==================================
# Multi-Region Deployment Script
# Session 13: Deploy to multiple regions
# ==================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REGIONS=("us-east" "eu-west" "ap-south" "ru-central")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl is not installed"
        exit 1
    fi

    if ! command -v helm &> /dev/null; then
        log_warning "helm is not installed (optional)"
    fi

    log_success "Prerequisites check passed"
}

# Deploy to a single region
deploy_region() {
    local region=$1
    log_info "Deploying to region: $region"

    # Apply namespace
    kubectl apply -f "$SCRIPT_DIR/regions/$region.yaml"

    # Wait for namespace to be ready
    sleep 2

    # Apply global load balancer (only once)
    if [ "$region" == "us-east" ]; then
        log_info "Deploying global load balancer..."
        kubectl apply -f "$SCRIPT_DIR/global-lb.yaml"
    fi

    log_success "Region $region deployed successfully"
}

# Deploy all regions
deploy_all_regions() {
    log_info "Starting multi-region deployment..."

    for region in "${REGIONS[@]}"; do
        deploy_region "$region"
    done

    log_success "All regions deployed successfully"
}

# Verify deployment
verify_deployment() {
    log_info "Verifying deployment..."

    for region in "${REGIONS[@]}"; do
        local namespace="antidetect-$region"
        log_info "Checking region: $region"

        # Check pods
        kubectl get pods -n "$namespace" 2>/dev/null || log_warning "No pods found in $namespace"

        # Check services
        kubectl get svc -n "$namespace" 2>/dev/null || log_warning "No services found in $namespace"
    done

    # Check global load balancer
    log_info "Checking global load balancer..."
    kubectl get svc global-lb -n antidetect 2>/dev/null || log_warning "Global load balancer not found"

    log_success "Verification complete"
}

# Get deployment status
get_status() {
    log_info "Getting deployment status..."

    echo ""
    echo "===== DEPLOYMENT STATUS ====="
    echo ""

    for region in "${REGIONS[@]}"; do
        local namespace="antidetect-$region"
        echo "Region: $region"
        echo "Namespace: $namespace"

        # Count pods
        local pod_count=$(kubectl get pods -n "$namespace" 2>/dev/null | grep -c "Running" || echo "0")
        echo "Running Pods: $pod_count"

        # Get service endpoints
        kubectl get svc -n "$namespace" -o wide 2>/dev/null || echo "No services"
        echo ""
    done

    echo "===== GLOBAL LOAD BALANCER ====="
    kubectl get svc global-lb -n antidetect 2>/dev/null || echo "Not deployed"
    echo ""
}

# Cleanup deployment
cleanup() {
    log_warning "Starting cleanup..."

    read -p "Are you sure you want to delete all regions? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Cleanup cancelled"
        exit 0
    fi

    for region in "${REGIONS[@]}"; do
        local namespace="antidetect-$region"
        log_info "Deleting region: $region"
        kubectl delete namespace "$namespace" --ignore-not-found=true
    done

    # Delete global load balancer
    kubectl delete -f "$SCRIPT_DIR/global-lb.yaml" --ignore-not-found=true

    log_success "Cleanup complete"
}

# Main script
main() {
    echo ""
    echo "====================================="
    echo "  Multi-Region Deployment Script"
    echo "====================================="
    echo ""

    case "${1:-}" in
        deploy)
            check_prerequisites
            deploy_all_regions
            verify_deployment
            get_status
            ;;
        deploy-region)
            if [ -z "$2" ]; then
                log_error "Please specify a region: us-east, eu-west, ap-south, or ru-central"
                exit 1
            fi
            check_prerequisites
            deploy_region "$2"
            ;;
        verify)
            verify_deployment
            ;;
        status)
            get_status
            ;;
        cleanup)
            cleanup
            ;;
        *)
            echo "Usage: $0 {deploy|deploy-region <region>|verify|status|cleanup}"
            echo ""
            echo "Commands:"
            echo "  deploy           - Deploy all regions"
            echo "  deploy-region    - Deploy specific region"
            echo "  verify           - Verify deployment"
            echo "  status           - Get deployment status"
            echo "  cleanup          - Delete all regions"
            echo ""
            echo "Regions: us-east, eu-west, ap-south, ru-central"
            exit 1
            ;;
    esac
}

main "$@"
