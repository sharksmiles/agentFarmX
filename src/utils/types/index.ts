export type User = {
    id: string
    td: string
    wallet_address_type: string
    invite_link: string
    username: string
    is_active: boolean
    lang: string
    farm_stats: FarmStats
}

export type Wallet = {
    address: string
    hasPrivateKey: boolean
    hasMnemonic: boolean
}

export type WalletBlance = {
    coin: number
    art: number
}

// Define the type for various crop names
export type CropTypes =
    | "Wheat"
    | "Corn"
    | "Potato"
    | "Tomato"
    | "Carrot"
    | "Cucumber"
    | "Celery"
    | "Garlic"
    | "Cabbage"
    | "Apple"
    | "Banana"
    | "Pear"
    | "Lemon"
    | "Pumpkin"
    | "Strawberry"
    | "Pineapple"
    | "Peach"
    | "Watermelon"
    | "Cherry"
    | "Grapes"
    | "Kiwi"
    | "Eggplant"
    | "Chilli"
    | "Sugarcane"

export enum LandIdTypes {
    Land1 = 1,
    Land2,
    Land3,
    Land4,
    Land5,
    Land6,
    Land7,
    Land8,
    Land9,
}

// Type for an individual crop item in inventory
export type CropItem = {
    crop_type: CropTypes
    quantity: number
}

// Type for detailing growing crop information
export type GrowingCrop = {
    coin_balance: number
    land_id: LandIdTypes
    land_owned: boolean
    land_can_buy: boolean
    is_planted: boolean
    crop_details: {
        crop_id?: string
        crop_type?: CropTypes
        maturing_time?: number
        growth_time_hours?: number
        planted_time?: string
        last_watered_time?: string
        next_watering_due?: string
        is_mature?: boolean
        status?: string
    }
}

// Type to encapsulate the overall farm status, including both inventory and growing crops
export type FarmStats = {
    inventory: CropItem[]
    growing_crops: GrowingCrop[]
    level: number
    level_exp: number
    coin_balance: number
    boost_left: number
    energy_left?: number
    max_energy?: number
    next_restore_time?: string | null
}

export type FriendStats = {
    id: string
    user_name: string
    if_friend_status: "friend" | "request_sent" | "request_received" | "not_friend"
    farm_stats: FarmStats
}

export type ActionTypes =
    | "plant"
    | "harvest"
    | "water"
    | "upgrade"
    | "shop"
    | "buyland"
    | "boost"
    | "checksteal"
    | "steal"

type Crop = {
    name: string
    unlock_level: number
    seed_price: number
    mature_time: number
    watering_period: number
    harvest_price: number
    seeding_exp: number
    harvest_exp: number
}

type CropsStats = Crop[]

export type LandStats = {
    [key: number]: number
}

type LevelRequirement = {
    "Require Experience": number
    "Max Land": number
    "Upgrade Cost": number
}

export type LevelRequirementsStats = {
    [key: number]: LevelRequirement
}

export type GameStats = {
    crop_info: CropsStats
    land_prices: LandStats
    level_requirements: LevelRequirementsStats
    raffle_live: number
}

export interface GasEstimate {
    totalCostInART: string
    finalEstimatedGas: bigint
    gasPriceInWei: bigint
}

export interface SelectedShopState {
    quantities: { [key: string]: number }
    selectedItemsNumber: number
    totalPrice: number
}

export interface TransactionHistory {
    contract_func: string
    action: string
    tx_hash: string
    from_address: string
    amount: number
    timestamp: string
    record: any
}

export interface NotificationTypes {
    notificationTitle: string
    IconSrc?: string
    notificationMessage: string
    progressBars?: number
    progressTimeLeft?: number
    leftHours?: number
    leftMinutes?: number
    needCopy?: boolean
}

export interface FriendPageNotificationTypes {
    id: number
    notificationTitle?: string
    notificationMessage?: string
    reward?: number
    friend_name?: string
    more_reward?: number
    action?: string
}

export type RenaissanceTask = {
    task_id: string
    completed: number // 0 or 1
    claimable: number // 0 or 1
    url: string // check button inside modal
    Context: string // details of the task
    logoUrl: string
    name: string // title
    reward: number
    stone: number // stone reward
    crystal: number // crystal reward
}

export type GameTask = {
    id: number
    title: string
    content: string
    reward: number
    url?: string
    click: boolean
    completed: boolean
    claimed: boolean
    banner?: string
}

export interface Raffle {
    id: number
    name: string
    description: string
    requirement_level: number
    requirement_invite: number
    ticket_price: number
    max_tickets_per_user: number
    main_color: string
    description_text_color: string
    title_background_color: string
    reward_type: string
    reward_seed_type?: string | null
    reward_detail: string
    total_winners: number
    reward_quantity: number
    in_game_reward: boolean
    total_user_tickets: number
    start_time: string
    end_time: string
    is_winner: boolean
    participated: boolean
    ticket_count: number
    is_twitter_task: boolean
    twitter_link: string
    drawed: boolean
    ended: boolean
    total_tickets?: number | null
    total_participants?: number | null
}

export type CapilaTypes = {
    owned: boolean
    token_list: {
        token_id: string
        picture_url: string
    }[]
}

export type StealConfirmationTypes = {
    success_rate_details: {
        base_success_rate: string
        online: string
        crop_level_diff: string
        level_diff: string
        invite_diff: string
        friendship_diff: string
        recidivist: string
        new_farmer: string
        final_success_rate: number
    }
    stealing_earning: string
    stealing_exp: string
    stealing_cost: string
    stealing_crop_name: string
    crop_id: string
}

export type AirDropStatsInfo = {
    airdrops: AirDropStats[]
}

export type AirDropStats = {
    id?: string
    eligible: boolean
    airdrop_amount: number
    remarks: string[]
}

export type currentTabTypes =
    | "Farm"
    | "Friends"
    | "Invite"
    | "Earn"
    | "AirDrop"
    | "AirdropPage"
    | "Wallet"
    | "InvitationLeaderboardPage"
    | "Agents"
    | null
