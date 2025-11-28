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
	import type { Capability } from '$lib/types/capability';
	import { formatDate } from '$lib/utils/date';
	import { Plus } from '@lucide/svelte';

	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let capabilities: Capability[] = $state(data?.capabilities);

	onMount(() => {
		if (data?.error) {
			toast.error(data.error);
		}
	});
</script>

<div class="container mx-auto space-y-6 p-4">
	<div class="flex justify-between items-center">
		<h1 class="text-2xl font-bold">Capabilities Management</h1>
		<Button href="/admin/capabilities/create">
			<Plus class="mr-2 h-4 w-4" />
			Add New Capability
		</Button>
	</div>

	<Card>
		<CardContent>
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Scheme</TableHead>
						<TableHead>Hier Part</TableHead>
						<TableHead>Namespace</TableHead>
						<TableHead>Segments</TableHead>
						<TableHead>Created At</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each capabilities as capability (capability.id)}
						<TableRow>
							<TableCell>{capability.id}</TableCell>
							<TableCell class="font-medium">{capability.scheme}</TableCell>
							<TableCell>{capability.hierPart}</TableCell>
							<TableCell>{capability.namespace}</TableCell>
							<TableCell>{capability.segments}</TableCell>
							<TableCell>{formatDate(capability.createdAt)}</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</CardContent>
	</Card>
</div>
