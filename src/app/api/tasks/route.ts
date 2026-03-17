import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Define available tasks
const TASKS = [
  {
    id: 'daily_login',
    name: 'Daily Login',
    description: 'Login to the game',
    type: 'daily',
    reward: 10,
    requirement: 1,
  },
  {
    id: 'plant_5_crops',
    name: 'Plant 5 Crops',
    description: 'Plant 5 crops in your farm',
    type: 'daily',
    reward: 20,
    requirement: 5,
  },
  {
    id: 'harvest_3_crops',
    name: 'Harvest 3 Crops',
    description: 'Harvest 3 mature crops',
    type: 'daily',
    reward: 30,
    requirement: 3,
  },
  {
    id: 'visit_friends',
    name: 'Visit 3 Friends',
    description: 'Visit 3 friends farms',
    type: 'daily',
    reward: 15,
    requirement: 3,
  },
  {
    id: 'reach_level_5',
    name: 'Reach Level 5',
    description: 'Reach farm level 5',
    type: 'achievement',
    reward: 100,
    requirement: 5,
  },
  {
    id: 'earn_1000_coins',
    name: 'Earn 1000 Coins',
    description: 'Accumulate 1000 farm coins',
    type: 'achievement',
    reward: 50,
    requirement: 1000,
  },
];

/**
 * GET /api/tasks - 获取用户任务列表
 * 根据用户实际行为判断任务完成状态
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'daily' | 'achievement' | 'all'
    
    // Try to get userId from URL params first, then from auth header
    let userId = searchParams.get('userId');
    
    if (!userId) {
      // Try to get from auth header
      const authHeader = request.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const { JWTService } = await import('@/lib/jwt');
          const session = await JWTService.verifyAccessToken(token);
          if (session) {
            userId = session.userId;
          }
        } catch (e) {
          // Token invalid, continue without userId
        }
      }
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required', code: 'BAD_REQUEST' },
        { status: 400 }
      );
    }

    // Get user data for task progress calculation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        farmState: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Get today's transactions for plant/harvest counts
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // Get today's social actions for visit friends count
    const todaySocialActions = await prisma.socialAction.findMany({
      where: {
        fromUserId: userId,
        actionType: 'visit',
        createdAt: {
          gte: startOfDay,
          lt: endOfDay,
        },
      },
    });

    // Calculate progress for each task
    const todayPlants = todayTransactions.filter(t => t.type === 'plant').length;
    const todayHarvests = todayTransactions.filter(t => t.type === 'harvest').length;
    const todayVisits = todaySocialActions.length;
    // 用户能调用此 API 就说明已经登录，Daily Login 始终完成
    const isTodayLogin = true;

    // Filter tasks by type
    let availableTasks = TASKS;
    if (type && type !== 'all') {
      availableTasks = TASKS.filter((t) => t.type === type);
    }

    // 获取今日已领取的任务列表
    const todayStr = today.toISOString().split('T')[0];
    const claimedKey = `task_claimed_${userId}_${todayStr}`;
    const claimedConfig = await prisma.systemConfig.findUnique({
      where: { key: claimedKey },
    });
    const todayClaimedTasks = (claimedConfig?.value as string[]) || [];

    // 对于成就类任务，检查是否已经领取过（不限日期）
    const achievementClaimedKey = `task_achievement_claimed_${userId}`;
    const achievementClaimedConfig = await prisma.systemConfig.findUnique({
      where: { key: achievementClaimedKey },
    });
    const achievementClaimedTasks = (achievementClaimedConfig?.value as string[]) || [];

    // Calculate task progress and completion
    const tasksWithProgress = availableTasks.map((task) => {
      let progress = 0;
      let completed = false;

      switch (task.id) {
        case 'daily_login':
          progress = isTodayLogin ? 1 : 0;
          completed = isTodayLogin;
          break;
        case 'plant_5_crops':
          progress = Math.min(todayPlants, task.requirement);
          completed = todayPlants >= task.requirement;
          break;
        case 'harvest_3_crops':
          progress = Math.min(todayHarvests, task.requirement);
          completed = todayHarvests >= task.requirement;
          break;
        case 'visit_friends':
          progress = Math.min(todayVisits, task.requirement);
          completed = todayVisits >= task.requirement;
          break;
        case 'reach_level_5':
          progress = user.level;
          completed = user.level >= task.requirement;
          break;
        case 'earn_1000_coins':
          progress = user.farmCoins;
          completed = user.farmCoins >= task.requirement;
          break;
        default:
          progress = 0;
          completed = false;
      }

      // 判断任务是否已领取：每日任务按日期追踪，成就任务永久追踪
      const claimed = task.type === 'daily'
        ? todayClaimedTasks.includes(task.id)
        : achievementClaimedTasks.includes(task.id);

      return {
        ...task,
        progress,
        completed,
        claimed,
      };
    });

    return NextResponse.json({ success: true, data: { tasks: tasksWithProgress } });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
