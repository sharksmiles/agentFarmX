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
    const res = await apiClient.get<TasksResponse>("/u/tasks/")
    return res.data
}

// ── Daily sign-in ─────────────────────────────────────────────────────────────
export const claimDailyReward = async (
    day: number
): Promise<{ reward: number; updated_user: any }> => {
    const res = await apiClient.post<{ reward: number; updated_user: any }>(
        "/u/tasks/daily/claim/",
        { day }
    )
    return res.data
}

// ── Game task claim ───────────────────────────────────────────────────────────
export const claimGameTask = async (
    taskId: number
): Promise<{ reward: number; updated_user: any }> => {
    const res = await apiClient.post<{ reward: number; updated_user: any }>(
        "/u/tasks/game/claim/",
        { task_id: taskId }
    )
    return res.data
}

// ── Ecosystem / Renaissance task ──────────────────────────────────────────────
export const checkEcosystemTask = async (taskId: string): Promise<RenaissanceTask> => {
    const res = await apiClient.post<RenaissanceTask>("/u/tasks/eco/check/", { task_id: taskId })
    return res.data
}

export const claimEcosystemTask = async (
    taskId: string
): Promise<{ reward: number; stone: number; crystal: number }> => {
    const res = await apiClient.post<{ reward: number; stone: number; crystal: number }>(
        "/u/tasks/eco/claim/",
        { task_id: taskId }
    )
    return res.data
}

// ── Game reward batch claim ───────────────────────────────────────────────────
export const claimGameReward = async (): Promise<{ reward: number; updated_user: any }> => {
    const res = await apiClient.post<{ reward: number; updated_user: any }>("/u/tasks/game/reward/claim/")
    return res.data
}
