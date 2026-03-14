"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { MOCK_AGENTS } from "../../../../utils/mock/mockData"
import { fetchAgentDetail, updateAgentConfig, Agent } from "../../../../utils/api/agents"

const CROP_OPTIONS = ["Wheat", "Corn", "Carrot", "Potato", "Tomato", "Strawberry", "Pineapple", "Watermelon"]

const AGENT_TYPE_ICONS: Record<string, string> = {
    farmer: "🌾", trader: "📈", raider: "⚔️", defender: "🛡️",
}

export default function AgentConfigPage() {
    const params = useParams()
    const id     = params.id as string
    const mockFallback = MOCK_AGENTS.find(a => a.id === id) ?? MOCK_AGENTS[0]
    const [agent, setAgent] = useState<Agent>(mockFallback as any)
    const cfg    = agent.config as any

    useEffect(() => {
        fetchAgentDetail(id)
            .then(setAgent)
            .catch(() => {})
    }, [id])

    // Shared fund controls
    const [maxGas,      setMaxGas]      = useState<number>(cfg.max_daily_gas_okb       ?? 0.05)
    const [maxUsdc,     setMaxUsdc]     = useState<number>(cfg.max_daily_spend_usdc     ?? 10)
    const [stopBalance, setStopBalance] = useState<number>(cfg.emergency_stop_balance   ?? 1)

    // Farmer
    const [preferredCrops, setPreferredCrops] = useState<string[]>(cfg.preferred_crops ?? ["Wheat"])
    const [autoHarvest,    setAutoHarvest]    = useState<boolean>(cfg.auto_harvest      ?? true)
    const [autoReplant,    setAutoReplant]    = useState<boolean>(cfg.auto_replant      ?? true)

    // Trader
    const [profitRate, setProfitRate] = useState<number>(cfg.swap_trigger_profit_rate ?? 15)
    const [maxSwap,    setMaxSwap]    = useState<number>(cfg.max_single_swap_usdc      ?? 5)

    // Raider
    const [radarLevel, setRadarLevel] = useState<1|2|3>((cfg.radar_level as 1|2|3)    ?? 2)
    const [maxSteals,  setMaxSteals]  = useState<number>(cfg.max_daily_steals          ?? 5)

    // Defender
    const [earlyHarvest, setEarlyHarvest] = useState<number>(cfg.early_harvest_threshold ?? 80)

    const [saving,  setSaving]  = useState(false)
    const [saved,   setSaved]   = useState(false)

    const toggleCrop = (crop: string) => {
        setPreferredCrops(prev =>
            prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
        )
    }

    const handleSave = () => {
        setSaving(true)
        const config = agent.type === "farmer"
            ? { preferred_crops: preferredCrops, auto_harvest: autoHarvest, auto_replant: autoReplant, max_daily_gas: maxGas, max_daily_usdc: maxUsdc, stop_balance: stopBalance }
            : agent.type === "trader"
            ? { profit_rate: profitRate, max_swap: maxSwap, max_daily_gas: maxGas, max_daily_usdc: maxUsdc, stop_balance: stopBalance }
            : agent.type === "raider"
            ? { radar_level: radarLevel, max_steals: maxSteals, max_daily_gas: maxGas, max_daily_usdc: maxUsdc, stop_balance: stopBalance }
            : { early_harvest: earlyHarvest, max_daily_gas: maxGas, max_daily_usdc: maxUsdc, stop_balance: stopBalance }
        updateAgentConfig(id, config)
            .then((updated) => setAgent(updated))
            .catch(() => {})
            .finally(() => {
                setSaving(false)
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
            })
    }

    return (
        <div className="w-full min-h-screen bg-[#1A1F25] text-white flex flex-col">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center gap-3">
                <Link href={`/agents/${id}`}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-xl">{AGENT_TYPE_ICONS[agent.type] ?? "🤖"}</span>
                    <div>
                        <h1 className="text-xl font-extrabold leading-tight">{agent.name}</h1>
                        <p className="text-xs text-gray-400 capitalize">{agent.type} agent · Strategy Config</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 px-4 pb-32 overflow-y-auto space-y-4">
                {/* Farmer-specific */}
                {agent.type === "farmer" && (
                    <Section title="Farmer Strategy" icon="🌾">
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Preferred Crops</p>
                            <div className="flex flex-wrap gap-2">
                                {CROP_OPTIONS.map(c => (
                                    <button key={c} onClick={() => toggleCrop(c)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all
                                            ${preferredCrops.includes(c)
                                                ? "border-green-500 bg-green-500/20 text-green-400"
                                                : "border-[#353B45] text-gray-400"}`}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <Toggle label="Auto Harvest" description="Harvest crops automatically when mature" value={autoHarvest} onChange={setAutoHarvest} />
                        <Toggle label="Auto Replant" description="Immediately replant after each harvest" value={autoReplant} onChange={setAutoReplant} />
                    </Section>
                )}

                {/* Trader-specific */}
                {agent.type === "trader" && (
                    <Section title="Trader Strategy" icon="📈">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm text-gray-300">Profit Trigger Rate</label>
                                <span className="text-sm text-[#5964F5] font-bold">{profitRate}%</span>
                            </div>
                            <input type="range" min={5} max={50} value={profitRate}
                                onChange={e => setProfitRate(+e.target.value)}
                                className="w-full accent-[#5964F5]" />
                            <p className="text-xs text-gray-600 mt-1">Execute swap when profit exceeds {profitRate}%</p>
                        </div>
                        <NumberInput label="Max Single Swap (USDC)" value={maxSwap} step={1} onChange={setMaxSwap} />
                    </Section>
                )}

                {/* Raider-specific */}
                {agent.type === "raider" && (
                    <Section title="Raider Strategy" icon="⚔️">
                        <div>
                            <p className="text-xs text-gray-400 mb-2">Radar Scan Level</p>
                            <div className="flex gap-2">
                                {([1,2,3] as const).map(l => (
                                    <button key={l} onClick={() => setRadarLevel(l)}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                                            ${radarLevel === l ? "border-red-500 bg-red-500/20 text-red-400" : "border-[#353B45] text-gray-400"}`}>
                                        {l === 1 ? "Basic" : l === 2 ? "Advanced" : "Precision"}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                                {radarLevel === 1 ? "Standard range, lower cost" :
                                 radarLevel === 2 ? "Extended range, moderate cost" :
                                 "Maximum range, highest accuracy"}
                            </p>
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm text-gray-300">Max Daily Steals</label>
                                <span className="text-sm text-red-400 font-bold">{maxSteals}</span>
                            </div>
                            <input type="range" min={1} max={20} value={maxSteals}
                                onChange={e => setMaxSteals(+e.target.value)}
                                className="w-full accent-red-500" />
                        </div>
                    </Section>
                )}

                {/* Defender-specific */}
                {agent.type === "defender" && (
                    <Section title="Defender Strategy" icon="🛡️">
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="text-sm text-gray-300">Early Harvest Threshold</label>
                                <span className="text-sm text-orange-400 font-bold">{earlyHarvest}%</span>
                            </div>
                            <input type="range" min={50} max={100} value={earlyHarvest}
                                onChange={e => setEarlyHarvest(+e.target.value)}
                                className="w-full accent-orange-400" />
                            <p className="text-xs text-gray-600 mt-1">Harvest when crop reaches {earlyHarvest}% maturity to prevent theft</p>
                        </div>
                    </Section>
                )}

                {/* Fund Safety Controls */}
                <Section title="Fund Safety Controls" icon="🔐">
                    <p className="text-xs text-gray-500 -mt-1">Limits reset daily at 00:00 UTC</p>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberInput label="Max Daily Gas" unit="OKB" value={maxGas} step={0.01} onChange={setMaxGas} />
                        <NumberInput label="Max Daily Spend" unit="USDC" value={maxUsdc} step={1} onChange={setMaxUsdc} />
                    </div>
                    <NumberInput
                        label="Emergency Stop Balance"
                        unit="USDC"
                        value={stopBalance}
                        step={0.5}
                        onChange={setStopBalance}
                        description="Agent auto-pauses when USDC balance falls below this threshold"
                    />
                </Section>

                {/* Agent Info (readonly) */}
                <Section title="Agent Info" icon="ℹ️">
                    <InfoRow label="SCA Address" value={agent.sca_address ?? "—"} mono />
                    <InfoRow label="Created" value={new Date(agent.created_at).toLocaleDateString()} />
                    <InfoRow label="Agent ID" value={agent.id} mono />
                </Section>
            </div>

            {/* Sticky Save Button */}
            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#1A1F25] border-t border-[#252A31]">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
                        saved   ? "bg-green-500" :
                        saving  ? "bg-[#5964F5]/60" : "bg-[#5964F5]"
                    }`}>
                    {saved ? "✓ Changes Saved" : saving ? "Signing & Saving…" : "Save Configuration"}
                </button>
                <p className="text-center text-xs text-gray-600 mt-2">Wallet signature required to confirm changes</p>
            </div>
        </div>
    )
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45] space-y-4">
            <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
                <span>{icon}</span>{title}
            </h3>
            {children}
        </div>
    )
}

function Toggle({ label, description, value, onChange }: {
    label: string; description?: string; value: boolean; onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
                <p className="text-sm font-medium">{label}</p>
                {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
            </div>
            <button onClick={() => onChange(!value)}
                className={`w-11 h-6 rounded-full transition-colors shrink-0 ${value ? "bg-[#5964F5]" : "bg-[#353B45]"}`}>
                <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${value ? "translate-x-5" : "translate-x-0"}`} />
            </button>
        </div>
    )
}

function NumberInput({ label, unit, value, step, onChange, description }: {
    label: string; unit?: string; value: number; step: number; onChange: (v: number) => void; description?: string
}) {
    return (
        <div>
            <label className="text-xs text-gray-400 mb-1 block">{label}{unit ? ` (${unit})` : ""}</label>
            <input type="number" step={step} value={value}
                onChange={e => onChange(+e.target.value)}
                className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#5964F5]" />
            {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
        </div>
    )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex justify-between items-center py-1.5 border-b border-[#353B45] last:border-0">
            <span className="text-xs text-gray-500">{label}</span>
            <span className={`text-xs text-gray-300 max-w-[60%] truncate text-right ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
        </div>
    )
}
