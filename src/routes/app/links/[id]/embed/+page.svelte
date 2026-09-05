<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ArrowLeftIcon, CheckIcon, CopyIcon, KeyRoundIcon, SaveIcon } from '@lucide/svelte';

	let { data, form } = $props();
	let copied = $state<'script' | 'link' | null>(null);

	async function copy(value: string, type: 'script' | 'link') {
		await navigator.clipboard.writeText(value);
		copied = type;
		window.setTimeout(() => (copied = null), 1600);
	}
</script>

<AppSidebarLayout page="Embed script" user={data.user} setting={data.setting}>
	<form method="POST" action="?/save" class="space-y-5 px-2 sm:px-4">
		<header class="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
			<div>
				<a
					href="/app/links/{data.campaign.id}"
					class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				>
					<ArrowLeftIcon class="size-4" />
					{data.campaign.name}
				</a>
				<h1 class="mt-2 text-2xl font-semibold">Embed script</h1>
			</div>
			<Button type="submit"><SaveIcon data-icon="inline-start" /> Save settings</Button>
		</header>

		{#if form?.error}
			<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>
		{:else if data.saved || data.rotated}
			<div class="rounded-md border border-border bg-muted/50 px-4 py-3 text-sm">
				{data.rotated ? 'Public embed key rotated.' : 'Embed settings saved.'}
			</div>
		{/if}

		<section class="grid gap-3 border-b border-border pb-6 sm:grid-cols-3">
			<div class="rounded-md border border-border p-4">
				<p class="text-xs font-medium text-muted-foreground uppercase">Status</p>
				<p class="mt-2 text-xl font-semibold">
					{data.embedSetting.enabled ? 'Enabled' : 'Disabled'}
				</p>
			</div>
			<div class="rounded-md border border-border p-4">
				<p class="text-xs font-medium text-muted-foreground uppercase">Impressions</p>
				<p class="mt-2 text-xl font-semibold tabular-nums">{data.totals.impressions}</p>
			</div>
			<div class="rounded-md border border-border p-4">
				<p class="text-xs font-medium text-muted-foreground uppercase">Embed clicks</p>
				<p class="mt-2 text-xl font-semibold tabular-nums">{data.totals.clicks}</p>
			</div>
		</section>

		<section class="grid gap-6 border-b border-border pb-6 md:grid-cols-2">
			<div class="space-y-4">
				<div>
					<h2 class="text-base font-semibold">Access</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Only requests from the listed domains can load this embed.
					</p>
				</div>
				<label class="flex items-center gap-3 text-sm font-medium">
					<input
						type="checkbox"
						name="enabled"
						checked={data.embedSetting.enabled}
						class="size-4"
					/>
					Enable embed
				</label>
				<div>
					<label for="allowedDomains" class="text-sm font-medium">Allowed domains</label>
					<Textarea
						id="allowedDomains"
						name="allowedDomains"
						value={data.embedSetting.allowedDomains.join('\n')}
						placeholder={'example.com\n*.example.org'}
						class="mt-1.5 min-h-32 font-mono text-sm"
					/>
				</div>
			</div>

			<div class="space-y-4">
				<div>
					<h2 class="text-base font-semibold">Link behavior</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						Choose which anchors call this campaign's redirect engine.
					</p>
				</div>
				<div>
					<label for="selector" class="text-sm font-medium">CSS selector</label>
					<Input
						id="selector"
						name="selector"
						value={data.embedSetting.selector}
						maxlength={255}
						class="mt-1.5 font-mono"
						required
					/>
				</div>
				<label class="flex items-start gap-3 text-sm">
					<input
						type="checkbox"
						name="rewriteLinks"
						checked={data.embedSetting.rewriteLinks}
						class="mt-0.5 size-4"
					/>
					<span
						><strong>Rewrite links</strong><br /><span class="text-muted-foreground"
							>Update matching href attributes when the page loads.</span
						></span
					>
				</label>
				<label class="flex items-start gap-3 text-sm">
					<input
						type="checkbox"
						name="forwardPageQuery"
						checked={data.embedSetting.forwardPageQuery}
						class="mt-0.5 size-4"
					/>
					<span
						><strong>Forward page query</strong><br /><span class="text-muted-foreground"
							>Pass UTM and affiliate parameters to the campaign.</span
						></span
					>
				</label>
			</div>
		</section>

		<section class="space-y-5 border-b border-border pb-6">
			<div>
				<h2 class="text-base font-semibold">Installation</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Add the script before the closing body tag, then mark campaign links with the selector.
				</p>
			</div>
			<div>
				<div class="mb-2 flex items-center justify-between gap-3">
					<p class="text-sm font-medium">Script</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={() => copy(data.snippet, 'script')}
					>
						{#if copied === 'script'}<CheckIcon data-icon="inline-start" /> Copied{:else}<CopyIcon
								data-icon="inline-start"
							/> Copy{/if}
					</Button>
				</div>
				<pre class="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs"><code
						>{data.snippet}</code
					></pre>
			</div>
			<div>
				<div class="mb-2 flex items-center justify-between gap-3">
					<p class="text-sm font-medium">Link markup</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onclick={() => copy(data.linkExample, 'link')}
					>
						{#if copied === 'link'}<CheckIcon data-icon="inline-start" /> Copied{:else}<CopyIcon
								data-icon="inline-start"
							/> Copy{/if}
					</Button>
				</div>
				<pre class="overflow-x-auto rounded-md border bg-muted/40 p-4 text-xs"><code
						>{data.linkExample}</code
					></pre>
			</div>
		</section>
	</form>

	<form
		method="POST"
		action="?/rotate"
		class="mx-auto mt-6 flex w-full max-w-5xl items-center justify-between gap-4 px-1 pb-6 sm:px-3"
		onsubmit={(event) => {
			if (!confirm('Rotate the public key? Existing embed snippets will stop working.'))
				event.preventDefault();
		}}
	>
		<div>
			<p class="text-sm font-medium">Public key</p>
			<p class="mt-1 max-w-lg truncate font-mono text-xs text-muted-foreground">
				{data.embedSetting.publicKey}
			</p>
		</div>
		<Button type="submit" variant="outline"
			><KeyRoundIcon data-icon="inline-start" /> Rotate key</Button
		>
	</form>
</AppSidebarLayout>
