import type { loginTokens } from '#lib/server/db/schema.ts';

export type LoginToken = typeof loginTokens.$inferSelect;

export type PageLoginToken = {
	token: LoginToken['token'];
	expiresAt: LoginToken['expiresAt'];
	expiresIn: number;
};
