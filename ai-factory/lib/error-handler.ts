/**
 * 统一错误处理工具
 * 提供一致的错误响应格式和错误分类
 */

import { NextResponse } from 'next/server';

// 错误类型枚举
export enum ErrorCode {
  // 客户端错误 (400-499)
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,

  // 服务端错误 (500-599)
  INTERNAL_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
  TIMEOUT = 504,

  // 业务错误 (自定义)
  PROJECT_LOCKED = 1001,
  PROJECT_NOT_FOUND = 1002,
  GENERATION_FAILED = 1003,
  CLAUDECK_UNAVAILABLE = 1004,
  PREVIEW_FAILED = 1005,
}

// 错误响应接口
export interface ErrorResponse {
  code: number;
  message: string;
  error?: string;
  details?: Record<string, any>;
  timestamp: number;
}

// 应用错误类
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, any>;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    details?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message);
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;

    // 确保正确的原型链
    Object.setPrototypeOf(this, AppError.prototype);
  }

  // 静态工厂方法
  static badRequest(message: string, details?: Record<string, any>): AppError {
    return new AppError(message, ErrorCode.BAD_REQUEST, details);
  }

  static unauthorized(message: string = '未授权访问'): AppError {
    return new AppError(message, ErrorCode.UNAUTHORIZED);
  }

  static forbidden(message: string = '禁止访问'): AppError {
    return new AppError(message, ErrorCode.FORBIDDEN);
  }

  static notFound(resource: string = '资源'): AppError {
    return new AppError(`${resource}不存在`, ErrorCode.NOT_FOUND);
  }

  static conflict(message: string, details?: Record<string, any>): AppError {
    return new AppError(message, ErrorCode.CONFLICT, details);
  }

  static validation(message: string, details?: Record<string, any>): AppError {
    return new AppError(message, ErrorCode.VALIDATION_ERROR, details);
  }

  static internal(message: string = '服务器内部错误'): AppError {
    return new AppError(message, ErrorCode.INTERNAL_ERROR, undefined, false);
  }

  static timeout(message: string = '请求超时'): AppError {
    return new AppError(message, ErrorCode.TIMEOUT);
  }

  static serviceUnavailable(service: string): AppError {
    return new AppError(`${service}服务不可用`, ErrorCode.SERVICE_UNAVAILABLE);
  }

  // 业务错误
  static projectLocked(projectId: string, operation: string): AppError {
    return new AppError(
      `项目正在被操作中 (${operation})`,
      ErrorCode.PROJECT_LOCKED,
      { projectId, operation }
    );
  }

  static projectNotFound(projectId: string): AppError {
    return new AppError('项目不存在', ErrorCode.PROJECT_NOT_FOUND, { projectId });
  }

  static generationFailed(reason: string): AppError {
    return new AppError(`生成失败: ${reason}`, ErrorCode.GENERATION_FAILED);
  }

  static claudeckUnavailable(): AppError {
    return new AppError('Claudeck 服务不可用，请确保服务正在运行', ErrorCode.CLAUDECK_UNAVAILABLE);
  }

  static previewFailed(reason: string): AppError {
    return new AppError(`预览失败: ${reason}`, ErrorCode.PREVIEW_FAILED);
  }
}

/**
 * 创建错误响应
 */
export function errorResponse(
  error: AppError | Error | unknown,
  defaultMessage: string = '服务器错误'
): NextResponse<ErrorResponse> {
  let code = ErrorCode.INTERNAL_ERROR;
  let message = defaultMessage;
  let details: Record<string, any> | undefined;

  if (error instanceof AppError) {
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof Error) {
    message = error.message;
  }

  // 记录错误日志
  console.error(`[Error] ${code}: ${message}`, details || '');

  // 构建 HTTP 状态码
  const httpStatus = getHttpStatus(code);

  return NextResponse.json(
    {
      code,
      message,
      details,
      timestamp: Date.now(),
    } as ErrorResponse,
    { status: httpStatus }
  );
}

/**
 * 根据错误码获取 HTTP 状态码
 */
function getHttpStatus(code: ErrorCode): number {
  // 业务错误统一返回 400
  if (code >= 1000) {
    return 400;
  }
  return code;
}

/**
 * 异步处理器包装器
 * 自动捕获错误并返回统一格式
 */
export function asyncHandler<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  }) as T;
}

/**
 * 判断是否为操作型错误（可预期的错误）
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * 错误重试包装器
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delay?: number;
    shouldRetry?: (error: Error) => boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, delay = 1000, shouldRetry } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 检查是否应该重试
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError;
      }

      // 最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 等待后重试
      console.log(`[Retry] 尝试 ${attempt + 1}/${maxRetries} 失败，${delay}ms 后重试...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * 超时包装器
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  message: string = '操作超时'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError(message, ErrorCode.TIMEOUT));
    }, timeoutMs);

    fn()
      .then(result => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch(error => {
        clearTimeout(timer);
        reject(error);
      });
  });
}