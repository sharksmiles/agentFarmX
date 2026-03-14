import apiClient from "./client"

export interface EnergyStatus {
  energy: number
  maxEnergy: number
  recoveryRate: number
  nextRecoveryAt: string | null
}

// 获取能量状态
export const fetchEnergy = async (userId: string): Promise<EnergyStatus> => {
  const res = await apiClient.get<EnergyStatus>(`/api/energy?userId=${userId}`)
  return res.data
}

// 购买能量包
export const buyEnergyPack = async (
  userId: string,
  pack: 'small' | 'large' | 'full'
) => {
  const res = await apiClient.post('/api/energy/buy', { userId, pack })
  return res.data
}
