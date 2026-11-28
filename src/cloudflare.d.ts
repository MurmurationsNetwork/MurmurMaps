// Bindings and context exposed by the Cloudflare runtime. Since SvelteKit 3 these
// are imported from `cloudflare:workers` instead of being read from `platform`.
declare module 'cloudflare:workers' {
	import type { D1Database, Queue } from '@cloudflare/workers-types';

	export const env: {
		DB: D1Database;
		JOB_QUEUE: Queue;
	};
	export function waitUntil(promise: Promise<unknown>): void;
}
