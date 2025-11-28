import type { loginTokens } from '$lib/server/db/schema';

export type LoginToken = typeof loginTokens.$inferSelect;

export type PageLoginToken = {
	token: LoginToken['token'];
	expiresAt: LoginToken['expiresAt'];
	expiresIn: number;
};
