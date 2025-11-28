<script lang="ts">
	import { goto } from '$app/navigation';
	import { createCapability } from '$lib/api/capabilities';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select/index.js';
	import type { CapabilityCreateInput } from '$lib/types/capability';

	import { toast } from 'svelte-sonner';

	let scheme = $state('');
	let hierPart = $state('');
	let namespace = $state('');
	let segments = $state('');
	let isSubmitting = $state(false);

	const segmentOptions = [
		{ value: 'GET', label: 'GET' },
		{ value: 'POST', label: 'POST' },
		{ value: 'PATCH', label: 'PATCH' },
		{ value: 'PUT', label: 'PUT' },
		{ value: 'DELETE', label: 'DELETE' }
	];

	const triggerContent = $derived(
		segmentOptions.find((s) => s.value === segments)?.label ?? 'Select segments'
	);

	async function handleSubmit(event: Event) {
		event.preventDefault();

		isSubmitting = true;

		try {
			const capabilityInput: CapabilityCreateInput = {
				scheme: scheme.trim(),
				hierPart: hierPart.trim(),
				namespace: namespace.trim(),
				segments: segments
			};

			await createCapability(capabilityInput);
			toast.success('Capability created successfully');
			goto('/admin/capabilities');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create capability');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Create New Capability</h1>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Capability Details</CardTitle>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="scheme">Scheme</Label>
					<Input id="scheme" type="text" bind:value={scheme} required placeholder="Enter scheme" />
				</div>

				<div class="space-y-2">
					<Label for="hierPart">Hier Part</Label>
					<Input
						id="hierPart"
						type="text"
						bind:value={hierPart}
						required
						placeholder="Enter hier part"
					/>
				</div>

				<div class="space-y-2">
					<Label for="namespace">Namespace</Label>
					<Input
						id="namespace"
						type="text"
						bind:value={namespace}
						required
						placeholder="Enter namespace"
					/>
				</div>

				<div class="space-y-2">
					<Label for="segments">Segments</Label>
					<Select.Root type="single" name="segments" bind:value={segments} required>
						<Select.Trigger class="w-full">
							{triggerContent}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								{#each segmentOptions as option (option.value)}
									<Select.Item value={option.value} label={option.label}>
										{option.label}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex gap-3">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Capability'}
					</Button>
					<Button type="button" variant="outline" href="/admin/capabilities">Cancel</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
