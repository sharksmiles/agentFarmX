import apiClient from "./client"
import { AirDropStatsInfo } from "../types"

export const fetchAirdropInfo = async (): Promise<AirDropStatsInfo> => {
    const res = await apiClient.get<AirDropStatsInfo>("/u/airdrop/")
    return res.data
}

export const claimAirdrop = async (airdropId: string): Promise<{ tx_hash: string }> => {
    const res = await apiClient.post<{ tx_hash: string }>("/u/airdrop/", { airdrop_id: airdropId })
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
