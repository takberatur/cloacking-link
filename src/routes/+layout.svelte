<script lang="ts">
	import { page } from '$app/state';
	import { MetaTags, deepMerge } from 'svelte-meta-tags';
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { ToastContent } from '@/components/extra/toast/index.js';
	import { SvelteKitTopLoader } from 'sveltekit-top-loader';

	let { data, children } = $props();

	let metaTags = $derived(deepMerge(data.baseMetaTags, page.data.pageMetaTags));
</script>

<MetaTags {...metaTags} />
<ModeWatcher />
<ToastContent />
<SvelteKitTopLoader color="#bb4d00" />

<main class="min-h-screen antialiased">
	{@render children?.()}
</main>
