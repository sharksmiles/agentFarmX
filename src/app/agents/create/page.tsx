"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"


const AGENT_TYPES = [
    {
        type: "farmer",
        icon: "🌾",
        name: "Farmer Agent",
        tagline: "Maximize yield",
        description: "Automatically plants, waters, and harvests crops to maximize $COIN output.",
        api: "okx-dex-token",
        color: "#33C14A",
    },
    {
        type: "trader",
        icon: "📈",
        name: "Trader Agent",
        tagline: "Maximize profit",
        description: "Monitors market prices and auto-swaps crop tokens for optimal returns.",
        api: "okx-dex-market, okx-dex-swap",
        color: "#5964F5",
    },
    {
        type: "raider",
        icon: "⚔️",
        name: "Raider Agent",
        tagline: "Plunder resources",
        description: "Scans vulnerable farms and executes stealth raids to steal crops.",
        api: "okx-onchain-gateway",
        color: "#EB5757",
    },
    {
        type: "defender",
        icon: "🛡️",
        name: "Defender Agent",
        tagline: "Guard your farm",
        description: "Monitors your farm 24/7, auto-harvests before raiders can strike.",
        api: "okx-wallet-portfolio",
        color: "#F2994A",
    },
]

const CROP_OPTIONS = ["Wheat", "Corn", "Carrot", "Potato", "Tomato", "Strawberry", "Pineapple", "Watermelon"]

