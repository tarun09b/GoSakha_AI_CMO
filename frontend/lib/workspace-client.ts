import type {State} from '../../shared/model.ts';

export type WorkspaceResponse={state:State;revision:number;role?:string;user?:string;readOnly?:boolean};
const object=(v:any)=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const strings=(v:any,keys:string[])=>object(v)&&keys.every(k=>typeof v[k]==='string');

export function validateWorkspace(data:any):WorkspaceResponse{
 const s=data?.state;
 const valid=object(s)&&Number.isInteger(data.revision)&&data.revision>=0
  &&Array.isArray(s.leads)&&s.leads.every((v:any)=>strings(v,['id','name','contact','email','location','type','source','temperature','stage','nextAction','notes','updatedAt'])&&typeof v.score==='number'&&Number.isFinite(v.score)&&typeof v.optOut==='boolean')
  &&Array.isArray(s.items)&&s.items.every((v:any)=>strings(v,['id','kind','title','body','status','channel','leadId','due','createdAt','source']))
  &&Array.isArray(s.events)&&s.events.every((v:any)=>strings(v,['id','type','actor','message','entityId','createdAt']))
  &&Array.isArray(s.disabledAgents)&&s.disabledAgents.every((v:any)=>typeof v==='string')
  &&strings(s.settings,['sender'])&&typeof s.settings.paused==='boolean'
  &&['followup1','followup2','dailyCap'].every(k=>typeof s.settings[k]==='number'&&Number.isFinite(s.settings[k]));
 if(!valid)throw new Error('Workspace returned invalid data. Retry or open the sample workspace.');
 return data;
}

// Bound both the network request and body parsing, even if a transport ignores abort.
export async function loadWorkspace({signal,timeoutMs=10000,fetcher=fetch}:{signal?:AbortSignal;timeoutMs?:number;fetcher?:typeof fetch}={}):Promise<WorkspaceResponse>{
 const controller=new AbortController();
 let timer:ReturnType<typeof setTimeout>|undefined;
 let cancel:()=>void=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{
  cancel=()=>{controller.abort();reject(new DOMException('Workspace request cancelled.','AbortError'))};
  timer=setTimeout(()=>{controller.abort();reject(new Error('Workspace request timed out after 10 seconds. Retry or open the sample workspace.'))},timeoutMs);
  if(signal?.aborted)cancel();else signal?.addEventListener('abort',cancel,{once:true});
 });
 const request=(async()=>{
  const response=await fetcher('/api/workspace?mode=live',{signal:controller.signal,cache:'no-store'});
  let data:any;
  try{data=await response.json()}catch{throw new Error(`Workspace returned an unreadable response (HTTP ${response.status}). Retry or open the sample workspace.`)}
  if(!response.ok)throw new Error(`Workspace request failed (HTTP ${response.status}). ${typeof data?.message==='string'?data.message:'Retry or open the sample workspace.'}`);
  return validateWorkspace(data);
 })();
 try{return await Promise.race([cancelled,request])}finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel)}
}
