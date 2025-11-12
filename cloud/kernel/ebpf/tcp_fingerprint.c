// SPDX-License-Identifier: GPL-2.0
/*
 * TCP Fingerprint Spoofing using eBPF
 *
 * This eBPF program modifies TCP/IP stack parameters to spoof network
 * fingerprints. It can modify:
 * - TCP window size
 * - TTL (Time To Live)
 * - TCP options
 * - MSS (Maximum Segment Size)
 * - Window scale
 * - SACK (Selective Acknowledgment)
 *
 * Attach point: BPF_CGROUP_SOCK_OPS
 */

#include <linux/bpf.h>
#include <linux/tcp.h>
#include <linux/ip.h>
#include <linux/in.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

/* TCP Profile structure */
struct tcp_profile {
    __u16 window_size;        /* Initial window size */
    __u8 ttl;                  /* Time to live */
    __u16 mss;                 /* Maximum segment size */
    __u8 window_scale;         /* Window scale factor (0-14) */
    __u8 sack_permitted;       /* SACK permitted flag */
    __u8 timestamps;           /* TCP timestamps enabled */
    __u8 no_delay;             /* TCP_NODELAY (Nagle's algorithm) */
    __u32 initial_congestion_window; /* Initial cwnd */
    __u8 ecn;                  /* ECN support */
    __u8 fast_open;            /* TCP Fast Open */
    __u8 padding[2];           /* Padding for alignment */
};

/* Hash map to store TCP profiles per process/connection */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __type(key, __u32);        /* PID or connection ID */
    __type(value, struct tcp_profile);
    __uint(max_entries, 1024);
} tcp_profiles SEC(".maps");

/* Statistics map */
struct tcp_stats {
    __u64 connections_modified;
    __u64 packets_processed;
    __u64 errors;
};

struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __type(key, __u32);
    __type(value, struct tcp_stats);
    __uint(max_entries, 1);
} stats SEC(".maps");

/* Helper function to update statistics */
static __always_inline void update_stats(__u8 error)
{
    __u32 key = 0;
    struct tcp_stats *st;

    st = bpf_map_lookup_elem(&stats, &key);
    if (!st)
        return;

    if (error) {
        __sync_fetch_and_add(&st->errors, 1);
    } else {
        __sync_fetch_and_add(&st->connections_modified, 1);
    }
}

/* Main sockops handler for TCP connection establishment */
SEC("sockops")
int tcp_fingerprint_spoof(struct bpf_sock_ops *skops)
{
    struct tcp_profile *profile;
    __u32 pid;
    int ret;

    /* Only handle TCP connections */
    if (skops->family != AF_INET && skops->family != AF_INET6)
        return 0;

    /* Handle different socket operations */
    switch (skops->op) {
    case BPF_SOCK_OPS_TCP_CONNECT_CB:
        /* Active connection (client) */
        pid = bpf_get_current_pid_tgid() >> 32;
        profile = bpf_map_lookup_elem(&tcp_profiles, &pid);

        if (!profile) {
            return 0;  /* No profile for this process */
        }

        /* Modify TCP window size */
        if (profile->window_size > 0) {
            ret = bpf_setsockopt(skops, SOL_TCP, TCP_WINDOW_CLAMP,
                               &profile->window_size, sizeof(profile->window_size));
            if (ret != 0) {
                update_stats(1);
                return 0;
            }
        }

        /* Modify TTL */
        if (profile->ttl > 0) {
            int level = (skops->family == AF_INET) ? SOL_IP : SOL_IPV6;
            int optname = (skops->family == AF_INET) ? IP_TTL : IPV6_UNICAST_HOPS;

            ret = bpf_setsockopt(skops, level, optname,
                               &profile->ttl, sizeof(profile->ttl));
            if (ret != 0) {
                update_stats(1);
                return 0;
            }
        }

        /* Modify MSS (Maximum Segment Size) */
        if (profile->mss > 0) {
            ret = bpf_setsockopt(skops, SOL_TCP, TCP_MAXSEG,
                               &profile->mss, sizeof(profile->mss));
            if (ret != 0) {
                update_stats(1);
                return 0;
            }
        }

        /* Enable/disable TCP_NODELAY */
        if (profile->no_delay) {
            __u32 nodelay = 1;
            ret = bpf_setsockopt(skops, SOL_TCP, TCP_NODELAY,
                               &nodelay, sizeof(nodelay));
            if (ret != 0) {
                update_stats(1);
            }
        }

        /* ECN support */
        if (profile->ecn) {
            ret = bpf_setsockopt(skops, SOL_TCP, TCP_ECN,
                               &profile->ecn, sizeof(profile->ecn));
        }

        update_stats(0);
        break;

    case BPF_SOCK_OPS_PASSIVE_ESTABLISHED_CB:
        /* Passive connection (server) - can also be spoofed */
        pid = bpf_get_current_pid_tgid() >> 32;
        profile = bpf_map_lookup_elem(&tcp_profiles, &pid);

        if (profile && profile->window_size > 0) {
            bpf_setsockopt(skops, SOL_TCP, TCP_WINDOW_CLAMP,
                         &profile->window_size, sizeof(profile->window_size));
        }
        break;

    case BPF_SOCK_OPS_ACTIVE_ESTABLISHED_CB:
        /* Connection fully established */
        __u32 key = 0;
        struct tcp_stats *st = bpf_map_lookup_elem(&stats, &key);
        if (st) {
            __sync_fetch_and_add(&st->packets_processed, 1);
        }
        break;

    default:
        break;
    }

    return 0;
}

/* Socket creation hook - set options early */
SEC("cgroup/sock_create")
int tcp_socket_create(struct bpf_sock *sk)
{
    if (sk->family != AF_INET && sk->family != AF_INET6)
        return 1;

    if (sk->type != SOCK_STREAM)  /* Only TCP */
        return 1;

    /* Socket created, profile will be applied on connect */
    return 1;
}

/* License required for GPL-only BPF helpers */
char _license[] SEC("license") = "GPL";
