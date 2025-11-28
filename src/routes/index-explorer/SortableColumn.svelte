<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';

	import type { Snippet } from 'svelte';

	interface Props {
		prop: string;
		currentSortProp: string;
		currentSortOrder: 'asc' | 'desc' | null;
		onSort: (key: string, order: 'asc' | 'desc') => void;
		children?: Snippet;
		class?: string;
	}

	let {
		prop,
		currentSortProp,
		currentSortOrder,
		onSort,
		children,
		class: className
	}: Props = $props();

	function handleSort(): void {
		let newOrder: 'asc' | 'desc' = 'asc';
		if (currentSortProp === prop) {
			newOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
		}
		onSort(prop, newOrder);
	}
</script>

<Table.Head onclick={handleSort} class="cursor-pointer {className}">
	{@render children?.()}
	{#if currentSortProp === prop}
		{#if currentSortOrder === 'asc'}
			▲
		{:else}
			▼
		{/if}
	{/if}
</Table.Head>
