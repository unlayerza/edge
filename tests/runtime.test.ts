import {describe,expect,test} from "bun:test";
import {EdgeRuntime} from "../src/runtime";

const config={host:"127.0.0.1",port:0,serviceTimeoutMs:500};

describe("Edge runtime",()=>{
  test("followers may serve traffic when healthy",()=>{
    const edge=new EdgeRuntime(config,[{prefix:"/v1/api",service:"api"}]);
    edge.setHAHealth({
      nodeId:"n1",status:"healthy",lifecycle:"active",
      quorum:true,fenced:true,membershipReady:true
    });
    expect(edge.health().ready).toBe(true);
  });

  test("fenced does not make an active-active Edge node unready",()=>{
    const edge=new EdgeRuntime(config,[]);
    edge.setHAHealth({
      nodeId:"n1",status:"healthy",lifecycle:"active",
      quorum:true,fenced:true,membershipReady:true
    });
    expect(edge.health().ready).toBe(true);
  });

  test("unhealthy or non-active HA state gates Edge",()=>{
    const edge=new EdgeRuntime(config,[]);
    edge.setHAHealth({
      nodeId:"n1",status:"unhealthy",lifecycle:"active",
      quorum:true,fenced:false,membershipReady:true
    });
    expect(edge.health().ready).toBe(false);
    edge.setHAHealth({
      nodeId:"n1",status:"healthy",lifecycle:"drain",
      quorum:true,fenced:false,membershipReady:true
    });
    expect(edge.health().ready).toBe(false);
  });
});
