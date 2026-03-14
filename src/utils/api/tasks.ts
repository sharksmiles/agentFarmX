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
    const res = await apiClient.get<TasksResponse>("/g/tasv/")
    return res.data
}

// ── Daily sign-in ─────────────────────────────────────────────────────────────
export interface DailyCheckInStatus {
    total_days_checked_in: number
    can_check_in_today: boolean
    daily_reward: DailyRewardDay[]
}

export const fetchDailyCheckIn = async (): Promise<DailyCheckInStatus> => {
    const res = await apiClient.get<DailyCheckInStatus>("/g/gdt/")
    return res.data
}

export const claimDailyReward = async (): Promise<{ reward: number; updated_user: any }> => {
    const res = await apiClient.patch<{ reward: number; updated_user: any }>("/g/gdt/")
    return res.data
}

// ── Game task claim ───────────────────────────────────────────────────────────
export const claimGameTask = async (
    taskId: number
): Promise<{ reward: number; updated_user: any }> => {
    const res = await apiClient.post<{ reward: number; updated_user: any }>(
        "/g/tasv/",
        { task_id: taskId }
    )
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
    const res = await apiClient.post<{ reward: number; updated_user: any }>("/g/cwr/")
    return res.data
}
