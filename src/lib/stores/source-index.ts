import { writable } from 'svelte/store';

export const sourceIndexStore = (() => {
	// Read from localStorage
	let stored: number | null = null;

	if (typeof localStorage !== 'undefined') {
		const raw = localStorage.getItem('selectedSourceIndexId');
		stored = raw ? Number(raw) : null;
	}

	// Create store
	const { subscribe, set, update } = writable<number | null>(stored);

	// Write to localStorage whenever the store changes
	subscribe((val) => {
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('selectedSourceIndexId', val === null ? '' : String(val));
		}
	});

	return { subscribe, set, update };
})();
