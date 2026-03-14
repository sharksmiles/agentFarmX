import { CropTypes, LandIdTypes, FarmStats, GameTask, Raffle, RenaissanceTask, GameStats } from "../types"

// ─── User & Farm ────────────────────────────────────────────────────────────

const mockFarmStats: FarmStats = {
    inventory: [
        { crop_type: "Wheat", quantity: 5 },
        { crop_type: "Corn", quantity: 3 },
        { crop_type: "Carrot", quantity: 10 },
        { crop_type: "Potato", quantity: 8 },
        { crop_type: "Tomato", quantity: 4 },
        { crop_type: "Strawberry", quantity: 2 },
    ],
    growing_crops: [
        // Land 1 - mature Wheat
        {
            land_id: 1 as LandIdTypes, land_owned: true, land_can_buy: false, is_planted: true, coin_balance: 3200,
            crop_details: {
                crop_id: "crop_001", crop_type: "Wheat" as CropTypes, maturing_time: 60, growth_time_hours: 1,
                planted_time: new Date(Date.now() - 3700000).toISOString(),
                last_watered_time: new Date(Date.now() - 1800000).toISOString(),
                next_watering_due: new Date(Date.now() - 600000).toISOString(),
                is_mature: true, status: "growing",
            },
        },
        // Land 2 - growing Corn, needs water
        {
            land_id: 2 as LandIdTypes, land_owned: true, land_can_buy: false, is_planted: true, coin_balance: 3200,
            crop_details: {
                crop_id: "crop_002", crop_type: "Corn" as CropTypes, maturing_time: 120, growth_time_hours: 2,
                planted_time: new Date(Date.now() - 5400000).toISOString(),
                last_watered_time: new Date(Date.now() - 7200000).toISOString(),
                next_watering_due: new Date(Date.now() - 1800000).toISOString(),
                is_mature: false, status: "growing",
            },
        },
        // Land 3 - growing Carrot, watered OK
        {
            land_id: 3 as LandIdTypes, land_owned: true, land_can_buy: false, is_planted: true, coin_balance: 3200,
            crop_details: {
                crop_id: "crop_003", crop_type: "Carrot" as CropTypes, maturing_time: 90, growth_time_hours: 1.5,
                planted_time: new Date(Date.now() - 2700000).toISOString(),
                last_watered_time: new Date(Date.now() - 900000).toISOString(),
                next_watering_due: new Date(Date.now() + 2700000).toISOString(),
                is_mature: false, status: "growing",
            },
        },
        // Land 4 - empty owned
        { land_id: 4 as LandIdTypes, land_owned: true, land_can_buy: false, is_planted: false, coin_balance: 3200, crop_details: {} },
        // Land 5 - empty owned
        { land_id: 5 as LandIdTypes, land_owned: true, land_can_buy: false, is_planted: false, coin_balance: 3200, crop_details: {} },
        // Land 6 - stolen
        {
            land_id: 6 as LandIdTypes, land_owned: true, land_can_buy: false, is_planted: true, coin_balance: 3200,
            crop_details: {
                crop_id: "crop_006", crop_type: "Tomato" as CropTypes, maturing_time: 150, growth_time_hours: 2.5,
                planted_time: new Date(Date.now() - 3600000).toISOString(),
                last_watered_time: new Date(Date.now() - 1800000).toISOString(),
                next_watering_due: new Date(Date.now() + 3600000).toISOString(),
                is_mature: false, status: "Stolen",
            },
        },
        // Land 7 - buyable
        { land_id: 7 as LandIdTypes, land_owned: false, land_can_buy: true, is_planted: false, coin_balance: 3200, crop_details: {} },
        // Land 8 - not buyable yet
        { land_id: 8 as LandIdTypes, land_owned: false, land_can_buy: false, is_planted: false, coin_balance: 3200, crop_details: {} },
        // Land 9 - not buyable yet
        { land_id: 9 as LandIdTypes, land_owned: false, land_can_buy: false, is_planted: false, coin_balance: 3200, crop_details: {} },
    ],
    level: 5,
    level_exp: 72,
    coin_balance: 3200,
    boost_left: 2,
    energy_left: 35,
    max_energy: 50,
    next_restore_time: new Date(Date.now() + 300000).toISOString(),
}

