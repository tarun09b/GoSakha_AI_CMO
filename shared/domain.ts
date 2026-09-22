import type {Lead,Item,State} from './model';
export const factCatalog=[
 {id:'HK-001',text:'Emergency symptom escalation directs callers to 112 or the emergency room',source:'GoSakha brochure',sensitive:true},
 {id:'HK-002',text:'Specialist routing based on described symptoms',source:'GoSakha brochure',sensitive:false},
 {id:'HK-003',text:'24/7 hospital call handling',source:'GoSakha brochure',sensitive:false},
 {id:'HK-004',text:'Appointment booking with reference numbers',source:'GoSakha brochure',sensitive:false}
];
export function isHotLead(l:Lead){return l.temperature==='Hot'&&!l.optOut&&!l.archived&&!['Won','Lost'].includes(l.stage)}
export function isUpcoming(i:Item,now=Date.now()){return i.kind==='demo'&&i.status==='Booked'&&Number.isFinite(Date.parse(i.due))&&Date.parse(i.due)>=now}
export function checkClaims(body:string,source=''){
 const flags:string[]=[];
 if(/\b(cure[sd]?|diagnos(?:e[sd]?|tic accuracy)|clinically proven|FDA.?approved|HIPAA.?compliant|guarantee[sd]?|100\s*%|replaces? (?:a |the )?doctor)\b/i.test(body))flags.push('Unsupported medical, certification or guaranteed-outcome claim.');
 const capability=/\b(sakha|specialist|appointment|24\s*[\/-]\s*7|emergency|triage|patient|symptom)\b/i.test(body);
 const facts=factCatalog.filter(f=>source.includes(f.id));
 if(capability&&facts.length===0)flags.push('Cite relevant brochure fact IDs before requesting review.');
 if(/\b(emergency|112|stroke|chest pain)\b/i.test(body)&&!facts.some(f=>f.id==='HK-001'))flags.push('Emergency statements require HK-001 and explicit human review.');
 return {status:flags.length?'Blocked':'Screened',flags,facts:facts.map(f=>f.id),sensitive:/emergency|112|symptom|triage/i.test(body),note:'Deterministic screening, not proof of claim validity. Human fact review remains required.'};
}
export function assertClaims(i:Item){if(['email','post'].includes(i.kind)){const c=checkClaims(i.title+'\n'+i.body,i.source);if(c.flags.length)throw new Error('Claim check: '+c.flags.join(' '));}}
export function metricsFor(s:State,campaignId?:string,since?:string){
 const ls=s.leads.filter(l=>!l.archived&&(!campaignId||l.campaignId===campaignId));
 const items=s.items.filter(i=>(!campaignId||i.campaignId===campaignId||ls.some(l=>l.id===i.leadId))&&(!since||i.createdAt>=since));
 const mail=items.filter(i=>i.kind==='email');const sent=mail.filter(i=>i.sentAt&&i.providerId);const replied=sent.filter(i=>i.status==='Replied');
 const complete=items.filter(i=>i.kind==='demo'&&i.status==='Completed');const interested=complete.filter(i=>i.outcome==='Interested');
 const posts=items.filter(i=>i.kind==='post'&&i.metrics);const impressions=posts.reduce((a,i)=>a+(i.metrics?.impressions||0),0);const engagements=posts.reduce((a,i)=>a+(i.metrics?.likes||0)+(i.metrics?.comments||0)+(i.metrics?.shares||0),0);
 const transitions=ls.flatMap(l=>{const h=l.stageHistory||[];return h.slice(1).map((x,n)=>(Date.parse(x.at)-Date.parse(h[n].at))/86400000).filter(n=>n>=0)}).sort((a,b)=>a-b);
 const median=transitions.length?(transitions[Math.floor((transitions.length-1)/2)]+transitions[Math.floor(transitions.length/2)])/2:null;
 return {leads:ls.length,hot:ls.filter(isHotLead).length,warm:ls.filter(l=>l.temperature==='Warm').length,cold:ls.filter(l=>l.temperature==='Cold').length,won:ls.filter(l=>l.stage==='Won').length,sent:sent.length,replied:replied.length,replyRate:sent.length?replied.length/sent.length:null,completed:complete.length,demoConversion:complete.length?interested.length/complete.length:null,impressions,engagementRate:impressions?engagements/impressions:null,velocity:median,overdue:items.filter(i=>i.kind==='task'&&i.status==='Open'&&i.due&&Date.parse(i.due)<Date.now()).length};
}
export function classifyReply(text:string){if(/unsubscribe|remove me|stop (?:email|contact)|do not contact|opt.?out/i.test(text))return 'Unsubscribe';if(/undeliverable|delivery.{0,20}fail|address.{0,20}not found/i.test(text))return 'Bounce';if(/not interested|already have|too expensive|not now|budget/i.test(text))return 'Objection';if(/schedule|book.{0,15}demo|interested|walkthrough|available|let.s meet/i.test(text))return 'Positive';return 'Neutral'}
export function roleAllows(role:string,action:string){if(role==='Admin'||role==='Founder')return true;if(role==='Viewer')return false;if(role==='CMO')return !/^(team\.|security\.|data\.erase|integration\.)/.test(action);if(role==='Sales')return /^(lead\.(create|update)|email\.(draft|reply)|demo\.|task\.|item\.(create|edit))/.test(action);if(role==='Content Reviewer')return /^(content\.|item\.(create|edit|submit)|approval\.)/.test(action);return false}
