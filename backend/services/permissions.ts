import {roleAllows} from '../../shared/domain.ts';
import type {State} from '../../shared/model.ts';
export const memberRoles=['Admin','CMO','Sales','Content Reviewer','Viewer'];
export function authorize(role:string,action:string,p:any,state:State){
 if(!roleAllows(role,action))throw new Error('Your workspace role cannot perform this action.');
 const kind=action==='item.create'?p.kind:state.items.find(i=>i.id===p.id)?.kind;
 if(role==='Sales'&&action.startsWith('item.')&&!['task','demo'].includes(kind||''))throw new Error('Sales can edit meetings and tasks; content requires a reviewer.');
 if(role==='Content Reviewer'&&/^(item\.|approval\.)/.test(action)&&kind!=='post')throw new Error('Content reviewers may review social posts only.');
}
export function validateMember(actorRole:string,owner:string,userId:string,role:string){
 if(actorRole!=='Founder')throw new Error('Only the workspace founder can manage access.');
 if(!userId||userId.length>200||/\s/.test(userId))throw new Error('Enter the exact account ID from your teammate’s Account & team page.');
 if(userId===owner)throw new Error('The founder’s access cannot be changed.');
 if(!memberRoles.includes(role))throw new Error('Choose a valid team role.');
}