export const MOCK_USER = {
    id: "user_12345",
    username: "CryptoFarmer",
    wallet_address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
    wallet_address_type: "artela",
    wallet_provider: "metamask",
    invite_link: "https://AgentFarmX.ai/invite/user_12345",
    ens_name: "farmer.eth",
    is_active: true,
    is_new_user: false,
    lang: "en",
    farm_stats: mockFarmStats,
}

// ─── Game Stats (crop catalog + land/level tables) ───────────────────────────

export const MOCK_GAME_STATS: GameStats = {
    crop_info: [
        { name: "Wheat",       unlock_level: 1,  seed_price: 10,   mature_time: 60,   watering_period: 30,  harvest_price: 20,   seeding_exp: 5,   harvest_exp: 10  },
        { name: "Corn",        unlock_level: 2,  seed_price: 20,   mature_time: 120,  watering_period: 60,  harvest_price: 45,   seeding_exp: 10,  harvest_exp: 20  },
        { name: "Potato",      unlock_level: 3,  seed_price: 30,   mature_time: 90,   watering_period: 45,  harvest_price: 60,   seeding_exp: 12,  harvest_exp: 22  },
        { name: "Tomato",      unlock_level: 4,  seed_price: 50,   mature_time: 150,  watering_period: 75,  harvest_price: 100,  seeding_exp: 20,  harvest_exp: 35  },
        { name: "Carrot",      unlock_level: 2,  seed_price: 25,   mature_time: 90,   watering_period: 45,  harvest_price: 55,   seeding_exp: 10,  harvest_exp: 20  },
        { name: "Cucumber",    unlock_level: 5,  seed_price: 60,   mature_time: 180,  watering_period: 90,  harvest_price: 120,  seeding_exp: 22,  harvest_exp: 40  },
        { name: "Celery",      unlock_level: 6,  seed_price: 70,   mature_time: 210,  watering_period: 105, harvest_price: 140,  seeding_exp: 24,  harvest_exp: 44  },
        { name: "Garlic",      unlock_level: 7,  seed_price: 80,   mature_time: 240,  watering_period: 120, harvest_price: 160,  seeding_exp: 26,  harvest_exp: 48  },
        { name: "Cabbage",     unlock_level: 8,  seed_price: 90,   mature_time: 270,  watering_period: 135, harvest_price: 180,  seeding_exp: 28,  harvest_exp: 52  },
        { name: "Apple",       unlock_level: 9,  seed_price: 100,  mature_time: 300,  watering_period: 150, harvest_price: 200,  seeding_exp: 30,  harvest_exp: 56  },
        { name: "Banana",      unlock_level: 10, seed_price: 120,  mature_time: 360,  watering_period: 180, harvest_price: 240,  seeding_exp: 35,  harvest_exp: 65  },
        { name: "Pear",        unlock_level: 11, seed_price: 140,  mature_time: 420,  watering_period: 210, harvest_price: 280,  seeding_exp: 40,  harvest_exp: 70  },
        { name: "Lemon",       unlock_level: 12, seed_price: 160,  mature_time: 480,  watering_period: 240, harvest_price: 320,  seeding_exp: 45,  harvest_exp: 80  },
        { name: "Pumpkin",     unlock_level: 13, seed_price: 180,  mature_time: 540,  watering_period: 270, harvest_price: 360,  seeding_exp: 50,  harvest_exp: 90  },
        { name: "Strawberry",  unlock_level: 14, seed_price: 200,  mature_time: 600,  watering_period: 300, harvest_price: 400,  seeding_exp: 55,  harvest_exp: 100 },
        { name: "Pineapple",   unlock_level: 15, seed_price: 240,  mature_time: 720,  watering_period: 360, harvest_price: 480,  seeding_exp: 60,  harvest_exp: 110 },
        { name: "Peach",       unlock_level: 16, seed_price: 280,  mature_time: 840,  watering_period: 420, harvest_price: 560,  seeding_exp: 65,  harvest_exp: 120 },
        { name: "Watermelon",  unlock_level: 17, seed_price: 320,  mature_time: 960,  watering_period: 480, harvest_price: 640,  seeding_exp: 70,  harvest_exp: 130 },
        { name: "Cherry",      unlock_level: 18, seed_price: 360,  mature_time: 1080, watering_period: 540, harvest_price: 720,  seeding_exp: 75,  harvest_exp: 140 },
        { name: "Grapes",      unlock_level: 19, seed_price: 400,  mature_time: 1200, watering_period: 600, harvest_price: 800,  seeding_exp: 80,  harvest_exp: 150 },
        { name: "Kiwi",        unlock_level: 20, seed_price: 450,  mature_time: 1440, watering_period: 720, harvest_price: 900,  seeding_exp: 90,  harvest_exp: 160 },
        { name: "Eggplant",    unlock_level: 22, seed_price: 500,  mature_time: 1680, watering_period: 840, harvest_price: 1000, seeding_exp: 100, harvest_exp: 180 },
        { name: "Chilli",      unlock_level: 24, seed_price: 600,  mature_time: 1920, watering_period: 960, harvest_price: 1200, seeding_exp: 110, harvest_exp: 200 },
        { name: "Sugarcane",   unlock_level: 26, seed_price: 800,  mature_time: 2400, watering_period: 1200,harvest_price: 1600, seeding_exp: 130, harvest_exp: 240 },
    ],
    land_prices: { 1: 0, 2: 0, 3: 0, 4: 100, 5: 200, 6: 500, 7: 1000, 8: 2000, 9: 5000 },
    level_requirements: Object.fromEntries(
        Array.from({ length: 40 }, (_, i) => {
            const lv = i + 1
            return [lv, {
                "Require Experience": lv === 1 ? 0 : lv * 100,
                "Max Land": Math.min(3 + Math.floor(lv / 3), 9),
                "Upgrade Cost": lv === 1 ? 0 : lv * 200,
            }]
        })
    ),
    raffle_live: 2,
}

