import { NextRequest, NextResponse } from 'next/server';
import { LockService } from '@/server/services/lock.service';
import { AppError, errorResponse, asyncHandler } from '@/lib/error-handler';
import { initDatabase } from '@/lib/db';
import { AuthService } from '@/server/services/auth.service';
import { ProjectService } from '@/server/services/project.service';

/**
 * 项目锁管理 API
 * POST: 获取锁或释放锁（通过 action 参数区分）
 * DELETE: 释放锁
 * GET: 查询锁状态
 */

export const POST = asyncHandler(async (request: NextRequest) => {
  await initDatabase();
  const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
  if (!currentUser) {
    throw AppError.unauthorized('未登录或登录状态无效');
  }

  const body = await request.json();
  const { projectId, operation, action } = body;

  if (!projectId) {
    throw AppError.badRequest('projectId 不能为空');
  }

  const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
  if (!project) {
    throw AppError.notFound('项目不存在');
  }

  // 如果 action 为 release，则释放锁
  if (action === 'release') {
    LockService.release(projectId);
    return NextResponse.json({
      code: 200,
      message: '锁已释放',
      data: {
        locked: false,
        projectId,
      },
    });
  }

  // 检查是否已有锁
  const existingLock = LockService.isLocked(projectId);
  if (existingLock) {
    return NextResponse.json({
      code: 409,
      message: `项目正在执行 ${existingLock.operation}，请勿重复触发`,
      data: {
        locked: true,
        projectId,
        operation: existingLock.operation,
      },
    });
  }

  // 尝试获取锁
  const acquired = LockService.acquire(projectId, operation || 'generate');

  if (acquired) {
    return NextResponse.json({
      code: 200,
      message: '锁获取成功',
      data: {
        locked: true,
        projectId,
      },
    });
  } else {
    throw AppError.conflict('无法获取锁，项目正在被其他操作占用');
  }
});

export const DELETE = asyncHandler(async (request: NextRequest) => {
  await initDatabase();
  const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
  if (!currentUser) {
    throw AppError.unauthorized('未登录或登录状态无效');
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    throw AppError.badRequest('projectId 不能为空');
  }

  const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
  if (!project) {
    throw AppError.notFound('项目不存在');
  }

  LockService.release(projectId);

  return NextResponse.json({
    code: 200,
    message: '锁已释放',
    data: {
      locked: false,
      projectId,
    },
  });
});

export const GET = asyncHandler(async (request: NextRequest) => {
  await initDatabase();
  const currentUser = await AuthService.getCurrentUserFromHeaders(request.headers);
  if (!currentUser) {
    throw AppError.unauthorized('未登录或登录状态无效');
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    // 返回所有活动锁
    const locks = LockService.getAllActiveLocks();
    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        locks,
        count: locks.length,
      },
    });
  }

  const project = await ProjectService.getAccessibleProjectById(projectId, currentUser);
  if (!project) {
    throw AppError.notFound('项目不存在');
  }

  const lockInfo = LockService.isLocked(projectId);

  return NextResponse.json({
    code: 200,
    message: 'success',
    data: {
      locked: lockInfo !== null,
      lockInfo,
    },
  });
});