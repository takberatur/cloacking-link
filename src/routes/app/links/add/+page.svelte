<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import CampaignForm from '$lib/components/app/campaign-form.svelte';

	let { data, form } = $props();
</script>

<AppSidebarLayout page="New campaign" user={data.user} setting={data.setting}>
	<div class="px-1 sm:px-3">
		<div class="mx-auto mb-6 w-full max-w-6xl">
			<p class="text-sm text-muted-foreground">Campaigns</p>
			<h1 class="mt-1 text-2xl font-semibold">Create campaign</h1>
		</div>
		<CampaignForm {form} />
	</div>
</AppSidebarLayout>
