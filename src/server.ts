import {EdgeRuntime} from "./runtime";

const env=Bun.env;
const config={
  host:env.EDGE_HOST||"0.0.0.0",
  port:Number(env.EDGE_PORT||8080),
  serviceTimeoutMs:Number(env.EDGE_SERVICE_TIMEOUT_MS||5000)
};

const edge=new EdgeRuntime(config,[
  {prefix:"/v1/identity",service:"identity"},
  {prefix:"/v1/database",service:"database"},
  {prefix:"/v1/voice",service:"voice"}
]);

const localNode=env.HA_NODE_ID||"edge-local";
edge.setHAHealth({
  nodeId:localNode,
  status:"healthy",
  lifecycle:"active",
  quorum:true,
  fenced:true,
  membershipReady:true
});

Bun.serve({
  hostname:config.host,
  port:config.port,
  fetch:req=>edge.fetch(req)
});

console.log(`Unlayer Edge listening on ${config.host}:${config.port}`);
