import apiClient from "./client"
import { Raffle } from "../types"

export const fetchRaffleList = async (): Promise<Raffle[]> => {
    const res = await apiClient.get<Raffle[]>("/g/raffle/")
    return res.data
}

export const buyRaffleTickets = async (
    raffleId: number,
    ticket_count: number
): Promise<{ raffle: Raffle; updated_coin_balance: number }> => {
    const res = await apiClient.post<{ raffle: Raffle; updated_coin_balance: number }>(
        "/g/raffle/",
        { raffle_id: raffleId, ticket_count }
    )
    return res.data
}

export const fetchRaffleParticipants = async (
    raffleId: number,
    cursor?: string | null
): Promise<{ participants: { user_id: string; user_name: string; tickets: number }[]; next_cursor: string | null }> => {
    const params: Record<string, string> = {}
    if (cursor) params.cursor = cursor
    const res = await apiClient.get(`/g/raffle/${raffleId}/participants/`, { params })
    return res.data
}

export const fetchRaffleWinners = async (
    raffleId: number
): Promise<{ winners: { user_id: string; user_name: string; reward: string }[] }> => {
    const res = await apiClient.get(`/g/raffle/${raffleId}/winners/`)
    return res.data
}
