import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 开发工厂',
  description: '所说即所得的智能开发平台',
  keywords: ['AI', '代码生成', '智能开发', 'Claude', 'Next.js'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="dark">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}