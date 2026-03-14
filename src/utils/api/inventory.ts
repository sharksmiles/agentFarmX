import apiClient from "./client"

export interface InventoryItem {
  id: string
  userId: string
  itemType: string
  itemId: string
  quantity: number
  createdAt: string
  updatedAt: string
}

// 获取背包
export const fetchInventory = async (userId: string): Promise<InventoryItem[]> => {
  const res = await apiClient.get<{ inventory: InventoryItem[] }>(`/api/inventory?userId=${userId}`)
  return res.data.inventory
}

// 使用道具
export const useItem = async (
  userId: string,
  itemType: string,
  itemId: string,
  quantity = 1
) => {
  const res = await apiClient.post('/api/inventory/use', {
    userId,
    itemType,
    itemId,
    quantity,
  })
  return res.data
}

// 出售物品
export const sellItem = async (
  userId: string,
  itemType: string,
  itemId: string,
  quantity = 1
) => {
  const res = await apiClient.post('/api/inventory/sell', {
    userId,
    itemType,
    itemId,
    quantity,
  })
  return res.data
}
