import apiClient from "./client"

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AgentLog {
    id: string
    action: string
    status: "success" | "failed" | "pending"
    detail: string
    timestamp: string
    gas_cost?: number
    coin_delta?: number
    tx_hash?: string
}

export interface AgentStats {
    total_actions: number
    total_earned_coin: number
    total_spent_gas: number
    total_spent_usdc: number
    win_rate: number
    ranking: number
    steal_success_count: number
    steal_fail_count: number
}

export interface AgentConfig {
    preferred_crops?: string[]
    auto_harvest?: boolean
    auto_replant?: boolean
    profit_rate?: number
    max_swap?: number
    radar_level?: 1 | 2 | 3
    max_steals?: number
    early_harvest?: number
    max_daily_gas?: number
    max_daily_usdc?: number
    stop_balance?: number
}

export interface Agent {
    id: string
    name: string
    type: "farmer" | "trader" | "raider" | "defender"
    status: "running" | "idle" | "paused" | "error" | "out_of_funds"
    balance_okb: number
    balance_usdc: number
    sca_address: string
    stats: AgentStats
    config: AgentConfig
    logs: AgentLog[]
    last_active_at: string
    created_at: string
}

// ── Agent CRUD ────────────────────────────────────────────────────────────────
export const fetchAgents = async (): Promise<Agent[]> => {
    const res = await apiClient.get<Agent[]>("/api/agents/")
    return res.data
}

export const fetchAgentDetail = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.get<Agent>(`/api/agents/${agentId}/`)
    return res.data
}

export interface CreateAgentPayload {
    name: string
    type: string
    config: AgentConfig
    initial_okb: number
    initial_usdc: number
}

export const createAgent = async (payload: CreateAgentPayload): Promise<Agent> => {
    const res = await apiClient.post<Agent>("/api/agents/", payload)
    return res.data
}

export const updateAgentConfig = async (
    agentId: string,
    config: Partial<AgentConfig>
): Promise<Agent> => {
    const res = await apiClient.patch<Agent>(`/api/agents/${agentId}/config/`, config)
    return res.data
}

// ── Agent control ─────────────────────────────────────────────────────────────
export const startAgent = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.post<Agent>(`/api/agents/${agentId}/control/`, { action: "start" })
    return res.data
}

export const pauseAgent = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.post<Agent>(`/api/agents/${agentId}/control/`, { action: "pause" })
    return res.data
}

export const stopAgent = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.post<Agent>(`/api/agents/${agentId}/control/`, { action: "stop" })
    return res.data
}

// ── Agent logs ────────────────────────────────────────────────────────────────
export interface AgentLogsResponse {
    logs: AgentLog[]
    next_cursor: string | null
}

export const fetchAgentLogs = async (
    agentId: string,
    filter?: "all" | "success" | "failed" | "pending",
    cursor?: string | null
): Promise<AgentLogsResponse> => {
    const params: Record<string, string> = {}
    if (filter && filter !== "all") params.filter = filter
    if (cursor) params.cursor = cursor
    const res = await apiClient.get<AgentLogsResponse>(`/api/agents/${agentId}/logs/`, { params })
    return res.data
}

// ── Agent top-up (backend records the deposit) ────────────────────────────────
export const recordAgentTopup = async (
    agentId: string,
    token: "okb" | "usdc",
    amount: number,
    txHash: string
): Promise<Agent> => {
    const res = await apiClient.post<Agent>(`/api/agents/${agentId}/topup/`, {
        token,
        amount,
        tx_hash: txHash,
    })
    return res.data
}

// ── SCA address for new agent (pre-create step) ───────────────────────────────
export const previewAgentSca = async (
    agentType: string
): Promise<{ sca_address: string }> => {
    const res = await apiClient.post<{ sca_address: string }>("/api/agents/preview-sca/", { type: agentType })
    return res.data
}
