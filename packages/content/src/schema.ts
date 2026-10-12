// Content schemas shared by the CLI, the Astro build and the engine (types only).
import { z } from 'zod';

export const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, 'use lowercase letters, digits, "-" or "_"');

export const BANDS = ['low', 'mid', 'high'] as const;
export type Band = (typeof BANDS)[number];

export const DimWeights = z.record(z.string(), z.number());

const Option = z.object({
  id: IdSchema,
  dims: DimWeights.optional(),
  correct: z.boolean().optional(),
  goto: IdSchema.optional(),
});

const common = { id: IdSchema, emoji: z.string().optional(), goto: IdSchema.optional() };

export const NarrativeScene = z.object({ ...common, type: z.literal('narrative') });
export const ChoiceScene = z.object({
  ...common,
  type: z.literal('choice'),
  options: z.array(Option).min(2),
});
export const QuizScene = z.object({
  ...common,
  type: z.literal('quiz'),
  options: z.array(Option).min(2),
});

export const SIM_MODELS = ['runway', 'purchasing-power', 'margin-of-safety', 'rebalance'] as const;
export type SimModel = (typeof SIM_MODELS)[number];
export const SIM_INPUTS: Record<SimModel, string[]> = {
  runway: ['savings', 'expenses'],
  'purchasing-power': ['amount', 'inflation', 'years'],
  'margin-of-safety': ['value', 'price'],
  rebalance: ['growth'],
};

export const SimScene = z.object({
  ...common,
  type: z.literal('sim'),
  model: z.enum(SIM_MODELS),
  inputs: z
    .array(
      z.object({
        id: IdSchema,
        min: z.number(),
        max: z.number(),
        step: z.number().positive(),
        default: z.number(),
        unit: z.enum(['million', 'percent', 'year', 'month', 'none']).default('none'),
      }),
    )
    .min(1),
});

export const SortScene = z.object({
  ...common,
  type: z.literal('sort'),
  items: z.array(IdSchema).min(2),
  correctOrder: z.array(IdSchema).min(2),
  dims: DimWeights.optional(),
});

export const MatchScene = z.object({
  ...common,
  type: z.literal('match'),
  pairs: z.array(IdSchema).min(2).max(6),
  dims: DimWeights.optional(),
});

export const ReflectScene = z.object({
  ...common,
  type: z.literal('reflect'),
  mode: z.enum(['pick', 'text']),
  options: z.array(IdSchema).optional(),
  saveAs: z.enum(['goal', 'note']),
});

export const ReportScene = z.object({
  ...common,
  type: z.literal('report'),
  scope: z.enum(['part', 'package']).default('part'),
});

export const SceneSchema = z.discriminatedUnion('type', [
  NarrativeScene,
  ChoiceScene,
  QuizScene,
  SimScene,
  SortScene,
  MatchScene,
  ReflectScene,
  ReportScene,
]);
export type Scene = z.infer<typeof SceneSchema>;

export const PartSchema = z
  .object({
    id: IdSchema,
    emoji: z.string(),
    minutes: z.number().positive(),
    access: z.enum(['free', 'premium']).optional(),
    scenes: z.array(SceneSchema).min(1),
  })
  .superRefine((part, ctx) => {
    const ids = new Set<string>();
    for (const s of part.scenes) {
      if (ids.has(s.id)) ctx.addIssue({ code: 'custom', message: `duplicate scene id "${s.id}"` });
      ids.add(s.id);
    }
    for (const s of part.scenes) {
      if (s.goto && !ids.has(s.goto)) ctx.addIssue({ code: 'custom', message: `${s.id}: goto "${s.goto}" not found` });
      if (s.type === 'choice' || s.type === 'quiz') {
        for (const o of s.options)
          if (o.goto && !ids.has(o.goto)) ctx.addIssue({ code: 'custom', message: `${s.id}/${o.id}: goto "${o.goto}" not found` });
      }
      if (s.type === 'quiz' && s.options.filter((o) => o.correct).length !== 1)
        ctx.addIssue({ code: 'custom', message: `${s.id}: quiz needs exactly one correct option` });
      if (s.type === 'sort') {
        const a = [...s.items].sort().join('|');
        const b = [...s.correctOrder].sort().join('|');
        if (a !== b) ctx.addIssue({ code: 'custom', message: `${s.id}: correctOrder must be a permutation of items` });
      }
      if (s.type === 'sim') {
        const have = s.inputs.map((i) => i.id).sort().join('|');
        const need = [...SIM_INPUTS[s.model]].sort().join('|');
        if (have !== need) ctx.addIssue({ code: 'custom', message: `${s.id}: model "${s.model}" needs inputs ${SIM_INPUTS[s.model].join(', ')}` });
      }
      if (s.type === 'reflect' && s.mode === 'pick' && !s.options?.length)
        ctx.addIssue({ code: 'custom', message: `${s.id}: pick mode needs options` });
    }
  });
