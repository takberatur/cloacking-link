import 'dotenv/config';
import assert from 'node:assert/strict';
import {
	buildEmbedScript,
	createEmbedTokenWithSecret,
	isEmbedDomainAllowed,
	normalizeEmbedDomain,
	parseEmbedSettingsFormData,
	verifyEmbedTokenWithSecret
} from '../src/lib/server/embed-core';

assert.equal(normalizeEmbedDomain('HTTPS://Example.COM'), 'example.com');
assert.equal(normalizeEmbedDomain('*.News.Example.com'), '*.news.example.com');
assert.equal(normalizeEmbedDomain('https://example.com/path'), null);
assert.equal(isEmbedDomainAllowed('shop.example.com', ['*.example.com']), true);
assert.equal(isEmbedDomainAllowed('example.com', ['*.example.com']), false);
assert.equal(isEmbedDomainAllowed('example.com', ['example.com']), true);
assert.equal(isEmbedDomainAllowed('notexample.com', ['example.com']), false);

const now = new Date('2026-09-04T00:00:00.000Z');
const secret = 'test-signing-secret';
const token = createEmbedTokenWithSecret('public-key', 'publisher.example', secret, now);
assert.deepEqual(verifyEmbedTokenWithSecret(token, 'public-key', secret, now), {
	domain: 'publisher.example'
});
assert.equal(verifyEmbedTokenWithSecret(`${token}x`, 'public-key', secret, now), null);
assert.equal(verifyEmbedTokenWithSecret(token, 'another-key', secret, now), null);
assert.equal(
	verifyEmbedTokenWithSecret(token, 'public-key', secret, new Date('2026-09-04T00:16:00.000Z')),
	null
);

const formData = new FormData();
formData.set('enabled', 'on');
formData.set('rewriteLinks', 'on');
formData.set('forwardPageQuery', 'on');
formData.set('selector', 'a[data-linkshift]');
formData.set('allowedDomains', 'example.com\n*.publisher.example\nexample.com');
assert.deepEqual(parseEmbedSettingsFormData(formData), {
	enabled: true,
	rewriteLinks: true,
	selector: 'a[data-linkshift]',
	forwardPageQuery: true,
	allowedDomains: ['example.com', '*.publisher.example']
});

const script = buildEmbedScript({
	baseUrl: 'https://links.example',
	publicKey: 'public-key',
	token,
	selector: 'a[data-linkshift]',
	rewriteLinks: true,
	forwardPageQuery: true
});
assert.match(script, /MutationObserver/);
assert.match(script, /\/api\/embed\//);
assert.match(script, /impression/);
assert.doesNotMatch(script, /<\/script>/i);

console.log('Embed security and script tests passed.');