export default function CreateAgentPage() {
    const router = useRouter()
    const [step, setStep]               = useState(1)
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [agentName, setAgentName]     = useState("")
    const [preferredCrops, setPreferredCrops] = useState<string[]>(["Wheat"])
    const [autoHarvest, setAutoHarvest] = useState(true)
    const [autoReplant, setAutoReplant] = useState(true)
    const [profitRate, setProfitRate]   = useState(15)
    const [maxSwap, setMaxSwap]         = useState(5)
    const [radarLevel, setRadarLevel]   = useState<1|2|3>(2)
    const [maxSteals, setMaxSteals]     = useState(5)
    const [earlyHarvest, setEarlyHarvest] = useState(80)
    const [maxGas, setMaxGas]           = useState(0.05)
    const [maxUsdc, setMaxUsdc]         = useState(10)
    const [stopBalance, setStopBalance] = useState(1)
    const [okbAmount, setOkbAmount]     = useState("0.1")
    const [usdcAmount, setUsdcAmount]   = useState("10")
    const [activating, setActivating]   = useState(false)
    const [activated, setActivated]     = useState(false)

    const typeInfo = AGENT_TYPES.find(t => t.type === selectedType)

    const toggleCrop = (crop: string) => {
        setPreferredCrops(prev =>
            prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
        )
    }

    const handleActivate = () => {
        setActivating(true)
        setTimeout(() => {
            setActivating(false)
            setActivated(true)
        }, 1800)
    }

    const stepLabels = ["Type", "Configure", "Fund", "Activate"]

    return (
        <div className="w-full min-h-screen bg-[#1A1F25] text-white flex flex-col">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 flex items-center gap-3">
                <Link href="/agents">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </Link>
                <h1 className="text-xl font-extrabold">Create New Agent</h1>
            </div>

            {/* Step Indicator */}
            <div className="px-4 pb-4">
                <div className="flex items-center gap-1">
                    {stepLabels.map((label, i) => {
                        const num = i + 1
                        const active = num === step
                        const done   = num < step
                        return (
                            <div key={num} className="flex items-center gap-1 flex-1 min-w-0">
                                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0
                                    ${done  ? "bg-green-500 text-white" :
                                      active ? "bg-[#5964F5] text-white" : "bg-[#353B45] text-gray-500"}`}>
                                    {done ? "✓" : num}
                                </div>
                                <span className={`text-xs truncate ${active ? "text-white font-semibold" : "text-gray-500"}`}>{label}</span>
                                {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-[#353B45] mx-1 min-w-[4px]" />}
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-1 px-4 pb-32 overflow-y-auto">
                {/* ── Step 1: Type Selection ── */}
                {step === 1 && (
                    <div className="space-y-3">
                        <p className="text-gray-400 text-sm mb-4">Choose the strategy for your AI Agent</p>
                        {AGENT_TYPES.map(t => (
                            <button
                                key={t.type}
                                onClick={() => setSelectedType(t.type)}
                                className={`w-full text-left bg-[#252A31] rounded-2xl p-4 border-2 transition-all
                                    ${selectedType === t.type ? "border-[#5964F5] shadow-lg" : "border-transparent"}`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-3xl">{t.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-base">{t.name}</h3>
                                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: t.color + "30", color: t.color }}>
                                                {t.tagline}
                                            </span>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-1">{t.description}</p>
                                        <p className="text-[10px] text-gray-600 mt-1.5">API: {t.api}</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}

                {/* ── Step 2: Name & Config ── */}
                {step === 2 && (
                    <div className="space-y-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">Agent Name</label>
                            <input
                                className="w-full bg-[#252A31] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5] text-base"
                                placeholder="e.g. WheatBot, ShadowRaider…"
                                maxLength={32}
                                value={agentName}
                                onChange={e => setAgentName(e.target.value)}
                            />
                            <p className="text-xs text-gray-600 mt-1 text-right">{agentName.length}/32</p>
                        </div>

                        {/* Type-specific config */}
                        {selectedType === "farmer" && (
                            <div className="bg-[#252A31] rounded-2xl p-4 space-y-4">
                                <h4 className="font-bold text-sm text-gray-300">Farmer Strategy</h4>
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
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Auto Harvest</span>
                                    <button onClick={() => setAutoHarvest(v => !v)}
                                        className={`w-11 h-6 rounded-full transition-colors ${autoHarvest ? "bg-[#5964F5]" : "bg-[#353B45]"}`}>
                                        <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${autoHarvest ? "translate-x-5" : "translate-x-0"}`} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Auto Replant</span>
                                    <button onClick={() => setAutoReplant(v => !v)}
                                        className={`w-11 h-6 rounded-full transition-colors ${autoReplant ? "bg-[#5964F5]" : "bg-[#353B45]"}`}>
                                        <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${autoReplant ? "translate-x-5" : "translate-x-0"}`} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {selectedType === "trader" && (
                            <div className="bg-[#252A31] rounded-2xl p-4 space-y-4">
                                <h4 className="font-bold text-sm text-gray-300">Trader Strategy</h4>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs text-gray-400">Profit Trigger Rate</label>
                                        <span className="text-xs text-[#5964F5] font-bold">{profitRate}%</span>
                                    </div>
                                    <input type="range" min={5} max={50} value={profitRate} onChange={e => setProfitRate(+e.target.value)}
                                        className="w-full accent-[#5964F5]" />
                                </div>
                                <div>
                                    <label className="text-xs text-gray-400 mb-1 block">Max Single Swap (USDC)</label>
                                    <input type="number" min={1} max={100} value={maxSwap} onChange={e => setMaxSwap(+e.target.value)}
                                        className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-white outline-none focus:border-[#5964F5]" />
                                </div>
                            </div>
                        )}

                        {selectedType === "raider" && (
                            <div className="bg-[#252A31] rounded-2xl p-4 space-y-4">
                                <h4 className="font-bold text-sm text-gray-300">Raider Strategy</h4>
                                <div>
                                    <p className="text-xs text-gray-400 mb-2">Radar Level</p>
                                    <div className="flex gap-2">
                                        {([1,2,3] as const).map(l => (
                                            <button key={l} onClick={() => setRadarLevel(l)}
                                                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all
                                                    ${radarLevel === l ? "border-red-500 bg-red-500/20 text-red-400" : "border-[#353B45] text-gray-400"}`}>
                                                {l === 1 ? "Basic" : l === 2 ? "Advanced" : "Precision"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs text-gray-400">Max Daily Steals</label>
                                        <span className="text-xs text-red-400 font-bold">{maxSteals}</span>
                                    </div>
                                    <input type="range" min={1} max={20} value={maxSteals} onChange={e => setMaxSteals(+e.target.value)}
                                        className="w-full accent-red-500" />
                                </div>
                            </div>
                        )}

                        {selectedType === "defender" && (
                            <div className="bg-[#252A31] rounded-2xl p-4 space-y-4">
                                <h4 className="font-bold text-sm text-gray-300">Defender Strategy</h4>
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <label className="text-xs text-gray-400">Early Harvest Threshold</label>
                                        <span className="text-xs text-orange-400 font-bold">{earlyHarvest}%</span>
                                    </div>
                                    <input type="range" min={50} max={100} value={earlyHarvest} onChange={e => setEarlyHarvest(+e.target.value)}
                                        className="w-full accent-orange-400" />
                                    <p className="text-[10px] text-gray-600 mt-1">Harvest when crop reaches {earlyHarvest}% maturity</p>
                                </div>
                            </div>
                        )}

                        {/* Fund Controls */}
                        <div className="bg-[#252A31] rounded-2xl p-4 space-y-4">
                            <h4 className="font-bold text-sm text-gray-300">Fund Safety Controls</h4>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">Max Daily Gas (OKB)</label>
                                    <input type="number" step={0.01} value={maxGas} onChange={e => setMaxGas(+e.target.value)}
                                        className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#5964F5]" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs text-gray-400 mb-1 block">Max Daily (USDC)</label>
                                    <input type="number" step={1} value={maxUsdc} onChange={e => setMaxUsdc(+e.target.value)}
                                        className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#5964F5]" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 mb-1 block">Emergency Stop Balance (USDC)</label>
                                <input type="number" step={0.5} value={stopBalance} onChange={e => setStopBalance(+e.target.value)}
                                    className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#5964F5]" />
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Fund ── */}
                {step === 3 && typeInfo && (
                    <div className="space-y-4">
                        <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-3xl">{typeInfo.icon}</span>
                                <div>
                                    <p className="font-bold">{agentName || typeInfo.name}</p>
                                    <p className="text-xs text-gray-400 capitalize">{typeInfo.type} agent</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-500 bg-[#1A1F25] rounded-xl px-3 py-2">
                                SCA Address: <span className="text-gray-300 font-mono">0x…{Date.now().toString(16).slice(-8)}</span>
                            </p>
                        </div>

                        <div className="bg-[#252A31] rounded-2xl p-4 space-y-1">
                            <p className="text-xs text-gray-400 mb-3">💡 Recommended for {typeInfo.name}</p>
                            {selectedType === "trader"
                                ? <p className="text-sm text-gray-300">0.1 OKB (Gas) + 10 USDC (operations)</p>
                                : selectedType === "raider"
                                ? <p className="text-sm text-gray-300">0.2 OKB (Gas) + 5 USDC (operations)</p>
                                : <p className="text-sm text-gray-300">0.05 OKB (Gas) + 5 USDC (operations)</p>}
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">OKB to deposit</label>
                            <div className="relative">
                                <input type="number" step={0.01} value={okbAmount} onChange={e => setOkbAmount(e.target.value)}
                                    className="w-full bg-[#252A31] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5] pr-16" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">OKB</span>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm text-gray-400 mb-1.5">USDC to deposit</label>
                            <div className="relative">
                                <input type="number" step={1} value={usdcAmount} onChange={e => setUsdcAmount(e.target.value)}
                                    className="w-full bg-[#252A31] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5] pr-16" />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">USDC</span>
                            </div>
                        </div>

                        <div className="bg-[#1A1F25] rounded-xl px-4 py-3 text-xs text-gray-500">
                            Funds will be transferred to your Agent SCA address. You can withdraw unused funds at any time.
                        </div>
                    </div>
                )}

                {/* ── Step 4: Activate ── */}
                {step === 4 && !activated && (
                    <div className="space-y-4 text-center">
                        <div className="py-6">
                            <div className="text-6xl mb-4">{typeInfo?.icon ?? "🤖"}</div>
                            <h2 className="text-xl font-extrabold mb-2">Ready to Deploy!</h2>
                            <p className="text-gray-400 text-sm">Review your Agent configuration below and click Start to activate.</p>
                        </div>
                        <div className="bg-[#252A31] rounded-2xl p-4 text-left space-y-2">
                            <Row label="Name"    value={agentName || "—"} />
                            <Row label="Type"    value={typeInfo?.name ?? "—"} />
                            <Row label="OKB"     value={`${okbAmount} OKB`} />
                            <Row label="USDC"    value={`${usdcAmount} USDC`} />
                            <Row label="Max Gas" value={`${maxGas} OKB/day`} />
                            <Row label="Max Spend" value={`${maxUsdc} USDC/day`} />
                        </div>
                        <p className="text-xs text-gray-600">SCA: 0x…{Date.now().toString(16).slice(-8)}</p>
                    </div>
                )}

                {/* ── Activated ── */}
                {step === 4 && activated && (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="text-6xl mb-6 animate-bounce">🎉</div>
                        <h2 className="text-2xl font-extrabold mb-2 text-green-400">Agent Activated!</h2>
                        <p className="text-gray-400 text-sm mb-6">{agentName || typeInfo?.name} is now running on X Layer.</p>
                        <div className="bg-[#252A31] rounded-xl px-4 py-3 w-full flex items-center justify-between mb-8">
                            <span className="text-xs text-gray-500 font-mono truncate">0x…{Date.now().toString(16).slice(-8)}</span>
                            <button onClick={() => navigator.clipboard.writeText("0x…")} className="text-xs text-[#5964F5] font-semibold ml-2">Copy</button>
                        </div>
                        <button onClick={() => router.push("/agents")}
                            className="w-full bg-[#5964F5] rounded-xl py-3 font-bold text-white">
                            View My Agents
                        </button>
                    </div>
                )}
            </div>

            {/* Bottom Button */}
            {!(step === 4 && activated) && (
                <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#1A1F25] border-t border-[#252A31]">
                    <div className="flex gap-3">
                        {step > 1 && (
                            <button onClick={() => setStep(s => s - 1)}
                                className="flex-1 border border-[#353B45] rounded-xl py-3 text-gray-300 font-semibold">
                                Back
                            </button>
                        )}
                        <button
                            disabled={
                                (step === 1 && !selectedType) ||
                                (step === 2 && !agentName.trim()) ||
                                (step === 4 && activating)
                            }
                            onClick={() => {
                                if (step < 4) setStep(s => s + 1)
                                else handleActivate()
                            }}
                            className="flex-1 bg-[#5964F5] rounded-xl py-3 font-bold text-white disabled:opacity-40 transition-opacity"
                        >
                            {step === 4 ? (activating ? "Activating…" : "Start Agent") : "Next →"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-center py-1 border-b border-[#353B45] last:border-0">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-sm font-semibold">{value}</span>
        </div>
    )
}