export type Part = z.infer<typeof PartSchema>;

export const ACCENTS = ['teal', 'violet', 'amber', 'rose', 'sky'] as const;
export const PackageMetaSchema = z.object({
  slug: IdSchema,
  type: z.enum(['book', 'game', 'test']),
  emoji: z.string(),
  accent: z.enum(ACCENTS),
  locales: z.array(z.string()).min(1),
  tags: z.array(z.string()).default([]),
  level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  minutes: z.number().positive(),
  gallery: z.array(z.string()).default([]),
  category: IdSchema,
  featured: z.boolean().default(false),
  access: z.enum(['free', 'premium']).default('free'),
  tier: z.number().int().min(1).max(3).default(1),
  dims: z.array(z.string()).min(1),
  parts: z.array(IdSchema).min(1),
  next: IdSchema.optional(),
  related: z.array(IdSchema).default([]),
});
export type PackageMeta = z.infer<typeof PackageMetaSchema>;

export const SceneTextSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  prompt: z.string().optional(),
  explain: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.record(z.string(), z.object({ label: z.string(), feedback: z.string().optional() })).optional(),
  inputs: z.record(z.string(), z.object({ label: z.string() })).optional(),
  items: z.record(z.string(), z.string()).optional(),
  hints: z.array(z.string()).optional(),
  pairs: z.record(z.string(), z.object({ left: z.string(), right: z.string() })).optional(),
});
export type SceneText = z.infer<typeof SceneTextSchema>;

export const LocaleTextSchema = z.object({
  package: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    about: z.string().optional(),
    gallery: z.record(z.string(), z.string()).optional(),
    author: z.object({ name: z.string(), bio: z.string() }).optional(),
  }),
  parts: z.record(
    z.string(),
    z.object({ title: z.string(), summary: z.string(), scenes: z.record(z.string(), SceneTextSchema) }),
  ),
  rewards: z.array(z.object({ title: z.string(), body: z.string() })).optional(),
});
export type LocaleText = z.infer<typeof LocaleTextSchema>;

export const CategorySchema = z.object({ id: IdSchema, emoji: z.string(), label: z.record(z.string(), z.string()) });
export type Category = z.infer<typeof CategorySchema>;

export const DimDefSchema = z.object({ id: z.string(), emoji: z.string() });
export type DimDef = z.infer<typeof DimDefSchema>;
const BandText = z.object({ meaning: z.string(), practice: z.string() });
export const DimTextSchema = z.object({ label: z.string(), low: BandText, mid: BandText, high: BandText });
export type DimText = z.infer<typeof DimTextSchema>;

const L10n = z.record(z.string(), z.string());
export const PathSchema = z.object({
  id: IdSchema,
  emoji: z.string(),
  title: L10n,
  description: L10n,
  items: z.array(z.object({ type: z.enum(['package', 'article']), slug: IdSchema })).min(2),
});
export type PathDef = z.infer<typeof PathSchema>;

export const ArticleFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string(),
  updated: z.string().optional(),
  tags: z.array(z.string()).default([]),
  packages: z.array(IdSchema).default([]),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
});
export type ArticleFrontmatter = z.infer<typeof ArticleFrontmatterSchema>;

// ---- Resolved (locale-merged) shapes consumed by the engine ----
export type ResolvedScene = Scene & { text: SceneText };
export interface SceneKind { type: string; emoji?: string; title?: string }
export interface ResolvedPart {
  id: string;
  emoji: string;
  minutes: number;
  title: string;
  summary: string;
  // Locked parts (premium in an edition without paywall access) carry no scenes and no scene text.
  locked: boolean;
  sceneCount: number;
  sceneKinds: SceneKind[];
  scenes: ResolvedScene[];
}
export interface ResolvedPackage {
  meta: PackageMeta;
  locale: string;
  fallback: boolean;
  title: string;
  subtitle?: string;
  description: string;
  about?: string;
  gallery: { file: string; caption?: string }[];
  author?: { name: string; bio: string };
  rewards: { title: string; body: string }[];
  parts: ResolvedPart[];
}

// Effective access of a part: the part's own value wins, otherwise the package default.
export function partAccess(meta: PackageMeta, part: Pick<Part, 'access'>): 'free' | 'premium' {
  return part.access ?? meta.access;
}
