export function toCamelCase<T = Record<string, unknown>>(obj: Record<string, unknown>): T {
	const result = Object.fromEntries(
		Object.entries(obj).map(([key, value]) => {
			const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

			let newValue: unknown = value;
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				newValue = toCamelCase(value as Record<string, unknown>);
			}

			return [camelKey, newValue];
		})
	);

	return result as T;
}

export function camelCaseArray<T = Record<string, unknown>>(arr: Record<string, unknown>[]): T[] {
	return arr.map((item) => toCamelCase<T>(item));
}
