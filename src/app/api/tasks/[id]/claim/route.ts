import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse, internalErrorResponse } from '@/utils/api/response';

// 任务配置（与 GET /api/tasks 保持一致）
const TASKS = [
  { id: 'daily_login', name: 'Daily Login', type: 'daily', reward: 10 },
  { id: 'plant_5_crops', name: 'Plant 5 Crops', type: 'daily', reward: 20 },
  { id: 'harvest_3_crops', name: 'Harvest 3 Crops', type: 'daily', reward: 30 },
  { id: 'visit_friends', name: 'Visit 3 Friends', type: 'daily', reward: 15 },
  { id: 'reach_level_5', name: 'Reach Level 5', type: 'achievement', reward: 100 },
  { id: 'earn_1000_coins', name: 'Earn 1000 Coins', type: 'achievement', reward: 50 },
];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId } = body;
    const taskId = params.id;

    if (!userId) {
      return errorResponse('userId is required', 400);
    }

    // 查找任务配置
    const taskConfig = TASKS.find(t => t.id === taskId);
    if (!taskConfig) {
      return errorResponse('Task not found', 404);
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // 检查任务是否已完成（通过调用 GET /api/tasks 的逻辑）
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { farmState: true },
    });

    if (!user) {
      return errorResponse('User not found', 404);
    }

    // 获取今日交易记录
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const todaySocialActions = await prisma.socialAction.findMany({
      where: {
        fromUserId: userId,
        actionType: 'visit',
        createdAt: { gte: startOfDay, lt: endOfDay },
      },
    });

    const todayPlants = todayTransactions.filter(t => t.type === 'plant').length;
    const todayHarvests = todayTransactions.filter(t => t.type === 'harvest').length;
    const todayVisits = todaySocialActions.length;

    // 检查任务完成状态
    let completed = false;
    switch (taskId) {
      case 'daily_login':
        completed = true;
        break;
      case 'plant_5_crops':
        completed = todayPlants >= 5;
        break;
      case 'harvest_3_crops':
        completed = todayHarvests >= 3;
        break;
      case 'visit_friends':
        completed = todayVisits >= 3;
        break;
      case 'reach_level_5':
        completed = user.level >= 5;
        break;
      case 'earn_1000_coins':
        completed = user.farmCoins >= 1000;
        break;
    }

    if (!completed) {
      return errorResponse('Task not completed yet', 400);
    }

    // 检查是否已领取
    if (taskConfig.type === 'daily') {
      const claimedKey = `task_claimed_${userId}_${todayStr}`;
      const claimedConfig = await prisma.systemConfig.findUnique({
        where: { key: claimedKey },
      });
      const claimedTasks = (claimedConfig?.value as string[]) || [];

      if (claimedTasks.includes(taskId)) {
        return errorResponse('Reward already claimed today', 400);
      }

      // 领取奖励
      const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { farmCoins: { increment: taskConfig.reward } },
        }),
        prisma.systemConfig.upsert({
          where: { key: claimedKey },
          create: { key: claimedKey, value: [taskId] },
          update: { value: [...claimedTasks, taskId] },
        }),
      ]);

      return successResponse({ reward: taskConfig.reward, updated_user: updatedUser });
    } else {
      // 成就类任务：永久追踪
      const claimedKey = `task_achievement_claimed_${userId}`;
      const claimedConfig = await prisma.systemConfig.findUnique({
        where: { key: claimedKey },
      });
      const claimedTasks = (claimedConfig?.value as string[]) || [];

      if (claimedTasks.includes(taskId)) {
        return errorResponse('Achievement reward already claimed', 400);
      }

      const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { farmCoins: { increment: taskConfig.reward } },
        }),
        prisma.systemConfig.upsert({
          where: { key: claimedKey },
          create: { key: claimedKey, value: [taskId] },
          update: { value: [...claimedTasks, taskId] },
        }),
      ]);

      return successResponse({ reward: taskConfig.reward, updated_user: updatedUser });
    }
  } catch (error) {
    console.error('POST /api/tasks/[id]/claim error:', error);
    return internalErrorResponse(error);
  }
}
