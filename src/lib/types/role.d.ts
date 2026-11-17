import type { roles } from '#lib/server/db/schema.ts';

export type Role = typeof roles.$inferSelect;

export type RoleInsert = typeof roles.$inferInsert;

export type RoleCreateInput = Omit<Role, 'id' | 'createdAt' | 'updatedAt'>;
