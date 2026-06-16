import fs from 'fs';
import path from 'path';

export interface DemoQualityPack {
  id: string;
  title: string;
  description: string;
  content: string;
}

const QUALITY_PACK_DIR = path.join(process.cwd(), 'server', 'demo-templates', 'quality-packs');

function titleFor(id: string) {
  if (id === 'anti-ai-slop') return '去 AI 味';
  if (id === 'visual-polish') return '视觉强化';
  if (id === 'interaction-polish') return '交互润色';
  return id;
}

function descriptionFor(id: string) {
  if (id === 'anti-ai-slop') return '减少模板味和空泛页面表达';
  if (id === 'visual-polish') return '提升层级、留白和卡片质感';
  if (id === 'interaction-polish') return '补足关键反馈和操作闭环';
  return '质量规则';
}

export const DemoQualityPackService = {
  list(): DemoQualityPack[] {
    if (!fs.existsSync(QUALITY_PACK_DIR)) return [];
    return fs.readdirSync(QUALITY_PACK_DIR)
      .filter((name) => name.endsWith('.md'))
      .map((name) => {
        const id = name.replace(/\.md$/i, '');
        return {
          id,
          title: titleFor(id),
          description: descriptionFor(id),
          content: fs.readFileSync(path.join(QUALITY_PACK_DIR, name), 'utf-8'),
        };
      });
  },

  getByIds(ids: string[]): DemoQualityPack[] {
    const wanted = new Set(ids);
    return this.list().filter((item) => wanted.has(item.id));
  },
};
