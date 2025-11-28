import type { ProfileData } from '$lib/types/profile';

export async function fetchProfileData(profileUrl: string) {
	let profileData: ProfileData = {};
	let fetchProfileError: string | null = null;

	if (profileUrl) {
		try {
			const response = await fetch(profileUrl);
			if (response.ok) {
				profileData = await response.json();
			} else {
				fetchProfileError = 'STATUS-' + response.status;
			}
		} catch (err) {
			console.error('Error fetching profile data:', err);
			if (err instanceof Error) {
				if (err.message === 'Failed to fetch') {
					fetchProfileError = 'CORS';
				} else {
					fetchProfileError = err.message;
				}
			} else {
				fetchProfileError = 'UNKNOWN';
			}
		}
	}

	return { profileData, fetchProfileError };
}

export async function validateProfileData(profileData: ProfileData, dataUrl: string) {
	try {
		const url = new URL(dataUrl);
		const response = await fetch(`${url.origin}/v2/validate`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(profileData)
		});
		return response.ok;
	} catch (err) {
		console.error('Error validating profile data:', err);
		return false;
	}
}

export async function fetchProfiles(indexUrl: string, queryUrl: string) {
	const fullUrl = `${indexUrl}${queryUrl}`;
	const response = await fetch(fullUrl);

	if (!response.ok) {
		throw new Error('Failed to fetch nodes');
	}

	const data = await response.json();
	const profiles = toCamelCase(data?.data ?? []);
	const meta = data?.meta;

	return { rawNodes: profiles, meta };
}

export function toCamelCase<T extends Record<string, unknown>>(obj: T): T {
	if (Array.isArray(obj)) {
		return obj.map((v) => toCamelCase(v)) as unknown as T;
	} else if (obj !== null && typeof obj === 'object') {
		const result = {} as Record<string, unknown>;
		for (const [key, value] of Object.entries(obj)) {
			const camelKey = key.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
			result[camelKey] =
				value && typeof value === 'object' ? toCamelCase(value as Record<string, unknown>) : value;
		}
		return result as T;
	}
	return obj;
}

export async function processProfile(profile: ProfileData, sourceIndex: string) {
	const { profileData, fetchProfileError } = await fetchProfileData(profile.profileUrl as string);
	let isValid = false;
	let unavailableMessage = '';

	if (fetchProfileError) {
		unavailableMessage = fetchProfileError;
	} else if (profileData && Object.keys(profileData).length > 0) {
		isValid = await validateProfileData(profileData, sourceIndex);
		if (!isValid) {
			unavailableMessage = 'Invalid Profile Data';
		}
	}

	return {
		profile_data: profileData,
		is_available: !!profileData && isValid,
		status: !profileData || !isValid ? 'ignore' : 'new',
		unavailable_message: unavailableMessage
	};
}

export function checkProfileAuthority(
	authorityMap: string[],
	originPrimaryUrl: string,
	originProfileUrl: string
) {
	if (!originPrimaryUrl || !originProfileUrl) {
		return 1;
	}

	try {
		if (originPrimaryUrl === 'https://') {
			console.log('Authority: Invalid URL');
			return 1;
		}

		const primaryUrl = new URL(addDefaultScheme(originPrimaryUrl));
		const profileUrl = new URL(addDefaultScheme(originProfileUrl));

		if (!primaryUrl.protocol.startsWith('http') || !profileUrl.protocol.startsWith('http')) {
			console.log('Authority: Invalid protocol');
			return 1;
		}

		// If the primary URL is in the authority map, it means that the primary URL has other profiles that have authority, so if the profile URL is not the same as the primary URL, it does not have authority
		if (authorityMap.includes(primaryUrl.hostname) && primaryUrl.hostname !== profileUrl.hostname) {
			return 0;
		}

		return 1;
	} catch (error) {
		console.log('Error checking profile authority:', error);
		return 1;
	}
}

function addDefaultScheme(url: string) {
	if (url !== undefined && !url?.startsWith('http://') && !url?.startsWith('https://')) {
		return 'https://' + url;
	}
	return url;
}
