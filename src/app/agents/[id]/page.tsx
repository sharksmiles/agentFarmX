"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { MOCK_AGENTS } from "../../../utils/mock/mockData"
import { timeAgo } from "../../../utils/func/utils"

const AGENT_TYPE_ICONS: Record<string, string> = {
    farmer: "🌾", trader: "📈", raider: "⚔️", defender: "🛡️",
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    running:      { bg: "bg-green-500/20",  text: "text-green-400",  dot: "bg-green-400 animate-pulse", label: "Running" },
    idle:         { bg: "bg-gray-500/20",   text: "text-gray-400",   dot: "bg-gray-400",                label: "Idle" },
    paused:       { bg: "bg-yellow-500/20", text: "text-yellow-400", dot: "bg-yellow-400",              label: "Paused" },
    error:        { bg: "bg-red-500/20",    text: "text-red-400",    dot: "bg-red-400 animate-pulse",   label: "Error" },
    out_of_funds: { bg: "bg-orange-500/20", text: "text-orange-400", dot: "bg-orange-400",              label: "Out of Funds" },
}

const ACTION_ICONS: Record<string, string> = {
    harvest: "🌾", plant: "🌱", water: "💧", steal: "⚔️",
    radar_scan: "📡", checksteal: "🔍", market_check: "📊", swap: "🔄",
    boost: "⚡", buyland: "🏡", upgrade: "⬆️",
}

type LogFilter = "all" | "success" | "failed" | "pending"

