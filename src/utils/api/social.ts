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
    const user = await import("./auth").then(m => m.fetchMe());
    const params = new URLSearchParams({ q: query });
    if (user?.id) {
        params.append('userId', user.id);
    }
    const res = await apiClient.get<FriendsData[]>(`/api/social/friends/search?${params.toString()}`)
    return res.data
}

// ── Friend requests ───────────────────────────────────────────────────────────
export interface FriendRequest {
    id: string  // 请求记录ID
    from_user_id: string  // 发送者用户ID
    from_user_name: string
    user_game_level: number
    user_coin_balance: number
    need_water: number
    need_harvest: number
    last_login: string
    created_at: string
}

export const fetchFriendRequests = async (): Promise<FriendRequest[]> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await fetchFriendRequestsNew(user.id);
    const now = new Date();
    
    return res.requests.map((req: any) => {
        const fromUser = req.fromUser || {};
        const plots = fromUser.farmState?.landPlots || [];
        const needWater = plots.filter((p: any) => 
            p.nextWateringDue && new Date(p.nextWateringDue) <= now && p.cropId && p.growthStage < 4
        ).length;
        const needHarvest = plots.filter((p: any) => p.growthStage === 4).length;
        
        return {
            id: req.id,  // 请求记录ID，用于接受/拒绝操作
            from_user_id: fromUser.id,
            from_user_name: fromUser.username || `X Layer-${fromUser.walletAddress?.slice(-4) || ''}`,
            user_game_level: fromUser.level || 1,
            user_coin_balance: fromUser.farmCoins || 0,
            need_water: needWater,
            need_harvest: needHarvest,
            last_login: fromUser.lastLoginAt || new Date().toISOString(),
            created_at: req.createdAt
        };
    });
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
// 辅助函数：将日期转换为 ISO 字符串
const toISOString = (date: any): string | undefined => {
    if (!date) return undefined
    if (typeof date === 'string') return date
    if (date instanceof Date) return date.toISOString()
    return new Date(date).toISOString()
}

export const fetchFriendFarm = async (friendId: string): Promise<FriendStats> => {
    // 手动访问好友农场，使用 mode='manual' 跳过支付
    const res = await visitFriendFarm(friendId, 'manual')
    const now = new Date()
    
    // 创建完整的地块数组（9个）
    const allPlots = Array.from({ length: 9 }, (_, i) => {
        const plot = res.landPlots?.find((p: any) => p.plotIndex === i)
        return plot || { plotIndex: i, isUnlocked: false, cropId: null }
    })
    
    // Map to FriendStats format expected by frontend
    return {
        id: res.userId,
        user_name: res.user?.username || `Farmer`,
        if_friend_status: "friend", // Should be checked properly
        farm_stats: {
            inventory: [],
            growing_crops: allPlots.map((p: any) => {
                // 计算作物是否成熟
                const isMature = p.growthStage >= 4 || (p.harvestAt && now >= new Date(p.harvestAt))
                
                // 计算成熟所需时间（小时）
                let maturingTimeHours: number | undefined = undefined
                let growthTimeHours: number | undefined = undefined
                if (p.plantedAt && p.harvestAt) {
                    const plantedAt = new Date(p.plantedAt)
                    const harvestAt = new Date(p.harvestAt)
                    maturingTimeHours = (harvestAt.getTime() - plantedAt.getTime()) / (1000 * 60 * 60)
                    
                    // 计算上次浇水时已经生长的时间（小时）
                    const lastWateredAt = p.lastWateredAt ? new Date(p.lastWateredAt) : plantedAt
                    growthTimeHours = (lastWateredAt.getTime() - plantedAt.getTime()) / (1000 * 60 * 60)
                }
                
                return {
                    coin_balance: res.user?.farmCoins || 0,
                    land_id: p.plotIndex + 1,
                    land_owned: p.isUnlocked,
                    land_can_buy: false,
                    is_planted: !!p.cropId,
                    crop_details: p.cropId ? {
                        crop_id: p.cropId,
                        crop_type: p.cropId,
                        planted_time: toISOString(p.plantedAt),
                        last_watered_time: toISOString(p.lastWateredAt) || toISOString(p.plantedAt),
                        next_watering_due: toISOString(p.nextWateringDue),
                        harvest_at: toISOString(p.harvestAt), // 添加成熟时间
                        is_mature: isMature,
                        status: isMature ? 'mature' : 'growing',
                        maturing_time: maturingTimeHours, // 成熟所需总时间（小时）
                        growth_time_hours: growthTimeHours, // 上次浇水时已生长时间（小时）
                    } : {}
                }
            }),
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
// mode: 'manual' = 手动访问（免费），不传或 'agent' = 机器人执行（需付费）
export const visitFriendFarm = async (friendId: string, mode: 'manual' | 'agent' = 'agent') => {
    // Record visit for task tracking
    apiClient.post('/api/social/visit', { friendId, mode }).catch(() => {
        // Ignore visit recording errors
    });
    
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
// mode: 'manual' = 手动操作（免费），不传或 'agent' = 机器人执行（需付费）
export const waterFriendCropNew = async (userId: string, friendId: string, plotIndex: number, mode: 'manual' | 'agent' = 'manual') => {
    const res = await apiClient.post('/api/social/water', { userId, friendId, plotIndex, mode })
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
        updatedSelf: res.updatedSelf  // 后端返回的是 updatedSelf
    }
}

// New API: Steal crop from friend
// mode: 'manual' = 手动操作（免费），不传或 'agent' = 机器人执行（需付费）
export const stealCropNew = async (userId: string, friendId: string, plotIndex: number, mode: 'manual' | 'agent' = 'manual') => {
    const res = await apiClient.post('/api/social/steal', { userId, friendId, plotIndex, mode })
    return res.data
}

// ── Explore (Radar) ──────────────────────────────────────────────────────────
export interface ExploreResult {
    friend: {
        id: string
        username: string
        avatar: string | null
        level: number
        stealableCrops: number
    }
    cost: number
}

export const exploreFarm = async (): Promise<ExploreResult> => {
    const res = await apiClient.post<ExploreResult>('/api/social/explore')
    return res.data
}
