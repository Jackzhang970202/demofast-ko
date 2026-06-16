import fs from 'fs';
import path from 'path';

const ARTIFACT_PRIORITY: { ext: string; rank: number }[] = [
  { ext: '.html', rank: 0 },
  { ext: '.htm', rank: 0 },
  { ext: '.png', rank: 1 },
  { ext: '.jpg', rank: 1 },
  { ext: '.jpeg', rank: 1 },
  { ext: '.webp', rank: 1 },
  { ext: '.mp4', rank: 2 },
  { ext: '.webm', rank: 2 },
  { ext: '.tsx', rank: 3 },
  { ext: '.jsx', rank: 3 },
];

function getRank(filePath: string): number {
  const ext = path.extname(filePath).toLowerCase();
  const entry = ARTIFACT_PRIORITY.find((e) => e.ext === ext);
  return entry ? entry.rank : 99;
}

export const DemoArtifactService = {
  selectMainArtifact(projectDir: string): string | null {
    if (!fs.existsSync(projectDir)) return null;

    const candidates: { path: string; rank: number; mtime: number }[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else {
          const relativePath = path.relative(projectDir, fullPath).replace(/\\/g, '/');
          const rank = getRank(relativePath);
          if (rank < 99) {
            const stat = fs.statSync(fullPath);
            candidates.push({ path: relativePath, rank, mtime: stat.mtimeMs });
          }
        }
      }
    };

    walk(projectDir);

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      return b.mtime - a.mtime;
    });

    return candidates[0].path;
  },
};
