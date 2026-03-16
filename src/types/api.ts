/**
 * API响应类型定义
 * 提供统一的API响应类型安全
 */

import { User, FarmState, LandPlot, Agent, AgentDecision, CropConfig, LevelConfig } from '@prisma/client';

// ============================================
// 基础响应类型
// ============================================

/**
 * API成功响应基础接口
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * API错误响应接口
 */
export interface ApiErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * API响应联合类型
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================
// 认证相关类型
// ============================================

export interface LoginRequest {
  message: string;
  signature: string;
  walletAddress: string;
}

export interface LoginResponse {
  user: {
    id: string;
    walletAddress: string;
    username: string | null;
    level: number;
    experience: number;
    farmCoins: number;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

export interface AuthContext {
  userId: string;
  walletAddress: string;
  iat: number;
  exp: number;
}

// ============================================
// 农场相关类型
// ============================================

export interface FarmStateResponse {
  user: {
    id: string;
    walletAddress: string;
    username: string | null;
    level: number;
    experience: number;
    farmCoins: number;
  };
  farmState: {
    id: string;
    energy: number;
    maxEnergy: number;
    unlockedLands: number;
    totalPlants: number;
    totalHarvests: number;
    lastEnergyUpdate: Date;
    landPlots: LandPlot[];
  };
  inventory: {
    id: string;
    itemType: string;
    itemId: string;
    quantity: number;
  }[];
}

export interface PlantRequest {
  plotIndex: number;
  cropId: string;
}

export interface PlantResponse {
  plotId: string;
  cropId: string;
  plantedAt: Date;
  harvestAt: Date;
  energyCost: number;
}

export interface HarvestRequest {
  plotIndex: number;
}

export interface HarvestResponse {
  plotId: string;
  cropId: string;
  reward: number;
  expGained: number;
  newBalance: number;
}

export interface UnlockPlotRequest {
  plotIndex: number;
}

export interface UnlockPlotResponse {
  plotIndex: number;
  cost: number;
}

// ============================================
// Agent相关类型
// ============================================

export interface AgentResponse {
  id: string;
  name: string;
  type: string;
  status: string;
  ownerId: string;
  config: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentDetailResponse extends AgentResponse {
  decisions: AgentDecision[];
}

export interface CreateAgentRequest {
  name: string;
  type: string;
  config?: Record<string, unknown>;
}

export interface UpdateAgentRequest {
  name?: string;
  config?: Record<string, unknown>;
  status?: string;
}

export interface AgentDecisionRequest {
  decision: string;
  params?: Record<string, unknown>;
}

export interface AgentDecisionResponse {
  id: string;
  agentId: string;
  decision: string;
  params: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  status: string;
  executedAt: Date | null;
  createdAt: Date;
}

// ============================================
// 社交相关类型
// ============================================

export interface StealRequest {
  targetUserId: string;
  plotIndex: number;
}

export interface StealResponse {
  success: boolean;
  amount: number;
  targetUserId: string;
  plotIndex: number;
}

// ============================================
// 配置相关类型
// ============================================

export interface CropConfigResponse extends CropConfig {}

export interface LevelConfigResponse extends LevelConfig {}

export interface GameConfigsResponse {
  crops: CropConfig[];
  levels: LevelConfig[];
}

// ============================================
// 抽奖相关类型
// ============================================

export interface RaffleStateResponse {
  totalPool: number;
  participants: number;
  endTime: Date;
  prizePool: number;
}

export interface RaffleEntryRequest {
  amount: number;
}

export interface RaffleEntryResponse {
  entryId: string;
  tickets: number;
  totalPool: number;
}

// ============================================
// 错误代码枚举
// ============================================

export enum ErrorCode {
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // 认证错误
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // 资源错误
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // 业务错误
  INSUFFICIENT_RESOURCES = 'INSUFFICIENT_RESOURCES',
  INSUFFICIENT_ENERGY = 'INSUFFICIENT_ENERGY',
  INSUFFICIENT_COINS = 'INSUFFICIENT_COINS',
  CONFLICT = 'CONFLICT',
  PLOT_LOCKED = 'PLOT_LOCKED',
  PLOT_OCCUPIED = 'PLOT_OCCUPIED',
  CROP_NOT_READY = 'CROP_NOT_READY',
  
  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  CONNECTION_TIMEOUT = 'CONNECTION_TIMEOUT',
  FOREIGN_KEY_ERROR = 'FOREIGN_KEY_ERROR',
}

// ============================================
// 类型守卫函数
// ============================================

/**
 * 检查是否为成功响应
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.success === true;
}

/**
 * 检查是否为错误响应
 */
export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.success === false;
}

/**
 * 提取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred';
}
