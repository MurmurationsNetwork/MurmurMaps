ALTER TABLE `users` ADD `enable_site_hints` integer DEFAULT true NOT NULL;
--> statement-breakpoint
INSERT INTO `capabilities` (`scheme`, `hier_part`, `namespace`, `segments`)
VALUES
    ('api', '/users/site-hints', 'users', 'PATCH');
--> statement-breakpoint
INSERT INTO `role_capabilities` (`role_id`, `capability_id`)
SELECT 
    r.id,
    (SELECT id FROM capabilities WHERE scheme = 'api' AND hier_part = '/users/site-hints' AND namespace = 'users' AND segments = 'PATCH')
FROM roles r
WHERE r.name = 'User' OR r.name = 'Root';
