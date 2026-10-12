// studio CLI: validate | lint-i18n | new <book|game|test> <slug>
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { defaultContentRoot } from './node.ts';
import { lintI18n, validateContent } from './validate.ts';
import { migrateFolder } from './migrate.ts';

const [cmd, ...args] = process.argv.slice(2);
const root = defaultContentRoot();
const repoRoot = path.resolve(root, '..');

function report(issues: { level: string; where: string; message: string }[]): number {
  const errors = issues.filter((i) => i.level === 'error');
  const warns = issues.filter((i) => i.level === 'warn');
  for (const i of [...errors, ...warns]) console.log(`${i.level === 'error' ? 'ERROR' : 'warn '}  ${i.where}  ${i.message}`);
  console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`);
  return errors.length;
}

if (cmd === 'validate') {
  const { content, issues } = validateContent(root);
  console.log(`packages: ${content.packages.length}, paths: ${content.paths.length}, articles: ${content.articles.length}, dims: ${content.dims.length}`);
  process.exit(report(issues) ? 1 : 0);
} else if (cmd === 'lint-i18n') {
  process.exit(report(lintI18n(repoRoot)) ? 1 : 0);
} else if (cmd === 'new') {
  const [type, slug] = args;
  if (!['book', 'game', 'test'].includes(type ?? '') || !/^[a-z0-9-]+$/.test(slug ?? '')) {
    console.error('usage: npm run new -- <book|game|test> <slug>');
    process.exit(2);
  }
  const dir = path.join(root, 'packages', slug);
  if (fs.existsSync(dir)) { console.error(`already exists: ${dir}`); process.exit(2); }
  fs.mkdirSync(path.join(dir, 'parts'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'locales'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.yaml'), `slug: ${slug}\ntype: ${type}\nemoji: "✨"\naccent: teal\ncategory: general\nfeatured: false\naccess: free\nlocales: [fa]\ntags: []\nlevel: beginner\nminutes: 10\ndims: [long_term_thinking]\nparts: [part-1]\nrelated: []\n`);
  fs.writeFileSync(path.join(dir, 'parts', 'part-1.yaml'), `id: part-1\nemoji: "✨"\nminutes: 5\nscenes:\n  - id: intro\n    type: narrative\n  - id: report\n    type: report\n    scope: package\n`);
  fs.writeFileSync(path.join(dir, 'locales', 'fa.yaml'), `package:\n  title: ""\n  description: ""\nparts:\n  part-1:\n    title: ""\n    summary: ""\n    scenes:\n      intro:\n        body: ""\n`);
  console.log(`created ${path.relative(process.cwd(), dir)} — fill the texts, then run: npm run validate`);
} else if (cmd === 'migrate') {
  const [src, slug, category] = args;
  if (!src || !slug) { console.error('usage: npm run migrate -- <legacy game src dir> <new-slug> [category]'); process.exit(2); }
  const r = migrateFolder(path.resolve(src), root, slug, category);
  console.log(`created ${r.parts} part(s) in content/packages/${slug}`);
  for (const w of r.warnings) console.log(`warn  ${w}`);
} else if (cmd === 'add-part') {
  const [slug, partId] = args;
  if (!slug || !/^[a-z0-9-]+$/.test(partId ?? '')) { console.error('usage: npm run add-part -- <package-slug> <part-id>'); process.exit(2); }
  const dir = path.join(root, 'packages', slug);
  const pkgFile = path.join(dir, 'package.yaml');
  if (!fs.existsSync(pkgFile)) { console.error(`no such package: ${slug}`); process.exit(2); }
  const doc = YAML.parseDocument(fs.readFileSync(pkgFile, 'utf8'));
  const parts = doc.get('parts') as YAML.YAMLSeq;
  if (parts.items.some((i) => String((i as YAML.Scalar).value) === partId)) { console.error('part already exists'); process.exit(2); }
  parts.add(partId);
  fs.writeFileSync(pkgFile, String(doc));
  fs.writeFileSync(path.join(dir, 'parts', `${partId}.yaml`), `id: ${partId}\nemoji: "✨"\nminutes: 6\nscenes:\n  - { id: intro, type: narrative }\n  - { id: report, type: report, scope: part }\n`);
  for (const locale of (doc.get('locales') as YAML.YAMLSeq).items.map((i) => String((i as YAML.Scalar).value))) {
    const f = path.join(dir, 'locales', `${locale}.yaml`);
    const ld = YAML.parseDocument(fs.readFileSync(f, 'utf8'));
    ld.setIn(['parts', partId], { title: '', summary: '', scenes: { intro: { body: '' } } });
    fs.writeFileSync(f, String(ld));
  }
  console.log(`added part "${partId}" to ${slug} (all locales). Fill the texts, then run: npm run validate`);
} else {
  console.error('commands: validate | lint-i18n | new <book|game|test> <slug> | add-part <slug> <part> | migrate <dir> <slug>');
  process.exit(2);
}
