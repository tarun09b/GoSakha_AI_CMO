import {mutate,record,uid,type State} from '../../shared/model.ts';
export const sampleAgents=['Email Outreach','LinkedIn Agent','Instagram Agent','CRM Agent','AI CMO Brain'] as const;
export function runSampleWorkflow(state:State,agent:string){
 if(!sampleAgents.includes(agent as any))throw new Error('Choose a supported sample workflow.');
 if(state.disabledAgents.includes(agent))throw new Error('Enable this agent before running its sample workflow.');
 const s=structuredClone(state),runId=uid(),startedAt=new Date().toISOString(),before=new Set(s.events.map(e=>e.id));
 record(s,'WORKFLOW_STARTED',agent,'Sample workflow started; no external provider will be contacted.');
 try{
  if(agent==='Email Outreach'){const l=s.leads.find(l=>!l.archived&&!l.optOut);if(!l)throw new Error('Add an active hospital first.');mutate(s,'email.draft',{leadId:l.id,sequence:true},'Sample operator',true)}
  if(agent==='LinkedIn Agent'||agent==='Instagram Agent'){mutate(s,'content.generate',{channel:agent==='LinkedIn Agent'?'LinkedIn':'Instagram'},'Sample operator',true);record(s,agent==='LinkedIn Agent'?'LINKEDIN_DRAFT_CREATED':'INSTAGRAM_DRAFT_CREATED',agent,'Sample Sakha product draft created. Human approval is required.',s.items[0].id)}
  if(agent==='CRM Agent'){const l=s.leads.find(l=>!l.archived&&!l.optOut);if(!l)throw new Error('Add an active hospital first.');mutate(s,'item.create',{kind:'demo',title:'Sakha demo · '+l.name,body:'Fictional product demo with '+l.contact+'. Show voice call handling, specialist routing, booking and staff call dashboard. No invitation sent.',channel:'Meeting',leadId:l.id,due:new Date(Date.now()+86400000).toISOString()},'Sample operator',true)}
  if(agent==='AI CMO Brain')mutate(s,'plan.create',{},'Sample operator',true);
  record(s,'WORKFLOW_COMPLETED',agent,'Sample workflow completed. Open the linked records to review the result.');
 }catch(e){record(s,'WORKFLOW_FAILED',agent,(e as Error).message)}
 const added=s.events.filter(e=>!before.has(e.id));for(const e of added){e.workflowRunId=runId;e.correlationId=runId;e.simulated=true;e.productId='sakha';e.status=e.type==='WORKFLOW_FAILED'?'Failed':e.type==='WORKFLOW_STARTED'?'Started':'Completed';const i=s.items.find(i=>i.id===e.entityId);e.hospitalId=i?.leadId||(s.leads.some(l=>l.id===e.entityId)?e.entityId:'');e.campaignId=i?.campaignId||'';e.metadata={provider:'Deterministic mock',externalAction:false}}
 const failed=added.find(e=>e.type==='WORKFLOW_FAILED');s.mockRuns=[{id:runId,agent,action:'mock.workflow',status:failed?'Failed':'Completed',started_at:startedAt,finished_at:new Date().toISOString(),message:failed?.message||'Mock records and events created; no external action.'},...(s.mockRuns||[])].slice(0,100);return s;
}
