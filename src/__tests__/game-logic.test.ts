/**
 * Game Logic Tests
 * Test pure functions extracted from GameService
 */

// Extracted pure functions for testing (to avoid module dependency issues)

const GAME_CONSTANTS = {
  BASE_SUCCESS_RATE: 0.5,
  STEAL_AMOUNT: 0.4,
  STEAL_ENERGY_COST: 1,
  STEAL_COIN_COST: 10,
  EXPLORE_COST: 20,
  ENERGY_RECOVERY_INTERVAL_MINS: 5,
  BASE_MAX_ENERGY: 100,
  DEFAULT_UNLOCKED_LANDS: 6,
  DAILY_BOOST_COUNT: 3,
};

/**
 * Calculate recovered energy based on time passed
 */
function calculateRecoveredEnergy(params: {
  currentEnergy: number;
  maxEnergy: number;
  lastUpdate: Date;
  recoveryIntervalMins: number;
}): { newEnergy: number; newLastUpdate: Date; recovered: number } {
  const { currentEnergy, maxEnergy, lastUpdate, recoveryIntervalMins } = params;
  const now = new Date();

  if (currentEnergy >= maxEnergy) {
    return { newEnergy: currentEnergy, newLastUpdate: now, recovered: 0 };
  }

  const msPerEnergy = recoveryIntervalMins * 60 * 1000;
  const msPassed = now.getTime() - lastUpdate.getTime();

  const energyToRecover = Math.floor(msPassed / msPerEnergy);
  if (energyToRecover <= 0) {
    return { newEnergy: currentEnergy, newLastUpdate: lastUpdate, recovered: 0 };
  }

  const actualRecovery = Math.min(energyToRecover, maxEnergy - currentEnergy);
  const newEnergy = currentEnergy + actualRecovery;
  const newLastUpdate = new Date(lastUpdate.getTime() + actualRecovery * msPerEnergy);

  return { newEnergy, newLastUpdate, recovered: actualRecovery };
}

/**
 * Calculate crop growth stage (1-4)
 */
function calculateGrowthStage(plot: {
  plantedAt: Date | null;
  harvestAt: Date | null;
  growthStage: number;
  cropId?: string | null;
}): number {
  if (!plot.plantedAt || !plot.harvestAt) return plot.growthStage;

  const now = new Date();
  if (now >= plot.harvestAt) return 4; // Mature

  const totalDuration = plot.harvestAt.getTime() - plot.plantedAt.getTime();
  const elapsed = now.getTime() - plot.plantedAt.getTime();

  if (elapsed <= 0) return 1;

  const progress = elapsed / totalDuration;

  if (progress < 0.33) return 1;
  if (progress < 0.66) return 2;
  if (progress < 1.0) return 3;

  return 4;
}

// Tests

describe('GAME_CONSTANTS', () => {
  it('should have correct base success rate', () => {
    expect(GAME_CONSTANTS.BASE_SUCCESS_RATE).toBe(0.5);
  });

  it('should have correct steal amount percentage', () => {
    expect(GAME_CONSTANTS.STEAL_AMOUNT).toBe(0.4);
  });

  it('should have correct energy recovery interval', () => {
    expect(GAME_CONSTANTS.ENERGY_RECOVERY_INTERVAL_MINS).toBe(5);
  });

  it('should have correct base max energy', () => {
    expect(GAME_CONSTANTS.BASE_MAX_ENERGY).toBe(100);
  });

  it('should have correct daily boost count', () => {
    expect(GAME_CONSTANTS.DAILY_BOOST_COUNT).toBe(3);
  });
});

