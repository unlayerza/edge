import type {EdgeInstance,ServiceDirectory} from "./types";

const HOP_BY_HOP=new Set([
  "connection","keep-alive","proxy-authenticate","proxy-authorization",
  "te","trailer","transfer-encoding","upgrade"
]);

function copyHeaders(source:Headers):Headers{
  const out=new Headers();
  for(const [key,value] of source)if(!HOP_BY_HOP.has(key.toLowerCase()))out.set(key,value);
  return out;
}

export class MemoryServiceDirectory implements ServiceDirectory{
  private table=new Map<string,EdgeInstance[]>();
  private cursors=new Map<string,number>();

  set(service:string,instances:EdgeInstance[]){
    this.table.set(service,instances.map(x=>({...x})));
    this.cursors.set(service,0);
  }

  instances(service:string){
    return (this.table.get(service)||[]).map(x=>({...x}));
  }

  next(service:string):EdgeInstance|undefined{
    const candidates=this.instances(service).filter(x=>x.healthy&&x.ready&&!x.draining);
    if(!candidates.length)return;
    const cursor=this.cursors.get(service)||0;
    const target=candidates[cursor%candidates.length];
    this.cursors.set(service,(cursor+1)%candidates.length);
    return target;
  }
}

export interface Route{
  service:string;
  prefix:string;
}

export class EdgeRouter{
  constructor(
    private readonly directory:MemoryServiceDirectory,
    private readonly routes:Route[]=[]
  ){}

  route(pathname:string){
    const route=this.routes
      .filter(x=>pathname===x.prefix||pathname.startsWith(x.prefix.endsWith("/")?x.prefix:x.prefix+"/"))
      .sort((a,b)=>b.prefix.length-a.prefix.length)[0];
    if(!route)return;
    const target=this.directory.next(route.service);
    if(!target)return;
    return {route,target};
  }

  async proxy(req:Request,pathTarget:{service:string;target:EdgeInstance}):Promise<Response>{
    const incoming=new URL(req.url);
    const base=new URL(`http://${pathTarget.target.address}`);
    base.pathname=incoming.pathname;
    base.search=incoming.search;
    const init:RequestInit={
      method:req.method,
      headers:copyHeaders(req.headers),
      body:["GET","HEAD"].includes(req.method)?undefined:req.body,
      redirect:"manual"
    };
    try{
      const response=await fetch(base,init);
      const headers=copyHeaders(response.headers);
      headers.set("x-unlayer-edge-node",pathTarget.target.id);
      headers.set("x-unlayer-edge-service",pathTarget.service);
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    }catch{
      return new Response("upstream unavailable",{status:503});
    }
  }
}
