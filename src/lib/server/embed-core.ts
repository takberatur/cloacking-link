import { createHmac, timingSafeEqual } from 'node:crypto';

const DEFAULT_SELECTOR = 'a[data-linkshift]';
const TOKEN_TTL_SECONDS = 15 * 60;

export type EmbedSettingsInput = {
	enabled: boolean;
	rewriteLinks: boolean;
	selector: string;
	forwardPageQuery: boolean;
	allowedDomains: string[];
};

function booleanValue(formData: FormData, key: string): boolean {
	return formData.get(key) === 'on' || formData.get(key) === 'true';
}

export function normalizeEmbedDomain(value: string): string | null {
	let candidate = value.trim().toLowerCase();
	if (!candidate) return null;
	const wildcard = candidate.startsWith('*.');
	if (wildcard) candidate = candidate.slice(2);
	try {
		const url = new URL(candidate.includes('://') ? candidate : `https://${candidate}`);
		if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
		candidate = url.hostname.replace(/\.$/, '');
	} catch {
		return null;
	}
	if (!candidate || candidate.length > 253 || !/^[a-z0-9.-]+$/.test(candidate)) return null;
	if (candidate.includes('..')) return null;
	return wildcard ? `*.${candidate}` : candidate;
}

export function parseEmbedSettingsFormData(formData: FormData): EmbedSettingsInput {
	const enabled = booleanValue(formData, 'enabled');
	const selector = String(formData.get('selector') ?? '').trim() || DEFAULT_SELECTOR;
	if (
		!/^(?:a)?(?:#[a-zA-Z][\w-]*|\.[a-zA-Z][\w-]*|\[data-[\w-]+(?:=["'][^"']+["'])?\])$/.test(
			selector
		)
	) {
		throw new Error(
			'Use a simple anchor selector such as a[data-linkshift], .offer-link, or #offer'
		);
	}
	const rawDomains = String(formData.get('allowedDomains') ?? '')
		.split(/[\s,]+/)
		.filter(Boolean);
	const allowedDomains = [...new Set(rawDomains.map(normalizeEmbedDomain))];
	if (allowedDomains.includes(null)) throw new Error('One or more allowed domains are invalid');
	const domains = allowedDomains as string[];
	if (enabled && domains.length === 0) throw new Error('Add at least one allowed domain');
	if (domains.length > 100) throw new Error('A maximum of 100 allowed domains is supported');

	return {
		enabled,
		rewriteLinks: booleanValue(formData, 'rewriteLinks'),
		selector,
		forwardPageQuery: booleanValue(formData, 'forwardPageQuery'),
		allowedDomains: domains
	};
}

export function isEmbedDomainAllowed(hostname: string, allowedDomains: string[]): boolean {
	const host = hostname.toLowerCase().replace(/\.$/, '');
	return allowedDomains.some((rule) => {
		if (rule.startsWith('*.')) {
			const base = rule.slice(2);
			return host !== base && host.endsWith(`.${base}`);
		}
		return host === rule;
	});
}

export function embedSourceDomain(headers: Headers): string | null {
	for (const value of [headers.get('origin'), headers.get('referer')]) {
		if (!value) continue;
		try {
			return new URL(value).hostname.toLowerCase();
		} catch {
			// Try the next source header.
		}
	}
	return null;
}

function sign(value: string, secret: string): string {
	if (!secret) throw new Error('Embed signing secret is not set');
	return createHmac('sha256', secret).update(value).digest('base64url');
}

export function createEmbedTokenWithSecret(
	key: string,
	domain: string,
	secret: string,
	now = new Date()
): string {
	const payload = Buffer.from(
		JSON.stringify({ key, domain, exp: Math.floor(now.getTime() / 1000) + TOKEN_TTL_SECONDS })
	).toString('base64url');
	return `${payload}.${sign(payload, secret)}`;
}

export function verifyEmbedTokenWithSecret(
	token: string,
	key: string,
	secret: string,
	now = new Date()
): { domain: string } | null {
	const [payload, signature, ...extra] = token.split('.');
	if (!payload || !signature || extra.length > 0) return null;
	const expected = Buffer.from(sign(payload, secret));
	const actual = Buffer.from(signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
	try {
		const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
			key?: unknown;
			domain?: unknown;
			exp?: unknown;
		};
		if (
			value.key !== key ||
			typeof value.domain !== 'string' ||
			typeof value.exp !== 'number' ||
			value.exp < Math.floor(now.getTime() / 1000)
		) {
			return null;
		}
		return { domain: value.domain };
	} catch {
		return null;
	}
}

export function buildEmbedScript(input: {
	baseUrl: string;
	publicKey: string;
	token: string;
	selector: string;
	rewriteLinks: boolean;
	forwardPageQuery: boolean;
}): string {
	const config = JSON.stringify(input).replace(/</g, '\\u003c');
	return `(function(){"use strict";var c=${config};var bound="data-linkshift-bound";function redirectUrl(){var u=new URL(c.baseUrl+"/api/embed/"+encodeURIComponent(c.publicKey)+"/redirect");u.searchParams.set("token",c.token);if(c.forwardPageQuery&&location.search)u.searchParams.set("q",location.search.slice(1,2049));return u.toString()}function bind(root){var links=[];try{links=Array.from(root.querySelectorAll(c.selector))}catch(e){return}links.forEach(function(link){if(!(link instanceof HTMLAnchorElement)||link.hasAttribute(bound))return;link.setAttribute(bound,"");var url=redirectUrl();if(c.rewriteLinks){link.href=url}else{link.addEventListener("click",function(event){if(event.defaultPrevented)return;event.preventDefault();if(event.button===1||event.metaKey||event.ctrlKey||event.shiftKey){window.open(url,"_blank","noopener,noreferrer")}else{location.assign(url)}})}})}function impression(){fetch(c.baseUrl+"/api/embed/"+encodeURIComponent(c.publicKey)+"/event",{method:"POST",mode:"cors",credentials:"omit",keepalive:true,headers:{"content-type":"application/json"},body:JSON.stringify({token:c.token,type:"impression",pageUrl:location.href.slice(0,2048)})}).catch(function(){})}function start(){bind(document);impression();new MutationObserver(function(records){records.forEach(function(record){record.addedNodes.forEach(function(node){if(node.nodeType===1){if(node.matches&&node.matches(c.selector))bind(node.parentNode||document);else bind(node)}})})}).observe(document.documentElement,{childList:true,subtree:true})}if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start()})();`;
}
