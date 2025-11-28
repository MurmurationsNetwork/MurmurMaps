PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_clusters` (
	`id` integer PRIMARY KEY NOT NULL,
	`cluster_uuid` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`index_url` text NOT NULL,
	`query_url` text NOT NULL,
	`center_lat` real DEFAULT 46.603354 NOT NULL,
	`center_lon` real DEFAULT 1.888334 NOT NULL,
	`scale` integer DEFAULT 5 NOT NULL,
	`source_index_id` integer DEFAULT 1 NOT NULL,
	`last_updated` integer DEFAULT (unixepoch()) NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`source_index_id`) REFERENCES `source_indexes`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_clusters`("id", "cluster_uuid", "name", "description", "index_url", "query_url", "center_lat", "center_lon", "scale", "source_index_id", "last_updated", "created_at", "updated_at") SELECT "id", "cluster_uuid", "name", "description", "index_url", "query_url", "center_lat", "center_lon", "scale", "source_index_id", "last_updated", "created_at", "updated_at" FROM `clusters`;--> statement-breakpoint
DROP TABLE `clusters`;--> statement-breakpoint
ALTER TABLE `__new_clusters` RENAME TO `clusters`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `clusters_cluster_uuid_unique` ON `clusters` (`cluster_uuid`);