// ─── Agents ──────────────────────────────────────────────────────────────────

export const MOCK_AGENTS = [
    {
        id: "agent_001",
        owner_address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        name: "WheatBot",
        type: "farmer",
        status: "running",
        sca_address: "0xSCA001aabbccdd",
        balance_okb: 0.52,
        balance_usdc: 18.4,
        config: {
            preferred_crops: ["Wheat", "Corn"],
            auto_harvest: true,
            auto_replant: true,
            max_daily_gas_okb: 0.05,
            max_daily_spend_usdc: 10,
            emergency_stop_balance: 1,
        },
        stats: {
            total_actions: 342,
            total_earned_coin: 12850,
            total_spent_gas: 0.28,
            total_spent_usdc: 45.2,
            steal_success_count: 0,
            steal_fail_count: 0,
            win_rate: 98,
            ranking: 47,
        },
        created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
        last_active_at: new Date(Date.now() - 120000).toISOString(),
        logs: [
            { id: "log_001", agent_id: "agent_001", action: "harvest", status: "success", detail: "Harvested Wheat from Land 1 · +240 COIN", coin_delta: 240, gas_cost: 0.0003, tx_hash: "0xabc1", timestamp: new Date(Date.now() - 120000).toISOString() },
            { id: "log_002", agent_id: "agent_001", action: "water",   status: "success", detail: "Watered Corn on Land 2",                  gas_cost: 0.0001, tx_hash: "0xabc2", timestamp: new Date(Date.now() - 900000).toISOString() },
            { id: "log_003", agent_id: "agent_001", action: "plant",   status: "success", detail: "Planted Wheat on Land 1",                  gas_cost: 0.0002, tx_hash: "0xabc3", timestamp: new Date(Date.now() - 1800000).toISOString() },
            { id: "log_004", agent_id: "agent_001", action: "market_check", status: "success", detail: "Checked market prices · Wheat +3.2%", gas_cost: 0.0001, tx_hash: "0xabc4", timestamp: new Date(Date.now() - 3600000).toISOString() },
            { id: "log_005", agent_id: "agent_001", action: "harvest", status: "failed",  detail: "Failed to harvest Corn �?already harvested", gas_cost: 0.0001, tx_hash: "0xabc5", timestamp: new Date(Date.now() - 7200000).toISOString() },
        ],
    },
    {
        id: "agent_002",
        owner_address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        name: "ShadowRaider",
        type: "raider",
        status: "paused",
        sca_address: "0xSCA002aabbccdd",
        balance_okb: 0.18,
        balance_usdc: 5.1,
        config: {
            radar_level: 2,
            max_daily_steals: 5,
            max_daily_gas_okb: 0.1,
            max_daily_spend_usdc: 5,
            emergency_stop_balance: 0.5,
        },
        stats: {
            total_actions: 89,
            total_earned_coin: 4200,
            total_spent_gas: 0.15,
            total_spent_usdc: 12.8,
            steal_success_count: 31,
            steal_fail_count: 14,
            win_rate: 68,
            ranking: 134,
        },
        created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
        last_active_at: new Date(Date.now() - 3600000).toISOString(),
        logs: [
            { id: "log_101", agent_id: "agent_002", action: "steal",       status: "success", detail: "Stole Tomato from Alice's farm · +320 COIN", coin_delta: 320, gas_cost: 0.0005, tx_hash: "0xdef1", timestamp: new Date(Date.now() - 3600000).toISOString() },
            { id: "log_102", agent_id: "agent_002", action: "radar_scan",  status: "success", detail: "Radar scan complete · 3 targets found",       gas_cost: 0.0002, tx_hash: "0xdef2", timestamp: new Date(Date.now() - 7200000).toISOString() },
            { id: "log_103", agent_id: "agent_002", action: "checksteal",  status: "pending", detail: "Evaluating steal success rate...",             gas_cost: 0.0001,                    timestamp: new Date(Date.now() - 7500000).toISOString() },
        ],
    },
    {
        id: "agent_003",
        owner_address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
        name: "ArbitrageBot",
        type: "trader",
        status: "out_of_funds",
        sca_address: "0xSCA003aabbccdd",
        balance_okb: 0.002,
        balance_usdc: 0.3,
        config: {
            swap_trigger_profit_rate: 15,
            max_single_swap_usdc: 5,
            max_daily_gas_okb: 0.05,
            max_daily_spend_usdc: 20,
            emergency_stop_balance: 1,
        },
        stats: {
            total_actions: 220,
            total_earned_coin: 8700,
            total_spent_gas: 0.41,
            total_spent_usdc: 88.5,
            steal_success_count: 0,
            steal_fail_count: 0,
            win_rate: 84,
            ranking: 92,
        },
        created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
        last_active_at: new Date(Date.now() - 86400000).toISOString(),
        logs: [
            { id: "log_201", agent_id: "agent_003", action: "swap",         status: "success", detail: "Swapped 5 USDC �?OKB at profit 17.3%", coin_delta: 850, gas_cost: 0.001, tx_hash: "0xghi1", timestamp: new Date(Date.now() - 86400000).toISOString() },
            { id: "log_202", agent_id: "agent_003", action: "market_check", status: "success", detail: "Market check complete · OKB +2.1%",     gas_cost: 0.0001,                   timestamp: new Date(Date.now() - 90000000).toISOString() },
        ],
    },
]

