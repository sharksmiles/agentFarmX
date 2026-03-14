import apiClient from "./client"

// ── Invite ────────────────────────────────────────────────────────────────────
export interface InviteStats {
    invite_link: string
    total_invites: number
    total_rewards: number
    friends: { id: string; user_name: string; joined_at: string }[]
    next_cursor: string | null
}

export const fetchInviteStats = async (cursor?: string | null): Promise<InviteStats> => {
    const params: Record<string, string> = {}
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<InviteStats>("/u/invite/", { params })
    return res.data
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
    rank: number
    user_id: string
    user_name: string
    invite_count: number
    coin_balance: number
    level: number
    capila_owner: boolean
}

export interface LeaderboardResponse {
    entries: LeaderboardEntry[]
    my_rank: LeaderboardEntry | null
    next_cursor: string | null
}

export const fetchLeaderboard = async (
    type: "invite" | "coin" | "level",
    cursor?: string | null
): Promise<LeaderboardResponse> => {
    const params: Record<string, string> = { type }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<LeaderboardResponse>("/u/leaderboard/", { params })
    return res.data
}

// ── Activity record ───────────────────────────────────────────────────────────
export interface ActivityRecord {
    id: string
    action: string
    amount: number
    timestamp: string
    details: string
}

export interface ActivityResponse {
    records: ActivityRecord[]
    next_cursor: string | null
}

export const fetchActivityRecords = async (cursor?: string | null): Promise<ActivityResponse> => {
    const params: Record<string, string> = {}
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<ActivityResponse>("/u/activity/", { params })
    return res.data
}
