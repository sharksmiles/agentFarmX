"use client"

import React, { createContext, useContext, useState, ReactNode, FC, useCallback } from "react"
import { Agent, AgentDecision, AgentLog, AgentSkill } from "@/utils/types/agent"
import { PreauthStatus } from "@/utils/api/agents"

export type { Agent, AgentDecision, AgentLog, AgentSkill }
export type { PreauthStatus }

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
    
    // 预授权状态
    preauthStatus: PreauthStatus | null
    needsPreauth: boolean
    setNeedsPreauth: React.Dispatch<React.SetStateAction<boolean>>
    
    // 方法
    refreshAgents: () => Promise<void>
    refreshDecisions: (agentId: string) => Promise<void>
    refreshLogs: (agentId: string) => Promise<void>
    startAgent: (agentId: string) => Promise<void>
    stopAgent: (agentId: string) => Promise<void>
    triggerDecision: (agentId: string) => Promise<void>
    clearAgentError: () => void
    checkPreauthStatus: (agentId: string) => Promise<PreauthStatus>
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
    const [preauthStatus, setPreauthStatus] = useState<PreauthStatus | null>(null)
    const [needsPreauth, setNeedsPreauth] = useState<boolean>(false)

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
            const { fetchAgentDecisions } = await import("@/utils/api/agents")
            const result = await fetchAgentDecisions(agentId)
            setDecisions(result.decisions)
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
            const { fetchAgentLogs } = await import("@/utils/api/agents")
            const result = await fetchAgentLogs(agentId)
            setLogs(result.logs)
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
            const { triggerAgentDecision } = await import("@/utils/api/agents")
            const decision = await triggerAgentDecision(agentId)
            setDecisions(prev => [decision, ...prev])
        } catch (error: any) {
            console.error('Failed to trigger decision:', error)
            setAgentError(error.message || 'Failed to trigger decision')
            throw error
        }
    }, [])

    const clearAgentError = useCallback(() => {
        setAgentError(null)
    }, [])

    const checkPreauthStatus = useCallback(async (agentId: string): Promise<PreauthStatus> => {
        try {
            const { getPreauthStatus } = await import("@/utils/api/agents")
            const status = await getPreauthStatus(agentId)
            setPreauthStatus(status)
            return status
        } catch (error: any) {
            console.error('Failed to check preauth status:', error)
            return { hasValidPreauth: false }
        }
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
        preauthStatus,
        needsPreauth,
        setNeedsPreauth,
        refreshAgents,
        refreshDecisions,
        refreshLogs,
        startAgent,
        stopAgent,
        triggerDecision,
        clearAgentError,
        checkPreauthStatus,
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
