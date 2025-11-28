<script lang="ts">
	import NodeDetail from '$lib/components/nodes/NodeDetail.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import type { ClusterPublic } from '$lib/types/cluster';
	import type { Node } from '$lib/types/node';
	import { ArrowLeft, CircleAlert } from '@lucide/svelte';
	import type { JSONSchema7 } from 'json-schema';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let node: Node | null = $state(data?.node ?? null);
	let cluster: ClusterPublic = $state(data?.cluster);
	let schema: JSONSchema7 | null = $state(data?.schema ?? null);
</script>

{#if !cluster}
	<div class="flex h-32 items-center justify-center">
		<div class="text-center space-y-2">
			<CircleAlert class="h-8 w-8 text-muted-foreground mx-auto" />
			<h3 class="text-lg font-semibold">Cluster Not Found</h3>
			<p class="text-sm text-muted-foreground">The requested cluster could not be loaded.</p>
		</div>
	</div>
{:else}
	<div class="container mx-auto p-4 space-y-6">
		<Button variant="outline" size="sm" href="/">
			<ArrowLeft class="h-4 w-4" />
			Back to Home
		</Button>

		<div class="flex items-center justify-between">
			<div class="mb-4 space-y-2">
				<h1 class="text-3xl font-bold tracking-tight">{cluster.name}</h1>
				{#if cluster.description}
					<div class="text-slate-700 dark:text-slate-300">
						{cluster.description}
					</div>
				{/if}
			</div>
		</div>

		{#if !node}
			<Card>
				<CardContent class="flex h-32 items-center justify-center">
					<div class="text-center space-y-2">
						<CircleAlert class="h-8 w-8 text-muted-foreground mx-auto" />
						<h3 class="text-lg font-semibold">Node Not Found</h3>
						<p class="text-sm text-muted-foreground">The requested node could not be found.</p>
					</div>
				</CardContent>
			</Card>
		{:else}
			{@const nodeData = typeof node.data === 'string' ? JSON.parse(node.data) : node.data}
			<div class="max-w-4xl mx-auto">
				<Card class="overflow-hidden">
					<CardHeader class="pb-3">
						<CardTitle class="text-2xl">
							{nodeData?.name || 'Node Details'}
						</CardTitle>
					</CardHeader>

					{#if nodeData?.image}
						<div class="px-6 pb-3">
							<img
								src={nodeData?.image}
								alt={nodeData?.name || 'Node Image'}
								class="w-full max-w-md mx-auto h-64 object-contain rounded-md border"
							/>
						</div>
					{/if}

					<CardContent class="space-y-4">
						{#if nodeData && typeof nodeData === 'object'}
							<NodeDetail {nodeData} {schema} />
						{:else}
							<div class="text-center space-y-2">
								<CircleAlert class="h-8 w-8 text-muted-foreground mx-auto" />
								<h3 class="text-lg font-semibold">No Data Available</h3>
								<p class="text-sm text-muted-foreground">The node data could not be displayed.</p>
							</div>
						{/if}
					</CardContent>
				</Card>
			</div>
		{/if}
	</div>
{/if}
