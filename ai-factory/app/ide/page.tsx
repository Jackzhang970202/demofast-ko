'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Terminal, Maximize2, Minimize2 } from 'lucide-react';
import FileTree from '@/components/FileTree';
import ConsolePanel from '@/components/ConsolePanel';
import EmbeddedChat from '@/components/EmbeddedChat';
import { getAuthHeaders, getJsonAuthHeaders } from '@/lib/auth-client';

// 动态加载 Monaco Editor
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface ProjectFile {
  path: string;
  name: string;
  language: string;
  content: string;
}

interface LogEntry {
  type: 'info' | 'error' | 'warn' | 'success';
  message: string;
  timestamp: Date;
}

// 主组件
function IdeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [currentFile, setCurrentFile] = useState<ProjectFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('智能管理系统');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 右侧面板状态
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [rightPanelWidth, setRightPanelWidth] = useState<number | null>(null); // null 表示使用 flex-1 (50%)
  const [rightPanelTab, setRightPanelTab] = useState<'files' | 'preview'>('preview');
  const [isResizing, setIsResizing] = useState(false);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  // 拖拽优化：使用 ref 存储临时宽度和 RAF 节流
  const resizingRef = useRef(false);
  const tempWidthRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // 添加日志
  const addLog = useCallback((type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { type, message, timestamp: new Date() }]);
  }, []);

  // 加载项目数据
  useEffect(() => {
    const urlProjectId = searchParams.get('project');

    if (urlProjectId) {
      loadExistingProject(urlProjectId);
      return;
    }

    const design = sessionStorage.getItem('design');
    const requirement = sessionStorage.getItem('requirement');

    if (!requirement) {
      router.push('/');
      return;
    }

    if (design) {
      const parsed = JSON.parse(design);
      setProjectName(parsed.title || '智能管理系统');
    }

    // 如果是从生成流程过来的，加载已生成的项目
    const generatedProjectId = sessionStorage.getItem('projectId');
    if (generatedProjectId) {
      loadExistingProject(generatedProjectId);
    } else {
      setLoading(false);
    }
  }, [router, searchParams]);

  const syncPreviewStatus = useCallback(async (id: string, silent = false) => {
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId: id, action: 'status' }),
      });
      const data = await res.json();

      if (data.code === 200 && data.data?.running && data.data?.url) {
        setPreviewUrl(data.data.url);
        if (!silent) {
          addLog('success', `✅ 已同步预览地址: ${data.data.url}`);
        }
        return;
      }

      setPreviewUrl(null);
    } catch (err: any) {
      if (!silent) {
        addLog('warn', `预览状态同步失败: ${err.message}`);
      }
    }
  }, [addLog]);

  // 加载已有项目
  const loadExistingProject = async (id: string) => {
    addLog('info', `正在加载项目 ${id}...`);

    setProjectId(id);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (data.code === 200 && data.data) {
        setProjectName(data.data.name || '项目');
        setFiles(data.data.files || []);

        if (data.data.files && data.data.files.length > 0) {
          const readme = data.data.files.find((f: ProjectFile) => f.path === 'spec/requirement.md');
          setCurrentFile(readme || data.data.files[0]);
        }

        await syncPreviewStatus(id, true);
        addLog('success', `✅ 项目加载完成，共 ${data.data.files?.length || 0} 个文件`);
      } else {
        throw new Error(data.message || '加载失败');
      }
    } catch (err: any) {
      addLog('error', `❌ 加载失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 启动预览
  const startPreview = async () => {
    if (!projectId) {
      addLog('warn', '请先加载项目');
      return;
    }

    setPreviewLoading(true);
    addLog('info', '正在准备预览环境...');

    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId, action: 'start' }),
      });

      const data = await res.json();

      if (data.code === 200 && data.data?.url) {
        setRightPanelTab('preview');
        setRightPanelOpen(true);
        await syncPreviewStatus(projectId, true);
        setPreviewUrl(prev => prev || data.data.url);
        addLog('success', `✅ 预览服务器已启动: ${data.data.url}`);
      } else {
        throw new Error(data.message || '启动预览失败');
      }
    } catch (err: any) {
      addLog('error', `❌ 启动预览失败: ${err.message}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // 停止预览
  const stopPreview = async () => {
    if (!projectId) return;

    try {
      await fetch('/api/preview', {
        method: 'POST',
        headers: getJsonAuthHeaders(),
        body: JSON.stringify({ projectId, action: 'stop' }),
      });
      setPreviewUrl(null);
      addLog('info', '预览已停止');
    } catch (err: any) {
      addLog('error', `停止预览失败: ${err.message}`);
    }
  };

  // 下载项目
  const handleDownload = async () => {
    if (!projectId) return;
    addLog('info', '正在打包项目...');

    try {
      const res = await fetch(`/api/projects/${projectId}/download`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('下载失败');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addLog('success', '✅ 项目已下载');
    } catch (err: any) {
      addLog('error', `❌ 下载失败: ${err.message}`);
    }
  };

  // 返回首页
  const handleBack = () => {
    sessionStorage.clear();
    router.push('/demo/workspace');
  };

  // 处理文件变更
  const handleFileChange = useCallback((path: string, action: 'create' | 'modify' | 'delete') => {
    addLog('info', `文件${action === 'create' ? '创建' : action === 'modify' ? '修改' : '删除'}: ${path}`);
    // 触发文件树刷新
    setRefreshTrigger(prev => prev + 1);
  }, [addLog]);

  // 重新加载文件列表
  const reloadFiles = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.code === 200 && data.data?.files) {
        setFiles(data.data.files);
      }
    } catch (err) {
      console.error('重新加载文件失败:', err);
    }
  }, [projectId]);

  // 预览全屏切换
  const togglePreviewFullscreen = useCallback(async () => {
    if (previewFullscreen) {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } else {
      const container = mainRef.current;
      if (container) {
        await container.requestFullscreen();
      }
    }
  }, [previewFullscreen]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFsChange = () => {
      setPreviewFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 拖拽调整右侧面板宽度 - 优化版本
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;

      const containerWidth = mainRef.current?.clientWidth || 1200;
      const newWidth = containerWidth - e.clientX;
      const clampedWidth = Math.max(300, Math.min(containerWidth - 400, newWidth));

      // 直接更新 DOM，避免 React 重渲染
      if (rightPanelRef.current) {
        rightPanelRef.current.style.flex = 'none';
        rightPanelRef.current.style.width = `${clampedWidth}px`;
      }

      tempWidthRef.current = clampedWidth;
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        setIsResizing(false);
        // 恢复文本选择
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        // 只在松开时更新 React 状态
        setRightPanelWidth(tempWidthRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 开始拖拽
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = true;
    setIsResizing(true);
    // 初始化宽度：如果还没有设置过，先获取当前宽度
    const currentWidth = rightPanelRef.current?.clientWidth || (mainRef.current?.clientWidth || 1200) / 2;
    tempWidthRef.current = currentWidth;
    // 禁用文本选择，提升拖拽体验
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  }, []);

  if (loading) {
    return (
      <div className="h-screen bg-[#1e1e1e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6" />
          <p className="text-gray-400 text-lg mb-2">正在加载项目...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">🏭 AI 开发工厂</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-300">{projectName}</span>
          {projectId && (
            <span className="text-gray-500 text-xs">({projectId})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setConsoleOpen(!consoleOpen)}
            className={`p-2 text-sm rounded transition-colors ${
              consoleOpen
                ? 'bg-purple-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
            title={consoleOpen ? '隐藏控制台' : '显示控制台'}
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={startPreview}
            disabled={previewLoading}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors disabled:opacity-50"
          >
            {previewLoading ? '⏳ 启动中...' : previewUrl ? '🔄 重启预览' : '▶ 启动预览'}
          </button>
          {previewUrl && (
            <button
              onClick={stopPreview}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
            >
              ⏹ 停止
            </button>
          )}
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
          >
            📥 下载ZIP
          </button>
          <button
            onClick={handleBack}
            className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            🏠 返回
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden" ref={mainRef}>
        {/* 左侧：对话面板 */}
        <div className="flex-1 flex flex-col min-w-[300px] bg-[#1a1a2e]">
          <EmbeddedChat
            projectId={projectId || ''}
            height="100%"
            onFileChange={handleFileChange}
            refreshTrigger={refreshTrigger}
          />
        </div>

        {/* 拖拽分隔条 - 加宽到更容易点击 */}
        {rightPanelOpen && (
          <div
            className={`w-3 cursor-col-resize flex-shrink-0 transition-colors ${
              isResizing ? 'bg-purple-500' : 'bg-[#3c3c3c] hover:bg-purple-500'
            }`}
            onMouseDown={handleResizeStart}
            style={{ userSelect: 'none' }}
          />
        )}

        {/* 右侧：文件查看面板 */}
        <div
          ref={rightPanelRef}
          className={`${
            rightPanelOpen ? (rightPanelWidth === null ? 'flex-1' : '') : 'w-0'
          } flex flex-col bg-[#252526] overflow-hidden ${isResizing ? '' : 'transition-all duration-300'}`}
          style={rightPanelOpen && rightPanelWidth !== null ? {
            width: rightPanelWidth,
            minWidth: 300,
            flexShrink: 0,
          } : rightPanelOpen ? { minWidth: 300 } : { width: 0 }}
        >
          {/* 右侧面板头部 */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#333333] border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRightPanelTab('files')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  rightPanelTab === 'files'
                    ? 'bg-[#3c3c3c] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                📁 文件
              </button>
              <button
                onClick={() => setRightPanelTab('preview')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  rightPanelTab === 'preview'
                    ? 'bg-[#3c3c3c] text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👁 预览
              </button>
              {rightPanelTab === 'preview' && (
                <button
                  onClick={togglePreviewFullscreen}
                  className="p-1 text-gray-400 hover:text-white rounded transition-colors"
                  title={previewFullscreen ? '退出全屏' : '全屏预览'}
                >
                  {previewFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="p-1 hover:bg-[#3c3c3c] rounded text-gray-400 hover:text-white"
              title="关闭面板"
            >
              ✕
            </button>
          </div>

          {/* 文件树 + 编辑器 */}
          {rightPanelTab === 'files' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* 文件树 */}
              <div className={`${currentFile ? 'h-48' : 'flex-1'} border-b border-[#3c3c3c] flex-shrink-0 transition-all duration-300`}>
                <FileTree
                  files={files}
                  selectedFile={currentFile?.path || null}
                  onSelectFile={(path) => {
                    const file = files.find(f => f.path === path);
                    if (file) setCurrentFile(file);
                  }}
                />
              </div>

              {/* 代码编辑器 */}
              {currentFile && (
                <div className="flex-1 overflow-hidden">
                  <div className="h-full flex flex-col">
                    <div className="px-3 py-1.5 bg-[#2d2d2d] border-b border-[#3c3c3c] text-gray-400 text-xs flex items-center justify-between">
                      <span>{currentFile.path}</span>
                      <button
                        onClick={() => setCurrentFile(null)}
                        className="hover:text-white"
                        title="关闭文件"
                      >
                        ✕
                      </button>
                    </div>
                    <MonacoEditor
                      height="100%"
                      language={currentFile.language}
                      value={currentFile.content}
                      theme="vs-dark"
                      options={{
                        readOnly: false,
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: 'on',
                      }}
                      onChange={(value) => {
                        if (value !== undefined && currentFile) {
                          setCurrentFile({ ...currentFile, content: value });
                          setFiles(prev => prev.map(f =>
                            f.path === currentFile.path ? { ...f, content: value } : f
                          ));
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 预览 */}
          {rightPanelTab === 'preview' && (
            <div className={`${previewFullscreen ? 'fixed inset-0 z-50 bg-[#0f172a]' : 'flex-1'} flex flex-col`}>
              {previewFullscreen && (
                <div className="absolute top-2 right-2 z-50">
                  <button
                    onClick={togglePreviewFullscreen}
                    className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
                    title="退出全屏"
                  >
                    <Minimize2 className="w-5 h-5" />
                  </button>
                </div>
              )}
              {previewUrl ? (
                <iframe
                  ref={iframeRef}
                  src={previewUrl}
                  className="w-full h-full border-0 bg-transparent"
                  title="Preview"
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-gray-100">
                  <div className="text-4xl mb-4">🚀</div>
                  <p className="mb-4 text-gray-600">点击「启动预览」查看运行效果</p>
                  <button
                    onClick={startPreview}
                    disabled={previewLoading}
                    className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                  >
                    {previewLoading ? '⏳ 启动中...' : '▶ 启动预览'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 右侧面板展开按钮（当面板关闭时显示） */}
        {!rightPanelOpen && (
          <div className="w-12 bg-[#333333] flex flex-col items-center py-2 gap-2 border-l border-[#3c3c3c]">
            <button
              onClick={() => {
                setRightPanelWidth(null); // 重置为 50%
                setRightPanelOpen(true);
                setRightPanelTab('preview');
              }}
              className="p-2 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white"
              title="查看预览"
            >
              👁
            </button>
            <button
              onClick={() => {
                setRightPanelWidth(null); // 重置为 50%
                setRightPanelOpen(true);
                setRightPanelTab('files');
              }}
              className="p-2 rounded hover:bg-[#3c3c3c] text-gray-400 hover:text-white"
              title="查看文件"
            >
              👁
            </button>
          </div>
        )}
      </div>

      {/* 底部控制台（默认隐藏，可通过按钮切换） */}
      {consoleOpen && (
        <div className="h-32 border-t border-[#3c3c3c]">
          <ConsolePanel logs={logs} onClear={() => setLogs([])} />
        </div>
      )}
    </div>
  );
}

// Loading 组件
function LoadingFallback() {
  return (
    <div className="h-screen bg-[#1e1e1e] flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6" />
        <p className="text-gray-400">正在加载...</p>
      </div>
    </div>
  );
}

// 导出带 Suspense 的组件
export default function IdePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <IdeContent />
    </Suspense>
  );
}