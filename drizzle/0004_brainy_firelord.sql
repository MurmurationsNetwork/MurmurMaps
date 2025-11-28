CREATE TABLE `profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cuid` text NOT NULL,
	`user_id` integer NOT NULL,
	`linked_schemas` text,
	`title` text,
	`profile` text,
	`node_id` text,
	`last_updated` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_cuid_unique` ON `profiles` (`cuid`);