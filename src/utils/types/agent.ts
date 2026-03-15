// Agent 类型定义
export interface Agent {
    id: string
    userId: string
    name: string
    scaAddress: string
    nftTokenId?: string
    personality: string
    strategyType: string
    aiModel: string
    customPrompt?: string
    temperature: number
    status: string
    isActive: boolean
    totalProfit: number
    totalTasks: number
    successRate: number
    balanceUsdc: number
    balanceOkb: number
    strategyConfig?: AgentConfig
    createdAt: string
    updatedAt: string
    lastActiveAt?: string
    tasks?: AgentTask[]
    logs?: AgentLog[]
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

export interface AgentTask {
    id: string
    agentId: string
    taskType: string
    taskData: any
    status: string
    priority: number
    result?: any
    error?: string
    createdAt: string
    startedAt?: string
    completedAt?: string
}

export interface AgentLog {
    id: string
    agentId: string
    level: "info" | "warning" | "error"
    message: string
    metadata?: any
    createdAt: string
}

export interface AgentDecision {
    id: string
    agentId: string
    model: string
    prompt: string
    response: string
    decisions: any[]
    reasoning?: string
    tokensUsed: number
    cost: number
    latency: number
    executed: boolean
    success: boolean
    createdAt: string
}

export interface AgentSkill {
    id: string
    name: string
    displayName: string
    description: string
    category: "farming" | "trading" | "social" | "strategy"
    parameters: any
    energyCost: number
    cooldown: number
    requiredLevel: number
    isActive: boolean
}

export interface AgentTopUpRequest {
  userId: string;
  amount: number;
  txHash: string;
  currency?: string;
}

export interface AgentTopUpResponse {
  success: boolean;
  agent: {
    id: string;
    name: string;
    scaAddress: string;
    balanceUsdc: number;
    balanceOkb: number;
  };
  topUp: {
    amount: number;
    currency: string;
    txHash: string;
    previousBalance: number;
    newBalance: number;
  };
  message: string;
}
