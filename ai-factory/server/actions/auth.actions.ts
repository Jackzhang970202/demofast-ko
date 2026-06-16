/**
 * 认证相关 Server Actions
 * 供 Client Components 调用
 */

'use server';

import { AuthService } from '@/server/services/auth.service';
import type { AuthResult, RegisterRequest, CreateUserRequest } from '@/types';

/**
 * 用户登录
 */
export async function loginAction(
  email: string,
  password: string
): Promise<AuthResult> {
  return AuthService.login(email, password);
}

/**
 * 用户注册
 */
export async function registerAction(data: RegisterRequest): Promise<AuthResult> {
  return AuthService.register(data);
}

/**
 * 管理员创建用户
 */
export async function createUserAction(
  currentUserId: string | null,
  data: CreateUserRequest
): Promise<AuthResult> {
  if (!currentUserId) {
    return { success: false, message: '未登录' };
  }

  const currentUser = await AuthService.getUserById(currentUserId);
  if (!currentUser || currentUser.role !== 'admin') {
    return { success: false, message: '无权限创建账号' };
  }

  return AuthService.createUser({ ...data, role: 'user' });
}

/**
 * 获取当前用户
 */
export async function getCurrentUserAction(userId: string | null): Promise<{
  success: boolean;
  user?: any;
}> {
  if (!userId) {
    return { success: false };
  }

  const user = await AuthService.getUserById(userId);
  return { success: !!user, user };
}