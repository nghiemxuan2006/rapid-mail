import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';

/**
 * Quill serializes mỗi dòng thành một block element (<p>, <h1>…), và một dòng
 * trống thành `<p><br></p>`. Trong app, quill.snow.css (`.ql-editor p{margin:0}`)
 * và Tailwind preflight đều reset margin của các block này về 0, nên editor và
 * PreviewModal hiển thị đúng.
 *
 * Nội dung gửi đi lại là HTML fragment trần, không kèm CSS nào. Gmail render nó
 * bằng user-agent stylesheet (`p { margin: 1em 0 }`), nên mỗi dòng bị cộng thêm
 * ~16px trên/dưới — dòng trống trở thành một dòng trống + 2 margin, tạo ra
 * khoảng cách rất lớn.
 *
 * Fix: inline lại đúng những margin mà editor đã reset, ngay trước khi build MIME.
 */

// Margin/padding mà editor áp cho từng block — inline lại để Gmail render giống app.
const BLOCK_RESETS: Record<string, string> = {
  p: 'margin: 0; padding: 0',
  h1: 'margin: 0; padding: 0',
  h2: 'margin: 0; padding: 0',
  h3: 'margin: 0; padding: 0',
  h4: 'margin: 0; padding: 0',
  h5: 'margin: 0; padding: 0',
  h6: 'margin: 0; padding: 0',
  // Quill snow: blockquote { margin: 5px 0; padding-left: 16px; border-left: 4px solid #ccc }
  blockquote: 'margin: 5px 0; padding-left: 16px; border-left: 4px solid #ccc',
};

function isElement(node: AnyNode): node is Element {
  return node.type === 'tag';
}

export function normalizeEmailHtml(html: string): string {
  if (!html) return html;

  const $ = cheerio.load(html, { xmlMode: false });

  $(Object.keys(BLOCK_RESETS).join(',')).each((_, node) => {
    if (!isElement(node)) return;

    const reset = BLOCK_RESETS[node.name];
    if (!reset) return;

    const existing = (node.attribs?.style ?? '').trim().replace(/;+$/, '');

    // Reset đứng trước để style có sẵn của user vẫn thắng theo thứ tự khai báo.
    node.attribs = {
      ...node.attribs,
      style: existing ? `${reset}; ${existing}` : reset,
    };
  });

  return $('body').html() ?? html;
}
