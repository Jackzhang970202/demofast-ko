'use client';

import { useState, useEffect } from 'react';

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileTreeItem[];
  language?: string;
}

interface FileTreeProps {
  files: { path: string; name: string; language: string }[];
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
}

export default function FileTree({ files, selectedFile, onSelectFile }: FileTreeProps) {
  // 默认展开常见目录和spec目录
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['app', 'components', 'lib', 'spec']));
  const [tree, setTree] = useState<FileTreeItem[]>([]);

  // 构建文件树
  useEffect(() => {
    const root: FileTreeItem[] = [];
    const map = new Map<string, FileTreeItem>();

    // 先创建所有节点
    files.forEach((file) => {
      const parts = file.path.split('/');
      let currentPath = '';

      parts.forEach((part, index) => {
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!map.has(currentPath)) {
          const isFile = index === parts.length - 1;
          const item: FileTreeItem = {
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            language: isFile ? file.language : undefined,
            children: isFile ? undefined : [],
          };
          map.set(currentPath, item);

          if (parentPath) {
            const parent = map.get(parentPath);
            parent?.children?.push(item);
          } else {
            root.push(item);
          }
        }
      });
    });

    // 排序：spec目录放最前，然后文件夹在前，再按名称排序
    const sortChildren = (items: FileTreeItem[]): FileTreeItem[] => {
      return items
        .sort((a, b) => {
          // spec目录放最前面
          if (a.name === 'spec') return -1;
          if (b.name === 'spec') return 1;
          // 文件夹优先
          if (a.type !== b.type) {
            return a.type === 'folder' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
        .map((item) => ({
          ...item,
          children: item.children ? sortChildren(item.children) : undefined,
        }));
    };

    setTree(sortChildren(root));
  }, [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const renderTree = (items: FileTreeItem[], level: number = 0): React.ReactNode => {
    return items.map((item) => {
      const isSpec = item.path === 'spec' || item.path.startsWith('spec/');

      return (
        <div key={item.path}>
          <div
            className={`flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-[#2a2d2e] transition-colors ${
              selectedFile === item.path ? 'bg-[#37373d]' : ''
            } ${isSpec && item.type === 'file' ? 'border-l-2 border-purple-500' : ''}`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => {
              if (item.type === 'folder') {
                toggleFolder(item.path);
              } else {
                onSelectFile(item.path);
              }
            }}
          >
            {item.type === 'folder' ? (
              <>
                <span className="text-gray-400 text-xs">
                  {expandedFolders.has(item.path) ? '▼' : '▶'}
                </span>
                <span className={isSpec ? 'text-purple-400' : 'text-yellow-400'}>
                  {isSpec ? '📋' : '📁'}
                </span>
              </>
            ) : (
              <>
                <span className="w-3" />
                <span>{getFileIcon(item.name, isSpec)}</span>
              </>
            )}
            <span className={`text-sm truncate ${isSpec ? 'text-purple-300' : 'text-gray-300'}`}>
              {item.name}
            </span>
          </div>
          {item.type === 'folder' && expandedFolders.has(item.path) && item.children && (
            <div>{renderTree(item.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full overflow-auto bg-[#252526] text-sm">
      <div className="p-2 text-gray-400 text-xs font-medium border-b border-[#3c3c3c]">
        📁 资源管理器
      </div>
      {renderTree(tree)}
    </div>
  );
}

function getFileIcon(fileName: string, isSpec: boolean = false): string {
  if (isSpec) {
    // spec目录下的文件用文档图标
    if (fileName === 'requirement.md') return '📄';
    if (fileName === 'design.md') return '📐';
    if (fileName === 'api.md') return '🔌';
    return '📝';
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const iconMap: Record<string, string> = {
    ts: '📘',
    tsx: '⚛️',
    js: '📒',
    jsx: '⚛️',
    json: '📋',
    css: '🎨',
    scss: '🎨',
    html: '🌐',
    md: '📝',
    sql: '🗄️',
    prisma: '🗄️',
    yaml: '⚙️',
    yml: '⚙️',
    gitignore: '🙈',
    env: '🔐',
  };
  return iconMap[ext] || '📄';
}