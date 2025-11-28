import type { publicKeys } from '$lib/server/db/schema';

export type PublicKey = typeof publicKeys.$inferSelect;
