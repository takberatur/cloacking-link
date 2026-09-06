<script lang="ts">
	import SafelinkView from '$lib/components/app/safelink-view.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.view.title}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<SafelinkView {...data.view} targetUrl={data.targetUrl} />
