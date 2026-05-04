import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import https from 'https';
import http from 'http';

const MAX_IMAGE_BYTES = 512 * 1024; // 512 KB per image

function fetchImageAsBase64(url: string): Promise<string | null> {
    return new Promise((resolve) => {
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, { timeout: 5000 }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                resolve(fetchImageAsBase64(res.headers.location));
                return;
            }
            if (!res.statusCode || res.statusCode >= 400) {
                resolve(null);
                return;
            }
            const contentType = res.headers['content-type']?.split(';')[0].trim() || 'image/png';
            const chunks: Buffer[] = [];
            let total = 0;
            res.on('data', (chunk: Buffer) => {
                total += chunk.length;
                if (total > MAX_IMAGE_BYTES) { res.destroy(); resolve(null); return; }
                chunks.push(chunk);
            });
            res.on('end', () => resolve(`data:${contentType};base64,${Buffer.concat(chunks).toString('base64')}`));
            res.on('error', () => resolve(null));
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

export async function inlineSignatureImages(html: string): Promise<string> {
    const $ = cheerio.load(html, { xmlMode: false });
    const imgs: { el: cheerio.Cheerio<Element>; src: string }[] = [];

    $('img').each((_, node) => {
        if (!isElement(node)) return;
        const src = node.attribs?.src ?? '';
        if (src.startsWith('http://') || src.startsWith('https://')) {
            imgs.push({ el: $(node), src });
        }
    });

    await Promise.all(imgs.map(async ({ el, src }) => {
        const dataUri = await fetchImageAsBase64(src);
        if (dataUri) el.attr('src', dataUri);
    }));

    return $('body').html() ?? html;
}

const ALLOWED_CSS_PROPS = new Set([
    'color', 'background-color', 'background',
    'font-size', 'font-family', 'font-weight', 'font-style', 'font-variant',
    'line-height', 'letter-spacing', 'text-decoration', 'text-align',
    'vertical-align', 'white-space',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-width', 'border-style', 'border-color',
    'border-collapse', 'border-spacing',
    'width', 'height', 'max-width', 'min-width',
    'display', 'overflow',
]);

const UNSUPPORTED_VALUE_PATTERNS = [
    /\boklab\s*\(/i,
    /\boklch\s*\(/i,
    /\bcolor-mix\s*\(/i,
    /\benv\s*\(/i,
    /\bvar\s*\(--/i,
];

function cleanInlineStyle(rawStyle: string): string {
    const result: string[] = [];

    for (const decl of rawStyle.split(';')) {
        const colonIdx = decl.indexOf(':');
        if (colonIdx === -1) continue;

        const prop = decl.slice(0, colonIdx).trim().toLowerCase();
        const value = decl.slice(colonIdx + 1).trim();

        if (!prop || !value) continue;
        if (!ALLOWED_CSS_PROPS.has(prop)) continue;
        if (UNSUPPORTED_VALUE_PATTERNS.some(re => re.test(value))) continue;

        result.push(`${prop}: ${value}`);
    }

    return result.join('; ');
}

function isElement(node: AnyNode): node is Element {
    return node.type === 'tag';
}

export function cleanSignatureHtml(html: string): string {
    const $ = cheerio.load(html, { xmlMode: false });

    $('*').each((_, node) => {
        if (!isElement(node)) return;

        const attribs = node.attribs ?? {};
        const keepAttrs: Record<string, string> = {};
        const tagName = node.name;

        for (const [attr, val] of Object.entries(attribs)) {
            if (attr === 'style') {
                const cleaned = cleanInlineStyle(val);
                if (cleaned) keepAttrs['style'] = cleaned;
            } else if (attr === 'href' || attr === 'src' || attr === 'alt') {
                keepAttrs[attr] = val;
            } else if ((attr === 'width' || attr === 'height') && ['img', 'table', 'td', 'th'].includes(tagName)) {
                keepAttrs[attr] = val;
            } else if (attr === 'border' || attr === 'cellpadding' || attr === 'cellspacing') {
                keepAttrs[attr] = val;
            } else if (attr === 'colspan' || attr === 'rowspan') {
                keepAttrs[attr] = val;
            } else if (attr === 'align' || attr === 'valign') {
                keepAttrs[attr] = val;
            }
        }

        node.attribs = keepAttrs;
    });

    // Fix tables: remove Word artifact width:0px and table-layout:fixed
    $('table').each((_, node) => {
        if (!isElement(node)) return;

        const style = node.attribs?.style ?? '';
        const fixedStyle = style
            .replace(/\bwidth\s*:\s*0\s*(px)?\s*;?/gi, '')
            .replace(/\btable-layout\s*:\s*fixed\s*;?/gi, '')
            .replace(/\bborder-spacing\s*:[^;]+;?/gi, '')
            .trim()
            .replace(/;+$/, '');

        if (fixedStyle) {
            node.attribs.style = fixedStyle;
        } else {
            delete node.attribs.style;
        }
    });

    return $('body').html() ?? html;
}
