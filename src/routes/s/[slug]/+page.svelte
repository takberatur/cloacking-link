<script lang="ts">
	import SafelinkView from '$lib/components/app/safelink-view.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	$effect(() => {
		if (!data.targetUrl || !data.entry.attributionEnabled) return;

		const iframe = document.createElement('iframe');
		iframe.style.display = 'none';
		document.body.appendChild(iframe);

		const iframeDoc = iframe.contentWindow?.document;
		if (iframeDoc) {
			iframeDoc.open();
			iframeDoc.write(`
					<html>
						<head>
							<meta name="referrer" content="unsafe-url">
							<meta http-equiv="refresh" content="0;url=${data.targetUrl}">
						</head>
						<body>
							<script>
								setTimeout(() => {
									window.parent.location.href = "${data.targetUrl}";
								}, 800);
							<\/script>
						</body>
					</html>
				`);
			iframeDoc.close();
		}

		try {
			Object.defineProperty(document, 'referrer', {
				get: () => customReferrer,
				configurable: true
			});
		} catch (e) {
			console.warn('Browser blocks referrer mutation API');
		}

		const timeout = setTimeout(() => {
			window.location.replace(targetUrl);
		}, 1200);

		return () => clearTimeout(timeout);
	});
</script>

<svelte:head>
	<title>{data.view.title}</title>
	<meta name="robots" content="noindex,nofollow" />
</svelte:head>

<SafelinkView {...data.view} targetUrl={data.targetUrl} />
