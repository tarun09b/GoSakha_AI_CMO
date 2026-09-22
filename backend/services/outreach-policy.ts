import {assertClaims} from '../../shared/domain.ts';
import type {State,Item} from '../../shared/model';
const day=(d:string)=>new Date(d).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
export function assertSendable(state:State,item:Item|undefined){if(!item||item.kind!=='email')throw new Error('Email draft not found.');assertClaims(item);if(item.status!=='Approved'||!item.decisionAt)throw new Error('A recorded human approval is required before sending.');if(state.settings.paused||state.disabledAgents.includes('Gmail Agent')||state.disabledAgents.includes('Email Outreach'))throw new Error('Email outreach is paused or disabled.');const l=state.leads.find(l=>l.id===item.leadId);if(!l||l.optOut||l.archived)throw new Error('Contact is missing or opted out. Sending is blocked.');if(!item.due||Date.parse(item.due)>Date.now())throw new Error('This email is not due yet.');const consumed=state.items.filter(i=>i.kind==='email'&&['Sent','Replied','Sending','Delivery uncertain'].includes(i.status)&&day(i.sentAt||i.createdAt)===day(new Date().toISOString())).length;if(consumed>=state.settings.dailyCap)throw new Error('Daily email cap reached.');if(item.sequenceId){const seq=state.items.find(i=>i.id===item.sequenceId);if(!seq||seq.status==='Stopped')throw new Error('Sequence is stopped.');if(item.step&& !state.items.some(i=>i.sequenceId===item.sequenceId&&i.step===item.step!-1&&i.status==='Sent'))throw new Error('The previous sequence email has not been confirmed sent.');}return l}

export function reservationCanSend(state:State,id:string){
 const i=state.items.find(i=>i.id===id);if(!i||i.status!=='Sending')return false;
 const l=state.leads.find(l=>l.id===i.leadId);
 if(!l||l.optOut||l.archived||state.settings.paused||state.disabledAgents.includes('Gmail Agent')||state.disabledAgents.includes('Email Outreach'))return false;
 if(i.sequenceId&&!state.items.some(s=>s.id===i.sequenceId&&s.status!=='Stopped'))return false;
 return !state.items.some(r=>r.kind==='reply'&&r.leadId===i.leadId&&r.createdAt>=(i.sentAt||i.createdAt));
}
