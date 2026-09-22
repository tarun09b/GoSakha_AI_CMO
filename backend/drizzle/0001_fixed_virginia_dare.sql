CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace` text NOT NULL,
	`agent` text NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`message` text,
	`entity_id` text
);
