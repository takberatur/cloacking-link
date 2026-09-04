<script lang="ts">
	import {
		BoldIcon,
		ItalicIcon,
		LinkIcon,
		ListIcon,
		ListOrderedIcon,
		QuoteIcon,
		Redo2Icon,
		StrikethroughIcon,
		UnderlineIcon,
		Undo2Icon,
		UnlinkIcon
	} from '@lucide/svelte';
	import { TOGGLE_LINK_COMMAND } from '@lexical/link';
	import type { Snippet } from 'svelte';
	import { getActiveEditor, getBlockType, getIsLink } from 'slx/core/composerContext.js';
	import {
		formatBulletList,
		formatHeading,
		formatNumberedList,
		formatParagraph,
		formatQuote,
		redo,
		toggleBold,
		toggleItalic,
		toggleStrikethrough,
		toggleUnderline,
		undo
	} from 'slx/core/commands/commands.js';

	const activeEditor = getActiveEditor();
	const blockType = getBlockType();
	const isLink = getIsLink();
	let { children }: { children?: Snippet } = $props();

	function setBlock(event: Event) {
		const value = (event.currentTarget as HTMLSelectElement).value;
		if (value === 'paragraph') formatParagraph($activeEditor);
		else if (value === 'h1' || value === 'h2' || value === 'h3')
			formatHeading($activeEditor, $blockType, value);
		else if (value === 'bullet') formatBulletList($activeEditor, $blockType);
		else if (value === 'number') formatNumberedList($activeEditor, $blockType);
		else if (value === 'quote') formatQuote($activeEditor, $blockType);
	}

	function toggleLink() {
		if ($isLink) {
			$activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
			return;
		}
		const value = window.prompt('Link URL', 'https://');
		if (!value) return;
		try {
			const url = new URL(value);
			if (url.protocol !== 'https:' && url.protocol !== 'http:') return;
			$activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url.toString());
		} catch {
			// Invalid URLs are ignored and never enter the document.
		}
	}
</script>

<div class="flex min-h-11 flex-wrap items-center gap-1 border-b border-border p-1.5">
	<button
		type="button"
		class="tool-button"
		title="Undo"
		aria-label="Undo"
		onclick={() => undo($activeEditor)}><Undo2Icon /></button
	>
	<button
		type="button"
		class="tool-button"
		title="Redo"
		aria-label="Redo"
		onclick={() => redo($activeEditor)}><Redo2Icon /></button
	>
	<span class="mx-1 h-6 w-px bg-border"></span>
	<select
		class="h-8 rounded-md border border-input bg-background px-2 text-xs"
		value={$blockType}
		onchange={setBlock}
		aria-label="Text block"
	>
		<option value="paragraph">Paragraph</option><option value="h1">Heading 1</option><option
			value="h2">Heading 2</option
		><option value="h3">Heading 3</option><option value="bullet">Bullet list</option><option
			value="number">Numbered list</option
		><option value="quote">Quote</option>
	</select>
	<span class="mx-1 h-6 w-px bg-border"></span>
	<button
		type="button"
		class="tool-button"
		title="Bold"
		aria-label="Bold"
		onclick={() => toggleBold($activeEditor)}><BoldIcon /></button
	>
	<button
		type="button"
		class="tool-button"
		title="Italic"
		aria-label="Italic"
		onclick={() => toggleItalic($activeEditor)}><ItalicIcon /></button
	>
	<button
		type="button"
		class="tool-button"
		title="Underline"
		aria-label="Underline"
		onclick={() => toggleUnderline($activeEditor)}><UnderlineIcon /></button
	>
	<button
		type="button"
		class="tool-button"
		title="Strikethrough"
		aria-label="Strikethrough"
		onclick={() => toggleStrikethrough($activeEditor)}><StrikethroughIcon /></button
	>
	<button
		type="button"
		class="tool-button"
		title={$isLink ? 'Remove link' : 'Add link'}
		aria-label={$isLink ? 'Remove link' : 'Add link'}
		onclick={toggleLink}
		>{#if $isLink}<UnlinkIcon />{:else}<LinkIcon />{/if}</button
	>
	<button
		type="button"
		class="tool-button"
		title="Bullet list"
		aria-label="Bullet list"
		onclick={() => formatBulletList($activeEditor, $blockType)}><ListIcon /></button
	>
	<button
		type="button"
		class="tool-button"
		title="Numbered list"
		aria-label="Numbered list"
		onclick={() => formatNumberedList($activeEditor, $blockType)}><ListOrderedIcon /></button
	>
	<button
		type="button"
		class="tool-button"
		title="Quote"
		aria-label="Quote"
		onclick={() => formatQuote($activeEditor, $blockType)}><QuoteIcon /></button
	>
	{@render children?.()}
</div>

<style>
	.tool-button {
		display: inline-flex;
		width: 2rem;
		height: 2rem;
		align-items: center;
		justify-content: center;
		border-radius: 0.375rem;
	}
	.tool-button:hover {
		background: var(--muted);
	}
	.tool-button :global(svg) {
		width: 1rem;
		height: 1rem;
	}
</style>
