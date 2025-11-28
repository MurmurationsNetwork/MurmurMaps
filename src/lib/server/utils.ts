import { createId } from '@paralleldrive/cuid2';

export function generateLoginToken(): string {
	return createId();
}
