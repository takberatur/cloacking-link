<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ArrowLeftIcon, FlaskConicalIcon } from '@lucide/svelte';
	let { data, form } = $props();
	const defaultUa =
		'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36';
</script>

<AppSidebarLayout page="Rule simulator" user={data.user} setting={data.setting}>
	<div class="mx-auto w-full max-w-5xl space-y-6 px-1 sm:px-3">
		<header class="border-b border-border pb-5">
			<a
				href={`/app/links/${data.campaign.id}`}
				class="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
				><ArrowLeftIcon class="size-4" /> {data.campaign.name}</a
			>
			<h1 class="mt-3 text-2xl font-semibold">Rule simulator</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Evaluate visitor signals without recording a click.
			</p>
		</header>

		{#if form?.error}<div
				class="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
			>
				{form.error}
			</div>{/if}

		<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
			<form method="POST" class="space-y-4">
				<div class="grid gap-4 sm:grid-cols-2">
					<label class="space-y-1.5 text-sm"
						><span>IP address</span><Input
							name="ip"
							value={form?.values?.ip ?? '203.0.113.42'}
							placeholder="203.0.113.42"
						/></label
					>
					<label class="space-y-1.5 text-sm"
						><span>Country</span><Input
							name="countryCode"
							maxlength={2}
							value={form?.values?.countryCode ?? 'ID'}
							placeholder="ID"
						/></label
					>
					<label class="space-y-1.5 text-sm"
						><span>Language</span><Input
							name="language"
							value={form?.values?.language ?? 'id-ID'}
							placeholder="id-ID"
						/></label
					>
					<label class="space-y-1.5 text-sm"
						><span>Referrer</span><Input
							name="referrer"
							type="url"
							value={form?.values?.referrer ?? ''}
							placeholder="https://example.com/page"
						/></label
					>
				</div>
				<label class="block space-y-1.5 text-sm"
					><span>User agent</span><textarea
						name="userAgent"
						rows={5}
						class="w-full resize-y border border-input bg-background px-3 py-2 text-sm"
						>{form?.values?.userAgent ?? defaultUa}</textarea
					></label
				>
				<Button type="submit"><FlaskConicalIcon data-icon="inline-start" /> Run simulation</Button>
			</form>

			<section class="border-l-0 border-border lg:border-l lg:pl-6">
				<h2 class="text-base font-semibold">Decision</h2>
				{#if form?.result}
					<div class="mt-4 space-y-4">
						<div class="flex flex-wrap items-center gap-2">
							<Badge variant={form.result.outcome === 'blocked' ? 'destructive' : 'default'}
								>{form.result.outcome}</Badge
							><span class="text-sm">{form.result.reason}</span>
						</div>
						<dl class="grid gap-3 text-sm">
							<div>
								<dt class="text-xs text-muted-foreground">Visitor</dt>
								<dd>
									{form.result.visitor.deviceType} · {form.result.visitor.browser} · {form.result
										.visitor.os}
								</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">Risk</dt>
								<dd>
									{form.result.visitor.riskScore}/100{form.result.visitor.riskReasons.length
										? ` · ${form.result.visitor.riskReasons.join(', ')}`
										: ''}
								</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">Matched rule</dt>
								<dd>
									{form.result.matchedRule
										? `${form.result.matchedRule.type} / ${form.result.matchedRule.action}`
										: 'None'}
								</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">Destination</dt>
								<dd>{form.result.destination?.name ?? 'None'}</dd>
							</div>
							<div>
								<dt class="text-xs text-muted-foreground">Final URL</dt>
								<dd class="font-mono text-xs break-all">{form.result.location ?? 'None'}</dd>
							</div>
						</dl>
					</div>
				{:else}<p class="mt-3 text-sm text-muted-foreground">
						Submit visitor signals to inspect the routing result.
					</p>{/if}
			</section>
		</div>
	</div>
</AppSidebarLayout>
