<script lang="ts">
	import { getIndexStatus } from '$lib/api/profiles';
	import { deleteIndex, deleteProfile } from '$lib/api/profiles';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { buttonVariants } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { dbStatus } from '$lib/stores/db-status';
	import { Clock, Database, SquarePen, Trash2 } from '@lucide/svelte';
	import { createQuery, QueryClient, QueryClientProvider } from '@tanstack/svelte-query';

	import { toast } from 'svelte-sonner';
	import { get } from 'svelte/store';

	const queryClient = new QueryClient();

	interface Props {
		cuid: string;
		title: string;
		node_id: string;
		status: string;
		last_updated: string;
		schemas: string[];
		sourceIndexUrl: string;
		profileUpdated: () => void;
		profileModify: (cuid: string) => Promise<void>;
	}

	let {
		cuid,
		title,
		node_id,
		status,
		last_updated,
		schemas,
		sourceIndexUrl,
		profileUpdated,
		profileModify
	}: Props = $props();

	let statusVariant: 'default' | 'secondary' | 'destructive' | 'outline' = $state('default');
	let isDbOnline: boolean = $state(get(dbStatus));
	let dialogOpen: boolean = $state(false);

	// Subscribe to dbStatus changes
	dbStatus.subscribe((value) => (isDbOnline = value));

	// Use svelte-query to fetch status
	const statusQuery = createQuery(() => ({
		queryKey: ['status', node_id],
		queryFn: fetchStatus,
		refetchInterval: 5000
	}));

	$effect(() => {
		const data = statusQuery.data;
		if (data !== undefined) {
			status = data ?? 'unknown';
			statusVariant = getStatusVariant(status);
		}
	});

	async function fetchStatus(): Promise<string> {
		if (!node_id) return 'unknown';
		if (['posted', 'deleted', 'validation_failed', 'post_failed'].includes(status)) {
			return status;
		}

		if (!sourceIndexUrl) {
			toast.error('Please select a Source Index first.');
			return 'unknown';
		}

		try {
			const { data, error } = await getIndexStatus(node_id, sourceIndexUrl);
			if (data?.status) {
				return data.status ?? 'unknown';
			} else {
				toast.error(error || 'Unknown error occurred. Please try again in a few minutes.');
				return 'unknown';
			}
		} catch (err) {
			console.error('Error fetching status:', err);
			return 'unknown';
		}
	}

	function getStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (status) {
			case 'posted':
				return 'default';
			case 'received':
			case 'validated':
				return 'secondary';
			default:
				return 'destructive';
		}
	}

	async function handleDeleteProfile(): Promise<void> {
		try {
			await deleteProfile(cuid);
			if (node_id) {
				await deleteIndex(node_id, sourceIndexUrl);
			}
			profileUpdated();
			dialogOpen = false;
			toast.success('Profile deleted successfully');
		} catch (err) {
			console.error('Error deleting profile:', err);
			toast.error('Error deleting profile: ' + err);
		}
	}

	function handleModify(): void {
		profileModify(cuid);
	}
</script>

<QueryClientProvider client={queryClient}>
	<Card class="transition-all duration-200 hover:shadow-md border-border">
		<CardContent class="p-6">
			<div class="flex items-start justify-between">
				<div class="flex-1 min-w-0">
					<div class="flex items-center gap-3 mb-3">
						<h3 class="text-lg font-semibold text-foreground">{title}</h3>
						<Badge
							variant={statusVariant}
							class="text-xs font-medium px-2.5 py-0.5 {statusVariant === 'destructive'
								? 'bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-950'
								: statusVariant === 'secondary'
									? 'bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-950'
									: 'bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-950'}"
						>
							{status}
						</Badge>
					</div>

					<div class="space-y-2">
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<Clock class="h-4 w-4" />
							<span>{last_updated}</span>
						</div>

						<div class="space-y-1">
							{#each schemas as schema (schema)}
								<div class="flex items-center gap-2 text-sm text-muted-foreground">
									<Database class="h-4 w-4" />
									<span class="font-mono text-xs bg-muted px-2 py-1 rounded">{schema}</span>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<Separator class="my-4" />

			<div class="flex items-center gap-3">
				<Button
					onclick={handleModify}
					size="sm"
					class="flex items-center gap-2"
					disabled={!isDbOnline}
				>
					<SquarePen class="h-4 w-4" />
					Modify
				</Button>
				<AlertDialog.Root bind:open={dialogOpen}>
					<AlertDialog.Trigger
						class={buttonVariants({
							variant: 'outline',
							size: 'sm'
						}) +
							' flex items-center gap-2 text-destructive border-destructive/20 hover:bg-destructive/10 hover:border-destructive/30 bg-transparent cursor-pointer'}
						disabled={!isDbOnline}
					>
						<Trash2 class="h-4 w-4" />
						Delete
					</AlertDialog.Trigger>
					<AlertDialog.Content>
						<AlertDialog.Header>
							<AlertDialog.Title>Delete Profile</AlertDialog.Title>
						</AlertDialog.Header>
						<AlertDialog.Description>
							<p>
								Are you sure you want to delete the profile: {title}?
							</p>
						</AlertDialog.Description>
						<AlertDialog.Footer>
							<AlertDialog.Cancel class="cursor-pointer">Cancel</AlertDialog.Cancel>
							<AlertDialog.Action class="cursor-pointer" onclick={handleDeleteProfile}
								>Continue</AlertDialog.Action
							>
						</AlertDialog.Footer>
					</AlertDialog.Content>
				</AlertDialog.Root>
			</div>
		</CardContent>
	</Card>
</QueryClientProvider>
