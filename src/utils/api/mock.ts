// Mock data helpers for APIs that aren't implemented yet

import { GameStats } from "../types"

export const getMockGameStats = (): GameStats => {
    return {
        total_users: 1000,
        total_crops_planted: 5000,
        total_crops_harvested: 3000,
        total_coins_earned: 100000,
        crop_info: {},
        land_prices: {},
        level_requirements: {},
        raffle_live: null,
    } as GameStats
}
