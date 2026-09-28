import {describe,expect,test} from "bun:test";
import {MemoryServiceDirectory,EdgeRouter} from "../src/router";

describe("Edge routing",()=>{
  test("round robins healthy ready instances",()=>{
    const d=new MemoryServiceDirectory();
    d.set("api",[
      {id:"a",service:"api",address:"127.0.0.1:9001",healthy:true,ready:true},
      {id:"b",service:"api",address:"127.0.0.1:9002",healthy:true,ready:true}
    ]);
    const r=new EdgeRouter(d,[{prefix:"/v1/api",service:"api"}]);
    expect(r.route("/v1/api/users")?.target.id).toBe("a");
    expect(r.route("/v1/api/users")?.target.id).toBe("b");
  });

  test("never routes to unhealthy, unready or draining instances",()=>{
    const d=new MemoryServiceDirectory();
    d.set("api",[
      {id:"bad-health",service:"api",address:"127.0.0.1:9001",healthy:false,ready:true},
      {id:"bad-ready",service:"api",address:"127.0.0.1:9002",healthy:true,ready:false},
      {id:"draining",service:"api",address:"127.0.0.1:9003",healthy:true,ready:true,draining:true},
      {id:"good",service:"api",address:"127.0.0.1:9004",healthy:true,ready:true}
    ]);
    const r=new EdgeRouter(d,[{prefix:"/v1/api",service:"api"}]);
    expect(r.route("/v1/api/x")?.target.id).toBe("good");
  });

  test("uses longest matching route",()=>{
    const d=new MemoryServiceDirectory();
    d.set("api",[{id:"api",service:"api",address:"127.0.0.1:9001",healthy:true,ready:true}]);
    d.set("special",[{id:"special",service:"special",address:"127.0.0.1:9002",healthy:true,ready:true}]);
    const r=new EdgeRouter(d,[
      {prefix:"/v1",service:"api"},
      {prefix:"/v1/special",service:"special"}
    ]);
    expect(r.route("/v1/special/x")?.target.id).toBe("special");
  });
});
