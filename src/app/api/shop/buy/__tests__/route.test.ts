/**
 * Unit tests for Shop API
 */

import { NextRequest } from 'next/server';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    inventory: {
      upsert: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('POST /api/shop/buy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if userId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ quantities: { Wheat: 5 } }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId and quantities are required');
  });

  it('should return 400 if quantities is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({ userId: 'test-user' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('userId and quantities are required');
  });

  it('should return 404 if user not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'non-existent-user',
        quantities: { Wheat: 5 },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return 400 if user has insufficient coins', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-user',
      farmCoins: 10, // Not enough for 5 Wheat (50 coins)
    });

    const request = new NextRequest('http://localhost:3000/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        quantities: { Wheat: 5 },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Insufficient coins');
    expect(data.details).toBeDefined();
    expect(data.details.required).toBe(50);
    expect(data.details.available).toBe(10);
  });

  it('should successfully purchase items', async () => {
    const mockUser = {
      id: 'test-user',
      farmCoins: 1000,
    };

    const mockUpdatedUser = {
      ...mockUser,
      farmCoins: 950, // 1000 - 50
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.$transaction as jest.Mock).mockResolvedValue([
      mockUpdatedUser,
      { id: 'inventory-1' },
      { id: 'transaction-1' },
    ]);

    const request = new NextRequest('http://localhost:3000/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        quantities: { Wheat: 5 },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.user.farmCoins).toBe(950);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should handle invalid crop names', async () => {
    const mockUser = {
      id: 'test-user',
      farmCoins: 1000,
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const request = new NextRequest('http://localhost:3000/api/shop/buy', {
      method: 'POST',
      body: JSON.stringify({
        userId: 'test-user',
        quantities: { InvalidCrop: 5 },
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid crop');
  });
});
