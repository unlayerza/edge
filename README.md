# Unlayer Edge

Unlayer Edge is the distributed ingress, gateway, proxy, traffic-management, and service-discovery layer for the Unlayer platform.

Edge is the front door to Unlayer services. It is intentionally separate from `unlayerza/ha`: HA provides cluster authority, membership, health, quorum, election, terms, and fencing; Edge uses that information to decide where traffic may safely go.

## Core responsibilities

- External and internal ingress
- HTTP/HTTPS routing
- TCP and UDP proxying
- SIP ingress and transport pass-through
- WebSocket and long-lived connection handling
- Service discovery
- Health-aware routing
- Active-active gateway operation
- Connection draining and failover
- TLS termination and passthrough where appropriate
- Rate limiting and traffic policy
- Internal versus external exposure modes
- Outbound/egress policy where explicitly required
- Bunny DNS/control-plane integration
- IPv4 and IPv6 first-class operation

## Design principle

A node may run Edge alongside Database, Identity, Voice, and other services, but node configuration determines which workloads are enabled.

Edge can run on every node while a listener is:

- external: accepts public traffic
- internal: accepts only trusted cluster/service traffic
- disabled: no listener is exposed for that protocol

A service may therefore be reachable internally without being exposed to the Internet.

## Architecture

```
Internet
   |
   v
Bunny DNS / upstream traffic steering
   |
   +-------------------------------+
   |               |               |
   v               v               v
 Edge A          Edge B          Edge C
   |               |               |
   +---------------+---------------+
                   |
             service discovery
                   |
        +----------+----------+
        |          |          |
        v          v          v
    Database   Identity     Voice
        |          |          |
        +----------+----------+
                   |
                   v
              Unlayer HA
```

HA does not proxy application traffic. Edge does not implement consensus. They are complementary systems.

## Outbound traffic

Outbound traffic normally originates directly from the service that needs it. Edge should only become an egress gateway when a workload explicitly requires:

- shared NAT/egress IPs
- centralized firewall policy
- proxying
- allow/deny policy
- audit requirements
- protocol translation
- controlled internet access

This avoids making Edge a mandatory bottleneck for east-west or ordinary outbound traffic.

## Roadmap

See [EDGE.md](./EDGE.md) for the architecture and [todo/](./todo/) for the implementation plan.
