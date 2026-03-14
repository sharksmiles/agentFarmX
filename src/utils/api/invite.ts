import apiClient from "./client"

// ── Invite ────────────────────────────────────────────────────────────────────
export interface InviteFriend {
    id: string
    invitee_name: string
    invitee_game_level: number
    invitee_coin_balance: number
}

export interface InviteStats {
    invite_link: string
    total_invites: number
    total_rewards: number
    friends: InviteFriend[]
    next_cursor: string | null
}

export const fetchInviteStats = async (cursor?: string | null): Promise<InviteStats> => {
    const params: Record<string, string> = {}
    if (cursor) params.cursor = cursor
    // TODO: Update to use new API
    const res = await apiClient.get<InviteStats>("/u/invite/", { params })
    return res.data
}

// New API: Get invite info
export const fetchInviteInfo = async (userId: string) => {
    const res = await apiClient.get(`/api/invite?userId=${userId}`)
    return res.data
}

// New API: Get invite code
export const fetchInviteCode = async (userId: string) => {
    const res = await apiClient.get(`/api/invite/code?userId=${userId}`)
    return res.data.inviteCode
}

// New API: Claim invite reward
export const claimInviteReward = async (userId: string, inviteCode: string) => {
    const res = await apiClient.post('/api/invite/claim', { userId, inviteCode })
    return res.data
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
export interface LeaderboardItem {
    rank: number
    user_id: string
    name: string
    total_invites: number
}

export interface LeaderboardResponse {
    results: LeaderboardItem[]
    next: string | null
}

export const fetchLeaderboard = async (
    type: "invite" | "coin" | "level",
    cursor?: string | null
): Promise<LeaderboardResponse> => {
    const params: Record<string, string> = { type }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<LeaderboardResponse>("/u/invite/leaderboard/", { params })
    return res.data
}

// ── Activity record ───────────────────────────────────────────────────────────
export interface ActivityRecord {
    id: string
    user_id: string
    user_name: string
    user_game_level: number
    user_coin_balance: number
    action: string
    user_earning: number
    user_exp_gain: number
    crop_name: string
    action_time: string
    last_login: string
}

export interface ActivityResponse {
    results: ActivityRecord[]
    next: string | null
}

export const fetchActivityRecords = async (cursor?: string | null): Promise<ActivityResponse> => {
    const params: Record<string, string> = {}
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<ActivityResponse>("/g/record/", { params })
    return res.data
}
