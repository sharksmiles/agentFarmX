/**
 * Prisma Client Mock
 * 使用 jest-mock-extended 创建类型安全的 Prisma Mock
 */

import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { beforeEach } from '@jest/globals';

// 创建深度 Mock
export const prismaMock: DeepMockProxy<PrismaClient> = mockDeep<PrismaClient>();

// 每个测试前重置 Mock
beforeEach(() => {
  mockReset(prismaMock);
});

/**
 * 设置 Prisma Mock 模块
 * 在测试文件顶部使用:
 * jest.mock('@/lib/prisma', () => ({
 *   prisma: require('@/__tests__/mocks/prisma').prismaMock,
 * }));
 */

/**
 * 辅助函数：设置用户查询 Mock
 */
export function mockUserFindUnique(user: any) {
  prismaMock.user.findUnique.mockResolvedValue(user);
}

/**
 * 辅助函数：设置农场状态查询 Mock
 */
export function mockFarmStateFindUnique(farmState: any) {
  prismaMock.farmState.findUnique.mockResolvedValue(farmState);
}

/**
 * 辅助函数：设置事务 Mock
 */
export function mockTransaction<T>(result: T) {
  prismaMock.$transaction.mockImplementation(async (fn: any) => {
    if (typeof fn === 'function') {
      return fn(prismaMock);
    }
    return result;
  });
}

/**
 * 辅助函数：设置批量更新 Mock
 */
export function mockLandPlotUpdate(result: any) {
  prismaMock.landPlot.update.mockResolvedValue(result);
}

/**
 * 辅助函数：设置 Agent 查询 Mock
 */
export function mockAgentFindUnique(agent: any) {
  prismaMock.agent.findUnique.mockResolvedValue(agent);
}

/**
 * 辅助函数：设置 Agent 更新 Mock
 */
export function mockAgentUpdate(result: any) {
  prismaMock.agent.update.mockResolvedValue(result);
}

/**
 * 辅助函数：设置库存查询 Mock
 */
export function mockInventoryFindMany(items: any[]) {
  prismaMock.inventory.findMany.mockResolvedValue(items);
}

/**
 * 辅助函数：设置系统配置 Mock
 */
export function mockSystemConfigFindUnique(config: any) {
  prismaMock.systemConfig.findUnique.mockResolvedValue(config);
}