// ─── Friends ─────────────────────────────────────────────────────────────────

export const MOCK_FRIEND_FARM_STATS = (level: number, coinBalance: number): FarmStats => ({
    inventory: [{ crop_type: "Wheat", quantity: 3 }],
    growing_crops: Array(9).fill(null).map((_, i) => ({
        land_id: (i + 1) as LandIdTypes,
        land_owned: i < Math.min(3 + Math.floor(level / 3), 9),
        land_can_buy: false,
        is_planted: i < 3,
        coin_balance: coinBalance,
        crop_details: i < 3 ? {
            crop_id: `fc_${i}`, crop_type: (["Wheat","Corn","Tomato"] as CropTypes[])[i],
            maturing_time: 60, growth_time_hours: 1,
            planted_time: new Date(Date.now() - 3600000 * (i + 1)).toISOString(),
            last_watered_time: new Date(Date.now() - 1800000 * (i + 1)).toISOString(),
            next_watering_due: i === 1 ? new Date(Date.now() - 600000).toISOString() : new Date(Date.now() + 3600000).toISOString(),
            is_mature: i === 0, status: "growing",
        } : {},
    })),
    level, level_exp: 50, coin_balance: coinBalance,
    boost_left: 3, energy_left: 40, max_energy: 50,
    next_restore_time: new Date(Date.now() + 300000).toISOString(),
})

