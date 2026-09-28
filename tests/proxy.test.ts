import {describe,expect,test} from "bun:test";
import {MemoryServiceDirectory,EdgeRouter} from "../src/router";

describe("Edge proxy",()=>{
  test("forwards requests to a healthy upstream and preserves response status",async()=>{
    const upstream=Bun.serve({
      port:0,
      fetch:req=>Response.json({path:new URL(req.url).pathname,method:req.method})
    });
    try{
      const directory=new MemoryServiceDirectory();
      directory.set("api",[{
        id:"api-1",service:"api",
        address:`127.0.0.1:${upstream.port}`,
        healthy:true,ready:true
      }]);
      const router=new EdgeRouter(directory,[{prefix:"/v1/api",service:"api"}]);
      const response=await router.proxy(
        new Request("http://edge.test/v1/api/users?x=1"),
        router.route("/v1/api/users")!
      );
      expect(response.status).toBe(200);
      expect(response.headers.get("x-unlayer-edge-node")).toBe("api-1");
      expect(await response.json()).toEqual({path:"/v1/api/users",method:"GET"});
    }finally{
      upstream.stop();
    }
  });
});
