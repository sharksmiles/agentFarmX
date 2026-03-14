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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'daily' | 'achievement' | 'all'

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get user's task progress from AgentTask (reusing existing table)
    const userTasks = await prisma.agentTask.findMany({
      where: {
        agent: {
          userId,
        },
        taskType: 'game_task',
      },
    });

    // Filter tasks by type
    let availableTasks = TASKS;
    if (type && type !== 'all') {
      availableTasks = TASKS.filter((t) => t.type === type);
    }

    // Combine with user progress
    const tasksWithProgress = availableTasks.map((task) => {
      const userTask = userTasks.find((ut) => {
        const data = ut.taskData as any;
        return data?.taskId === task.id;
      });

      return {
        ...task,
        progress: userTask ? (userTask.taskData as any)?.progress || 0 : 0,
        completed: userTask?.status === 'completed',
        claimed: userTask ? (userTask.taskData as any)?.claimed || false : false,
      };
    });

    return NextResponse.json({ tasks: tasksWithProgress });
  } catch (error) {
    console.error('GET /api/tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
