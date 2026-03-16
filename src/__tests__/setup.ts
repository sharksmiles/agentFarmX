/**
 * Jest 测试设置文件
 * 在每个测试文件运行前执行
 */

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-min-32-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.NEXT_PUBLIC_CHAIN_ID = '195';
process.env.NEXT_PUBLIC_APP_NAME = 'AgentFarm X Test';
process.env.LOG_LEVEL = 'error'; // 测试时只显示错误日志

// 增加测试超时时间
jest.setTimeout(30000);

// 全局清理
afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});
