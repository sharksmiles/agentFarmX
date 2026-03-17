import apiClient from "./client"
import { AirDropStatsInfo } from "../types"

export const fetchAirdropInfo = async (): Promise<AirDropStatsInfo> => {
    const res = await apiClient.get('/api/airdrop')
    return {
        eligible: res.data.airdrops?.[0]?.eligible || false,
        airdrop_amount: res.data.airdrops?.[0]?.airdrop_amount || 0,
        remarks: res.data.airdrops?.[0]?.remarks || [],
        total_airdrop: (res.data.totalAirdrops || 0).toString(),
        claimed_airdrop: (res.data.claimedCount || 0).toString(),
        unclaimed_airdrop: ((res.data.totalAirdrops || 0) - (res.data.claimedCount || 0)).toString(),
        airdrops: res.data.airdrops || [],
    }
}

// Keep for backward compatibility, but userId is no longer needed
export const fetchAirdropInfoNew = async (_userId: string): Promise<AirDropStatsInfo> => {
    return fetchAirdropInfo()
}

export const claimAirdrop = async (airdropId: string): Promise<{ tx_hash: string }> => {
    const res = await apiClient.post('/api/airdrop/claim', { airdropId })
    return res.data
}

// Keep for backward compatibility, but userId is no longer needed
export const claimAirdropNew = async (_userId: string, airdropId: string) => {
    return claimAirdrop(airdropId)
}

// ── On-chain balances ─────────────────────────────────────────────────────────
export interface OnChainBalances {
    okb: string
    coin: number
    art: string
}

export const fetchOnChainBalances = async (): Promise<OnChainBalances> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await apiClient.get<OnChainBalances>(`/api/users/balances?userId=${user.id}`)
    return res.data
}
