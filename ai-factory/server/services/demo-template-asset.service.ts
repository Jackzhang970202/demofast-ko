import fs from 'fs';
import path from 'path';

export interface DemoTemplateAssetMeta {
  id: string;
  title: string;
  description: string;
  useCases: string[];
  avoidCases?: string[];
  visualStyle?: string[];
  layoutStyle?: string[];
  tone?: string[];
  density?: 'low' | 'medium' | 'high';
  preferredOutputs?: string[];
  previewFile?: string;
  promptSeed?: string;
}

export interface DemoTemplateAssetDetail extends DemoTemplateAssetMeta {
  templateMarkdown: string;
  previewHtml?: string;
  references: Array<{ path: string; content: string }>;
  assets: string[];
}

const TEMPLATE_ROOT = path.join(process.cwd(), 'server', 'demo-templates', 'assets');

function templateDir(id: string) {
  return path.join(TEMPLATE_ROOT, id);
}

function safeRead(filePath: string) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
}

export const DemoTemplateAssetService = {
  list(): DemoTemplateAssetMeta[] {
    if (!fs.existsSync(TEMPLATE_ROOT)) return [];
    return fs.readdirSync(TEMPLATE_ROOT, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const metaPath = path.join(TEMPLATE_ROOT, entry.name, 'meta.json');
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as DemoTemplateAssetMeta;
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  },

  getById(id: string): DemoTemplateAssetDetail | null {
    const dir = templateDir(id);
    if (!fs.existsSync(dir)) return null;
    const metaPath = path.join(dir, 'meta.json');
    if (!fs.existsSync(metaPath)) return null;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as DemoTemplateAssetMeta;
    const referencesDir = path.join(dir, 'references');
    const references = fs.existsSync(referencesDir)
      ? fs.readdirSync(referencesDir).filter((name) => name.endsWith('.md') || name.endsWith('.txt')).map((name) => ({ path: `references/${name}`, content: safeRead(path.join(referencesDir, name)) }))
      : [];
    const assetsDir = path.join(dir, 'assets');
    const assets = fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir).map((name) => `assets/${name}`) : [];
    return {
      ...meta,
      templateMarkdown: safeRead(path.join(dir, 'template.md')),
      previewHtml: safeRead(path.join(dir, meta.previewFile || 'preview.html')) || undefined,
      references,
      assets,
    };
  },
};
