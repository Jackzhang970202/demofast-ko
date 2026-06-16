'use client';

import { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';

interface CodeEditorProps {
  value: string;
  language: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
}

export default function CodeEditor({
  value,
  language,
  onChange,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  // 映射语言标识
  const getLanguage = (lang: string): string => {
    const langMap: Record<string, string> = {
      typescript: 'typescript',
      javascript: 'javascript',
      json: 'json',
      css: 'css',
      scss: 'scss',
      html: 'html',
      markdown: 'markdown',
      sql: 'sql',
      yaml: 'yaml',
      plaintext: 'plaintext',
    };
    return langMap[lang] || 'plaintext';
  };

  return (
    <Editor
      height="100%"
      language={getLanguage(language)}
      value={value}
      onChange={(v) => onChange?.(v || '')}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        readOnly,
        fontSize: 14,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        fontLigatures: true,
        minimap: { enabled: true },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        lineNumbers: 'on',
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,
        padding: { top: 10 },
      }}
    />
  );
}