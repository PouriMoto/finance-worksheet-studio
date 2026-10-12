// Markdown for articles and "about" blocks. Images use media:<path> (files in content/media) and render as large figures.
import { Marked } from 'marked';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

const md = new Marked({
  renderer: {
    image({ href, title, text }) {
      const src = href?.startsWith('media:') ? `/media/${href.slice('media:'.length)}` : href ?? '';
      const caption = title ? `<figcaption class="mt-2 text-center text-sm text-muted">${esc(title)}</figcaption>` : '';
      return `<figure class="my-6"><img src="${esc(src)}" alt="${esc(text)}" loading="lazy" class="w-full rounded-2xl border border-line bg-surface" />${caption}</figure>`;
    },
  },
});

export const renderMarkdown = (source: string): string => md.parse(source, { async: false }) as string;
