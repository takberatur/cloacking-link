<script lang="ts">
	import SafelinkView from '$lib/components/app/safelink-view.svelte';
	let { data } = $props();
</script>

<svelte:head>
	<title>Preview: {data.view.title}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<SafelinkView {...data.view} targetUrl="#" preview />
