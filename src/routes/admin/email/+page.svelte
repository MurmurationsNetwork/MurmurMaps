<script lang="ts">
	import { sendResetEmailRequest } from '$lib/api/emails';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { isValidEmail } from '$lib/utils/validators';
	import { CircleAlert, CircleCheck } from '@lucide/svelte';

	let email = $state('');
	let validEmail = $derived(isValidEmail(email));
	let successMessage = $state('');
	let errorMessage = $state('');
	let isLoading = $state(false);

	const handleSubmit = async (e: SubmitEvent) => {
		e.preventDefault();
		if (isLoading) return;

		successMessage = '';
		errorMessage = '';
		isLoading = true;

		try {
			const { success, error } = await sendResetEmailRequest(email);
			if (success) {
				successMessage = 'Email submitted successfully!';
			} else {
				errorMessage = error || 'Failed to submit email.';
				console.error(errorMessage);
			}
		} catch (error) {
			console.error('Error submitting email:', error);
			errorMessage = 'An error occurred while submitting the email.';
		} finally {
			isLoading = false;
		}
	};
</script>

<h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">Email Reset</h1>

{#if successMessage}
	<Alert variant="default" class="mb-4">
		<CircleCheck class="size-4" />
		<AlertTitle>Success</AlertTitle>
		<AlertDescription>{successMessage}</AlertDescription>
	</Alert>
{/if}
{#if errorMessage}
	<Alert variant="destructive" class="mb-4">
		<CircleAlert class="size-4" />
		<AlertTitle>Error</AlertTitle>
		<AlertDescription>{errorMessage}</AlertDescription>
	</Alert>
{/if}

<form onsubmit={handleSubmit} class="space-y-4">
	<div class="space-y-2">
		<label for="email" class="block text-sm font-medium">Email</label>
		<Input
			id="email"
			type="email"
			bind:value={email}
			placeholder="Enter your email"
			autocomplete="email"
		/>
		{#if email && !validEmail}
			<p class="text-sm text-destructive">Invalid email format</p>
		{/if}
	</div>
	<Button type="submit" disabled={!validEmail || isLoading} class="w-full">
		{#if isLoading}
			Loading...
		{:else}
			Submit Email
		{/if}
	</Button>
</form>
