import apiClient from "./client"
import { GameTask, RenaissanceTask } from "../types"

// ── Task list ─────────────────────────────────────────────────────────────────
export interface DailyRewardDay {
    day: number
    reward: number
    claimed: boolean
}

export interface TasksResponse {
    game_tasks: GameTask[]
    renaissance_tasks: RenaissanceTask[]
    daily_reward: DailyRewardDay[]
    game_reward: number
    completed: boolean
}

// Task ID mapping for frontend compatibility
const TASK_ID_MAP: Record<string, number> = {
    'daily_login': 1,
    'plant_5_crops': 2,
    'harvest_3_crops': 3,
    'visit_friends': 4,
    'reach_level_5': 5,
    'earn_1000_coins': 6,
};

// Task banner mapping
const TASK_BANNER_MAP: Record<string, string> = {
    'reach_level_5': 'banner1.png',
};

export const fetchTasks = async (userId?: string): Promise<TasksResponse> => {
    let id = userId;
    if (!id) {
        const user = await import("./auth").then(m => m.fetchMe());
        if (!user) throw new Error("User not found");
        id = user.id;
    }
    
    const [tasks, dailyStatus] = await Promise.all([
        fetchTasksByUserId(id, 'all'),
        fetchDailyCheckInStatus(id)
    ]);
    
    const game_tasks = tasks.map(t => ({
        id: TASK_ID_MAP[t.id] || 0,
        title: t.name,
        content: t.description,
        reward: t.reward,
        url: '',
        click: false,
        completed: t.completed,
        claimed: t.claimed,
        banner: TASK_BANNER_MAP[t.id],
    }));
    
    return {
        game_tasks,
        renaissance_tasks: [],
        daily_reward: dailyStatus.daily_reward || [],
        game_reward: 0,
        completed: false
    }
}

// New API: Get tasks by userId
export interface Task {
    id: string
    name: string
    description: string
    type: 'daily' | 'achievement'
    reward: number
    requirement: number
    progress: number
    completed: boolean
    claimed: boolean
}

export const fetchTasksByUserId = async (userId: string, type: 'daily' | 'achievement' | 'all' = 'all'): Promise<Task[]> => {
    const res = await apiClient.get<{ success: boolean; data: { tasks: Task[] } }>(`/api/tasks?userId=${userId}&type=${type}`)
    // Handle both response formats: { tasks: [...] } and { success: true, data: { tasks: [...] } }
    const data = res.data as any
    return data.data?.tasks || data.tasks || []
}

// ── Daily sign-in ─────────────────────────────────────────────────────────────
export interface DailyCheckInStatus {
    total_days_checked_in: number
    can_check_in_today: boolean
    daily_reward: DailyRewardDay[]
}

export const fetchDailyCheckIn = async (userId?: string): Promise<DailyCheckInStatus> => {
    let id = userId;
    if (!id) {
        const user = await import("./auth").then(m => m.fetchMe());
        if (!user) throw new Error("User not found");
        id = user.id;
    }
    
    const res = await fetchDailyCheckInStatus(id);
    return res;
}

// New API: Get daily check-in status
export const fetchDailyCheckInStatus = async (userId: string) => {
    const res = await apiClient.get(`/api/tasks/daily?userId=${userId}`)
    return res.data
}

export const claimDailyReward = async (userId?: string): Promise<{ reward: number; updated_user: any }> => {
    let id = userId;
    if (!id) {
        const user = await import("./auth").then(m => m.fetchMe());
        if (!user) throw new Error("User not found");
        id = user.id;
    }
    
    const res = await claimDailyCheckIn(id);
    return res;
}

// New API: Claim daily check-in
export const claimDailyCheckIn = async (userId: string) => {
    const res = await apiClient.post('/api/tasks/daily/claim', { userId })
    return res.data
}

// ── Game task claim ───────────────────────────────────────────────────────────
export const claimGameTask = async (
    taskId: number
): Promise<{ reward: number; updated_user: any }> => {
    // TODO: Update to use new API when userId is available
    const res = await apiClient.post<{ reward: number; updated_user: any }>(
        "/g/tasv/",
        { task_id: taskId }
    )
    return res.data
}

// New API: Claim task reward
export const claimTaskReward = async (taskId: string, userId: string) => {
    const res = await apiClient.post(`/api/tasks/${taskId}/claim`, { userId })
    return res.data
}

// ── Ecosystem / Renaissance task ──────────────────────────────────────────────
export const checkEcosystemTask = async (taskId: string): Promise<RenaissanceTask> => {
    const res = await apiClient.post<RenaissanceTask>("/g/rt/", { task_id: taskId, claim: 0 })
    return res.data
}

export const claimEcosystemTask = async (
    taskId: string
): Promise<{ reward: number; stone: number; crystal: number }> => {
    const res = await apiClient.post<{ reward: number; stone: number; crystal: number }>(
        "/g/rt/",
        { task_id: taskId, claim: 1 }
    )
    return res.data
}

// ── Game reward batch claim ───────────────────────────────────────────────────
export const claimGameReward = async (): Promise<{ reward: number; updated_user: any }> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    // Claim all completed tasks
    const tasks = await fetchTasksByUserId(user.id, 'all');
    const completedTasks = tasks.filter(t => t.completed && !t.claimed);
    
    let totalReward = 0;
    for (const task of completedTasks) {
        try {
            const result = await apiClient.post(`/api/tasks/${task.id}/claim`, { userId: user.id });
            totalReward += result.data.reward || 0;
        } catch (err) {
            console.error(`Failed to claim task ${task.id}:`, err);
        }
    }
    
    // Fetch updated user
    const updatedUser = await import("./auth").then(m => m.fetchMe());
    
    return {
        reward: totalReward,
        updated_user: updatedUser
    };
}
