import apiClient from "./client"
import { Raffle } from "../types"

export const fetchRaffleList = async (): Promise<Raffle[]> => {
    const res = await apiClient.get<{ raffles: any[] }>("/api/raffle")
    // Map backend response to Raffle interface
    return res.data.raffles.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        requirement_level: 1,
        requirement_invite: 0,
        ticket_price: r.ticketPrice || 10,
        max_tickets_per_user: r.maxTickets || 100,
        main_color: "#FFD700", // Default gold
        description_text_color: "#FFFFFF",
        title_background_color: "#000000",
        reward_type: "coin",
        reward_detail: r.prizes?.join(", ") || "Coins",
        total_winners: r.prizes?.length || 3,
        reward_quantity: r.prizes?.[0] || 0,
        in_game_reward: true,
        total_user_tickets: r.participan,
        start_time: new Date().toISOString(),
        end_time: r.endDate,
        is_winner: false,
        participated: r.participants > 0,
        ticket_count: r.participants || 0,
        is_twitter_task: false,
        twitter_link: "",
        drawed: r.status === 'ended',
        ended: r.status === 'ended' || new Date(r.endDate) < new Date(),
    })) as Raffle[]
}

export const buyRaffleTickets = async (
    raffleId: number,
    ticket_count: number
): Promise<{ raffle: Raffle; updated_coin_balance: number }> => {
    const user = await import("./auth").then(m => m.fetchMe());
    if (!user) throw new Error("User not found");

    const res = await apiClient.post<any>(
        `/api/raffle/${raffleId}/enter`,
        { userId: user.id, ticketCount: ticket_count }
    )
    
    // Fetch updated raffle list to get the single raffle status (mocking mapping for now)
    const raffleList = await fetchRaffleList();
    const updatedRaffle = raffleList.find(r => r.id === raffleId);

    return { 
        raffle: updatedRaffle!, 
        updated_coin_balance: res.data.user.farmCoins 
    }
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
    const res = await apiClient.get<{ winners: any[] }>(`/api/raffle/${raffleId}/winners`)
    return {
        winners: res.data.winners.map(w => ({
            user_id: w.user?.id || w.userId,
            user_name: w.user?.username || 'Unknown',
            reward: w.prizeAmount || 'Coins'
        }))
    }
}
