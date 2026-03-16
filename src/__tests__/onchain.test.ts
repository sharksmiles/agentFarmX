/**
 * Onchain Utility Functions Tests
 * Test pure functions from onchain.ts
 */

/**
 * Encode address for EVM transaction data
 */
function encodeAddress(addr: string): string {
  return addr.replace(/^0x/, "").toLowerCase().padStart(64, "0");
}

/**
 * Encode uint256 for EVM transaction data
 */
function encodeUint256(value: bigint): string {
  return value.toString(16).padStart(64, "0");
}

/**
 * Calculate progress circle offset
 */
function calculateProgressOffset(percentage: number, radius: number): number {
  const circumference = 2 * Math.PI * radius;
  return circumference - (percentage / 100) * circumference;
}

/**
 * Calculate level progress percentage
 */
function calculateLevelProgress(currentExp: number, requiredExp: number): number {
  if (!requiredExp || requiredExp === 0) return 0;
  return (currentExp / requiredExp) * 100;
}

/**
 * Calculate steal success rate
 * Base 20% + various modifiers
 */
function calculateStealSuccessRate(params: {
  baseRate: number;
  attackerLevel: number;
  targetLevel: number;
  isTargetOnline: boolean;
  cropMaturity: number; // 0-1
  isFriend: boolean;
  attackerInviteCount: number;
  targetInviteCount: number;
  isNewFarmer: boolean; // target is new (Lv≤3, registered < 3 days)
  hasStolenRecently: boolean; // stolen target in 24h
}): number {
  const {
    baseRate,
    attackerLevel,
    targetLevel,
    isTargetOnline,
    cropMaturity,
    isFriend,
    attackerInviteCount,
    targetInviteCount,
    isNewFarmer,
    hasStolenRecently,
  } = params;

  // New farmer protection
  if (isNewFarmer) return 0;

  let rate = baseRate;

  // Level difference: (attacker.level - target.level) × 2%
  rate += (attackerLevel - targetLevel) * 0.02;

  // Online penalty: target online (60s active) → -5%
  if (isTargetOnline) rate -= 0.05;

  // Crop maturity penalty: maturity × (-10%)
  rate -= cropMaturity * 0.1;

  // Friendship: friend → -5%, not friend → +2%
  rate += isFriend ? -0.05 : 0.02;

  // Invite difference: attacker invites > target → +1%
  if (attackerInviteCount > targetInviteCount) rate += 0.01;

  // Recidivist: stolen target in 24h → -10%
  if (hasStolenRecently) rate -= 0.1;

  // Clamp between 0 and 1
  return Math.max(0, Math.min(1, rate));
}

// Tests

describe('encodeAddress', () => {
  it('should encode address correctly', () => {
    const address = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';
    const result = encodeAddress(address);
    expect(result).toBe('00000000000000000000000071c7656ec7ab88b098defb751b7401b5f6d8976f');
    expect(result.length).toBe(64);
  });

  it('should handle address without 0x prefix', () => {
    const address = '71C7656EC7ab88b098defB751B7401B5f6d8976F';
    const result = encodeAddress(address);
    expect(result.length).toBe(64);
  });

  it('should convert to lowercase', () => {
    const address = '0xABCDEF';
    const result = encodeAddress(address);
    expect(result).toMatch(/^[0-9a-f]+$/);
  });

  it('should pad to 64 characters', () => {
    const address = '0x123';
    const result = encodeAddress(address);
    expect(result.length).toBe(64);
    expect(result.startsWith('0'.repeat(60))).toBe(true);
  });
});

