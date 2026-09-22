CREATE TABLE `workspace_members` (
	`owner` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`owner`, `user_id`)
);
--> statement-breakpoint
CREATE INDEX `members_user_idx` ON `workspace_members` (`user_id`);