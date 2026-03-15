import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 作物配置数据（来自 Mock）
const CROP_CONFIGS = [
  { cropType: "Wheat", unlockLevel: 1, seedPrice: 10, matureTime: 5, wateringPeriod: 2, harvestPrice: 30, seedingExp: 5, harvestExp: 10 },
  { cropType: "Corn", unlockLevel: 3, seedPrice: 20, matureTime: 10, wateringPeriod: 4, harvestPrice: 60, seedingExp: 8, harvestExp: 15 },
  { cropType: "Potato", unlockLevel: 5, seedPrice: 30, matureTime: 15, wateringPeriod: 5, harvestPrice: 90, seedingExp: 10, harvestExp: 20 },
  { cropType: "Tomato", unlockLevel: 7, seedPrice: 40, matureTime: 20, wateringPeriod: 7, harvestPrice: 120, seedingExp: 12, harvestExp: 25 },
  { cropType: "Carrot", unlockLevel: 9, seedPrice: 50, matureTime: 25, wateringPeriod: 8, harvestPrice: 150, seedingExp: 15, harvestExp: 30 },
  { cropType: "Cucumber", unlockLevel: 11, seedPrice: 60, matureTime: 30, wateringPeriod: 10, harvestPrice: 180, seedingExp: 18, harvestExp: 35 },
  { cropType: "Celery", unlockLevel: 13, seedPrice: 70, matureTime: 35, wateringPeriod: 12, harvestPrice: 210, seedingExp: 20, harvestExp: 40 },
  { cropType: "Garlic", unlockLevel: 15, seedPrice: 80, matureTime: 40, wateringPeriod: 13, harvestPrice: 240, seedingExp: 22, harvestExp: 45 },
  { cropType: "Cabbage", unlockLevel: 17, seedPrice: 90, matureTime: 45, wateringPeriod: 15, harvestPrice: 270, seedingExp: 25, harvestExp: 50 },
  { cropType: "Apple", unlockLevel: 19, seedPrice: 100, matureTime: 50, wateringPeriod: 17, harvestPrice: 300, seedingExp: 28, harvestExp: 55 },
  { cropType: "Banana", unlockLevel: 21, seedPrice: 110, matureTime: 55, wateringPeriod: 18, harvestPrice: 330, seedingExp: 30, harvestExp: 60 },
  { cropType: "Pear", unlockLevel: 23, seedPrice: 120, matureTime: 60, wateringPeriod: 20, harvestPrice: 360, seedingExp: 32, harvestExp: 65 },
  { cropType: "Lemon", unlockLevel: 25, seedPrice: 130, matureTime: 65, wateringPeriod: 22, harvestPrice: 390, seedingExp: 35, harvestExp: 70 },
  { cropType: "Pumpkin", unlockLevel: 27, seedPrice: 140, matureTime: 70, wateringPeriod: 23, harvestPrice: 420, seedingExp: 38, harvestExp: 75 },
  { cropType: "Strawberry", unlockLevel: 29, seedPrice: 150, matureTime: 75, wateringPeriod: 25, harvestPrice: 450, seedingExp: 40, harvestExp: 80 },
  { cropType: "Pineapple", unlockLevel: 31, seedPrice: 160, matureTime: 80, wateringPeriod: 27, harvestPrice: 480, seedingExp: 42, harvestExp: 85 },
  { cropType: "Peach", unlockLevel: 33, seedPrice: 170, matureTime: 85, wateringPeriod: 28, harvestPrice: 510, seedingExp: 45, harvestExp: 90 },
  { cropType: "Watermelon", unlockLevel: 35, seedPrice: 180, matureTime: 90, wateringPeriod: 30, harvestPrice: 540, seedingExp: 48, harvestExp: 95 },
  { cropType: "Cherry", unlockLevel: 37, seedPrice: 190, matureTime: 95, wateringPeriod: 32, harvestPrice: 570, seedingExp: 50, harvestExp: 100 },
  { cropType: "Grapes", unlockLevel: 39, seedPrice: 200, matureTime: 100, wateringPeriod: 33, harvestPrice: 600, seedingExp: 52, harvestExp: 105 },
  { cropType: "Kiwi", unlockLevel: 41, seedPrice: 210, matureTime: 105, wateringPeriod: 35, harvestPrice: 630, seedingExp: 55, harvestExp: 110 },
  { cropType: "Eggplant", unlockLevel: 43, seedPrice: 220, matureTime: 110, wateringPeriod: 37, harvestPrice: 660, seedingExp: 58, harvestExp: 115 },
  { cropType: "Chilli", unlockLevel: 45, seedPrice: 230, matureTime: 115, wateringPeriod: 38, harvestPrice: 690, seedingExp: 60, harvestExp: 120 },
  { cropType: "Sugarcane", unlockLevel: 47, seedPrice: 240, matureTime: 120, wateringPeriod: 40, harvestPrice: 720, seedingExp: 62, harvestExp: 125 },
];

// 等级配置数据
const LEVEL_CONFIGS = Array.from({ length: 50 }, (_, i) => {
  const level = i + 1;
  return {
    level,
    requiredExp: level * 100 + (level - 1) * 50,
    maxLand: Math.min(6 + Math.floor(level / 5), 36),
    upgradeCost: level * 500,
  };
});

async function main() {
  console.log('🌱 Seeding game configurations...');

  // 清空现有配置
  await prisma.cropConfig.deleteMany({});
  await prisma.levelConfig.deleteMany({});

  // 插入作物配置
  console.log('📦 Inserting crop configs...');
  for (const crop of CROP_CONFIGS) {
    await prisma.cropConfig.create({
      data: crop,
    });
  }
  console.log(`✅ Created ${CROP_CONFIGS.length} crop configs`);

  // 插入等级配置
  console.log('📊 Inserting level configs...');
  for (const level of LEVEL_CONFIGS) {
    await prisma.levelConfig.create({
      data: level,
    });
  }
  console.log(`✅ Created ${LEVEL_CONFIGS.length} level configs`);

  // 插入土地价格配置
  console.log('🏞️ Inserting land prices...');
  await prisma.systemConfig.upsert({
    where: { key: 'land_prices' },
    update: {
      value: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
        7: 1000, 8: 2000, 9: 3000,
      },
    },
    create: {
      key: 'land_prices',
      value: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0,
        7: 1000, 8: 2000, 9: 3000,
      },
      description: 'Land purchase prices by plot index',
    },
  });
  console.log('✅ Created land prices config');

  // 插入抽奖状态
  await prisma.systemConfig.upsert({
    where: { key: 'raffle_live' },
    update: { value: 0 },
    create: {
      key: 'raffle_live',
      value: 0,
      description: 'Current active raffle count',
    },
  });

  console.log('✨ Game configurations seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding game configs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
