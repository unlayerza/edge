export type EdgeExposure="external"|"internal"|"disabled";

export interface EdgeInstance{
  id:string;
  service:string;
  address:string;
  healthy:boolean;
  ready:boolean;
  draining?:boolean;
}

export interface HAHealth{
  nodeId:string;
  status:string;
  lifecycle:string;
  quorum:boolean;
  fenced:boolean;
  membershipReady:boolean;
}

export interface EdgeConfig{
  host:string;
  port:number;
  serviceTimeoutMs:number;
}

export interface ServiceDirectory{
  instances(service:string):EdgeInstance[];
}
