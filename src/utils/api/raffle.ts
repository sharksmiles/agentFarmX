import apiClient from "./client"
import { Raffle } from "../types"

export const fetchRaffleList = async (): Promise<Raffle[]> => {
    // TODO: Update to use new API
    const res = await apiClient.get<Raffle[]>("/g/raffle/")
    return res.data
}

// New API: Get active raffles
export const fetchRaffles = async () => {
    const res = await apiClient.get('/api/raffle')
    return res.data.raffles
}

export const buyRaffleTickets = async (
    raffleId: number,
    ticket_count: number
): Promise<{ raffle: Raffle; updated_coin_balance: number }> => {
    // TODO: Update to use new API
    const res = await apiClient.post<{ raffle: Raffle; updated_coin_balance: number }>(
        "/g/raffle/",
        { raffle_id: raffleId, ticket_count }
    )
    return res.data
}

// New API: Enter raffle
export const enterRaffle = async (raffleId: string, userId: string, ticketCount = 1) => {
    const res = await apiClient.post(`/api/raffle/${raffleId}/enter`, { userId, ticketCount })
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
    // TODO: Update to use new API
    const res = await apiClient.get(`/g/raffle/${raffleId}/winners/`)
    return res.data
}

// New API: Get raffle winners
export const getRaffleWinners = async (raffleId: string) => {
    const res = await apiClient.get(`/api/raffle/${raffleId}/winners`)
    return res.data.winners
}
