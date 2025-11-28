CREATE TABLE `capabilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`scheme` text NOT NULL,
	`hier_part` text NOT NULL,
	`namespace` text NOT NULL,
	`segments` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `role_capabilities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`role_id` integer NOT NULL,
	`capability_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`capability_id`) REFERENCES `capabilities`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `capabilities` (`scheme`, `hier_part`, `namespace`, `segments`)
VALUES
  ('api', '/clusters', 'clusters', 'POST'),
  ('api', '/clusters/*', 'clusters', 'PUT'),
  ('api', '/clusters/*', 'clusters', 'DELETE'),
  ('api', '/clusters/*/nodes', 'clusters', 'POST'),
  ('api', '/clusters/*/nodes/*', 'clusters', 'PUT'),
  ('api', '/clusters/*/update-timestamp', 'clusters', 'PATCH'),

  ('api', '/emails', 'emails', 'GET'),
  ('api', '/emails', 'emails', 'POST'),
  ('api', '/emails', 'emails', 'DELETE'),
  ('api', '/emails/send-reset-request', 'emails', 'POST'),

  ('api', '/keys', 'keys', 'GET'),
  ('api', '/keys', 'keys', 'DELETE'),

  ('api', '/profiles', 'profiles', 'GET'),
  ('api', '/profiles', 'profiles', 'POST'),
  ('api', '/profiles/*', 'profiles', 'GET'),
  ('api', '/profiles/*', 'profiles', 'PATCH'),
  ('api', '/profiles/*', 'profiles', 'DELETE'),
  ('api', '/profiles/*/update-node-id', 'profiles', 'PUT'),

  ('api', '/source-indexes', 'source-indexes', 'POST'),
  ('api', '/source-indexes/*', 'source-indexes', 'PUT'),
  ('api', '/source-indexes/*', 'source-indexes', 'DELETE'),

  ('api', '/tokens', 'tokens', 'GET'),
  ('api', '/tokens', 'tokens', 'POST'),
  ('api', '/tokens', 'tokens', 'DELETE'),

  ('api', '/users', 'users', 'GET'),
  ('api', '/users/email-reset', 'users', 'PATCH'),

  ('api', '/batches', 'batches', 'GET'),
  ('api', '/batches', 'batches', 'POST'),
  ('api', '/batches', 'batches', 'PUT'),
  ('api', '/batches', 'batches', 'DELETE'),

  ('api', '/admin/users', 'admin-users', 'GET'),
  ('api', '/admin/users/*/roles', 'admin-users', 'GET'),
  ('api', '/admin/users/*/roles', 'admin-users', 'POST'),

  ('api', '/admin/roles', 'admin-roles', 'GET'),
  ('api', '/admin/roles', 'admin-roles', 'POST'),
  ('api', '/admin/roles/*/capabilities', 'admin-roles', 'GET'),
  ('api', '/admin/roles/*/capabilities', 'admin-roles', 'POST'),

  ('api', '/admin/capabilities', 'admin-capabilities', 'GET'),
  ('api', '/admin/capabilities', 'admin-capabilities', 'POST'),

  ('page', '/', 'admin', 'GET'),
  ('page', '/clusters', 'admin', 'GET'),
  ('page', '/emails', 'admin', 'GET'),
  ('page', '/source-indexes', 'admin', 'GET'),  
  ('page', '/users', 'admin', 'GET'),
  ('page', '/roles', 'admin', 'GET'),
  ('page', '/capabilities', 'admin', 'GET'),
  ('page', '/account-settings', 'client', 'GET'),
  ('page', '/generate-delegation', 'client', 'GET'),
  ('page', '/receive-delegation', 'client', 'GET');
--> statement-breakpoint
INSERT INTO `roles` (`name`, `description`)
VALUES
  ('Root', 'Super admin user'),
  ('User', 'Default user');
--> statement-breakpoint
INSERT INTO `role_capabilities` (`role_id`, `capability_id`)
SELECT 
  (SELECT id FROM roles WHERE name = 'Root'),
  id
FROM capabilities;
--> statement-breakpoint
INSERT INTO `role_capabilities` (`role_id`, `capability_id`)
SELECT r.id, c.id
FROM roles r
JOIN capabilities c
WHERE r.name = 'User'
  AND c.namespace IN ('client', 'profiles', 'users', 'emails', 'batches', 'keys', 'tokens');
