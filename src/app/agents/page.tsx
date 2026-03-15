"use client"
import { useEffect, useState } from "react"
import { fetchAgents, Agent } from "../../utils/api/agents"
import Link from "next/link"
import { useData } from "../../components/context/dataContext"
import { timeAgo } from "../../utils/func/utils"

const AGENT_TYPE_ICONS: Record<string, string> = {
    farmer:  "🌾",
    trader:  "📈",
    raider:  "⚔️",
    defender:"🛡️",
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
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Agents")
        fetchAgents()
            .then(setAgents)
            .catch(() => setAgents([]))
    }, [setCurrentTab])

    const totalEarned  = agents.reduce((s, a) => s + ((a as any).totalProfit || (a as any).stats?.total_earned_coin || 0), 0)
    const totalGas     = agents.reduce((s, a) => s + ((a as any).balanceOkb || (a as any).stats?.total_spent_gas || 0), 0)
    const totalUsdc    = agents.reduce((s, a) => s + ((a as any).balanceUsdc || (a as any).stats?.total_spent_usdc || 0), 0)
    const activeCount  = agents.filter(a => a.status === "running").length

    return (
        <div className="w-full h-screen bg-[#1A1F25] text-white flex flex-col">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between shrink-0">
                <h1 className="text-2xl font-extrabold">AI Agents</h1>
                <Link href="/agents/create">
                    <button className="bg-[#5964F5] text-white text-sm font-semibold px-4 py-2 rounded-xl">
                        + New Agent
                    </button>
                </Link>
            </div>

            <div className="flex-1 overflow-y-auto pb-32">
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
                <div className="px-4 space-y-3">
                    {agents.length === 0 && (
                        <div className="text-center py-16 text-gray-500">
                            <p className="text-5xl mb-4">🤖</p>
                            <p className="text-lg font-semibold">No agents yet</p>
                            <p className="text-sm mt-1">Create your first AI Agent to get started</p>
                        </div>
                    )}
                    {agents.map(agent => {
                        const type = agent.strategyType || (agent as any).type
                        const st = STATUS_STYLES[agent.status] ?? STATUS_STYLES.idle
                        const lastLog = agent.logs?.[0]
                        return (    
                            <Link href={`/agents/${agent.id}`} key={agent.id}>
                                <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45] hover:border-[#5964F5] transition-colors cursor-pointer mb-3">
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
                                                {(agent.totalProfit || (agent as any).stats?.total_earned_coin || 0).toLocaleString()} <span className="text-[9px] text-[#FBB602]/60 ml-0.5">$COIN</span>
                                            </p>
                                        </div>
                                        <div className="bg-[#1A1F25] rounded-xl p-2.5">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Success Rate</p>
                                            <p className="text-white font-bold text-sm leading-none">
                                                {((agent.successRate || (agent as any).stats?.win_rate || 0) * 100).toFixed(1)}%
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
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