export const MOCK_FRIENDS = [
    { id: "friend_1", user_name: "AliceGrower",   user_game_level: 12, user_coin_balance: 8400,  is_online: true,  need_water: 2, need_harvest: 5, last_login: new Date().toISOString(), if_friend_status: "friend", capila_owner: true,  farm_stats: MOCK_FRIEND_FARM_STATS(12, 8400) },
    { id: "friend_2", user_name: "BobTheFarmer",  user_game_level: 7,  user_coin_balance: 2100,  is_online: false, need_water: 0, need_harvest: 0, last_login: new Date(Date.now() - 7200000).toISOString(), if_friend_status: "friend", capila_owner: false, farm_stats: MOCK_FRIEND_FARM_STATS(7, 2100) },
    { id: "friend_3", user_name: "CharlieXYZ",    user_game_level: 18, user_coin_balance: 15600, is_online: true,  need_water: 3, need_harvest: 8, last_login: new Date().toISOString(), if_friend_status: "friend", capila_owner: true,  farm_stats: MOCK_FRIEND_FARM_STATS(18, 15600) },
    { id: "friend_4", user_name: "Diana_Web3",    user_game_level: 4,  user_coin_balance: 600,   is_online: false, need_water: 1, need_harvest: 0, last_login: new Date(Date.now() - 86400000).toISOString(), if_friend_status: "friend", capila_owner: false, farm_stats: MOCK_FRIEND_FARM_STATS(4, 600) },
]

export const MOCK_FRIEND_REQUESTS = [
    { id: "req_1", user_id: "stranger_1", user_name: "Eve_Farmer",  user_game_level: 9,  user_coin_balance: 3200 },
    { id: "req_2", user_id: "stranger_2", user_name: "Frank_Grow",  user_game_level: 15, user_coin_balance: 9800 },
]

export const MOCK_SEARCH_RESULTS = [
    { id: "search_1", user_name: "Grace_Farm",  user_game_level: 6,  user_coin_balance: 1800, if_friend_status: "not_friend" },
    { id: "search_2", user_name: "Henry_Crops", user_game_level: 11, user_coin_balance: 6200, if_friend_status: "request_sent" },
    { id: "search_3", user_name: "Ivy_Harvest", user_game_level: 20, user_coin_balance: 22000, if_friend_status: "friend" },
]

export const MOCK_STEAL_CONFIRMATION = {
    success_rate_details: {
        base_success_rate: "20",
        online: "-5",
        crop_level_diff: "+3",
        level_diff: "+2",
        invite_diff: "+1",
        friendship_diff: "+2",
        recidivist: "0",
        new_farmer: "0",
        final_success_rate: 23,
    },
    stealing_earning: "320",
    stealing_exp: "45",
    stealing_cost: "100",
    stealing_crop_name: "Tomato",
    crop_id: "fc_0",
}

// ─── Earn / Tasks ─────────────────────────────────────────────────────────────

export const MOCK_DAILY_REWARD = {
    daily_reward: [100, 200, 300, 500, 800, 1200, 2000],
    claimable: 1,
    game_reward: 500,
    completed: 0,
    total_days_checked_in: 3,
    can_check_in_today: true,
    data: [] as GameTask[],
}

