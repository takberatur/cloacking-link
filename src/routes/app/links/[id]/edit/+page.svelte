<script lang="ts">
	import { AppSidebarLayout } from '@/components/app';
	import CampaignForm from '$lib/components/app/campaign-form.svelte';

	let { data, form } = $props();
</script>

<AppSidebarLayout page="Edit campaign" user={data.user} setting={data.setting}>
	<div class="space-y-5 px-2 sm:px-4">
		<div class="mb-6 w-full">
			<p class="text-sm text-muted-foreground">Campaigns / {data.campaign.name}</p>
			<h1 class="mt-1 text-2xl font-semibold">Edit campaign</h1>
		</div>
		<CampaignForm campaign={data.campaign} {form} teams={data.teams} submitLabel="Save changes" />
	</div>
</AppSidebarLayout>
