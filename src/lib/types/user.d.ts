import type { users } from '$lib/server/db/schema';

export type User = typeof users.$inferSelect;

export type UserWithRoles = User & {
	roles: string[];
};
