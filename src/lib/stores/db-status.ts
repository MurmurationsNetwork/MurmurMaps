import { writable, type Writable } from 'svelte/store';

export const dbStatus: Writable<boolean> = writable<boolean>(true);
