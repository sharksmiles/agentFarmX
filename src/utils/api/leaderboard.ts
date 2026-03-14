import apiClient from "./client"

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
export const fetchLeaderboard = async (
  type: 'coins' | 'level' | 'experience' = 'coins',
  limit = 50
) => {
  const res = await apiClient.get<{ leaderboard: LeaderboardEntry[]; type: string }>(
    `/api/leaderboard?type=${type}&limit=${limit}`
  )
  return res.data
}

// 获取特定类型排行榜（包含用户排名）
export const fetchLeaderboardWithUserRank = async (
  type: 'coins' | 'level' | 'experience',
  userId: string,
  limit = 50
) => {
  const res = await apiClient.get<{
    leaderboard: LeaderboardEntry[]
    userRank: LeaderboardEntry | null
  }>(`/api/leaderboard/${type}?userId=${userId}&limit=${limit}`)
  return res.data
}
