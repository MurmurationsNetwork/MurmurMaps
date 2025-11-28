CREATE TABLE `source_indexes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`url` text NOT NULL,
	`label` text NOT NULL,
	`library_url` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `source_indexes_url_unique` ON `source_indexes` (`url`);
INSERT INTO `source_indexes` (`url`, `label`, `library_url`, `data_proxy_url`)
VALUES
  ('https://index.murmurations.network', 'Production Index', 'https://library.murmurations.network', 'https://data-proxy.murmurations.network'),
  ('https://test-index.murmurations.network', 'Test Index', 'https://test-library.murmurations.network', 'https://test-data-proxy.murmurations.network');