import type { capabilities } from '$lib/server/db/schema';

export type Capability = typeof capabilities.$inferSelect;

export type CapabilityInsert = typeof capabilities.$inferInsert;

export type CapabilityCreateInput = Omit<Capability, 'id' | 'createdAt' | 'updatedAt'>;
