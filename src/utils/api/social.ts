import apiClient from "./client"
import { FriendStats, User } from "../types"
import { FriendsData } from "@/components/friends/friendsearchpage"

// ── Cache ──────────────────────────────────────────────────────────────────
const requestCache = new Map<string, Promise<any>>();
function cachedGet<T>(url: string, params?: any): Promise<T> {
    const key = `${url}${JSON.stringify(params || {})}`;
    if (requestCache.has(key)) {
        return requestCache.get(key)!;
    }
    const promise = apiClient.get<T>(url, { params }).then(res => {
        setTimeout(() => requestCache.delete(key), 500); // Clear cache after 500ms
        return res.data;
    }).catch(err => {
        requestCache.delete(key);
        throw err;
    });
    requestCache.set(key, promise);
    return promise;
}

// ── Friend info ───────────────────────────────────────────────────────────────
export interface FriendInfoResponse {
    new_friend_requests_count: number
    friend_total: number
}

export const fetchFriendInfo = async (): Promise<FriendInfoResponse> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const [requests, friends] = await Promise.all([
        fetchFriendRequestsNew(user.id),
        fetchFriendsList(user.id)
    ]);

    return {
        new_friend_requests_count: requests.count || 0,
        friend_total: friends.total || 0,
    }
}

// ── Friend list ───────────────────────────────────────────────────────────────
export interface FriendListResponse {
    friends: FriendsData[]
    next_cursor: string | null
    total: number
}

export const fetchFriends = async (
    filter?: "need_water" | "all",
    cursor?: string | null
): Promise<FriendListResponse> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const params: any = { userId: user.id };
    if (filter === 'need_water') params.filter = 'need_water';
    if (cursor) params.cursor = cursor;

    const data = await cachedGet<{ friends: any[]; total: number }>(`/api/social/friends`, params);
    
    // Map to FriendsData
    const friends: FriendsData[] = data.friends.map(friend => ({
        id: friend.id,
        user_name: friend.username || `X Layer-${friend.walletAddress.slice(-4)}`,
        user_game_level: friend.level,
        user_coin_balance: friend.farmCoins || 0,
        need_water: friend.need_water || 0,
        need_harvest: friend.need_harvest || 0,
        last_login: new Date().toISOString() // Fallback
    }));

    return {
        friends,
        next_cursor: null,
        total: data.total || 0
    }
}

// New API: Get friends list
export const fetchFriendsList = async (userId: string) => {
    return cachedGet<{ friends: any[]; total: number }>(`/api/social/friends`, { userId })
}

// ── Friend search ─────────────────────────────────────────────────────────────
export const searchUsers = async (query: string): Promise<FriendsData[]> => {
    return searchUsersNew(query)
}

// New API: Search users
export const searchUsersNew = async (query: string) => {
    const res = await apiClient.get<FriendsData[]>(`/api/social/friends/search?q=${query}`)
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
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await fetchFriendRequestsNew(user.id);
    return res.requests.map((req: any) => ({
        id: req.id,
        from_user_id: req.fromUserId,
        from_user_name: req.fromUser?.username || `X Layer-${req.fromUser?.walletAddress.slice(-4)}`,
        created_at: req.createdAt
    }));
}

// New API: Get friend requests
export const fetchFriendRequestsNew = async (userId: string) => {
    return cachedGet<{ requests: any[]; count: number }>(`/api/social/friends/requests`, { userId })
}

export const sendFriendRequest = async (toUserId: string): Promise<void> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    await sendFriendRequestNew(user.id, toUserId)
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
    await respondToFriendRequest(requestId, action === "accept" ? "accept" : "reject")
}

// New API: Respond to friend request
export const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
    const res = await apiClient.patch(`/api/social/friends/${requestId}`, { action })
    return res.data
}

export const deleteFriend = async (friendId: string): Promise<void> => {
    await apiClient.delete(`/api/social/friends/${friendId}`)
}

// ── Friend farm operations ────────────────────────────────────────────────────
export const fetchFriendFarm = async (friendId: string): Promise<FriendStats> => {
    const res = await visitFriendFarm(friendId)
    // Map to FriendStats format expected by frontend
    return {
        id: res.userId,
        user_name: res.user?.username || `Farmer`,
        if_friend_status: "friend", // Should be checked properly
        farm_stats: {
            inventory: [],
            growing_crops: res.landPlots.map((p: any) => ({
                coin_balance: res.user?.farmCoins || 0,
                land_id: p.plotIndex + 1,
                land_owned: p.isUnlocked,
                land_can_buy: false,
                is_planted: !!p.cropId,
                crop_details: p.cropId ? {
                    crop_id: p.cropId,
                    crop_type: p.cropId,
                    planted_time: p.plantedAt,
                    is_mature: p.growthStage >= 4,
                    status: p.growthStage >= 4 ? 'mature' : 'growing',
                    maturing_time: p.harvestAt ? new Date(p.harvestAt).getTime() : undefined,
                } : {}
            })),
            level: res.user?.level || 1,
            level_exp: 0,
            coin_balance: res.user?.farmCoins || 0,
            boost_left: 3,
            energy_left: res.energy,
            max_energy: res.maxEnergy,
        }
    }
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
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await waterFriendCropNew(user.id, friendId, landId - 1)
    return {
        reward: res.reward,
        updatedSelf: res.user
    }
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
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    // cropId is plotIndex in some cases
    const res = await stealCropNew(user.id, friendId, parseInt(cropId) || 0)
    return {
        reward: res.reward,
        success: res.success,
        updatedSelf: res.user
    }
}

// New API: Steal crop from friend
export const stealCropNew = async (userId: string, friendId: string, plotIndex: number) => {
    const res = await apiClient.post('/api/social/steal', { userId, friendId, plotIndex })
    return res.data
}
