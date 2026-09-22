import {getChatGPTUser} from '@/backend/auth/chatgpt-auth';
import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {database} from './storage';
import {memberRoles} from './permissions';
import type {State} from '../../shared/model';
export async function access(sample=false){
 const u=await getChatGPTUser()||(import.meta.env.DEV?{userId:'local-preview',displayName:'Preview operator',email:'preview@example.com'}:null);
 if(!u)throw new Error('Sign in with ChatGPT first.');
 const c=env as unknown as Record<string,string>;
 const cookie=(await headers()).get('cookie')||'';let selected='';try{selected=decodeURIComponent(cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('cmo_workspace='))?.slice(14)||'')}catch{}
 const owner=c.CMO_OWNER_USER_ID||selected||u.userId;let role='Founder';
 if(owner!==u.userId){
  let team:Record<string,string>={};if(c.CMO_OWNER_USER_ID){try{team=JSON.parse(c.CMO_TEAM_MEMBERS||'{}')}catch{throw new Error('Team access configuration is invalid.')}}
  const membership=await database().prepare('SELECT role FROM workspace_members WHERE owner=? AND user_id=?').bind(owner,u.userId).first<{role:string}>();
  role=membership?.role||team[u.userId]||'Denied';if(!memberRoles.includes(role))throw new Error('You do not have access to this workspace. Open Account & team to switch back to your own workspace.');
 }
 return {...u,role,owner,key:owner+':'+(sample?'sample':'live')};
}
export {authorize} from './permissions';
export async function requestBody(req:Request){if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)throw new Error('Request origin not allowed.');const raw=await req.text();if(raw.length>30000)throw new Error('Request too large.');const b=JSON.parse(raw);if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('Invalid request.');return b;}
