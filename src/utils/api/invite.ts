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
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await fetchInviteInfo(user.id);
    
    return {
        invite_link: `https://agentfarm.x/?invite=${res.inviteCode}`,
        total_invites: res.totalInvites || 0,
        total_rewards: 0, // Need API for rewards
        friends: (res.invites || []).map((invite: any) => ({
            id: invite.toUserId,
            invitee_name: `Farmer-${invite.toUserId.substring(0, 4)}`,
            invitee_game_level: 1,
            invitee_coin_balance: 0
        })),
        next_cursor: null
    }
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
    const res = await apiClient.get<LeaderboardResponse>(`/api/leaderboard?type=${type}`)
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
    action_direction: 'your' | 'their' // 'your' = 别人对我的, 'their' = 我对别人的
    is_incoming: boolean // true = 别人对我, false = 我对别人
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

export const fetchActivityRecords = async (userId: string, filter?: string, cursor?: string | null): Promise<ActivityResponse> => {
    const params: Record<string, string> = { userId }
    if (filter) params.filter = filter
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<ActivityResponse>("/api/social/record", { params })
    return res.data
}
