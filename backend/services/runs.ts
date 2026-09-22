import {database} from './storage';
export async function monitored<T>(workspace:string,agent:string,action:string,entityId:string,fn:()=>Promise<T>){
 const id=crypto.randomUUID();await database().prepare('INSERT INTO agent_runs (id,workspace,agent,action,status,started_at,entity_id) VALUES (?,?,?,?,?,?,?)').bind(id,workspace,agent,action,'Running',new Date().toISOString(),entityId).run();
 try{const value=await fn();await database().prepare('UPDATE agent_runs SET status=?,finished_at=?,message=? WHERE id=?').bind('Completed',new Date().toISOString(),'Completed',id).run();return value}catch(e){await database().prepare('UPDATE agent_runs SET status=?,finished_at=?,message=? WHERE id=?').bind('Failed',new Date().toISOString(),(e as Error).message.slice(0,500),id).run();throw e}
}
export async function runs(workspace:string){return (await database().prepare('SELECT * FROM agent_runs WHERE workspace=? ORDER BY started_at DESC LIMIT 100').bind(workspace).all()).results;}
