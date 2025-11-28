import type { Delegation } from '$lib/types/delegation';

import { writable } from 'svelte/store';

export const rootTokenStore = writable<string | null>(null);
export const currentTokenStore = writable<string | null>(null);
export const delegationsStore = writable<Delegation[]>([]);
export const selectedDelegationStore = writable<string | null>(null);
