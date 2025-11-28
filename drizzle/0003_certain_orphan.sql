CREATE TABLE `cluster_schemas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cluster_uuid` text NOT NULL,
	`schema_json` text NOT NULL,
	`fetched_at` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`cluster_uuid`) REFERENCES `clusters`(`cluster_uuid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clusters_cluster_uuid_unique` ON `clusters` (`cluster_uuid`);