export const MOCK_TASKS: GameTask[] = [
    { id: 1,  title: "Join our Twitter",         content: "Follow @AgentFarmXAI on Twitter",              reward: 500,   url: "https://twitter.com/AgentFarmX", click: false, completed: false, claimed: false },
    { id: 2,  title: "Join Telegram Channel",    content: "Join the official AgentFarmX Telegram channel", reward: 300,   url: "https://t.me/AgentFarmX",         click: false, completed: true,  claimed: false },
    { id: 3,  title: "Refer 1 Friend",           content: "Invite a friend to AgentFarmX",                reward: 1000,  click: false, completed: false, claimed: false },
    { id: 4,  title: "Harvest 5 Crops",          content: "Harvest at least 5 crops from your farm",    reward: 800,   click: false, completed: true,  claimed: true  },
    { id: 6,  title: "Plant 3 Premium Crops",    content: "Plant Strawberry, Pineapple or above",       reward: 1500,  click: false, completed: false, claimed: false },
    { id: 7,  title: "Reach Level 5",            content: "Upgrade your farm to level 5",               reward: 2000,  click: false, completed: true,  claimed: true  },
    { id: 8,  title: "Buy 6 Land Plots",         content: "Unlock and purchase 6 land plots",           reward: 3000,  click: false, completed: false, claimed: false },
    { id: 9,  title: "Deploy an AI Agent",       content: "Create and activate your first AI Agent",    reward: 5000,  click: false, completed: false, claimed: false },
]

export const MOCK_RENAISSANCE_TASKS: RenaissanceTask[] = [
    { task_id: "rt_1", completed: 1, claimable: 0, url: "https://twitter.com/AgentFarmX", Context: "Follow AgentFarmX on Twitter to earn rewards.", logoUrl: "/icon/twitter.png", name: "Twitter Follow", reward: 100, stone: 1, crystal: 0 },
    { task_id: "rt_2", completed: 0, claimable: 1, url: "https://t.me/AgentFarmX",        Context: "Join AgentFarmX Telegram group.",                  logoUrl: "/icon/telegram.png", name: "Telegram Join", reward: 200, stone: 0, crystal: 1 },
]

// ─── Raffle ───────────────────────────────────────────────────────────────────

export const MOCK_RAFFLES: Raffle[] = [
    {
        id: 1, name: "X Layer Genesis Raffle", description: "Win OKB rewards from the X Layer genesis event!",
        requirement_level: 3, requirement_invite: 1, ticket_price: 100, max_tickets_per_user: 10,
        main_color: "#5964F5", description_text_color: "#FFFFFF", title_background_color: "#343A8F",
        reward_type: "OKB", reward_detail: "5 OKB", total_winners: 3, reward_quantity: 5,
        in_game_reward: false, total_user_tickets: 3,
        start_time: new Date(Date.now() - 86400000).toISOString(),
        end_time: new Date(Date.now() + 3 * 86400000).toISOString(),
        is_winner: false, participated: true, ticket_count: 3,
        is_twitter_task: true, twitter_link: "https://twitter.com/AgentFarmX",
        drawed: false, ended: false, total_tickets: 180, total_participants: 62,
    },
    {
        id: 2, name: "Weekly FARM Airdrop", description: "Top farmers this week win $FARM tokens!",
        requirement_level: 5, requirement_invite: 2, ticket_price: 200, max_tickets_per_user: 5,
        main_color: "#FBB602", description_text_color: "#1A1F25", title_background_color: "#E8A500",
        reward_type: "FARM", reward_detail: "1000 $FARM", total_winners: 5, reward_quantity: 1000,
        in_game_reward: true, total_user_tickets: 0,
        start_time: new Date(Date.now() - 3 * 86400000).toISOString(),
        end_time: new Date(Date.now() + 4 * 86400000).toISOString(),
        is_winner: false, participated: false, ticket_count: 0,
        is_twitter_task: false, twitter_link: "",
        drawed: false, ended: false, total_tickets: 240, total_participants: 85,
    },
    {
        id: 3, name: "Agent Pioneer Raffle", description: "Early AI Agent deployers win exclusive NFT skins!",
        requirement_level: 8, requirement_invite: 3, ticket_price: 500, max_tickets_per_user: 3,
        main_color: "#33C14A", description_text_color: "#FFFFFF", title_background_color: "#228B38",
        reward_type: "NFT", reward_detail: "Exclusive Agent Skin", total_winners: 1, reward_quantity: 1,
        in_game_reward: false, total_user_tickets: 1,
        start_time: new Date(Date.now() - 7 * 86400000).toISOString(),
        end_time: new Date(Date.now() - 86400000).toISOString(),
        is_winner: true, participated: true, ticket_count: 1,
        is_twitter_task: false, twitter_link: "",
        drawed: true, ended: true, total_tickets: 95, total_participants: 40,
    },
]

