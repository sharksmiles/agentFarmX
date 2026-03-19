"use client"
import { useEffect, useState } from "react"
import { fetchAgents, Agent, startAgent, stopAgent } from "../../utils/api/agents"
import Link from "next/link"
import { useData } from "../../components/context/dataContext"
import { timeAgo } from "../../utils/func/utils"

const AGENT_TYPE_ICONS: Record<string, string> = {
    farming: "🌾",
    raider:  "⚔️",
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    running:      { bg: "bg-green-500/20",  text: "text-green-400",  dot: "bg-green-400 animate-pulse", label: "Running" },
    idle:         { bg: "bg-gray-500/20",   text: "text-gray-400",   dot: "bg-gray-400",                label: "Idle" },
    paused:       { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-400",              label: "Paused" },
    error:        { bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-400 animate-pulse",   label: "Error" },
    out_of_funds: { bg: "bg-orange-500/20", text: "text-orange-400", dot: "bg-orange-400",              label: "Out of Funds" },
}

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [loadingAgentId, setLoadingAgentId] = useState<string | null>(null)
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Agents")
        fetchAgents()
            .then(setAgents)
            .catch(() => setAgents([]))
    }, [setCurrentTab])

    const totalEarned  = agents.reduce((s, a) => s + (a.totalProfit || 0), 0)
    const totalGas     = agents.reduce((s, a) => s + (a.balanceOkb || 0), 0)
    const totalUsdc    = agents.reduce((s, a) => s + (a.balanceUsdc || 0), 0)
    const activeCount  = agents.filter(a => a.status === "running").length

    return (
        <div className="w-full h-screen bg-[#1A1F25] text-white flex flex-col">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-extrabold">AI Agents</h1>
            </div>

            <div className="flex-1  pb-32 ">
                {/* Overview Bar */}
                <div className="mx-4 mb-4 bg-[#252A31] rounded-2xl p-4 grid grid-cols-3 gap-2 text-center border border-[#353B45]">
                    <div>
                        <p className="text-[11px] text-gray-400 mb-1">Total Earned</p>
                        <p className="text-[#FBB602] font-bold text-base">{totalEarned.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-500">$COIN</p>
                    </div>
                    <div className="border-x border-[#353B45]">
                        <p className="text-[11px] text-gray-400 mb-1">Total Spent</p>
                        <p className="text-white font-bold text-base">{(totalGas).toFixed(3)}</p>
                        <p className="text-[10px] text-gray-500">OKB + {totalUsdc.toFixed(1)} USDC</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-gray-400 mb-1">Active</p>
                        <p className="text-green-400 font-bold text-base">{activeCount} / {agents.length}</p>
                        <p className="text-[10px] text-gray-500">agents</p>
                    </div>
                </div>

                {/* Agent Cards */}
                <div className="px-4 space-y-3 h-[calc(100vh-16rem)] overflow-y-auto">
                    {agents.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p className="text-5xl mb-4">🤖</p>
                            <p className="text-lg font-semibold">Loading your agents...</p>
                            <p className="text-sm mt-1">Please wait</p>
                        </div>
                    )}
                    {agents.map(agent => {
                        const type = agent.strategyType
                        const st = STATUS_STYLES[agent.status] ?? STATUS_STYLES.idle
                        const lastLog = agent.logs?.[0]
                        return (
                            <div key={agent.id} className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45] mb-3">
                                {/* Top row */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-11 h-11 rounded-xl bg-[#1A1F25] flex items-center justify-center text-2xl">
                                            {AGENT_TYPE_ICONS[type] ?? "🤖"}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base leading-tight">{agent.name}</h3>
                                            <p className="text-gray-400 text-xs capitalize mt-0.5">{type} agent</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                        <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
                                    </div>
                                </div>
                                
                                {/* Stats grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-[#1A1F25] rounded-xl p-2.5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Total Profit</p>
                                        <p className="text-[#FBB602] font-bold text-sm leading-none">
                                            {(agent.totalProfit || 0).toLocaleString()} <span className="text-[9px] text-[#FBB602]/60 ml-0.5">$COIN</span>
                                        </p>
                                    </div>
                                    <div className="bg-[#1A1F25] rounded-xl p-2.5">
                                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Success Rate</p>
                                        <p className="text-white font-bold text-sm leading-none">
                                            {((agent.successRate || 0) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>

                                {/* Bottom status line */}
                                <div className="flex items-center justify-between border-t border-[#353B45] pt-3 mt-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                        <p className="text-[11px] text-gray-500 truncate max-w-[180px]">
                                            {lastLog ? lastLog.message : "Waiting for next action..."}
                                        </p>
                                    </div>
                                    <p className="text-[10px] text-gray-600 whitespace-nowrap">
                                        {agent.lastActiveAt ? timeAgo(new Date(agent.lastActiveAt).toISOString()) : "Never active"}
                                    </p>
                                </div>

                                {/* Action buttons */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-[#353B45]">
                                    {/* Start/Stop Button */}
                                    <button
                                        onClick={async () => {
                                            if (loadingAgentId) return
                                            setLoadingAgentId(agent.id)
                                            try {
                                                const updated = agent.status === 'running'
                                                    ? await stopAgent(agent.id)
                                                    : await startAgent(agent.id)
                                                setAgents(prev => prev.map(a => a.id === agent.id ? updated : a))
                                            } catch (e) {
                                                console.error('Failed to toggle agent:', e)
                                            } finally {
                                                setLoadingAgentId(null)
                                            }
                                        }}
                                        disabled={loadingAgentId === agent.id}
                                        className={`flex-1 py-2 px-3 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                                            agent.status === 'running'
                                                ? 'bg-red-500/80 hover:bg-red-600'
                                                : 'bg-green-500/80 hover:bg-green-600'
                                        }`}
                                    >
                                        {loadingAgentId === agent.id ? (
                                            <span className="animate-spin">⏳</span>
                                        ) : agent.status === 'running' ? (
                                            <span>⏹️</span>
                                        ) : (
                                            <span>▶️</span>
                                        )}
                                        <span>{loadingAgentId === agent.id ? '...' : (agent.status === 'running' ? 'Stop' : 'Start')}</span>
                                    </button>
                                    <Link href={`/agents/${agent.id}/settings`} className="flex-1">
                                        <button className="w-full py-2 px-3 bg-[#5964F5] hover:bg-[#4751D8] text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5">
                                            <span>⚙️</span>
                                            <span>Settings</span>
                                        </button>
                                    </Link>
                                    <Link href={`/agents/${agent.id}/logs`} className="flex-1">
                                        <button className="w-full py-2 px-3 bg-[#353B45] hover:bg-[#404652] text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5">
                                            <span>📋</span>
                                            <span>Logs</span>
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
