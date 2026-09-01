<script lang="ts">
	import { HomeNavbar, HomeFooter } from '$lib/components/landing/index';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col">
	<HomeNavbar />
	<main class="flex-1">
		{@render children()}
	</main>
	<HomeFooter />
</div>
