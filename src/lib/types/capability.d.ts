import type { capabilities } from '#lib/server/db/schema.ts';

export type Capability = typeof capabilities.$inferSelect;

export type CapabilityInsert = typeof capabilities.$inferInsert;

export type CapabilityCreateInput = Omit<Capability, 'id' | 'createdAt' | 'updatedAt'>;
