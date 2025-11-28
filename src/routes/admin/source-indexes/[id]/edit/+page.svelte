<script lang="ts">
	import { goto } from '$app/navigation';
	import { updateSourceIndex } from '$lib/api/source-indexes';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import type { SourceIndexUpdateInput } from '$lib/types/source-index';

	import { toast } from 'svelte-sonner';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let formData = $state<SourceIndexUpdateInput>({
		url: data.sourceIndex?.url ?? '',
		label: data.sourceIndex?.label ?? '',
		libraryUrl: data.sourceIndex?.libraryUrl ?? '',
		dataProxyUrl: data.sourceIndex?.dataProxyUrl ?? ''
	});

	let isSubmitting = $state(false);

	async function handleSubmit() {
		if (!formData.url.trim()) {
			toast.error('URL is required');
			return;
		}

		if (!formData.label.trim()) {
			toast.error('Label is required');
			return;
		}

		if (!formData.libraryUrl.trim()) {
			toast.error('Library URL is required');
			return;
		}

		if (!formData.dataProxyUrl.trim()) {
			toast.error('Data Proxy URL is required');
			return;
		}

		try {
			isSubmitting = true;
			const response = await updateSourceIndex(data.sourceIndex?.id ?? 0, formData);

			if (response.success) {
				toast.success('Source index updated successfully');
				goto('/admin/source-indexes');
			} else {
				const errorMessage = response.error ?? '';
				toast.error(`Failed to update source index: ${errorMessage}`);
			}
		} catch (err) {
			console.error(err);
			toast.error('Failed to update source index');
		} finally {
			isSubmitting = false;
		}
	}

	function handleCancel() {
		goto('/admin/source-indexes');
	}
</script>

{#if data.error}
	<div class="container mx-auto space-y-6 p-4">
		<h1 class="text-3xl font-bold">Edit Source Index</h1>
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<h3 class="text-lg font-semibold mb-2 text-red-700">Error</h3>
				<p class="text-muted-foreground text-center">{data?.error ?? 'Unknown error'}</p>
				<div class="mt-4">
					<Button variant="outline" href="/admin/source-indexes">Back to Source Indexes</Button>
				</div>
			</CardContent>
		</Card>
	</div>
{:else if !data.sourceIndex}
	<div class="container mx-auto space-y-6 p-4">
		<h1 class="text-3xl font-bold">Edit Source Index</h1>
		<Card>
			<CardContent class="flex flex-col items-center justify-center py-12">
				<h3 class="text-lg font-semibold mb-2 text-yellow-700">Source Index Not Found</h3>
				<p class="text-muted-foreground text-center">
					The source index you're looking for could not be found.
				</p>
				<div class="mt-4">
					<Button variant="outline" href="/admin/source-indexes">Back to Source Indexes</Button>
				</div>
			</CardContent>
		</Card>
	</div>
{:else}
	<div class="container mx-auto space-y-6 p-4">
		<h1 class="text-3xl font-bold">Edit Source Index</h1>
		<p class="text-muted-foreground mt-2">Update the source index information below.</p>

		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2">Source Index Details</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
					class="space-y-4"
				>
					<div class="space-y-2">
						<Label for="label">Label</Label>
						<Input
							id="label"
							type="text"
							bind:value={formData.label}
							placeholder="Main Index"
							required
							disabled={isSubmitting}
						/>
						<p class="text-sm text-muted-foreground">
							A human-readable label to identify this source index
						</p>
					</div>

					<div class="space-y-2">
						<Label for="url">URL</Label>
						<Input
							id="url"
							type="url"
							bind:value={formData.url}
							placeholder="https://index.example.com"
							required
							disabled={isSubmitting}
						/>
						<p class="text-sm text-muted-foreground">The URL endpoint for the source index API</p>
					</div>

					<div class="space-y-2">
						<Label for="libraryUrl">Library URL</Label>
						<Input
							id="libraryUrl"
							type="url"
							bind:value={formData.libraryUrl}
							placeholder="https://library.example.com"
							disabled={isSubmitting}
						/>
						<p class="text-sm text-muted-foreground">The URL endpoint for the library API</p>
					</div>

					<div class="space-y-2">
						<Label for="dataProxyUrl">Data Proxy URL</Label>
						<Input
							id="dataProxyUrl"
							type="url"
							bind:value={formData.dataProxyUrl}
							placeholder="https://data-proxy.example.com"
							disabled={isSubmitting}
						/>
						<p class="text-sm text-muted-foreground">The URL endpoint for the data proxy API</p>
					</div>

					<div class="flex gap-3 pt-4">
						<Button type="submit" disabled={isSubmitting}>
							{#if isSubmitting}
								Updating...
							{:else}
								Update Source Index
							{/if}
						</Button>
						<Button type="button" variant="outline" onclick={handleCancel} disabled={isSubmitting}>
							Cancel
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	</div>
{/if}
