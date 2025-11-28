PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_nodes` (
	`id` integer PRIMARY KEY NOT NULL,
	`cluster_uuid` text NOT NULL,
	`profile_url` text NOT NULL,
	`status` text DEFAULT 'ignore' NOT NULL,
	`is_available` integer DEFAULT 0 NOT NULL,
	`unavailable_message` text DEFAULT '',
	`has_authority` integer DEFAULT 1 NOT NULL,
	`last_updated` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	`data` text NOT NULL,
	`updated_data` text,
	`has_updated` integer DEFAULT 0 NOT NULL,
	`last_update_job_uuid` text,
	`last_unavailable_check_job_uuid` text,
	`last_authority_change_job_uuid` text,
	`is_deleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_nodes`("id", "cluster_uuid", "profile_url", "status", "is_available", "unavailable_message", "has_authority", "last_updated", "created_at", "updated_at", "data", "updated_data", "has_updated", "last_update_job_uuid", "last_unavailable_check_job_uuid", "last_authority_change_job_uuid", "is_deleted") SELECT "id", "cluster_uuid", "profile_url", "status", "is_available", "unavailable_message", "has_authority", "last_updated", "created_at", "updated_at", "data", "updated_data", "has_updated", "last_update_job_uuid", "last_unavailable_check_job_uuid", "last_authority_change_job_uuid", "is_deleted" FROM `nodes`;--> statement-breakpoint
DROP TABLE `nodes`;--> statement-breakpoint
ALTER TABLE `__new_nodes` RENAME TO `nodes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `jobs` ADD `payload` text;