# 前端 API 集成指南

> 更新前端代码以使用新的后端 API

---

## 📋 需要更新的文件

### 1. 认证相关 (`src/utils/api/auth.ts`)

#### 更新内容

```typescript
// 新增: 获取 Nonce
export const fetchNonce = async (): Promise<string> => {
  const res = await apiClient.get<{ nonce: string }>('/api/auth/nonce')
  return res.data.nonce
}

// 新增: SIWE 登录
export const loginWithSIWE = async (message: string, signature: string) => {
  const res = await apiClient.post<{
    success: boolean
    user: User
    sessionToken: string
  }>('/api/auth/login', { message, signature })
  
  // 保存 session token
  localStorage.setItem('sessionToken', res.data.sessionToken)
  return res.data
}

// 新增: 登出
export const logout = async () => {
  await apiClient.post('/api/auth/logout')
  localStorage.removeItem('sessionToken')
}

// 新增: 获取会话
export const fetchSession = async () => {
  const token = localStorage.getItem('sessionToken')
  if (!token) throw new Error('No session token')
  
  const res = await apiClient.get<{ user: User }>('/api/auth/session', {
    headers: { Authorization: `Bearer ${token}` }
  })
  return res.data.user
}

// 保留现有的 fetchMe (已更新)
export const fetchMe = async (): Promise<User> => {
  const address = typeof window !== 'undefined'
    ? (window as any).ethereum?.selectedAddress || localStorage.getItem('walletAddress')
    : null

  if (!address) throw new Error('No wallet address found')

  const res = await apiClient.get<{ user: User }>(`/api/users?walletAddress=${address}`)
  return res.data.user
}
```

---

### 2. 农场功能 (`src/utils/api/farm.ts`)

#### 新增 API 调用

```typescript
// 获取农场状态
export const fetchFarmState = async (userId: string) => {
  const res = await apiClient.get<{ farmState: FarmState }>(`/api/farm/state?userId=${userId}`)
  return res.data.farmState
}

// 解锁土地
export const unlockLand = async (userId: string, plotIndex: number) => {
  const res = await apiClient.post('/api/farm/unlock', { userId, plotIndex })
  return res.data
}

// 浇水
export const waterCrop = async (userId: string, plotIndex: number) => {
  const res = await apiClient.post('/api/farm/water', { userId, plotIndex })
  return res.data
}

// 使用加速道具
export const boostCrop = async (userId: string, plotIndex: number) => {
  const res = await apiClient.post('/api/farm/boost', { userId, plotIndex })
  return res.data
}

// 升级农场
export const upgradeFarm = async (userId: string) => {
  const res = await apiClient.post('/api/farm/upgrade', { userId })
  return res.data
}
```

---

### 3. 背包系统 (新建 `src/utils/api/inventory.ts`)

```typescript
import { apiClient } from "./client"

export interface InventoryItem {
  id: string
  userId: string
  itemType: string
  itemId: string
  quantity: number
}

// 获取背包
export const fetchInventory = async (userId: string) => {
  const res = await apiClient.get<{ inventory: InventoryItem[] }>(`/api/inventory?userId=${userId}`)
  return res.data.inventory
}

// 使用道具
export const useItem = async (userId: string, itemType: string, itemId: string, quantity = 1) => {
  const res = await apiClient.post('/api/inventory/use', { userId, itemType, itemId, quantity })
  return res.data
}

// 出售物品
export const sellItem = async (userId: string, itemType: string, itemId: string, quantity = 1) => {
  const res = await apiClient.post('/api/inventory/sell', { userId, itemType, itemId, quantity })
  return res.data
}
```

---

### 4. 能量系统 (新建 `src/utils/api/energy.ts`)

```typescript
import { apiClient } from "./client"

export interface EnergyStatus {
  energy: number
  maxEnergy: number
  recoveryRate: number
  nextRecoveryAt: string | null
}

// 获取能量状态
export const fetchEnergy = async (userId: string) => {
  const res = await apiClient.get<EnergyStatus>(`/api/energy?userId=${userId}`)
  return res.data
}

// 购买能量包
export const buyEnergyPack = async (userId: string, pack: 'small' | 'large' | 'full') => {
  const res = await apiClient.post('/api/energy/buy', { userId, pack })
  return res.data
}
```

