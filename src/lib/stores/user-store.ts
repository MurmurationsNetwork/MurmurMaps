import type { User } from '$lib/types/user';

import { writable } from 'svelte/store';

export const userStore = writable<User | null>(null);
