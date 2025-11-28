ALTER TABLE `profiles` ADD `source_index_id` integer DEFAULT NULL REFERENCES source_indexes(id);--> statement-breakpoint
ALTER TABLE `source_indexes` ADD `data_proxy_url` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `source_indexes` ADD `deleted_at` integer DEFAULT (NULL);