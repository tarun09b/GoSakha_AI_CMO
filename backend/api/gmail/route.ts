import {gmailConfigured,health,gmailToken} from '@/backend/services/gmail';
import {sendApproved,syncReplies} from '@/backend/services/outreach';
import {access,requestBody} from '@/backend/services/access';
import {monitored} from '@/backend/services/runs';
export async function GET(){try{await access(false);return Response.json({configured:gmailConfigured()})}catch{return Response.json({configured:false})}}
export async function POST(req:Request){try{const p=await requestBody(req),u=await access(false);if(!['Founder','Admin','CMO'].includes(u.role))throw new Error('An Admin or CMO role is required to operate Gmail.');const result=await monitored(u.key,'Gmail Agent',p.action,p.id||'',async()=>{if(p.action==='health')return await health();if(p.action==='sync'){await syncReplies(u.key,await gmailToken());return {synced:true}}if(p.action==='send'&&typeof p.id==='string')return await sendApproved(u.key,p.id);throw new Error('Unknown Gmail action.')});return Response.json(result)}catch(e){return Response.json({message:(e as Error).message},{status:400})}}
