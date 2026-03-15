import apiClient from "./client"
import { FriendStats, User } from "../types"
import { FriendsData } from "@/components/friends/friendsearchpage"

// ── Friend info ───────────────────────────────────────────────────────────────
export interface FriendInfoResponse {
    new_friend_requests_count: number
    friend_total: number
}

export const fetchFriendInfo = async (): Promise<FriendInfoResponse> => {
    // Return mock data for now - can be replaced with real API later
    return {
        new_friend_requests_count: 0,
        friend_total: 0,
    }
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
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await apiClient.get<{ friends: FriendsData[]; total: number }>(`/api/social/friends?userId=${user.id}`)
    
    return {
        friends: res.data.friends,
        next_cursor: null
    }
}

// New API: Get friends list
export const fetchFriendsList = async (userId: string) => {
    const res = await apiClient.get(`/api/social/friends?userId=${userId}`)
    return res.data
}

// ── Friend search ─────────────────────────────────────────────────────────────
export const searchUsers = async (query: string): Promise<FriendsData[]> => {
    // TODO: Update to use new API
    const res = await apiClient.get<FriendsData[]>("/u/friends/search/", { params: { q: query } })
    return res.data
}

// New API: Search users
export const searchUsersNew = async (query: string) => {
    const res = await apiClient.get(`/api/social/friends/search?q=${query}`)
    return res.data.users
}

// ── Friend requests ───────────────────────────────────────────────────────────
export interface FriendRequest {
    id: string
    from_user_id: string
    from_user_name: string
    created_at: string
}

export const fetchFriendRequests = async (): Promise<FriendRequest[]> => {
    // TODO: Update to use new API
    const res = await apiClient.get<FriendRequest[]>("/u/friends/requests/")
    return res.data
}

// New API: Get friend requests
export const fetchFriendRequestsNew = async (userId: string) => {
    const res = await apiClient.get(`/api/social/friends/requests?userId=${userId}`)
    return res.data
}

export const sendFriendRequest = async (userId: string): Promise<void> => {
    // TODO: Update to use new API
    await apiClient.post("/u/friends/", { friend_id: userId })
}

// New API: Send friend request
export const sendFriendRequestNew = async (fromUserId: string, toUserId: string) => {
    const res = await apiClient.post('/api/social/friends', { fromUserId, toUserId })
    return res.data
}

export const respondFriendRequest = async (
    requestId: string,
    action: "accept" | "decline"
): Promise<void> => {
    // TODO: Update to use new API
    await apiClient.patch(`/u/friends/${requestId}/`, { action })
}

// New API: Respond to friend request
export const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    const res = await apiClient.patch(`/api/social/friends/${requestId}`, { action })
    return res.data
}

export const deleteFriend = async (friendId: string): Promise<void> => {
    await apiClient.delete(`/u/friends/${friendId}/`)
}

// ── Friend farm operations ────────────────────────────────────────────────────
export const fetchFriendFarm = async (friendId: string): Promise<FriendStats> => {
    // TODO: Update to use new API
    const res = await apiClient.get<FriendStats>(`/u/friends/${friendId}/farm/`)
    return res.data
}

// New API: Visit friend farm
export const visitFriendFarm = async (friendId: string) => {
    const res = await apiClient.get(`/api/social/${friendId}/farm`)
    return res.data.farmState
}

export const waterFriendCrop = async (
    friendId: string,
    landId: number
): Promise<{ reward: number; updatedSelf: User }> => {
    // TODO: Update to use new API
    const res = await apiClient.post<{ reward: number; updatedSelf: User }>(
        "/g/fa/",
        { action: "water", friend_id: friendId, land_id: landId }
    )
    return res.data
}

// New API: Water friend's crop
export const waterFriendCropNew = async (userId: string, friendId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/social/water', { userId, friendId, plotIndex })
    return res.data
}

export const checkSteal = async (
    friendId: string,
    cropId: string
): Promise<any> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    // Extract plotIndex from cropId if needed, or pass cropId as is
    // Assuming cropId might contain plot info or we need to find it
    const res = await apiClient.post("/api/social/checksteal", { 
        userId: user.id, 
        friendId, 
        plotIndex: parseInt(cropId) || 0 
    })
    return res.data
}

export const stealCrop = async (
    friendId: string,
    cropId: string
): Promise<{ reward: number; success: boolean; updatedSelf: User }> => {
    // TODO: Update to use new API
    const res = await apiClient.post<{ reward: number; success: boolean; updatedSelf: User }>(
        "/g/fa/",
        { action: "steal", friend_id: friendId, crop_id: cropId }
    )
    return res.data
}

// New API: Steal crop from friend
export const stealCropNew = async (userId: string, friendId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/social/steal', { userId, friendId, plotIndex })
    return res.data
}
