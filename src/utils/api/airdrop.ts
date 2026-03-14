import apiClient from "./client"
import { AirDropStatsInfo } from "../types"

export const fetchAirdropInfo = async (): Promise<AirDropStatsInfo> => {
    // Return mock data for now - can be replaced with real API later
    return {
        total_airdrop: "0",
        claimed_airdrop: "0",
        unclaimed_airdrop: "0",
        airdrops: [],
    } as AirDropStatsInfo
}

// New API: Get airdrop info
export const fetchAirdropInfoNew = async (userId: string): Promise<AirDropStatsInfo> => {
    const res = await apiClient.get(`/api/airdrop?userId=${userId}`)
    return {
        total_airdrop: res.data.totalAirdrops.toString(),
        claimed_airdrop: res.data.claimedCount.toString(),
        unclaimed_airdrop: (res.data.totalAirdrops - res.data.claimedCount).toString(),
        airdrops: res.data.airdrops,
    }
}

export const claimAirdrop = async (airdropId: string): Promise<{ tx_hash: string }> => {
    // TODO: Update to use new API when userId is available
    const res = await apiClient.post<{ tx_hash: string }>("/u/airdrop/", { airdrop_id: airdropId })
    return res.data
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
    const res = await apiClient.get<OnChainBalances>("/u/balances/")
    return res.data
}
