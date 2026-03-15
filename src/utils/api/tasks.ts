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

export const fetchTasks = async (): Promise<TasksResponse> => {
    try {
        const user = await import("./auth").then(m => m.fetchMe());
        if (!user) throw new Error("User not found");
        
        const [tasks, dailyStatus] = await Promise.all([
            fetchTasksByUserId(user.id, 'all'),
            fetchDailyCheckInStatus(user.id)
        ]);
        
        // Transform to match old response format
        const game_tasks = tasks.filter(t => t.type === 'daily').map(t => ({
            id: parseInt(t.id) || 0,
            title: t.name,
            content: t.description,
            reward: t.reward,
            url: '',
            click: false,
            completed: t.completed,
            claimed: t.claimed,
        }));
        
        return {
            game_tasks,
            renaissance_tasks: [],
            daily_reward: dailyStatus.daily_reward || [],
            game_reward: 0,
            completed: false
        }
    } catch (error) {
        // Fallback to old API
        const res = await apiClient.get<TasksResponse>("/g/tasv/")
        return res.data
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
    const res = await apiClient.get<{ tasks: Task[] }>(`/api/tasks?userId=${userId}&type=${type}`)
    return res.data.tasks
}

// ── Daily sign-in ─────────────────────────────────────────────────────────────
export interface DailyCheckInStatus {
    total_days_checked_in: number
    can_check_in_today: boolean
    daily_reward: DailyRewardDay[]
}

export const fetchDailyCheckIn = async (): Promise<DailyCheckInStatus> => {
    try {
        const user = await import("./auth").then(m => m.fetchMe());
        if (!user) throw new Error("User not found");
        
        const res = await fetchDailyCheckInStatus(user.id);
        return res as DailyCheckInStatus;
    } catch (error) {
        // Fallback to old API
        const res = await apiClient.get<DailyCheckInStatus>("/g/gdt/")
        return res.data
    }
}

// New API: Get daily check-in status
export const fetchDailyCheckInStatus = async (userId: string) => {
    const res = await apiClient.get(`/api/tasks/daily?userId=${userId}`)
    return res.data
}

export const claimDailyReward = async (): Promise<{ reward: number; updated_user: any }> => {
    try {
        const user = await import("./auth").then(m => m.fetchMe());
        if (!user) throw new Error("User not found");
        
        const res = await claimDailyCheckIn(user.id);
        return res;
    } catch (error) {
        // Fallback to old API
        const res = await apiClient.patch<{ reward: number; updated_user: any }>("/g/gdt/")
        return res.data
    }
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
    try {
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
    } catch (error) {
        // Fallback to old API
        const res = await apiClient.post<{ reward: number; updated_user: any }>("/g/cwr/")
        return res.data
    }
}