---

### 5. 社交功能 (`src/utils/api/social.ts`)

#### 更新和新增

```typescript
// 获取好友列表
export const fetchFriends = async (userId: string) => {
  const res = await apiClient.get<{ friends: any[], total: number }>(`/api/social/friends?userId=${userId}`)
  return res.data
}

// 发送好友请求
export const sendFriendRequest = async (fromUserId: string, toUserId: string) => {
  const res = await apiClient.post('/api/social/friends', { fromUserId, toUserId })
  return res.data
}

// 搜索用户
export const searchUsers = async (query: string) => {
  const res = await apiClient.get<{ users: any[] }>(`/api/social/friends/search?q=${query}`)
  return res.data.users
}

// 获取好友请求
export const fetchFriendRequests = async (userId: string) => {
  const res = await apiClient.get<{ requests: any[], count: number }>(`/api/social/friends/requests?userId=${userId}`)
  return res.data
}

// 接受/拒绝好友请求
export const respondToFriendRequest = async (requestId: string, action: 'accept' | 'reject') => {
  const res = await apiClient.patch(`/api/social/friends/${requestId}`, { action })
  return res.data
}

// 访问好友农场
export const visitFriendFarm = async (friendId: string) => {
  const res = await apiClient.get(`/api/social/${friendId}/farm`)
  return res.data.farmState
}

// 帮好友浇水
export const waterFriendCrop = async (userId: string, friendId: string, plotIndex: number) => {
  const res = await apiClient.post('/api/social/water', { userId, friendId, plotIndex })
  return res.data
}

// 偷菜
export const stealCrop = async (userId: string, friendId: string, plotIndex: number) => {
  const res = await apiClient.post('/api/social/steal', { userId, friendId, plotIndex })
  return res.data
}

// 更新 fetchFriendInfo (保留现有mock或更新)
export const fetchFriendInfo = async (): Promise<FriendInfoResponse> => {
  // 可以调用新的 API 或保留 mock
  return {
    new_friend_requests_count: 0,
    friend_total: 0,
  }
}
```

---

### 6. 任务系统 (新建 `src/utils/api/tasks.ts`)

```typescript
import { apiClient } from "./client"

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

// 获取任务列表
export const fetchTasks = async (userId: string, type: 'daily' | 'achievement' | 'all' = 'all') => {
  const res = await apiClient.get<{ tasks: Task[] }>(`/api/tasks?userId=${userId}&type=${type}`)
  return res.data.tasks
}

// 领取任务奖励
export const claimTaskReward = async (taskId: string, userId: string) => {
  const res = await apiClient.post(`/api/tasks/${taskId}/claim`, { userId })
  return res.data
}

// 每日签到状态
export const fetchDailyCheckIn = async (userId: string) => {
  const res = await apiClient.get(`/api/tasks/daily?userId=${userId}`)
  return res.data
}

// 每日签到
export const claimDailyCheckIn = async (userId: string) => {
  const res = await apiClient.post('/api/tasks/daily/claim', { userId })
  return res.data
}
```

---

### 7. 排行榜 (新建 `src/utils/api/leaderboard.ts`)

```typescript
import { apiClient } from "./client"

export interface LeaderboardEntry {
  id: string
  walletAddress: string
  username: string | null
  avatar: string | null
  level: number
  experience: number
  farmCoins: number
  rank: number
}

// 获取排行榜
export const fetchLeaderboard = async (type: 'coins' | 'level' | 'experience' = 'coins', limit = 50) => {
  const res = await apiClient.get<{ leaderboard: LeaderboardEntry[], type: string }>(`/api/leaderboard?type=${type}&limit=${limit}`)
  return res.data
}

// 获取特定类型排行榜（包含用户排名）
export const fetchLeaderboardWithUserRank = async (
  type: 'coins' | 'level' | 'experience',
  userId: string,
  limit = 50
) => {
  const res = await apiClient.get<{ leaderboard: LeaderboardEntry[], userRank: LeaderboardEntry | null }>(`/api/leaderboard/${type}?userId=${userId}&limit=${limit}`)
  return res.data
}
```

