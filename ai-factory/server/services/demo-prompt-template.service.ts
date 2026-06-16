import fs from 'fs';
import path from 'path';

export interface DemoPromptTemplate {
  id: string;
  surface: string;
  title: string;
  summary: string;
  prompt: string;
  tags?: string[];
  qualityScore?: number;
}

const PROMPT_TEMPLATE_FILE = path.join(process.cwd(), 'server', 'demo-templates', 'prompt-templates', 'starter-prompts.json');

export const DemoPromptTemplateService = {
  list(): Omit<DemoPromptTemplate, 'prompt'>[] {
    if (!fs.existsSync(PROMPT_TEMPLATE_FILE)) return [];
    return (JSON.parse(fs.readFileSync(PROMPT_TEMPLATE_FILE, 'utf-8')) as DemoPromptTemplate[])
      .map(({ prompt, ...summary }) => summary);
  },

  getById(id: string): DemoPromptTemplate | null {
    if (!fs.existsSync(PROMPT_TEMPLATE_FILE)) return null;
    return ((JSON.parse(fs.readFileSync(PROMPT_TEMPLATE_FILE, 'utf-8')) as DemoPromptTemplate[])
      .find((item) => item.id === id)) || null;
  },
};
