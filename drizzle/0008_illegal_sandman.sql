CREATE TABLE `jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_uuid` text NOT NULL,
	`type` text NOT NULL,
	`target_id` text NOT NULL,
	`target_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`total_nodes` integer DEFAULT 0 NOT NULL,
	`processed_nodes` integer DEFAULT 0 NOT NULL,
	`result` text,
	`error_message` text,
	`finished_at` integer,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_job_uuid_unique` ON `jobs` (`job_uuid`);