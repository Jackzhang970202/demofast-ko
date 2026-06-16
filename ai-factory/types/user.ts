/**
 * 用户相关类型定义
 */

// 用户角色
export type UserRole = 'admin' | 'user';

// 用户
export interface User {
  id: string;
  name: string;
  password: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  balancePoints?: number;
  usedPoints?: number;
  usedTokens?: number;
}

// 公开用户信息（不含密码）
export interface PublicUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  password?: string;
  balancePoints?: number;
  usedPoints?: number;
  usedTokens?: number;
}

// 认证结果
export interface AuthResult {
  success: boolean;
  user?: PublicUser;
  message?: string;
}

// 登录请求
export interface LoginRequest {
  name: string;
  password: string;
}

// 注册请求
export interface RegisterRequest {
  name: string;
  password: string;
}

// 管理员创建用户请求
export interface CreateUserRequest {
  name: string;
  password: string;
  role?: UserRole;
  avatar?: string;
}