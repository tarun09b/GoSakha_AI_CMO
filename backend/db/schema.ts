import {sqliteTable,text,integer,primaryKey,index} from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('workspaces',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull().default(0)});

export const agentRuns=sqliteTable('agent_runs',{id:text('id').primaryKey(),workspace:text('workspace').notNull(),agent:text('agent').notNull(),action:text('action').notNull(),status:text('status').notNull(),startedAt:text('started_at').notNull(),finishedAt:text('finished_at'),message:text('message'),entityId:text('entity_id')});

export const workspaceMembers=sqliteTable('workspace_members',{owner:text('owner').notNull(),userId:text('user_id').notNull(),name:text('name').notNull(),role:text('role').notNull(),updatedAt:text('updated_at').notNull()},t=>[primaryKey({columns:[t.owner,t.userId]}),index('members_user_idx').on(t.userId)]);
