import apiClient from "./client"
import { Raffle } from "../types"

export const fetchRaffleList = async (): Promise<Raffle[]> => {
    const res = await apiClient.get<Raffle[]>("/r/list/")
    return res.data
}

export const buyRaffleTickets = async (
    raffleId: number,
    quantity: number
): Promise<{ raffle: Raffle; updated_coin_balance: number }> => {
    const res = await apiClient.post<{ raffle: Raffle; updated_coin_balance: number }>(
        "/r/buy/",
        { raffle_id: raffleId, quantity }
    )
    return res.data
}

export const fetchRaffleParticipants = async (
    raffleId: number,
    cursor?: string | null
): Promise<{ participants: { user_id: string; user_name: string; tickets: number }[]; next_cursor: string | null }> => {
    const params: Record<string, string> = { raffle_id: String(raffleId) }
    if (cursor) params.cursor = cursor
    const res = await apiClient.get("/r/participants/", { params })
    return res.data
}

export const fetchRaffleWinners = async (
    raffleId: number
): Promise<{ winners: { user_id: string; user_name: string; reward: string }[] }> => {
    const res = await apiClient.get(`/r/${raffleId}/winners/`)
    return res.data
}
