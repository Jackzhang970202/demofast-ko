'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Loader2, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { getAuthHeaders } from '@/lib/auth-client';

interface EmbeddedChatProps {
  /** 项目ID */
  projectId: string;
  /** Claudeck 服务地址（默认从配置获取） */
  claudeckUrl?: string;
  /** 认证 Token */
  authToken?: string;
  /** 高度 */
  height?: string;
  /** 文件变更回调 */
  onFileChange?: (path: string, action: 'create' | 'modify' | 'delete') => void;
  /** 刷新触发器 */
  refreshTrigger?: number;
}

export default function EmbeddedChat({
  projectId,
  claudeckUrl,
  authToken,
  height = '100%',
  onFileChange,
  refreshTrigger,
}: EmbeddedChatProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [serviceUrl, setServiceUrl] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string>('');

  // 刷新 iframe
  const refreshIframe = useCallback(() => {
    setLoading(true);
    setError(null);
    setIframeKey((prev) => prev + 1);
  }, []);

  // 获取 Claudeck 服务状态和项目路径
  useEffect(() => {
    // 如果 projectId 为空，不请求路径
    if (!projectId) {
      setServiceUrl(claudeckUrl || 'http://localhost:9009');
      return;
    }

    async function fetchServiceStatus() {
      try {
        // 获取 Claudeck 服务状态
        const statusRes = await fetch('/api/claudeck/status', {
          headers: getAuthHeaders(),
        });
        const statusData = await statusRes.json();
        if (statusData.code === 200 && statusData.data) {
          const url = claudeckUrl || statusData.data.apiUrl || 'http://localhost:9009';
          setServiceUrl(url);
        } else {
          setServiceUrl(claudeckUrl || 'http://localhost:9009');
        }

        // 获取项目的绝对路径（必须从服务端获取）
        const pathRes = await fetch(`/api/projects/${projectId}/path`, {
          headers: getAuthHeaders(),
        });
        const pathData = await pathRes.json();
        if (pathData.code === 200 && pathData.data?.path) {
          setProjectPath(pathData.data.path);
        }
      } catch {
        setServiceUrl(claudeckUrl || 'http://localhost:9009');
      }
    }
    fetchServiceStatus();
  }, [claudeckUrl, projectId]);

  // 构建 iframe URL
  const buildIframeUrl = useCallback(() => {
    if (!serviceUrl || !projectPath) return '';

    const params = new URLSearchParams({
      embed: 'chat-only',
      cwd: projectPath,  // 使用绝对路径
      projectId: projectId,
    });

    if (authToken) {
      params.set('token', authToken);
    }

    return `${serviceUrl}?${params.toString()}`;
  }, [projectId, serviceUrl, projectPath, authToken]);

  // 在新窗口打开
  const openInNewWindow = useCallback(() => {
    if (serviceUrl && projectPath) {
      window.open(buildIframeUrl(), '_blank');
    }
  }, [serviceUrl, projectPath, buildIframeUrl]);

  // 处理 iframe 加载完成
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  // 处理 iframe 加载错误
  const handleError = useCallback(() => {
    setLoading(false);
    setError('无法连接到 Claudeck 服务，请确保服务正在运行');
  }, []);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 宽松检查：接受所有来源的消息
      if (!event.origin) return;

      // 处理文件变更消息
      if (event.data?.type === 'file_change') {
        onFileChange?.(event.data.path, event.data.action);
      }

      // 处理刷新请求
      if (event.data?.type === 'refresh') {
        refreshIframe();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onFileChange, refreshIframe]);

  // 刷新触发器变化时刷新
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      refreshIframe();
    }
  }, [refreshTrigger, refreshIframe]);

  // 所有 hooks 之后才能进行条件渲染

  // 如果 projectId 为空，显示提示
  if (!projectId) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-gray-400 text-sm">
            请先选择一个项目
          </p>
        </div>
      </div>
    );
  }

  // 如果还没有获取到服务地址或项目路径，显示加载状态
  if (!serviceUrl || !projectPath) {
    return (
      <div className="relative w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">
            {!serviceUrl ? '正在连接对话服务...' : '正在加载项目路径...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full" style={{ height }}>
      {/* 加载状态 */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">正在连接对话服务...</p>
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
          <div className="text-center p-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-white mb-2">{error}</p>
            <p className="text-gray-400 text-sm mb-4">
              请确保 Claudeck 服务正在运行
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={refreshIframe}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                重试
              </button>
              <button
                onClick={openInNewWindow}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                新窗口打开
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 工具栏 */}
      <div className="absolute top-2 right-2 z-20 flex gap-1">
        <button
          onClick={refreshIframe}
          className="p-1.5 bg-gray-800/80 text-gray-400 rounded hover:text-white hover:bg-gray-700 transition-colors"
          title="刷新"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={openInNewWindow}
          className="p-1.5 bg-gray-800/80 text-gray-400 rounded hover:text-white hover:bg-gray-700 transition-colors"
          title="在新窗口打开"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* iframe */}
      <iframe
        key={iframeKey}
        ref={iframeRef}
        src={buildIframeUrl()}
        className="w-full h-full border-0"
        onLoad={handleLoad}
        onError={handleError}
        allow="clipboard-read; clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}