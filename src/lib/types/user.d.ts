import type { users } from '#lib/server/db/schema.ts';

export type User = typeof users.$inferSelect;

export type UserWithRoles = User & {
	roles: string[];
};