// ─── Activity Record ──────────────────────────────────────────────────────────

export const MOCK_RECORDS = [
    { id: "r1", action: "watered",          user_name: "AliceGrower",   user_id: "friend_1", crop_name: "Wheat",  crop_type: "Wheat",  user_earning: 50,  timestamp: new Date(Date.now() - 300000).toISOString(),   is_online: true  },
    { id: "r2", action: "stole",            user_name: "BobTheFarmer",  user_id: "friend_2", crop_name: "Corn",   crop_type: "Corn",   user_earning: 0,   timestamp: new Date(Date.now() - 1800000).toISOString(),  is_online: false },
    { id: "r3", action: "failed stealing",  user_name: "CharlieXYZ",    user_id: "friend_3", crop_name: "Carrot", crop_type: "Carrot", user_earning: 0,   timestamp: new Date(Date.now() - 3600000).toISOString(),  is_online: true  },
    { id: "r4", action: "watered",          user_name: "Diana_Web3",    user_id: "friend_4", crop_name: "Tomato", crop_type: "Tomato", user_earning: 80,  timestamp: new Date(Date.now() - 86400000).toISOString(), is_online: false },
    { id: "r5", action: "stole",            user_name: "Eve_Farmer",    user_id: "stranger_1", crop_name: "Wheat", crop_type: "Wheat", user_earning: 0,  timestamp: new Date(Date.now() - 172800000).toISOString(),is_online: false },
]

// ─── Leaderboard ─────────────────────────────────────────────────────────────

export const MOCK_LEADERBOARD = {
    my_rank: 4,
    results: [
        { rank: 1, user_id: "u1",          name: "TopFarmer",      total_invites: 156, reward: "500 OKB"  },
        { rank: 2, user_id: "u2",          name: "CryptoGrower",   total_invites: 128, reward: "200 OKB"  },
        { rank: 3, user_id: "u3",          name: "GreenThumb99",   total_invites: 104, reward: "100 OKB"  },
        { rank: 4, user_id: "user_12345",  name: "CryptoFarmer",   total_invites: 52,  reward: "50 OKB"   },
        { rank: 5, user_id: "u5",          name: "SeedMaster",     total_invites: 48,  reward: "20 OKB"   },
        { rank: 6, user_id: "u6",          name: "HarvestKing",    total_invites: 39,  reward: "10 OKB"   },
        { rank: 7, user_id: "u7",          name: "FarmHero",       total_invites: 31,  reward: "5 OKB"    },
        { rank: 8, user_id: "u8",          name: "GoldCrop",       total_invites: 25,  reward: "5 OKB"    },
    ],
    next: null,
}

// ─── Invites ──────────────────────────────────────────────────────────────────

export const MOCK_INVITES = [
    { id: "inv_1", user_name: "Bob_Invited",  user_game_level: 7,  user_coin_balance: 2100 },
    { id: "inv_2", user_name: "Carol_Player", user_game_level: 12, user_coin_balance: 7600 },
    { id: "inv_3", user_name: "Dave_Grower",  user_game_level: 3,  user_coin_balance: 480  },
]

// ─── Airdrop ──────────────────────────────────────────────────────────────────

export const MOCK_AIRDROP = {
    airdrops: [
        { eligible: true, airdrop_amount: 12500, remarks: ["Early Adopter", "Top Farmer", "Agent Pioneer"] },
    ],
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export const MOCK_FRIEND_INFO = {
    new_friend_requests_count: 2,
    friend_total: 4,
}

// Legacy alias kept for any existing imports
export const MOCK_GAME_STATS_EXTRA = MOCK_GAME_STATS
