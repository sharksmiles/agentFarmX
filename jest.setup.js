// Jest setup file
// Add custom matchers or global test utilities here

// Mock environment variables for testing
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.PAYMENT_RECEIVER_ADDRESS = '0x1234567890123456789012345678901234567890'
process.env.BLOCKCHAIN_RPC_URL = 'https://testrpc.x1.tech'
