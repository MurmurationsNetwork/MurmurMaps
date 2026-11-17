import type { publicKeys } from '#lib/server/db/schema.ts';

export type PublicKey = typeof publicKeys.$inferSelect;
