/**
 * Claudeck 服务状态 API
 * GET: 获取服务状态
 */

import { NextResponse } from 'next/server';
import { claudeckIntegrated } from '@/server/services/claudeck-integrated.service';

export async function GET() {
  const status = claudeckIntegrated.getStatus();
  const config = claudeckIntegrated.getConfig();

  // 检查服务健康状态
  let healthy = false;
  try {
    healthy = await claudeckIntegrated.healthCheck();
  } catch {
    healthy = false;
  }

  return NextResponse.json({
    code: 200,
    data: {
      running: status.running,
      port: status.port,
      healthy,
      wsUrl: config.wsUrl,
      apiUrl: config.apiUrl,
    },
  });
}