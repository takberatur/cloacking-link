<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import SafelinkEditor from '$lib/components/app/safelink-editor.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeftIcon, EyeIcon, SaveIcon, SendIcon } from '@lucide/svelte';

	let { data, form } = $props();
	let document = $state('');
	let title = $state('');
	let ctaLabel = $state('');
	let countdownSeconds = $state(0);
	let backgroundColor = $state('#ffffff');
	let textColor = $state('#18181b');
	let accentColor = $state('#16a34a');

	$effect.pre(() => {
		document = JSON.stringify(data.page.document);
		title = data.page.title;
		ctaLabel = data.page.theme.ctaLabel;
		countdownSeconds = data.page.theme.countdownSeconds;
		backgroundColor = data.page.theme.backgroundColor;
		textColor = data.page.theme.textColor;
		accentColor = data.page.theme.accentColor;
	});
</script>

<AppSidebarLayout page="Safelink builder" user={data.user} setting={data.setting}>
	<form method="POST" class="mx-auto w-full max-w-7xl space-y-5 px-1 sm:px-3">
		<input type="hidden" name="document" value={document} />
		<header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
			<div>
				<a
					href="/app/links/{data.campaign.id}"
					class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeftIcon class="size-4" />
					{data.campaign.name}
				</a>
				<div class="mt-2 flex items-center gap-2">
					<h1 class="text-2xl font-semibold">Safelink builder</h1>
					<Badge variant={data.page.status === 'published' ? 'default' : 'secondary'}>
						{data.page.status}
					</Badge>
				</div>
			</div>
			<div class="flex flex-wrap gap-2">
				<Button href={data.previewUrl} target="_blank" variant="outline">
					<EyeIcon data-icon="inline-start" /> Preview
				</Button>
				<Button type="submit" formaction="?/save" variant="outline">
					<SaveIcon data-icon="inline-start" /> Save draft
				</Button>
				<Button type="submit" formaction="?/publish">
					<SendIcon data-icon="inline-start" /> Publish
				</Button>
			</div>
		</header>

		{#if form?.error}
			<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>
		{:else if data.saved || data.published || data.unpublished}
			<div class="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
				{data.published
					? 'Safelink published.'
					: data.unpublished
						? 'Safelink unpublished.'
						: 'Draft saved.'}
			</div>
		{/if}

		<div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
			<section class="min-w-0 space-y-3">
				<div>
					<label for="title" class="text-sm font-medium">Page title</label>
					<Input
						id="title"
						name="title"
						bind:value={title}
						maxlength={200}
						required
						class="mt-1.5"
					/>
				</div>
				<div>
					<p class="mb-1.5 text-sm font-medium">Page content</p>
					<SafelinkEditor
						campaignId={data.campaign.id}
						initialDocument={data.page.document}
						bind:document
					/>
				</div>
			</section>

			<aside
				class="space-y-5 border-t border-border pt-5 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-5"
			>
				<div>
					<h2 class="text-sm font-semibold">Call to action</h2>
					<label for="ctaLabel" class="mt-3 block text-xs text-muted-foreground">Button label</label
					>
					<Input id="ctaLabel" name="ctaLabel" bind:value={ctaLabel} maxlength={48} class="mt-1" />
					<label for="countdown" class="mt-3 block text-xs text-muted-foreground"
						>Countdown seconds</label
					>
					<Input
						id="countdown"
						name="countdownSeconds"
						type="number"
						min={0}
						max={300}
						bind:value={countdownSeconds}
						class="mt-1"
					/>
				</div>

				<div class="border-t border-border pt-5">
					<h2 class="text-sm font-semibold">Theme</h2>
					<label
						for="backgroundColor"
						class="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"
					>
						Background <input
							id="backgroundColor"
							name="backgroundColor"
							type="color"
							bind:value={backgroundColor}
							class="size-8 cursor-pointer rounded border-0 bg-transparent"
						/>
					</label>
					<label
						for="textColor"
						class="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"
					>
						Text <input
							id="textColor"
							name="textColor"
							type="color"
							bind:value={textColor}
							class="size-8 cursor-pointer rounded border-0 bg-transparent"
						/>
					</label>
					<label
						for="accentColor"
						class="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"
					>
						CTA <input
							id="accentColor"
							name="accentColor"
							type="color"
							bind:value={accentColor}
							class="size-8 cursor-pointer rounded border-0 bg-transparent"
						/>
					</label>
				</div>

				{#if data.page.status === 'published'}
					<div class="border-t border-border pt-5">
						<Button type="submit" formaction="?/unpublish" variant="destructive" class="w-full">
							Unpublish page
						</Button>
					</div>
				{/if}
			</aside>
		</div>
	</form>
</AppSidebarLayout>