export default function AgentDetailPage() {
    const params  = useParams()
    const id      = params.id as string
    const agent   = MOCK_AGENTS.find(a => a.id === id) ?? MOCK_AGENTS[0]

    const [agentStatus, setAgentStatus] = useState(agent.status)
    const [topupModal, setTopupModal]   = useState<"okb"|"usdc"|null>(null)
    const [topupAmt, setTopupAmt]       = useState("")
    const [logFilter, setLogFilter]     = useState<LogFilter>("all")
    const [localBalance, setLocalBalance] = useState({
        okb: agent.balance_okb, usdc: agent.balance_usdc,
    })

    const currentSt = STATUS_STYLES[agentStatus] ?? STATUS_STYLES.idle

    const filteredLogs = useMemo(() =>
        agent.logs.filter(l => logFilter === "all" || l.status === logFilter),
    [logFilter])

    const handleToggle = () => {
        setAgentStatus(s => s === "running" ? "paused" : "running")
    }

    const handleTopup = () => {
        const amt = parseFloat(topupAmt)
        if (isNaN(amt) || amt <= 0) return
        setLocalBalance(prev => ({
            okb:  topupModal === "okb"  ? prev.okb  + amt : prev.okb,
            usdc: topupModal === "usdc" ? prev.usdc + amt : prev.usdc,
        }))
        setTopupModal(null)
        setTopupAmt("")
    }

    const handleEmergencyStop = () => {
        if (window.confirm("Emergency stop will halt the agent and initiate balance withdrawal. Continue?")) {
            setAgentStatus("idle")
        }
    }

    return (
        <div className="w-full min-h-screen bg-[#1A1F25] text-white pb-8">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/agents">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </Link>
                    <h1 className="text-xl font-extrabold truncate">{agent.name}</h1>
                </div>
                <Link href={`/agents/${id}/config`}>
                    <button className="text-[#5964F5] font-semibold text-sm border border-[#5964F5] px-3 py-1.5 rounded-xl">
                        Edit Config
                    </button>
                </Link>
            </div>

            <div className="px-4 space-y-4">
                {/* ① Status & Balance */}
                <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-[#1A1F25] flex items-center justify-center text-2xl">
                                {AGENT_TYPE_ICONS[agent.type] ?? "🤖"}
                            </div>
                            <div>
                                <p className="font-bold text-lg leading-tight">{agent.name}</p>
                                <p className="text-xs text-gray-400 capitalize">{agent.type} agent · Rank #{agent.stats.ranking}</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${currentSt.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${currentSt.dot}`} />
                            <span className={`text-xs font-medium ${currentSt.text}`}>{currentSt.label}</span>
                        </div>
                    </div>

                    {/* Balances */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#1A1F25] rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">OKB Balance</p>
                            <p className="text-xl font-bold">{localBalance.okb.toFixed(4)}</p>
                            <button onClick={() => setTopupModal("okb")}
                                className="mt-2 w-full text-xs bg-[#5964F5]/20 text-[#5964F5] rounded-lg py-1 font-semibold">
                                + Top Up
                            </button>
                        </div>
                        <div className="bg-[#1A1F25] rounded-xl p-3">
                            <p className="text-xs text-gray-500 mb-1">USDC Balance</p>
                            <p className="text-xl font-bold">{localBalance.usdc.toFixed(2)}</p>
                            <button onClick={() => setTopupModal("usdc")}
                                className="mt-2 w-full text-xs bg-[#5964F5]/20 text-[#5964F5] rounded-lg py-1 font-semibold">
                                + Top Up
                            </button>
                        </div>
                    </div>

                    {agent.status === "out_of_funds" && (
                        <div className="mt-3 bg-orange-500/10 border border-orange-500/30 rounded-xl px-3 py-2 text-xs text-orange-400">
                            ⚠️ Agent paused — balance below emergency threshold. Top up to resume.
                        </div>
                    )}
                </div>

                {/* ② Stats Panel */}
                <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
                    <h3 className="font-bold text-sm mb-3 text-gray-300">Performance Stats</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard label="Total Actions"   value={agent.stats.total_actions.toLocaleString()} />
                        <StatCard label="Total Earned"    value={`${agent.stats.total_earned_coin.toLocaleString()} COIN`} color="text-[#FBB602]" />
                        <StatCard label="Win Rate"        value={`${agent.stats.win_rate}%`} color="text-green-400" />
                        <StatCard label="Global Rank"     value={`#${agent.stats.ranking}`} color="text-[#5964F5]" />
                        {agent.stats.steal_success_count > 0 && (
                            <StatCard label="Steals"      value={`${agent.stats.steal_success_count}W / ${agent.stats.steal_fail_count}L`} />
                        )}
                        <StatCard label="Gas Spent"       value={`${agent.stats.total_spent_gas.toFixed(4)} OKB`} />
                        <StatCard label="USDC Spent"      value={`${agent.stats.total_spent_usdc.toFixed(2)} USDC`} />
                        <StatCard label="Last Active"     value={timeAgo(agent.last_active_at)} />
                    </div>
                </div>

                {/* ③ Control Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleToggle}
                        className={`py-3 rounded-xl font-bold text-sm ${
                            agentStatus === "running"
                                ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                : "bg-green-500/20 text-green-400 border border-green-500/30"
                        }`}>
                        {agentStatus === "running" ? "⏸ Pause Agent" : "▶ Start Agent"}
                    </button>
                    <button onClick={handleEmergencyStop}
                        className="py-3 rounded-xl font-bold text-sm bg-red-500/20 text-red-400 border border-red-500/30">
                        🛑 Emergency Stop
                    </button>
                </div>

                {/* ④ Activity Log */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-base">Activity Log</h3>
                        <div className="flex gap-1">
                            {(["all","success","failed","pending"] as LogFilter[]).map(f => (
                                <button key={f} onClick={() => setLogFilter(f)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        logFilter === f ? "bg-[#5964F5] text-white" : "bg-[#252A31] text-gray-400"
                                    }`}>
                                    {f.charAt(0).toUpperCase() + f.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {filteredLogs.length === 0 && (
                            <div className="text-center py-8 text-gray-600 text-sm">No logs matching filter</div>
                        )}
                        {filteredLogs.map(log => (
                            <div key={log.id} className="bg-[#252A31] rounded-xl px-4 py-3 flex items-start gap-3">
                                <span className="text-lg shrink-0 mt-0.5">{ACTION_ICONS[log.action] ?? "🔧"}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-white truncate">{log.detail}</p>
                                        <span className={`shrink-0 text-xs font-bold ${
                                            log.status === "success" ? "text-green-400" :
                                            log.status === "failed"  ? "text-red-400"   : "text-yellow-400"
                                        }`}>
                                            {log.status === "success" ? "✓" : log.status === "failed" ? "✗" : "⏳"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-[10px] text-gray-600">{timeAgo(log.timestamp)}</span>
                                        {log.gas_cost && <span className="text-[10px] text-gray-600">Gas: {log.gas_cost} OKB</span>}
                                        {log.coin_delta && <span className="text-[10px] text-[#FBB602]">+{log.coin_delta} COIN</span>}
                                        {log.tx_hash && (
                                            <a href={`https://www.okx.com/explorer/xlayer/tx/${log.tx_hash}`}
                                                target="_blank" rel="noopener noreferrer"
                                                className="text-[10px] text-[#5964F5] underline">
                                                {log.tx_hash.slice(0, 8)}…
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top-up Modal */}
            {topupModal && (
                <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50">
                    <div className="bg-[#1A1F25] rounded-t-3xl p-6 w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">
                            Top Up {topupModal.toUpperCase()}
                        </h3>
                        <div className="relative mb-4">
                            <input type="number" step={topupModal === "okb" ? 0.01 : 1}
                                placeholder={`Amount in ${topupModal.toUpperCase()}`}
                                value={topupAmt}
                                onChange={e => setTopupAmt(e.target.value)}
                                className="w-full bg-[#252A31] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5] pr-16"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                                {topupModal.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Wallet signature required to transfer funds to Agent SCA.</p>
                        <div className="flex gap-3">
                            <button onClick={() => { setTopupModal(null); setTopupAmt("") }}
                                className="flex-1 border border-[#353B45] rounded-xl py-3 text-gray-300 font-semibold">
                                Cancel
                            </button>
                            <button onClick={handleTopup}
                                className="flex-1 bg-[#5964F5] rounded-xl py-3 font-bold">
                                Confirm Deposit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
        <div className="bg-[#1A1F25] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-gray-500 mb-1">{label}</p>
            <p className={`text-sm font-bold ${color ?? "text-white"}`}>{value}</p>
        </div>
    )
}
