import { dbStatus } from '$lib/stores/db-status';

export function checkDbStatus(): void {
	const checkStatus = async () => {
		try {
			const response = await fetch('/api/health-check/db');
			dbStatus.set(response.ok);
		} catch (err) {
			console.error('Error checking DB status:', err);
			dbStatus.set(false);
		}
	};

	// Immediately check DB status on load
	checkStatus();

	// Check DB status every 5 seconds
	setInterval(checkStatus, 5000);
}
