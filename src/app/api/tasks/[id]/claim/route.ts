import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Find user's agent (create one if doesn't exist for task tracking)
    let agent = await prisma.agent.findFirst({
      where: { userId },
    });

    if (!agent) {
      agent = await prisma.agent.create({
        data: {
          userId,
          scaAddress: `task_agent_${userId}`,
          name: 'Task Agent',
          personality: 'balanced',
          strategyType: 'farming',
        },
      });
    }

    // Find the task
    const task = await prisma.agentTask.findFirst({
      where: {
        agentId: agent.id,
        taskType: 'game_task',
      },
    });

    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const taskData = task.taskData as any;

    if (task.status !== 'completed') {
      return NextResponse.json(
        { error: 'Task not completed yet' },
        { status: 400 }
      );
    }

    if (taskData?.claimed) {
      return NextResponse.json(
        { error: 'Reward already claimed' },
        { status: 400 }
      );
    }

    // Get task reward
    const reward = taskData?.reward || 10;

    // Claim reward
    const [updatedTask, updatedUser] = await prisma.$transaction([
      prisma.agentTask.update({
        where: { id: task.id },
        data: {
          taskData: {
            ...taskData,
            claimed: true,
            claimedAt: new Date().toISOString(),
          },
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          farmCoins: { increment: reward },
        },
      }),
    ]);

    return NextResponse.json({
      task: updatedTask,
      user: updatedUser,
      reward,
    });
  } catch (error) {
    console.error('POST /api/tasks/[id]/claim error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
