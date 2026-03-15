import apiClient from "./client"
import { Agent, AgentLog, AgentTopUpRequest, AgentTopUpResponse, AgentConfig } from "../types/agent"

export type { Agent, AgentLog, AgentTopUpRequest, AgentTopUpResponse, AgentConfig }

// ── Agent SCA Top-up ──────────────────────────────────────────────────────────

export const topUpAgentSCA = async (
  agentId: string,
  data: AgentTopUpRequest
): Promise<AgentTopUpResponse> => {
  const res = await apiClient.post(`/api/agents/${agentId}/topup`, data);
  return res.data;
};

export const getAgentTopUpHistory = async (
  agentId: string,
  userId: string
) => {
  const res = await apiClient.get(`/api/agents/${agentId}/topup?userId=${userId}`);
  return res.data;
};

// ── Agent CRUD ────────────────────────────────────────────────────────────────
export const fetchAgents = async (userId?: string): Promise<Agent[]> => {
    // If no userId, try to get from session or something?
    // For now, assume it's passed or handled by the backend if userId is not provided
    const url = userId ? `/api/agents?userId=${userId}` : "/api/agents"
    const res = await apiClient.get<{ agents: Agent[] }>(url)
    return res.data.agents
}

export const fetchAgentDetail = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.get<{ agent: Agent }>(`/api/agents/${agentId}`)
    return res.data.agent
}

export interface CreateAgentPayload {
    userId?: string
    scaAddress?: string
    name: string
    personality?: string
    strategyType?: string
    type?: string // Alias for strategyType
    aiModel?: string
    customPrompt?: string
    temperature?: number
    strategyConfig?: AgentConfig
    config?: AgentConfig // Alias for strategyConfig
    initial_okb?: number
    initial_usdc?: number
}

export const createAgent = async (payload: CreateAgentPayload): Promise<Agent> => {
    // Map aliases if needed
    const data = {
        ...payload,
        strategyType: payload.strategyType || payload.type || 'farming',
        strategyConfig: payload.strategyConfig || payload.config,
    }
    const res = await apiClient.post<{ agent: Agent }>("/api/agents", data)
    return res.data.agent
}

export const updateAgent = async (
    agentId: string,
    data: Partial<CreateAgentPayload>
): Promise<Agent> => {
    const res = await apiClient.patch<{ agent: Agent }>(`/api/agents/${agentId}`, data)
    return res.data.agent
}

export const updateAgentConfig = async (
    agentId: string,
    config: Partial<AgentConfig>
): Promise<Agent> => {
    // Update strategyConfig via the main agent update endpoint or a dedicated one
    const res = await apiClient.patch<{ agent: Agent }>(`/api/agents/${agentId}`, { strategyConfig: config })
    return res.data.agent
}

export const previewAgentSca = async (name: string, userId?: string): Promise<{ sca_address: string }> => {
    // Dummy implementation or call backend
    return { sca_address: "0x" + "0".repeat(40) }
}

export const deleteAgent = async (agentId: string): Promise<boolean> => {
    const res = await apiClient.delete<{ success: boolean }>(`/api/agents/${agentId}`)
    return res.data.success
}

// ── Agent control ─────────────────────────────────────────────────────────────
export const startAgent = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.post<{ agent: Agent }>(`/api/agents/${agentId}/start`)
    return res.data.agent
}

export const stopAgent = async (agentId: string): Promise<Agent> => {
    const res = await apiClient.post<{ agent: Agent }>(`/api/agents/${agentId}/stop`)
    return res.data.agent
}

// ── Agent logs ────────────────────────────────────────────────────────────────
export const fetchAgentLogs = async (agentId: string): Promise<AgentLog[]> => {
    const res = await apiClient.get<{ logs: AgentLog[] }>(`/api/agents/${agentId}/logs`)
    return res.data.logs
}
