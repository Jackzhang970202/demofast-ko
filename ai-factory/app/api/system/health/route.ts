import { NextRequest, NextResponse } from 'next/server';
import { getHealthReport, triggerHealthCheck, triggerCleanup } from '@/server/services/execution-state.service';
import { LockService } from '@/server/services/lock.service';
import { ClaudeckService } from '@/server/services/claudeck.service';

/**
 * 系统健康检查 API
 * GET: 获取健康报告
 * POST: 触发健康检查或清理
 */

export async function GET(request: NextRequest) {
  try {
    // 获取进程健康报告
    const processHealth = getHealthReport();

    // 获取锁状态
    const activeLocks = LockService.getAllActiveLocks();

    // 检查 Claudeck 服务状态
    let claudeckStatus = 'unknown';
    try {
      claudeckStatus = await ClaudeckService.healthCheck() ? 'healthy' : 'unhealthy';
    } catch {
      claudeckStatus = 'error';
    }

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        timestamp: Date.now(),
        processHealth,
        activeLocks,
        lockCount: activeLocks.length,
        claudeckStatus,
        systemStatus: {
          healthy: processHealth.deadProcesses === 0 && claudeckStatus === 'healthy',
          warnings: [
            ...(processHealth.deadProcesses > 0 ? [`${processHealth.deadProcesses} 个僵尸进程`] : []),
            ...(claudeckStatus !== 'healthy' ? ['Claudeck 服务异常'] : []),
            ...(activeLocks.length > 5 ? [`${activeLocks.length} 个活动锁`] : []),
          ],
        },
      },
    });
  } catch (error: any) {
    console.error('Health check error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'check') {
      triggerHealthCheck();
      return NextResponse.json({
        code: 200,
        message: '健康检查已触发',
      });
    }

    if (action === 'cleanup') {
      triggerCleanup();
      return NextResponse.json({
        code: 200,
        message: '僵尸进程清理已触发',
      });
    }

    return NextResponse.json(
      { code: 400, message: '无效的操作，支持: check, cleanup' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Health action error:', error);
    return NextResponse.json(
      { code: 500, message: error.message || '服务器错误' },
      { status: 500 }
    );
  }
}