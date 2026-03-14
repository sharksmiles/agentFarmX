import apiClient from "./client"
import { FriendStats, User } from "../types"
import { FriendsData } from "@/components/friends/friendsearchpage"

// ── Friend info ───────────────────────────────────────────────────────────────
export interface FriendInfoResponse {
    new_friend_requests_count: number
    friend_total: number
}

export const fetchFriendInfo = async (): Promise<FriendInfoResponse> => {
    const res = await apiClient.get<FriendInfoResponse>("/u/friends/info/")
    return res.data
}

// ── Friend list ───────────────────────────────────────────────────────────────
export interface FriendListResponse {
    friends: FriendsData[]
    next_cursor: string | null
}

export const fetchFriends = async (
    filter?: "need_water" | "all",
    cursor?: string | null
): Promise<FriendListResponse> => {
    const params: Record<string, string> = {}
    if (filter && filter !== "all") params.filter = filter
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<FriendListResponse>("/u/friends/", { params })
    return res.data
}

// ── Friend search ─────────────────────────────────────────────────────────────
export const searchUsers = async (query: string): Promise<FriendsData[]> => {
    const res = await apiClient.get<FriendsData[]>("/u/friends/search/", { params: { q: query } })
    return res.data
}

// ── Friend requests ───────────────────────────────────────────────────────────
export interface FriendRequest {
    id: string
    from_user_id: string
    from_user_name: string
    created_at: string
}

export const fetchFriendRequests = async (): Promise<FriendRequest[]> => {
    const res = await apiClient.get<FriendRequest[]>("/u/friends/requests/")
    return res.data
}

export const sendFriendRequest = async (userId: string): Promise<void> => {
    await apiClient.post("/u/friends/", { friend_id: userId })
}

export const respondFriendRequest = async (
    requestId: string,
    action: "accept" | "decline"
): Promise<void> => {
    await apiClient.patch(`/u/friends/${requestId}/`, { action })
}

export const deleteFriend = async (friendId: string): Promise<void> => {
    await apiClient.delete(`/u/friends/${friendId}/`)
}

// ── Friend farm operations ────────────────────────────────────────────────────
export const fetchFriendFarm = async (friendId: string): Promise<FriendStats> => {
    const res = await apiClient.get<FriendStats>(`/u/friends/${friendId}/farm/`)
    return res.data
}

export const waterFriendCrop = async (
    friendId: string,
    landId: number
): Promise<{ reward: number; updatedSelf: User }> => {
    const res = await apiClient.post<{ reward: number; updatedSelf: User }>(
        "/g/fa/",
        { action: "water", friend_id: friendId, land_id: landId }
    )
    return res.data
}

export const checkSteal = async (
    friendId: string,
    cropId: string
): Promise<any> => {
    const res = await apiClient.post("/g/fa/", { action: "checksteal", friend_id: friendId, crop_id: cropId })
    return res.data
}

export const stealCrop = async (
    friendId: string,
    cropId: string
): Promise<{ reward: number; success: boolean; updatedSelf: User }> => {
    const res = await apiClient.post<{ reward: number; success: boolean; updatedSelf: User }>(
        "/g/fa/",
        { action: "steal", friend_id: friendId, crop_id: cropId }
    )
    return res.data
}
