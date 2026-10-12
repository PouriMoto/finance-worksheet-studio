// Copies content/media -> apps/web/public/media so authors only ever touch the content folder.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'content', 'media');
const dest = path.join(root, 'apps', 'web', 'public', 'media');
fs.rmSync(dest, { recursive: true, force: true });
if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log(`media synced -> ${path.relative(root, dest)}`);
} else {
  console.log('no content/media folder; nothing to sync');
}
