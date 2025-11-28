<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';

	interface Props {
		schemasList: string[];
		schemaSelected: (schemas: string[]) => void;
	}

	let { schemasList, schemaSelected }: Props = $props();

	let selectedSchemas: string[] = $state([]);

	function selectSchemas() {
		schemaSelected(selectedSchemas);
	}
</script>

<Card>
	<CardContent class="p-6">
		<form onsubmit={selectSchemas}>
			<div class="font-medium text-foreground mb-4">
				Select one or more schemas to {page.url.pathname === '/batch-importer'
					? 'create a new batch of profiles'
					: 'create a new profile'}
			</div>
			<div class="mb-6">
				<select
					bind:value={selectedSchemas}
					multiple
					required
					size="6"
					class="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					id="schemaSelector"
				>
					{#each schemasList as schema (schema)}
						<option value={schema} class="py-1">{schema}</option>
					{/each}
				</select>
			</div>
			<div class="flex justify-center">
				<Button type="submit" class="font-semibold">Select</Button>
			</div>
		</form>
	</CardContent>
</Card>
