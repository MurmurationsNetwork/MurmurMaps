/* eslint-disable @typescript-eslint/no-explicit-any */
function getType(value: unknown): string {
	return Object.prototype.toString.call(value);
}

export function isNil(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

export function isObject(value: unknown): boolean {
	return getType(value) === '[object Object]';
}

export function isArrayEqual<T>(prevArr: T[], curArr: T[]): boolean {
	if (prevArr.length !== curArr.length) {
		return false;
	}

	return curArr.every((element) => prevArr.includes(element));
}

export function isObjectEqual(prevObj: any, curObj: any): boolean {
	if (prevObj === curObj) {
		return true;
	}
	// check if both objects are objects and not null
	if (
		typeof prevObj !== 'object' ||
		prevObj === null ||
		typeof curObj !== 'object' ||
		curObj === null
	) {
		return false;
	}
	// get the list of keys
	const prevKeys = Object.keys(prevObj);
	const curKeys = Object.keys(curObj);
	// check if the number of keys is the same
	if (prevKeys.length !== curKeys.length) {
		return false;
	}
	// iterate over the list of keys and compare the keys and values
	for (const key of prevKeys) {
		if (!curKeys.includes(key) || !isObjectEqual(prevObj[key], curObj[key])) {
			return false;
		}
	}
	return true;
}

export function isPrimitiveEqual(prevVal: unknown, curVal: unknown) {
	if (getType(prevVal) !== getType(curVal)) {
		return false;
	} else {
		return prevVal === curVal;
	}
}

export function isFunction(func: unknown) {
	return (
		typeof func === 'function' && typeof func.constructor === 'function' && func instanceof Function
	);
}
