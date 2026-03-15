import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/config/game - 获取游戏配置（作物、等级、土地价格）
export async function GET(request: NextRequest) {
  try {
    // 获取所有作物配置
    const crops = await prisma.cropConfig.findMany({
      where: { isActive: true },
      orderBy: { unlockLevel: 'asc' },
    });

    // 获取所有等级配置
    const levels = await prisma.levelConfig.findMany({
      orderBy: { level: 'asc' },
    });

    // 获取土地价格配置
    const landPricesConfig = await prisma.systemConfig.findUnique({
      where: { key: 'land_prices' },
    });

    // 获取抽奖状态
    const raffleLiveConfig = await prisma.systemConfig.findUnique({
      where: { key: 'raffle_live' },
    });

    // 转换为前端格式
    const cropInfo = crops.map(crop => ({
      name: crop.cropType,
      unlock_level: crop.unlockLevel,
      seed_price: crop.seedPrice,
      mature_time: crop.matureTime,
      watering_period: crop.wateringPeriod,
      harvest_price: crop.harvestPrice,
      seeding_exp: crop.seedingExp,
      harvest_exp: crop.harvestExp,
    }));

    const levelRequirements: Record<number, any> = {};
    levels.forEach(level => {
      levelRequirements[level.level] = {
        "Require Experience": level.requiredExp,
        "Max Land": level.maxLand,
        "Upgrade Cost": level.upgradeCost,
      };
    });

    // 默认土地价格（如果数据库中没有）
    const defaultLandPrices: Record<number, number> = {
      1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
      7: 1000, 8: 2000, 9: 3000,
    };

    const landPrices = landPricesConfig?.value as Record<number, number> || defaultLandPrices;

    return NextResponse.json({
      crop_info: cropInfo,
      land_prices: landPrices,
      level_requirements: levelRequirements,
      raffle_live: raffleLiveConfig?.value || 0,
    });
  } catch (error) {
    console.error('GET /api/config/game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
