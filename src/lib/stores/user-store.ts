import type { User } from '#lib/types/user.d.ts';

import { writable } from 'svelte/store';

export const userStore = writable<User | null>(null);
