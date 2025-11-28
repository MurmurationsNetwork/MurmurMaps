import type { roles } from '$lib/server/db/schema';

export type Role = typeof roles.$inferSelect;

export type RoleInsert = typeof roles.$inferInsert;

export type RoleCreateInput = Omit<Role, 'id' | 'createdAt' | 'updatedAt'>;
