import { NextResponse } from 'next/server';
import { MOCK_TASKS, MOCK_DAILY_REWARD, MOCK_RENAISSANCE_TASKS } from '@/utils/mock/mockData';

export async function GET() {
  return NextResponse.json({
    game_tasks: MOCK_TASKS,
    daily_reward: MOCK_DAILY_REWARD.daily_reward,
    game_reward: MOCK_DAILY_REWARD.game_reward,
    completed: MOCK_DAILY_REWARD.completed,
    total_days_checked_in: MOCK_DAILY_REWARD.total_days_checked_in,
    can_check_in_today: MOCK_DAILY_REWARD.can_check_in_today,
    renaissance_tasks: MOCK_RENAISSANCE_TASKS
  });
}
