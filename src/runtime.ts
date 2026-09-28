import {EdgeRouter,MemoryServiceDirectory,type Route} from "./router";
import type {EdgeConfig,HAHealth} from "./types";

export class EdgeRuntime{
  readonly directory=new MemoryServiceDirectory();
  readonly router:EdgeRouter;
  private ha:HAHealth|null=null;
  private ready=false;
  private startedAt=Date.now();

  constructor(
    readonly config:EdgeConfig,
    routes:Route[]
  ){
    this.router=new EdgeRouter(this.directory,routes);
  }

  setHAHealth(state:HAHealth){
    this.ha={...state};
    this.ready=this.trafficReady(state);
  }

  setReady(value:boolean){this.ready=value}

  trafficReady(state:HAHealth){
    return state.membershipReady
      && ["healthy","degraded"].includes(state.status)
      && ["ready","active"].includes(state.lifecycle);
  }

  health(){
    return {
      status:"ok",
      live:true,
      ready:this.ready,
      startedAt:this.startedAt,
      ha:this.ha
    };
  }

  async fetch(req:Request):Promise<Response>{
    const url=new URL(req.url);
    if(url.pathname==="/healthz")return Response.json(this.health());
    if(url.pathname==="/readyz")return new Response(
      this.ready?"ready":"not ready",
      {status:this.ready?200:503}
    );
    if(url.pathname==="/routes"){
      return Response.json({routes:this.router,ha:this.ha});
    }
    if(!this.ready)return new Response("edge not ready",{status:503});
    const match=this.router.route(url.pathname);
    if(!match)return new Response("not found",{status:404});
    return this.router.proxy(req,match);
  }
}
