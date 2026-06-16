/**
 * 认证服务层
 */

import { queryOne, queryAll, insert } from '@/lib/db';
import type { User, AuthResult, PublicUser, CreateUserRequest, UserRole } from '@/types';

export interface LoginRequest {
  name: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  password: string;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export const AuthService = {
  async getUserUsageSummary(id: string) {
    const user = queryOne('users', (u: User) => u.id === id);
    if (!user) return null;
    return {
      balancePoints: user.balancePoints ?? 0,
      usedPoints: user.usedPoints ?? 0,
      usedTokens: user.usedTokens ?? 0,
    };
  },

  /**
   * 用户登录（使用用户名）
   */
  async login(name: string, password: string): Promise<AuthResult> {
    const user = queryOne('users', (u: User) => u.name === name);

    if (!user) {
      return { success: false, message: '用户不存在' };
    }

    if (user.password !== password) {
      return { success: false, message: '密码错误' };
    }

    const publicUser: PublicUser = {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      balancePoints: user.balancePoints,
      usedPoints: user.usedPoints,
      usedTokens: user.usedTokens,
    };

    return { success: true, user: publicUser };
  },

  /**
   * 用户注册
   */
  async register(): Promise<AuthResult> {
    return { success: false, message: '公开注册已关闭，请联系管理员分配账号' };
  },

  /**
   * 管理员创建用户
   */
  async createUser(data: CreateUserRequest): Promise<AuthResult> {
    const { name, password, role = 'user', avatar } = data;

    const existingUser = queryOne('users', (u: User) => u.name === name);
    if (existingUser) {
      return { success: false, message: '用户名已被占用' };
    }

    const newUser = await insert('users', {
      name,
      password,
      role,
      avatar: avatar || this.getRandomAvatar(),
      balancePoints: 100,
      usedPoints: 0,
      usedTokens: 0,
    });

    const publicUser: PublicUser = {
      id: newUser.id,
      name: newUser.name,
      role: newUser.role,
      avatar: newUser.avatar,
      createdAt: newUser.createdAt,
      password: newUser.password,
      balancePoints: newUser.balancePoints,
      usedPoints: newUser.usedPoints,
      usedTokens: newUser.usedTokens,
    };

    return { success: true, user: publicUser };
  },

  /**
   * 根据ID获取用户
   */
  async getUserById(id: string): Promise<PublicUser | null> {
    const user = queryOne('users', (u: User) => u.id === id);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      balancePoints: user.balancePoints,
      usedPoints: user.usedPoints,
      usedTokens: user.usedTokens,
    };
  },

  /**
   * 获取所有用户
   */
  async getAllUsers(): Promise<PublicUser[]> {
    const users = queryAll('users') as User[];
    return users.map((user) => ({
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      password: user.password,
      balancePoints: user.balancePoints,
      usedPoints: user.usedPoints,
      usedTokens: user.usedTokens,
    }));
  },

  async getCurrentUserFromHeaders(headers: Headers): Promise<CurrentUser | null> {
    const userId = headers.get('x-user-id');
    const userRole = headers.get('x-user-role') as UserRole | null;

    if (!userId || !userRole) {
      return null;
    }

    const user = queryOne('users', (u: User) => u.id === userId) as User | undefined;
    if (!user || user.role !== userRole) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      avatar: user.avatar,
    };
  },

  /**
   * 获取随机头像
   */
  getRandomAvatar(): string {
    const avatars = ['😀', '😎', '🤓', '😊', '🥳', '🤩', '😋', '🧐'];
    return avatars[Math.floor(Math.random() * avatars.length)];
  },
};