"use client"
import { useEffect, useState } from "react"
import { MOCK_AGENTS } from "../../utils/mock/mockData"
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
            .catch(() => setAgents(MOCK_AGENTS as any))
    }, [setCurrentTab])

    const totalEarned  = agents.reduce((s, a) => s + a.stats.total_earned_coin, 0)
    const totalGas     = agents.reduce((s, a) => s + a.stats.total_spent_gas, 0)
    const totalUsdc    = agents.reduce((s, a) => s + a.stats.total_spent_usdc, 0)
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
                        const st = STATUS_STYLES[agent.status] ?? STATUS_STYLES.idle
                        const lastLog = agent.logs?.[0]
                        return (
                            <Link href={`/agents/${agent.id}`} key={agent.id}>
                                <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45] hover:border-[#5964F5] transition-colors cursor-pointer mb-3">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-xl bg-[#1A1F25] flex items-center justify-center text-2xl">
                                                {AGENT_TYPE_ICONS[agent.type] ?? "🤖"}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-base leading-tight">{agent.name}</h3>
                                                <p className="text-gray-400 text-xs capitalize mt-0.5">{agent.type} agent</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${st.bg}`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                            <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
                                        </div>
                                    </div>

                                    {/* Balance row */}
                                    <div className="flex gap-3 mb-3">
                                        <div className="flex-1 bg-[#1A1F25] rounded-lg px-3 py-1.5">
                                            <p className="text-[10px] text-gray-500">OKB</p>
                                            <p className="text-sm font-bold">{agent.balance_okb.toFixed(3)}</p>
                                        </div>
                                        <div className="flex-1 bg-[#1A1F25] rounded-lg px-3 py-1.5">
                                            <p className="text-[10px] text-gray-500">USDC</p>
                                            <p className="text-sm font-bold">{agent.balance_usdc.toFixed(2)}</p>
                                        </div>
                                        <div className="flex-1 bg-[#1A1F25] rounded-lg px-3 py-1.5">
                                            <p className="text-[10px] text-gray-500">Win Rate</p>
                                            <p className="text-sm font-bold text-green-400">{agent.stats.win_rate}%</p>
                                        </div>
                                    </div>

                                    {/* Last log */}
                                    {lastLog && (
                                        <div className="bg-[#1A1F25] rounded-lg px-3 py-2 flex items-center gap-2">
                                            <span className={`text-xs font-semibold ${
                                                lastLog.status === "success" ? "text-green-400" :
                                                lastLog.status === "failed"  ? "text-red-400"   : "text-yellow-400"
                                            }`}>
                                                {lastLog.status === "success" ? "✓" : lastLog.status === "failed" ? "✗" : "⏳"}
                                            </span>
                                            <p className="text-xs text-gray-400 truncate flex-1">{lastLog.detail}</p>
                                            <p className="text-[10px] text-gray-600 whitespace-nowrap">{timeAgo(lastLog.timestamp)}</p>
                                        </div>
                                    )}

                                    {/* Out-of-funds warning */}
                                    {agent.status === "out_of_funds" && (
                                        <div className="mt-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2 text-xs text-orange-400">
                                            ⚠️ Agent paused — low balance. Top up to resume.
                                        </div>
                                    )}
                                </div>
                            </Link>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
