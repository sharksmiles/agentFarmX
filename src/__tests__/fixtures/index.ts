/**
 * 测试数据 Fixtures
 * 提供标准化的测试数据
 */

import { faker } from '@faker-js/faker';

// 设置固定的种子以获得可重复的结果
faker.seed(123);

/**
 * 生成测试用钱包地址
 */
export function generateWalletAddress(): string {
  return '0x' + faker.string.hexadecimal({ length: 40, casing: 'lower' }).replace('0x', '');
}

/**
 * 生成测试用户ID
 */
export function generateUserId(): string {
  return faker.string.uuid();
}

/**
 * 创建模拟用户数据
 */
export function createMockUser(overrides: Partial<any> = {}) {
  const userId = generateUserId();
  const walletAddress = generateWalletAddress();
  
  return {
    id: userId,
    walletAddress,
    farmCoins: 1000,
    level: 1,
    experience: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建模拟农场状态
 */
export function createMockFarmState(overrides: Partial<any> = {}) {
  const userId = generateUserId();
  
  return {
    id: faker.string.uuid(),
    userId,
    level: 1,
    experience: 0,
    energy: 100,
    maxEnergy: 100,
    lastEnergyUpdate: new Date(),
    unlockedPlots: 6,
    totalHarvests: 0,
    totalEarnings: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
    landPlots: [],
    ...overrides,
  };
}

/**
 * 创建模拟地块数据
 */
export function createMockLandPlot(overrides: Partial<any> = {}) {
  return {
    id: faker.string.uuid(),
    farmStateId: faker.string.uuid(),
    plotIndex: 0,
    isUnlocked: true,
    cropId: null,
    plantedAt: null,
    harvestableAt: null,
    boostMultiplier: 1.0,
    waterLevel: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建模拟Agent数据
 */
export function createMockAgent(overrides: Partial<any> = {}) {
  const userId = generateUserId();
  
  return {
    id: faker.string.uuid(),
    userId,
    name: faker.person.fullName(),
    status: 'idle',
    aiModel: 'gpt-4',
    personality: 'balanced',
    autoActionEnabled: true,
    totalDecisions: 0,
    successfulDecisions: 0,
    totalTokensUsed: 0,
    totalCost: '0',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建模拟库存数据
 */
export function createMockInventory(overrides: Partial<any> = {}) {
  return {
    id: faker.string.uuid(),
    userId: generateUserId(),
    itemType: 'crop',
    itemId: faker.commerce.productName(),
    quantity: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建模拟作物配置
 */
export function createMockCropConfig(overrides: Partial<any> = {}) {
  return {
    id: faker.commerce.productName(),
    name: faker.commerce.productName(),
    growthTime: 60, // 分钟
    baseYield: 10,
    sellPrice: 50,
    buyPrice: 10,
    experience: 5,
    ...overrides,
  };
}

/**
 * 创建模拟JWT Session
 */
export function createMockSession(overrides: Partial<any> = {}) {
  const userId = generateUserId();
  const walletAddress = generateWalletAddress();
  
  return {
    userId,
    walletAddress,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1小时后过期
    ...overrides,
  };
}

/**
 * 创建模拟认证上下文
 */
export function createMockAuthContext(overrides: Partial<any> = {}) {
  const userId = generateUserId();
  const walletAddress = generateWalletAddress();
  
  return {
    userId,
    walletAddress,
    session: createMockSession({ userId, walletAddress }),
    ...overrides,
  };
}

/**
 * 创建模拟API请求
 */
export function createMockRequest(body: any = {}, headers: Record<string, string> = {}) {
  return {
    json: jest.fn().mockResolvedValue(body),
    headers: {
      get: jest.fn((key: string) => headers[key] || null),
    },
    url: 'http://localhost:3000/api/test',
    nextUrl: {
      searchParams: new URLSearchParams(),
    },
  } as any;
}

/**
 * 创建模拟NextResponse
 */
export function mockNextResponse() {
  return {
    json: jest.fn((data: any, init?: any) => ({
      ...data,
      status: init?.status || 200,
    })),
  };
}
