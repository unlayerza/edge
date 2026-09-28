# Unlayer Edge

Unlayer Edge is the active-active ingress and gateway layer for Unlayer services.

The first runtime is intentionally small and Bun-native:

- HTTP ingress
- health/readiness endpoints
- service-directory based routing
- round-robin active-active upstream selection
- upstream health/readiness/draining gates
- HA readiness integration without requiring Edge to become leader
- no external runtime dependencies

## Run

    bun test
    EDGE_PORT=8080 bun run src/server.ts

The current runtime uses an in-process service directory. The next integration step is to bind that directory to HA service membership and real workload readiness, then add sustained HTTP flood and fault-injection tests.

See [EDGE.md](./EDGE.md) for the architecture contract.
