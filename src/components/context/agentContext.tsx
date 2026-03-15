"use client"

import React, { createContext, useContext, useState, ReactNode, FC, useCallback } from "react"

// Agent 类型定义
export interface Agent {
    id: string
    userId: string
    name: string
    scaAddress: string
    nftTokenId?: string
    personality: "aggressive" | "conservative" | "balanced"
    strategyType: "farming" | "trading" | "social"
    aiModel: string
    customPrompt?: string
    temperature: number
    status: "idle" | "running" | "paused" | "error"
    isActive: boolean
    totalProfit: number
    totalTasks: number
    successRate: number
    createdAt: string
    updatedAt: string
    lastActiveAt?: string
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

export interface AgentLog {
    id: string
    agentId: string
    level: "info" | "warning" | "error"
    message: string
    metadata?: any
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

interface AgentContextValue {
    // Agent 列表
    agents: Agent[]
    setAgents: React.Dispatch<React.SetStateAction<Agent[]>>
    
    // 当前选中的 Agent
    selectedAgent: Agent | null
    setSelectedAgent: React.Dispatch<React.SetStateAction<Agent | null>>
    
    // Agent 决策历史
    decisions: AgentDecision[]
    setDecisions: React.Dispatch<React.SetStateAction<AgentDecision[]>>
    
    // Agent 日志
    logs: AgentLog[]
    setLogs: React.Dispatch<React.SetStateAction<AgentLog[]>>
    
    // 可用技能
    availableSkills: AgentSkill[]
    setAvailableSkills: React.Dispatch<React.SetStateAction<AgentSkill[]>>
    
    // 加载状态
    isLoadingAgents: boolean
    setIsLoadingAgents: React.Dispatch<React.SetStateAction<boolean>>
    
    isLoadingDecisions: boolean
    setIsLoadingDecisions: React.Dispatch<React.SetStateAction<boolean>>
    
    isLoadingLogs: boolean
    setIsLoadingLogs: React.Dispatch<React.SetStateAction<boolean>>
    
    // 错误状态
    agentError: string | null
    setAgentError: React.Dispatch<React.SetStateAction<string | null>>
    
    // 方法
    refreshAgents: () => Promise<void>
    refreshDecisions: (agentId: string) => Promise<void>
    refreshLogs: (agentId: string) => Promise<void>
    startAgent: (agentId: string) => Promise<void>
    stopAgent: (agentId: string) => Promise<void>
    triggerDecision: (agentId: string) => Promise<void>
    clearAgentError: () => void
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined)

interface AgentProviderProps {
    children: ReactNode
}

export const AgentProvider: FC<AgentProviderProps> = ({ children }) => {
    const [agents, setAgents] = useState<Agent[]>([])
    const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
    const [decisions, setDecisions] = useState<AgentDecision[]>([])
    const [logs, setLogs] = useState<AgentLog[]>([])
    const [availableSkills, setAvailableSkills] = useState<AgentSkill[]>([])
    
    const [isLoadingAgents, setIsLoadingAgents] = useState<boolean>(false)
    const [isLoadingDecisions, setIsLoadingDecisions] = useState<boolean>(false)
    const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false)
    
    const [agentError, setAgentError] = useState<string | null>(null)

    const refreshAgents = useCallback(async () => {
        setIsLoadingAgents(true)
        setAgentError(null)
        try {
            const { fetchAgents } = await import("@/utils/api/agents")
            const agentList = await fetchAgents()
            setAgents(agentList)
        } catch (error: any) {
            console.error('Failed to fetch agents:', error)
            setAgentError(error.message || 'Failed to fetch agents')
        } finally {
            setIsLoadingAgents(false)
        }
    }, [])

    const refreshDecisions = useCallback(async (agentId: string) => {
        setIsLoadingDecisions(true)
        setAgentError(null)
        try {
            // TODO: Implement fetchAgentDecisions API call
            // const decisions = await fetchAgentDecisions(agentId)
            // setDecisions(decisions)
            console.log('Fetching decisions for agent:', agentId)
        } catch (error: any) {
            console.error('Failed to fetch decisions:', error)
            setAgentError(error.message || 'Failed to fetch decisions')
        } finally {
            setIsLoadingDecisions(false)
        }
    }, [])

    const refreshLogs = useCallback(async (agentId: string) => {
        setIsLoadingLogs(true)
        setAgentError(null)
        try {
            // TODO: Implement fetchAgentLogs API call
            // const logs = await fetchAgentLogs(agentId)
            // setLogs(logs)
            console.log('Fetching logs for agent:', agentId)
        } catch (error: any) {
            console.error('Failed to fetch logs:', error)
            setAgentError(error.message || 'Failed to fetch logs')
        } finally {
            setIsLoadingLogs(false)
        }
    }, [])

    const startAgent = useCallback(async (agentId: string) => {
        setAgentError(null)
        try {
            const { startAgent: startAgentAPI } = await import("@/utils/api/agents")
            const updatedAgent = await startAgentAPI(agentId)
            
            // Update agents list
            setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a))
            
            // Update selected agent if it's the one being started
            if (selectedAgent?.id === agentId) {
                setSelectedAgent(updatedAgent)
            }
        } catch (error: any) {
            console.error('Failed to start agent:', error)
            setAgentError(error.message || 'Failed to start agent')
            throw error
        }
    }, [selectedAgent])

    const stopAgent = useCallback(async (agentId: string) => {
        setAgentError(null)
        try {
            const { stopAgent: stopAgentAPI } = await import("@/utils/api/agents")
            const updatedAgent = await stopAgentAPI(agentId)
            
            // Update agents list
            setAgents(prev => prev.map(a => a.id === agentId ? updatedAgent : a))
            
            // Update selected agent if it's the one being stopped
            if (selectedAgent?.id === agentId) {
                setSelectedAgent(updatedAgent)
            }
        } catch (error: any) {
            console.error('Failed to stop agent:', error)
            setAgentError(error.message || 'Failed to stop agent')
            throw error
        }
    }, [selectedAgent])

    const triggerDecision = useCallback(async (agentId: string) => {
        setAgentError(null)
        try {
            // TODO: Implement triggerAgentDecision API call
            // const decision = await triggerAgentDecision(agentId)
            // setDecisions(prev => [decision, ...prev])
            console.log('Triggering decision for agent:', agentId)
        } catch (error: any) {
            console.error('Failed to trigger decision:', error)
            setAgentError(error.message || 'Failed to trigger decision')
            throw error
        }
    }, [])

    const clearAgentError = useCallback(() => {
        setAgentError(null)
    }, [])

    const value: AgentContextValue = {
        agents,
        setAgents,
        selectedAgent,
        setSelectedAgent,
        decisions,
        setDecisions,
        logs,
        setLogs,
        availableSkills,
        setAvailableSkills,
        isLoadingAgents,
        setIsLoadingAgents,
        isLoadingDecisions,
        setIsLoadingDecisions,
        isLoadingLogs,
        setIsLoadingLogs,
        agentError,
        setAgentError,
        refreshAgents,
        refreshDecisions,
        refreshLogs,
        startAgent,
        stopAgent,
        triggerDecision,
        clearAgentError,
    }

    return <AgentContext.Provider value={value}>{children}</AgentContext.Provider>
}

export const useAgent = (): AgentContextValue => {
    const context = useContext(AgentContext)
    if (context === undefined) {
        throw new Error("useAgent must be used within an AgentProvider")
    }
    return context
}

export default AgentContext
