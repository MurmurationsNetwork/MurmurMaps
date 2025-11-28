<script lang="ts">
	import { goto } from '$app/navigation';
	import { replaceState } from '$app/navigation';
	import { getJobByUuidAndTarget } from '$lib/api/job';
	import { getUpdateNodes, updateNodes, updateNodeStatuses } from '$lib/api/nodes';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Progress } from '$lib/components/ui/progress';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import type { Node } from '$lib/types/node';
	import LoaderCircle from '@lucide/svelte/icons/loader-circle';
	import { diffJson } from 'diff';
	import type { Change } from 'diff';

	import { onDestroy, onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let updateInterval: ReturnType<typeof setInterval> | null = null;
	let updateStatus = $state<'pending' | 'processing' | 'completed' | 'failed'>('pending');
	let jobUuid = $state<string | null>(null);
	let clusterUuid = $state<string | null>(data?.clusterUuid ?? null);
	let isLoading = $state(false);
	let loadingProgress = $state(0);
	let jobType: 'update-nodes' | 'update-node-statuses' | null = $state(null);

	let deletedProfiles = $state<Node[]>([]);
	let unauthoritativeProfiles = $state<Node[]>([]);
	let profileList = $state<Node[]>([]);
	const selectableNodes = $derived(profileList.filter((n) => n.isAvailable && n.hasAuthority));

	let selectedAction = $state('');

	const actions = [
		{ value: 'published', label: 'Publish' },
		{ value: 'dismissed', label: 'Dismiss' },
		{ value: 'ignored', label: 'Ignore' }
	];

	const triggerContent = $derived(
		actions.find((a) => a.value === selectedAction)?.label ?? 'Select action'
	);

	let selectedIds: number[] = $state([]);
	const showUnavailableColumn = $derived(
		profileList.some((n) => !n.isAvailable && n.unavailableMessage)
	);

	let dialogOpen = $state(false);
	let selectedNodeForDiff: Node | null = $state(null);
	let diffs: Change[] = $state([]);

	function openDiffDialog(node: Node) {
		selectedNodeForDiff = node;
		updateDiff(node);
		dialogOpen = true;
	}

	function updateDiff(node: Node) {
		try {
			const before = JSON.parse(node.data);
			const after = JSON.parse(node.updatedData ?? node.data);
			diffs = diffJson(before, after);
		} catch (error) {
			console.error('Error updating diff:', error);
			toast.error('Error updating diff. Please try again.');
			diffs = [];
		}
	}

	function toggleSelectAll() {
		const selectable = profileList.filter((n) => n.isAvailable && n.hasAuthority);
		if (selectedIds.length === selectable.length) {
			selectedIds = [];
		} else {
			selectedIds = selectable.map((n) => n.id);
		}
	}

	function toggleSelectRow(id: number) {
		if (selectedIds.includes(id)) {
			selectedIds = selectedIds.filter((i) => i !== id);
		} else {
			selectedIds = [...selectedIds, id];
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!selectedAction || selectedIds.length === 0) {
			toast.error('Please select an action and at least one node.');
			return;
		}

		// Scroll to the top of the page
		window.scrollTo({ top: 0, behavior: 'smooth' });

		try {
			const { data, success, error } = await updateNodeStatuses(
				clusterUuid ?? '',
				selectedIds,
				selectedAction
			);
			if (!success) {
				toast.error(error ?? 'Failed to update node statuses');
				isLoading = false;
				return;
			}

			const newJobUuid = data?.jobUuid;
			if (!newJobUuid) {
				toast.error('Job UUID missing in response.');
				isLoading = false;
				return;
			}

			jobUuid = newJobUuid;

			// Update the URL with the jobUuid
			const url = new URL(window.location.href);
			url.searchParams.set('jobUuid', newJobUuid);
			replaceState(url.pathname + url.search, '');

			startUpdatePolling();
		} catch (error) {
			console.error('Error updating node statuses:', error);
			toast.error('Failed to update node statuses. Please try again.');
			isLoading = false;
		}
	}

	async function handleUpdate() {
		try {
			if (!clusterUuid) {
				toast.error('Cluster not found.');
				return;
			}

			const { data, success, error } = await updateNodes(clusterUuid);
			if (!success) {
				toast.error(error ?? 'Failed to update nodes');
				return;
			}

			jobUuid = data?.jobUuid;
			if (!jobUuid) {
				toast.error('Failed to update nodes. Please try again.');
				return;
			}

			toast.success('Updating nodes in progress...');

			// Update the URL with the jobUuid
			const url = new URL(window.location.href);
			url.searchParams.set('jobUuid', jobUuid);
			replaceState(url.pathname + url.search, '');

			startUpdatePolling();
		} catch (error) {
			console.error('Error updating nodes:', error);
			toast.error('Failed to update nodes. Please try again.');
		}
	}

	function startUpdatePolling() {
		if (updateInterval) clearInterval(updateInterval);
		isLoading = true;

		updateInterval = setInterval(async () => {
			try {
				const { data: jobData, success } = await getJobByUuidAndTarget(
					clusterUuid ?? '',
					jobUuid ?? '',
					fetch
				);

				if (!success || !jobData) throw new Error('Job not found');

				if (jobData.totalNodes === 0) {
					loadingProgress = 0;
				} else {
					loadingProgress = Math.min(
						100,
						Math.round((jobData.processedNodes / jobData.totalNodes) * 100)
					);
				}

				updateStatus = jobData.status as 'pending' | 'processing' | 'completed' | 'failed';
				jobType = jobData.type as 'update-nodes' | 'update-node-statuses' | null;

				if (updateStatus === 'completed') {
					stopUpdatePolling();
					if (jobData.type === 'update-nodes') {
						toast.success('Cluster update completed.');
						const {
							data: jobResult,
							success,
							error
						} = await getUpdateNodes(clusterUuid ?? '', jobUuid ?? '', fetch);
						if (!success) {
							toast.error(error ?? 'Failed to get update nodes');
							return;
						}
						profileList = jobResult?.profileList ?? [];
						deletedProfiles = jobResult?.deletedProfiles ?? [];
						unauthoritativeProfiles = jobResult?.unauthoritativeProfiles ?? [];

						if (profileList.length === 0) {
							toast.success('No updated profiles found.');
							if (deletedProfiles.length === 0 && unauthoritativeProfiles.length === 0) {
								await goto('/admin');
							}
						}
					} else if (jobData.type === 'update-node-statuses') {
						toast.success('Node statuses updated successfully.');
						await goto('/admin');
					}
				} else if (updateStatus === 'failed') {
					stopUpdatePolling();
					toast.error(jobData.errorMessage ?? 'Cluster update failed.');
				}
			} catch (err) {
				console.error('Polling error:', err);
				stopUpdatePolling();
				toast.error('Failed to poll update job status. Please try again.');
			}
		}, 2000);
	}

	function stopUpdatePolling() {
		loadingProgress = 0;
		isLoading = false;
		jobType = null;
		if (updateInterval) {
			clearInterval(updateInterval);
			updateInterval = null;
		}
	}

	onMount(() => {
		const url = new URL(window.location.href);
		jobUuid = url.searchParams.get('jobUuid');

		if (jobUuid) {
			startUpdatePolling();
		} else {
			handleUpdate();
		}
	});

	onDestroy(() => {
		if (updateInterval) clearInterval(updateInterval);
	});
</script>

<div class="container mx-auto min-h-screen bg-background text-foreground">
	<div class="container mx-auto px-4 py-8">
		<header class="mb-8">
			<h1 class="mb-6 text-3xl font-bold text-slate-900 dark:text-slate-50">Updated Nodes</h1>
		</header>

		{#if isLoading}
			<div class="my-6">
				<p class="mb-2 text-sm text-muted-foreground">
					{#if jobType === null}
						Loading job...
					{:else if jobType === 'update-node-statuses'}
						Updating node statuses... {loadingProgress}%
					{:else if loadingProgress < 33}
						Checking for new and updated profiles... {loadingProgress}%
					{:else if loadingProgress < 66}
						Rechecking unavailable profiles... {loadingProgress}%
					{:else}
						Validating domain authority... {loadingProgress}%
					{/if}
				</p>
				<Progress value={loadingProgress} max={100} class="w-full" />
			</div>
		{/if}

		{#if deletedProfiles.length > 0}
			<h2 class="mb-4 text-xl font-semibold">Deleted Profiles</h2>
			<div class="overflow-hidden rounded-md border">
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-[40px]">ID</Table.Head>
								<Table.Head>Name / Title</Table.Head>
								<Table.Head>Profile URL</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each deletedProfiles as node (node.id)}
								<Table.Row>
									<Table.Cell>{node.id}</Table.Cell>
									<Table.Cell>{JSON.parse(node.data)?.name || 'N/A'}</Table.Cell>
									<Table.Cell>
										<a
											href={node.profileUrl}
											target="_blank"
											rel="noreferrer"
											class="text-blue-500 underline">{node.profileUrl}</a
										>
									</Table.Cell>
									<Table.Cell class="capitalize">{node.status}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		{/if}

		{#if unauthoritativeProfiles.length > 0}
			<h2 class="mb-4 text-xl font-semibold">Unauthoritative Profiles</h2>
			<div class="overflow-hidden rounded-md border mb-8">
				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head class="w-[40px]">ID</Table.Head>
								<Table.Head>Name / Title</Table.Head>
								<Table.Head>Profile URL</Table.Head>
								<Table.Head>Status</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each unauthoritativeProfiles as node (node.id)}
								<Table.Row>
									<Table.Cell>{node.id}</Table.Cell>
									<Table.Cell>{JSON.parse(node.data)?.name || 'N/A'}</Table.Cell>
									<Table.Cell>
										<a
											href={node.profileUrl}
											target="_blank"
											rel="noreferrer"
											class="text-blue-500 underline">{node.profileUrl}</a
										>
									</Table.Cell>
									<Table.Cell class="capitalize">{node.status}</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>
		{/if}

		{#if deletedProfiles.length > 0 || unauthoritativeProfiles.length > 0}
			<div class="mt-6 flex items-center gap-4">
				<Button variant="outline" href="/admin">Return to Home</Button>
			</div>
		{/if}

		{#if profileList.length > 0}
			<h2 class="mb-4 text-xl font-semibold">Updated Profiles</h2>
			<div class="overflow-hidden rounded-md border">
				<div class="overflow-x-auto">
					<Table.Root
						class="table-auto w-max md:table-fixed md:w-full
             [&_th]:whitespace-normal [&_td]:whitespace-normal [&_td]:wrap-break-word"
					>
						<Table.Header>
							<Table.Row>
								<Table.Head class="md:w-[4%]">
									<Checkbox
										checked={profileList.length > 0 &&
											selectableNodes.length > 0 &&
											selectedIds.length === selectableNodes.length}
										disabled={selectableNodes.length === 0}
										onCheckedChange={toggleSelectAll}
									/>
								</Table.Head>
								<Table.Head class="md:w-[4%]">ID</Table.Head>
								<Table.Head class="md:w-[6%]">Geo Data</Table.Head>
								<Table.Head class="md:w-[15%]">Name / Title</Table.Head>
								<Table.Head class="md:w-[15%]">Primary URL</Table.Head>
								<Table.Head class="md:w-[24%]">Profile URL</Table.Head>
								<Table.Head class="md:w-[8%]">Status</Table.Head>
								<Table.Head class="md:w-[8%]">Availability</Table.Head>
								{#if showUnavailableColumn}
									<Table.Head class="md:w-[8%]">Unavailable Message</Table.Head>
								{/if}
								<Table.Head class="md:w-[8%]">Actions</Table.Head>
							</Table.Row>
						</Table.Header>

						<Table.Body>
							{#each profileList as node (node.id)}
								<Table.Row>
									<Table.Cell>
										<Checkbox
											checked={selectedIds.includes(node.id)}
											onCheckedChange={() => toggleSelectRow(node.id)}
											disabled={!node.isAvailable || !node.hasAuthority}
										/>
									</Table.Cell>
									<Table.Cell>{node.id}</Table.Cell>
									<Table.Cell>{JSON.parse(node.data)?.geolocation ? '📍' : ''}</Table.Cell>
									<Table.Cell>{JSON.parse(node.data)?.name || 'N/A'}</Table.Cell>
									<Table.Cell>{JSON.parse(node.data)?.primary_url || 'N/A'}</Table.Cell>
									<Table.Cell>
										<a
											href={node.profileUrl}
											target="_blank"
											rel="noreferrer"
											class="text-blue-500 underline">{node.profileUrl}</a
										>
									</Table.Cell>
									<Table.Cell class="capitalize">{node.status}</Table.Cell>
									<Table.Cell class="capitalize">
										{node.isAvailable === 1 ? 'Available' : 'Unavailable'}
									</Table.Cell>
									{#if showUnavailableColumn}
										<Table.Cell class="text-red-600">
											{#if !node.isAvailable && node.unavailableMessage}
												{node.unavailableMessage}
											{/if}
										</Table.Cell>
									{/if}
									<Table.Cell>
										{#if node.updatedData}
											<Button variant="outline" size="sm" onclick={() => openDiffDialog(node)}>
												View Update
											</Button>
										{/if}
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</div>

			<div class="mt-6 flex items-center gap-4">
				<div>
					<Select.Root type="single" name="action" bind:value={selectedAction}>
						<Select.Trigger class="w-32">
							{triggerContent}
						</Select.Trigger>
						<Select.Content>
							<Select.Group>
								<Label>Actions</Label>
								{#each actions as action (action.value)}
									<Select.Item value={action.value} label={action.label}>
										{action.label}
									</Select.Item>
								{/each}
							</Select.Group>
						</Select.Content>
					</Select.Root>
				</div>

				{#if isLoading}
					<Button disabled>
						<LoaderCircle class="animate-spin" />
						Please wait
					</Button>
				{:else}
					<Button variant="default" onclick={handleSubmit}>Submit</Button>
				{/if}
				<Button variant="outline" href="/admin">Cancel</Button>
			</div>

			<div class="mt-4 text-sm text-muted-foreground">
				<p>Publish = display node on map</p>
				<p>Dismiss = hide node until it has updates</p>
				<p>Ignore = always hide node</p>
			</div>
		{/if}
	</div>
</div>

<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-w-6xl max-h-[80vh] overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Profile Update Diff</Dialog.Title>
			<Dialog.Description>
				{#if selectedNodeForDiff}
					Showing changes for: {JSON.parse(selectedNodeForDiff.data)?.name || 'N/A'}
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="overflow-auto max-h-[60vh]">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<h3 class="font-semibold">Before</h3>
					<div class="border p-2 font-mono text-sm bg-gray-50 min-h-[200px] overflow-auto">
						{#each diffs as part, index (index)}
							{#if part.removed}
								<div class="bg-red-50 text-red-700 whitespace-pre-wrap">
									<span class="text-red-600 font-bold">- </span>{part.value}
								</div>
							{:else if part.added}
								<div class="text-gray-400 whitespace-pre-wrap">
									{part.value
										.split('\n')
										.map(() => '')
										.join('\n')}
								</div>
							{:else}
								<div class="whitespace-pre-wrap">
									{part.value}
								</div>
							{/if}
						{/each}
					</div>
				</div>

				<div class="space-y-2">
					<h3 class="font-semibold">After</h3>
					<div class="border p-2 font-mono text-sm bg-gray-50 min-h-[200px] overflow-auto">
						{#each diffs as part, index (index)}
							{#if part.added}
								<div class="bg-green-50 text-green-700 whitespace-pre-wrap">
									<span class="text-green-600 font-bold">+ </span>{part.value}
								</div>
							{:else if part.removed}
								<div class="text-gray-400 whitespace-pre-wrap">
									{part.value
										.split('\n')
										.map(() => '')
										.join('\n')}
								</div>
							{:else}
								<div class="whitespace-pre-wrap">
									{part.value}
								</div>
							{/if}
						{/each}
					</div>
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
