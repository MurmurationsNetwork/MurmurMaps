import { browser } from '$app/environment';

import { writable } from 'svelte/store';

export const sourceIndexStore = (() => {
	// Read from localStorage
	let stored: number | null = null;

	if (browser) {
		try {
			const raw = localStorage.getItem('selectedSourceIndexId');
			stored = raw ? Number(raw) : null;
		} catch (e) {
			console.error('localStorage might not be available', e);
			stored = null;
		}
	}

	// Create store
	const { subscribe, set, update } = writable<number | null>(stored);

	// Write to localStorage whenever the store changes
	subscribe((val) => {
		if (browser) {
			try {
				localStorage.setItem('selectedSourceIndexId', val === null ? '' : String(val));
			} catch (e) {
				console.error('localStorage might not be available', e);
			}
		}
	});

	return { subscribe, set, update };
})();
