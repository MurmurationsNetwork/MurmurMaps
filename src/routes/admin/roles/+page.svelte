<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';
	import type { Role } from '$lib/types/role';
	import { formatDate } from '$lib/utils/date';
	import { Edit, Plus } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let roles: Role[] = $state(data?.roles);

	onMount(() => {
		if (data?.error) {
			toast.error(data.error);
		}
	});
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Roles Management</h1>
		<Button href="/admin/roles/create">
			<Plus class="mr-2 h-4 w-4" />
			Add New Role
		</Button>
	</div>

	<Card>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Name</TableHead>
						<TableHead>Description</TableHead>
						<TableHead>Created At</TableHead>
						<TableHead>Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each roles as role (role.id)}
						<TableRow>
							<TableCell>{role.id}</TableCell>
							<TableCell class="font-medium">{role.name}</TableCell>
							<TableCell>{role.description}</TableCell>
							<TableCell>{formatDate(role.createdAt)}</TableCell>
							<TableCell>
								<Button variant="outline" size="sm" href={`/admin/roles/${role.id}/edit`}>
									<Edit class="mr-2 h-4 w-4" />
									Edit
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>
