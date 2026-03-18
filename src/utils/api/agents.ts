import apiClient from "./client"
import { Agent, AgentLog, AgentTopUpRequest, AgentTopUpResponse, AgentConfig, AgentDecision } from "../types/agent"

export type { Agent, AgentLog, AgentTopUpRequest, AgentTopUpResponse, AgentConfig, AgentDecision }

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
export const fetchAgents = async (): Promise<Agent[]> => {
    const res = await apiClient.get<{ agents: Agent[] }>('/api/agents')
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
    aiModel?: string
    customPrompt?: string
    temperature?: number
    strategyConfig?: AgentConfig
    initial_okb?: number
    initial_usdc?: number
}

export const createAgent = async (payload: CreateAgentPayload): Promise<Agent> => {
    const data = {
        ...payload,
        strategyType: payload.strategyType || 'farming',
    }
    const res = await apiClient.post<{ agent: Agent }>('/api/agents', data)
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
export const fetchAgentLogs = async (agentId: string, limit = 50): Promise<{ logs: AgentLog[]; total: number }> => {
    const res = await apiClient.get<{ logs: AgentLog[]; total: number }>(`/api/agents/${agentId}/logs?limit=${limit}`)
    return res.data
}

// ── Agent decisions ────────────────────────────────────────────────────────────
export const fetchAgentDecisions = async (agentId: string, limit = 10): Promise<{ decisions: AgentDecision[]; total: number; stats: any }> => {
    const res = await apiClient.get<{ decisions: AgentDecision[]; total: number; stats: any }>(`/api/agents/${agentId}/decisions?limit=${limit}`)
    return res.data
}

// ── Agent decision trigger ─────────────────────────────────────────────────────
export const triggerAgentDecision = async (agentId: string): Promise<AgentDecision> => {
    const res = await apiClient.post<{ decision: AgentDecision }>(`/api/agents/${agentId}/decide`)
    return res.data.decision
}

// ── Agent Pre-authorization ──────────────────────────────────────────────────────
export interface PreauthStatus {
    hasValidPreauth: boolean
    auth?: {
        id: string
        authorizedValue: string
        usedValue: string
        validBefore: string
        createdAt: string
    }
}

export interface PreauthRequest {
    amountUsdc: number
}

export interface PreauthConfirmRequest {
    auth: {
        from: string
        to: string
        value: string
        validAfter: string
        validBefore: string
        nonce: string
        signature: string
    }
}

export interface PreauthConfirmResponse {
    success: boolean
    auth: {
        id: string
        userId: string
        agentId: string
        authorizedValue: string
        usedValue: string
        validBefore: string
    }
}

/**
 * 获取Agent预授权状态
 */
export const getPreauthStatus = async (agentId: string): Promise<PreauthStatus> => {
    const res = await apiClient.get<PreauthStatus>(`/api/agents/${agentId}/preauth`)
    return res.data
}

/**
 * 请求预授权（获取支付参数）
 */
export const requestPreauth = async (agentId: string, data: PreauthRequest): Promise<{ paymentRequired: any }> => {
    const res = await apiClient.post<{ paymentRequired: any }>(`/api/agents/${agentId}/preauth`, data)
    return res.data
}

/**
 * 确认预授权签名
 */
export const confirmPreauth = async (agentId: string, data: PreauthConfirmRequest): Promise<PreauthConfirmResponse> => {
    const res = await apiClient.post<PreauthConfirmResponse>(`/api/agents/${agentId}/preauth/confirm`, data)
    return res.data
}

/**
 * 撤销预授权
 */
export const revokePreauth = async (agentId: string, authId: string): Promise<{ success: boolean }> => {
    const res = await apiClient.delete<{ success: boolean }>(`/api/agents/${agentId}/preauth?id=${authId}`)
    return res.data
}
