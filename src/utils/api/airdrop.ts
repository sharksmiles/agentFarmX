import apiClient from "./client"
import { AirDropStatsInfo } from "../types"

export const fetchAirdropInfo = async (): Promise<AirDropStatsInfo> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    return fetchAirdropInfoNew(user.id);
}

// New API: Get airdrop info
export const fetchAirdropInfoNew = async (userId: string): Promise<AirDropStatsInfo> => {
    const res = await apiClient.get(`/api/airdrop?userId=${userId}`)
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

export const claimAirdrop = async (airdropId: string): Promise<{ tx_hash: string }> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    return claimAirdropNew(user.id, airdropId);
}

// New API: Claim airdrop
export const claimAirdropNew = async (userId: string, airdropId: string) => {
    const res = await apiClient.post('/api/airdrop/claim', { userId, airdropId })
    return res.data
}

// ── On-chain balances ─────────────────────────────────────────────────────────
export interface OnChainBalances {
    okb: string
    coin: number
    stone: number
    crystal: number
    art: string
}

export const fetchOnChainBalances = async (): Promise<OnChainBalances> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");
    
    const res = await apiClient.get<OnChainBalances>(`/api/users/balances?userId=${user.id}`)
    return res.data
}
