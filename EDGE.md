# Unlayer Edge Architecture

## Purpose

Unlayer Edge is the traffic entry and gateway layer for the Unlayer distributed platform.

It provides a stable network boundary while allowing workloads to move between nodes without changing the service architecture.

## Separation of concerns

### Edge owns

- ingress
- listeners
- protocol detection
- proxying
- routing
- service discovery
- load balancing
- connection lifecycle
- exposure policy
- TLS
- traffic controls
- egress gateways when configured
- DNS/provider integration

### HA owns

- node identity
- membership
- cluster health
- terms/epochs
- leader election
- quorum
- fencing
- cluster lifecycle
- authoritative coordination

### Workloads own

Database:
- database state
- replication
- WAL/change streams
- snapshots
- recovery
- PITR

Identity:
- users
- sessions
- credentials
- organizations
- authorization

Voice:
- SIP signalling
- registrations
- calls
- numbers
- trunks
- CDRs
- media coordination

## Active-active Edge

Edge should be active-active by default.

Multiple nodes may simultaneously accept traffic. No single Edge node is required to be the global leader.

A node may become unavailable without requiring an Edge-wide election.

```
             public traffic
                   |
       +-----------+-----------+
       |           |           |
     Edge A      Edge B      Edge C
       |           |           |
       +-----------+-----------+
                   |
             service routing
```

HA is still used for node validity and cluster coordination, but ordinary traffic does not need to traverse the HA leader.

## Exposure modes

Each node can run Edge with independent exposure configuration.

```
edge.enabled = true

listeners:
  http:
    mode = external
  sip:
    mode = external
  admin:
    mode = internal
```

Modes:

### external

The listener may accept Internet-originated traffic.

### internal

The listener is available to trusted cluster/service traffic but is not advertised as a public endpoint.

Internal does not mean "security through obscurity". Authentication, authorization, TLS, source policy, and explicit listener binding remain required.

### disabled

The listener is not started.

This allows every node to run the Edge process while exposing only selected protocols.

## Network model

The first implementation should not require a dedicated private network.

Where nodes have only publicly routable addresses, Edge can still distinguish external and internal traffic through:

- explicit listener bindings
- source/address policy
- mTLS or service authentication
- signed service identity
- HA membership
- firewall rules
- protocol-specific authorization

A private/overlay network can be added later for stronger east-west isolation, but it is not a prerequisite for the Edge architecture.

## Entry points

Unlayer can expose multiple stable DNS names:

- api.unlayer.network
- voice.unlayer.network
- sip.unlayer.network
- db.unlayer.network
- custom service domains

Bunny DNS may advertise multiple Edge endpoints for a service. The exact provider steering mechanism remains provider-specific and should be isolated behind a DNS/provider adapter.

## Bunny integration

Edge should integrate with Bunny through an adapter rather than hard-code provider behavior into the routing core.

The adapter can manage:

- endpoint registration
- health state publication where supported
- DNS record updates
- endpoint removal
- traffic steering configuration
- failover
- reconciliation

A DNS Script is an optional future mechanism, not a required part of Edge.

## SIP

SIP should be able to reach Edge before Voice.

```
SIP client/carrier
       |
       v
     Edge
       |
       v
     Voice
```

Edge should support transparent TCP/UDP/TLS SIP transport forwarding without becoming responsible for SIP call semantics.

Voice remains responsible for SIP protocol semantics, authentication, registrations, routing, and calls.

RTP/media should not be forced through Edge unless a media gateway or explicit media policy requires it.

## HTTP/API

```
client
  |
  v
Edge
  |
  +-- /v1/identity/*  -> Identity
  +-- /v1/databases/* -> Database
  +-- /v1/voice/*     -> Voice
  +-- /v1/*           -> other services
```

Routing must be service-discovery driven rather than a hard-coded list of node addresses.

## Service discovery

Edge discovers service instances from a control-plane contract backed by HA.

A service instance should expose:

- service name
- instance ID
- node ID
- protocol
- address
- port
- exposure
- readiness
- health
- capacity metadata
- current generation/configuration
- draining state

Edge must never route to a node that HA or the service reports as fenced, failed, or not ready.

## Configuration-driven workloads

The node should have a declarative configuration describing enabled workloads.

Example:

```yaml
node:
  id: mc-03

services:
  edge:
    enabled: true
    listeners:
      http:
        mode: external
      sip:
        mode: external
      admin:
        mode: internal

  database:
    enabled: true

  identity:
    enabled: false

  voice:
    enabled: false
```

This allows a small two-node deployment to run everything and later expand without redesigning the cluster.

Example:

```
MC1: Edge + Database + Identity + Voice
MC2: Edge + Database + Identity + Voice

        add MC3

MC1: Edge + Database
MC2: Edge + Identity + Voice
MC3: Edge + Database
```

All three can still run Edge, while only selected nodes advertise particular workload endpoints.

## Outbound

Default:

```
service -> Internet
```

not:

```
service -> Edge -> Internet
```

Edge becomes an egress path only when explicitly configured.

Possible future egress modes:

- direct
- shared NAT
- fixed source IP
- HTTP proxy
- TCP proxy
- policy gateway
- audited egress

This prevents Edge from becoming an unnecessary single chokepoint.

## Failure model

If an Edge node fails:

1. HA marks the node unavailable.
2. Edge stops advertising affected endpoints.
3. Bunny/provider steering removes or deprioritizes the endpoint according to the configured policy.
4. Existing connections fail or drain according to protocol semantics.
5. Other Edge nodes continue accepting traffic.
6. When the node returns, it rejoins and becomes ready only after health checks pass.

If a workload fails while Edge remains healthy, Edge removes only that workload instance from routing.

## Production invariants

- Edge must be active-active.
- No global Edge leader is required for ordinary traffic.
- HA must remain independent of Edge.
- A fenced node must never receive new authoritative workload traffic.
- Routing must be health/readiness aware.
- Internal exposure must not depend on public advertisement.
- Outbound traffic must not require Edge by default.
- SIP signalling and media must remain separate concerns.
- DNS/provider integration must be replaceable.
- Configuration must be deterministic and reloadable.
