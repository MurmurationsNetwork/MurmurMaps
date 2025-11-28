import { request } from '$lib/api/request';
import type { Capability, CapabilityCreateInput } from '$lib/types/capability';

export const getCapabilities = (customFetch?: typeof fetch) =>
	request<undefined, Capability[]>('/api/admin/capabilities', 'GET', undefined, customFetch);

export const createCapability = (capability: CapabilityCreateInput, customFetch?: typeof fetch) =>
	request<CapabilityCreateInput, Capability>(
		'/api/admin/capabilities',
		'POST',
		capability,
		customFetch
	);