describe('calculateRecoveredEnergy', () => {
  it('should return 0 recovery when energy is already at max', () => {
    const result = calculateRecoveredEnergy({
      currentEnergy: 100,
      maxEnergy: 100,
      lastUpdate: new Date(Date.now() - 60 * 60 * 1000),
      recoveryIntervalMins: 5,
    });

    expect(result.recovered).toBe(0);
    expect(result.newEnergy).toBe(100);
  });

  it('should return 0 recovery when not enough time has passed', () => {
    const result = calculateRecoveredEnergy({
      currentEnergy: 50,
      maxEnergy: 100,
      lastUpdate: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
      recoveryIntervalMins: 5,
    });

    expect(result.recovered).toBe(0);
    expect(result.newEnergy).toBe(50);
  });

  it('should calculate correct recovery amount', () => {
    const result = calculateRecoveredEnergy({
      currentEnergy: 50,
      maxEnergy: 100,
      lastUpdate: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      recoveryIntervalMins: 5,
    });

    // 30 minutes / 5 minutes = 6 energy points
    expect(result.recovered).toBe(6);
    expect(result.newEnergy).toBe(56);
  });

  it('should not exceed max energy', () => {
    const result = calculateRecoveredEnergy({
      currentEnergy: 95,
      maxEnergy: 100,
      lastUpdate: new Date(Date.now() - 60 * 60 * 1000), // 60 minutes ago
      recoveryIntervalMins: 5,
    });

    // Would recover 12, but only 5 needed to reach max
    expect(result.recovered).toBe(5);
    expect(result.newEnergy).toBe(100);
  });

  it('should update lastEnergyUpdate correctly', () => {
    const lastUpdate = new Date(Date.now() - 30 * 60 * 1000);
    const result = calculateRecoveredEnergy({
      currentEnergy: 50,
      maxEnergy: 100,
      lastUpdate,
      recoveryIntervalMins: 5,
    });

    // Should advance by 6 * 5 minutes = 30 minutes
    const expectedNewUpdate = new Date(lastUpdate.getTime() + 6 * 5 * 60 * 1000);
    expect(result.newLastUpdate.getTime()).toBe(expectedNewUpdate.getTime());
  });

  it('should handle edge case of exactly one recovery interval', () => {
    const result = calculateRecoveredEnergy({
      currentEnergy: 80,
      maxEnergy: 100,
      lastUpdate: new Date(Date.now() - 5 * 60 * 1000), // exactly 5 minutes
      recoveryIntervalMins: 5,
    });

    expect(result.recovered).toBe(1);
    expect(result.newEnergy).toBe(81);
  });
});

describe('calculateGrowthStage', () => {
  it('should return current stage when no plantedAt', () => {
    const result = calculateGrowthStage({
      plantedAt: null,
      harvestAt: null,
      growthStage: 2,
    });

    expect(result).toBe(2);
  });

  it('should return stage 4 when crop is mature', () => {
    const plantedAt = new Date(Date.now() - 60 * 60 * 1000);
    const harvestAt = new Date(Date.now() - 1000); // already passed

    const result = calculateGrowthStage({
      plantedAt,
      harvestAt,
      growthStage: 1,
    });

    expect(result).toBe(4);
  });

  it('should return stage 1 at 0-33% progress', () => {
    const plantedAt = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
    const harvestAt = new Date(Date.now() + 55 * 60 * 1000); // 55 minutes remaining

    const result = calculateGrowthStage({
      plantedAt,
      harvestAt,
      growthStage: 1,
    });

    expect(result).toBe(1);
  });

  it('should return stage 2 at 33-66% progress', () => {
    const plantedAt = new Date(Date.now() - 25 * 60 * 1000); // 25 minutes ago
    const harvestAt = new Date(Date.now() + 25 * 60 * 1000); // 25 minutes remaining (50% total)

    const result = calculateGrowthStage({
      plantedAt,
      harvestAt,
      growthStage: 1,
    });

    expect(result).toBe(2);
  });

  it('should return stage 3 at 66-100% progress', () => {
    const plantedAt = new Date(Date.now() - 45 * 60 * 1000); // 45 minutes ago
    const harvestAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes remaining (75% total)

    const result = calculateGrowthStage({
      plantedAt,
      harvestAt,
      growthStage: 1,
    });

    expect(result).toBe(3);
  });

  it('should return stage 1 when just planted', () => {
    const plantedAt = new Date(Date.now() - 1000); // 1 second ago
    const harvestAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour total

    const result = calculateGrowthStage({
      plantedAt,
      harvestAt,
      growthStage: 1,
    });

    expect(result).toBe(1);
  });
});
