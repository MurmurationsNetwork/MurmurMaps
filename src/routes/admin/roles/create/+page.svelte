<script lang="ts">
	import { goto } from '$app/navigation';
	import { createRole } from '$lib/api/role';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { RoleCreateInput } from '$lib/types/role';

	import { toast } from 'svelte-sonner';

	let name = '';
	let description = '';
	let isSubmitting = false;

	async function handleSubmit(event: Event) {
		event.preventDefault();

		isSubmitting = true;

		try {
			const roleInput: RoleCreateInput = {
				name: name.trim(),
				description: description.trim() || null
			};

			await createRole(roleInput);
			toast.success('Role created successfully');
			goto('/admin/roles');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to create role');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Create New Role</h1>
	</div>

	<Card>
		<CardHeader>
			<CardTitle>Role Details</CardTitle>
		</CardHeader>
		<CardContent>
			<form onsubmit={handleSubmit} class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Role Name</Label>
					<Input id="name" type="text" bind:value={name} required placeholder="Enter role name" />
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Input
						id="description"
						type="text"
						bind:value={description}
						placeholder="Enter role description"
					/>
				</div>

				<div class="flex gap-3">
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Role'}
					</Button>
					<Button type="button" variant="outline" href="/admin/roles">Cancel</Button>
				</div>
			</form>
		</CardContent>
	</Card>
</div>
