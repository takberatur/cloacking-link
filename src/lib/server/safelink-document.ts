const MAX_DOCUMENT_BYTES = 250_000;
const MAX_DEPTH = 20;

export type SafelinkTheme = {
	backgroundColor: string;
	textColor: string;
	accentColor: string;
	ctaLabel: string;
	countdownSeconds: number;
};

export const DEFAULT_SAFELINK_DOCUMENT = JSON.stringify({
	root: {
		children: [
			{
				children: [
					{
						detail: 0,
						format: 0,
						mode: 'normal',
						style: '',
						text: 'Your destination is ready. Add useful context here before visitors continue.',
						type: 'text',
						version: 1
					}
				],
				direction: null,
				format: '',
				indent: 0,
				type: 'paragraph',
				version: 1
			}
		],
		direction: null,
		format: '',
		indent: 0,
		type: 'root',
		version: 1
	}
});

const DEFAULT_THEME: SafelinkTheme = {
	backgroundColor: '#ffffff',
	textColor: '#18181b',
	accentColor: '#16a34a',
	ctaLabel: 'Continue',
	countdownSeconds: 0
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');
}

function safeUrl(value: unknown, image = false): string | null {
	if (typeof value !== 'string' || value.length > 2_048) return null;
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
		if (image && url.protocol !== 'https:') return null;
		return url.toString();
	} catch {
		return null;
	}
}

function renderChildren(node: Record<string, unknown>, depth: number): string {
	if (!Array.isArray(node.children) || depth > MAX_DEPTH) return '';
	return node.children.map((child) => renderNode(child, depth + 1)).join('');
}

function renderText(node: Record<string, unknown>): string {
	let value = escapeHtml(typeof node.text === 'string' ? node.text : '');
	const format = typeof node.format === 'number' ? node.format : 0;
	if (format & 16) value = `<code>${value}</code>`;
	if (format & 1) value = `<strong>${value}</strong>`;
	if (format & 2) value = `<em>${value}</em>`;
	if (format & 4) value = `<s>${value}</s>`;
	if (format & 8) value = `<u>${value}</u>`;
	if (format & 32) value = `<sub>${value}</sub>`;
	if (format & 64) value = `<sup>${value}</sup>`;
	return value;
}

function renderNode(value: unknown, depth = 0): string {
	if (!isRecord(value) || depth > MAX_DEPTH || typeof value.type !== 'string') return '';

	switch (value.type) {
		case 'root':
			return renderChildren(value, depth);
		case 'text':
			return renderText(value);
		case 'linebreak':
			return '<br>';
		case 'paragraph':
			return `<p>${renderChildren(value, depth)}</p>`;
		case 'heading': {
			const tag = ['h1', 'h2', 'h3'].includes(String(value.tag)) ? String(value.tag) : 'h2';
			return `<${tag}>${renderChildren(value, depth)}</${tag}>`;
		}
		case 'quote':
			return `<blockquote>${renderChildren(value, depth)}</blockquote>`;
		case 'list': {
			const tag = value.listType === 'number' ? 'ol' : 'ul';
			return `<${tag}>${renderChildren(value, depth)}</${tag}>`;
		}
		case 'listitem':
			return `<li>${renderChildren(value, depth)}</li>`;
		case 'link': {
			const url = safeUrl(value.url);
			return url
				? `<a href="${escapeHtml(url)}" rel="nofollow noreferrer noopener" target="_blank">${renderChildren(value, depth)}</a>`
				: renderChildren(value, depth);
		}
		case 'horizontalrule':
			return '<hr>';
		case 'image': {
			const src = safeUrl(value.src, true);
			if (!src) return '';
			const alt = escapeHtml(typeof value.altText === 'string' ? value.altText.slice(0, 300) : '');
			return `<figure><img src="${escapeHtml(src)}" alt="${alt}" loading="lazy" referrerpolicy="no-referrer"></figure>`;
		}
		default:
			return renderChildren(value, depth);
	}
}

export function parseSafelinkDocument(raw: string): Record<string, unknown> {
	if (!raw || new TextEncoder().encode(raw).length > MAX_DOCUMENT_BYTES) {
		throw new Error('Safelink content is empty or too large');
	}
	const document: unknown = JSON.parse(raw);
	if (!isRecord(document) || !isRecord(document.root) || document.root.type !== 'root') {
		throw new Error('Safelink content is invalid');
	}
	return document;
}

export function renderSafelinkDocument(document: unknown): string {
	if (!isRecord(document) || !isRecord(document.root)) return '';
	return renderNode(document.root);
}

export function parseSafelinkTheme(
	input: Record<string, unknown> | null | undefined
): SafelinkTheme {
	const hex = (value: unknown, fallback: string) =>
		typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
	const label = typeof input?.ctaLabel === 'string' ? input.ctaLabel.trim().slice(0, 48) : '';
	const countdown = Number(input?.countdownSeconds);

	return {
		backgroundColor: hex(input?.backgroundColor, DEFAULT_THEME.backgroundColor),
		textColor: hex(input?.textColor, DEFAULT_THEME.textColor),
		accentColor: hex(input?.accentColor, DEFAULT_THEME.accentColor),
		ctaLabel: label || DEFAULT_THEME.ctaLabel,
		countdownSeconds: Number.isFinite(countdown)
			? Math.min(300, Math.max(0, Math.floor(countdown)))
			: DEFAULT_THEME.countdownSeconds
	};
}