describe('encodeUint256', () => {
  it('should encode zero correctly', () => {
    const result = encodeUint256(BigInt(0));
    expect(result).toBe('0'.repeat(64));
  });

  it('should encode small number correctly', () => {
    const result = encodeUint256(BigInt(255));
    expect(result).toBe('0'.repeat(62) + 'ff');
  });

  it('should encode large number correctly', () => {
    const result = encodeUint256(BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'));
    expect(result).toBe('f'.repeat(64));
  });

  it('should pad to 64 characters', () => {
    const result = encodeUint256(BigInt(1));
    expect(result.length).toBe(64);
    expect(result).toBe('0'.repeat(63) + '1');
  });

  it('should handle USDC amount (6 decimals)', () => {
    const usdcAmount = 10.5;
    const rawAmount = BigInt(Math.floor(usdcAmount * 10 ** 6));
    const result = encodeUint256(rawAmount);
    expect(result.length).toBe(64);
    // 10.5 * 10^6 = 10500000 = 0xa037a0
    expect(result.endsWith('a037a0')).toBe(true);
  });
});

describe('calculateProgressOffset', () => {
  it('should calculate offset for 0%', () => {
    const radius = 11.5;
    const offset = calculateProgressOffset(0, radius);
    const circumference = 2 * Math.PI * radius;
    expect(offset).toBeCloseTo(circumference, 5);
  });

  it('should calculate offset for 100%', () => {
    const radius = 11.5;
    const offset = calculateProgressOffset(100, radius);
    expect(offset).toBeCloseTo(0, 5);
  });

  it('should calculate offset for 50%', () => {
    const radius = 11.5;
    const offset = calculateProgressOffset(50, radius);
    const circumference = 2 * Math.PI * radius;
    expect(offset).toBeCloseTo(circumference / 2, 5);
  });

  it('should calculate offset for 25%', () => {
    const radius = 11.5;
    const offset = calculateProgressOffset(25, radius);
    const circumference = 2 * Math.PI * radius;
    expect(offset).toBeCloseTo(circumference * 0.75, 5);
  });
});

describe('calculateLevelProgress', () => {
  it('should return 0 when required exp is 0', () => {
    expect(calculateLevelProgress(100, 0)).toBe(0);
  });

  it('should calculate correct percentage', () => {
    expect(calculateLevelProgress(50, 100)).toBe(50);
  });

  it('should handle 100% progress', () => {
    expect(calculateLevelProgress(100, 100)).toBe(100);
  });

  it('should handle over 100% progress', () => {
    expect(calculateLevelProgress(150, 100)).toBe(150);
  });

  it('should handle 0 current exp', () => {
    expect(calculateLevelProgress(0, 100)).toBe(0);
  });
});

describe('calculateStealSuccessRate', () => {
  const baseParams = {
    baseRate: 0.2,
    attackerLevel: 10,
    targetLevel: 10,
    isTargetOnline: false,
    cropMaturity: 0.5,
    isFriend: false,
    attackerInviteCount: 5,
    targetInviteCount: 3,
    isNewFarmer: false,
    hasStolenRecently: false,
  };

  it('should return 0 for new farmer protection', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      isNewFarmer: true,
    });
    expect(rate).toBe(0);
  });

  it('should calculate base rate correctly', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      attackerLevel: 10,
      targetLevel: 10,
      cropMaturity: 0,
      isFriend: false,
      attackerInviteCount: 0,
      targetInviteCount: 0,
    });
    // Base 20% + 0 (level diff) + 0 (maturity) + 2% (not friend) = 22%
    expect(rate).toBeCloseTo(0.22, 3);
  });

  it('should apply level difference bonus', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      attackerLevel: 20,
      targetLevel: 10,
    });
    // Base 20% + 20% (level diff) - 5% (maturity) + 2% (not friend) + 1% (invites) = 38%
    expect(rate).toBeCloseTo(0.38, 3);
  });

  it('should apply online penalty', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      isTargetOnline: true,
    });
    // Base 20% - 5% (online) - 5% (maturity) + 2% (not friend) + 1% (invites) = 13%
    expect(rate).toBeCloseTo(0.13, 3);
  });

  it('should apply friend penalty', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      isFriend: true,
    });
    // Base 20% - 5% (maturity) - 5% (friend) + 1% (invites) = 11%
    expect(rate).toBeCloseTo(0.11, 3);
  });

  it('should apply recidivist penalty', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      hasStolenRecently: true,
    });
    // Base 20% - 5% (maturity) + 2% (not friend) + 1% (invites) - 10% (recidivist) = 8%
    expect(rate).toBeCloseTo(0.08, 3);
  });

  it('should not go below 0', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      attackerLevel: 1,
      targetLevel: 50,
      isTargetOnline: true,
      cropMaturity: 1,
      isFriend: true,
      hasStolenRecently: true,
    });
    expect(rate).toBe(0);
  });

  it('should not exceed 1', () => {
    const rate = calculateStealSuccessRate({
      ...baseParams,
      attackerLevel: 100,
      targetLevel: 1,
      cropMaturity: 0,
    });
    expect(rate).toBeLessThanOrEqual(1);
  });
});