---

### 8. 抽奖系统 (新建 `src/utils/api/raffle.ts`)

```typescript
import { apiClient } from "./client"

// 获取抽奖列表
export const fetchRaffles = async () => {
  const res = await apiClient.get('/api/raffle')
  return res.data.raffles
}

// 参与抽奖
export const enterRaffle = async (raffleId: string, userId: string, ticketCount = 1) => {
  const res = await apiClient.post(`/api/raffle/${raffleId}/enter`, { userId, ticketCount })
  return res.data
}

// 查看中奖者
export const fetchRaffleWinners = async (raffleId: string) => {
  const res = await apiClient.get(`/api/raffle/${raffleId}/winners`)
  return res.data.winners
}
```

---

### 9. 邀请系统 (新建 `src/utils/api/invite.ts`)

```typescript
import { apiClient } from "./client"

// 获取邀请信息
export const fetchInviteInfo = async (userId: string) => {
  const res = await apiClient.get(`/api/invite?userId=${userId}`)
  return res.data
}

// 获取邀请码
export const fetchInviteCode = async (userId: string) => {
  const res = await apiClient.get(`/api/invite/code?userId=${userId}`)
  return res.data.inviteCode
}

// 使用邀请码
export const claimInviteReward = async (userId: string, inviteCode: string) => {
  const res = await apiClient.post('/api/invite/claim', { userId, inviteCode })
  return res.data
}
```

---

### 10. 空投系统 (`src/utils/api/airdrop.ts`)

#### 更新内容

```typescript
// 更新 fetchAirdropInfo
export const fetchAirdropInfo = async (userId: string): Promise<AirDropStatsInfo> => {
  const res = await apiClient.get(`/api/airdrop?userId=${userId}`)
  return {
    total_airdrop: res.data.totalAirdrops.toString(),
    claimed_airdrop: res.data.claimedCount.toString(),
    unclaimed_airdrop: (res.data.totalAirdrops - res.data.claimedCount).toString(),
    airdrops: res.data.airdrops,
  }
}

// 新增: 领取空投
export const claimAirdrop = async (userId: string, airdropId: string) => {
  const res = await apiClient.post('/api/airdrop/claim', { userId, airdropId })
  return res.data
}
```

---

## 🔄 迁移步骤

### 第 1 步: 更新现有文件

1. ✅ `src/utils/api/auth.ts` - 已部分更新
2. ✅ `src/utils/api/game.ts` - 使用 mock 数据
3. ✅ `src/utils/api/social.ts` - 已部分更新
4. ✅ `src/utils/api/airdrop.ts` - 使用 mock 数据

### 第 2 步: 创建新文件

1. ⏳ `src/utils/api/inventory.ts`
2. ⏳ `src/utils/api/energy.ts`
3. ⏳ `src/utils/api/tasks.ts`
4. ⏳ `src/utils/api/leaderboard.ts`
5. ⏳ `src/utils/api/raffle.ts`
6. ⏳ `src/utils/api/invite.ts`

### 第 3 步: 更新组件

根据新的 API 函数更新相关 React 组件：

- 农场页面组件
- 社交页面组件
- 任务页面组件
- 排行榜页面组件
- 等等...

---

## 📝 注意事项

1. **类型定义**: 确保所有新的 API 响应都有对应的 TypeScript 类型定义
2. **错误处理**: 添加适当的错误处理和用户提示
3. **Loading 状态**: 为所有 API 调用添加 loading 状态
4. **缓存策略**: 考虑使用 React Query 或 SWR 进行数据缓存
5. **Session 管理**: 实现完整的 session 管理和自动刷新

---

## 🧪 测试清单

- [ ] 认证流程（登录/登出）
- [ ] 农场操作（种植/收获/浇水/加速）
- [ ] 背包管理（查看/使用/出售）
- [ ] 能量购买
- [ ] 好友系统（添加/搜索/访问）
- [ ] 任务系统（查看/领取）
- [ ] 排行榜显示
- [ ] 抽奖参与
- [ ] 邀请功能
- [ ] 空投领取

---

**最后更新**: 2026-03-15 00:45
