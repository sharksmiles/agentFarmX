"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { fetchAgentDetail, updateAgentConfig, Agent } from "@/utils/api/agents";

const CROP_OPTIONS = ["Wheat", "Corn", "Carrot", "Potato", "Tomato", "Strawberry", "Pineapple", "Watermelon"];

interface AgentSettings {
  aiModel: string;
  customPrompt: string;
}

export default function AgentSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [settings, setSettings] = useState<AgentSettings>({
    aiModel: "gpt-3.5-turbo",
    customPrompt: "",
  });

  // Fund Safety Controls
  const cfg = agent ? (agent.strategyConfig || {}) : {};
  const [maxGas, setMaxGas] = useState<number>(cfg.max_daily_gas_okb ?? 0.05);
  const [maxUsdc, setMaxUsdc] = useState<number>(cfg.max_daily_spend_usdc ?? 10);
  const [stopBalance, setStopBalance] = useState<number>(cfg.emergency_stop_balance ?? 1);

  // Farming Strategy (种植)
  const [preferredCrops, setPreferredCrops] = useState<string[]>(cfg.preferred_crops ?? ["Wheat"]);
  const [autoHarvest, setAutoHarvest] = useState<boolean>(cfg.auto_harvest ?? true);
  const [autoReplant, setAutoReplant] = useState<boolean>(cfg.auto_replant ?? true);

  // Raider Strategy (社交/偷菜)
  const [radarLevel, setRadarLevel] = useState<1 | 2 | 3>((cfg.radar_level as 1 | 2 | 3) ?? 2);
  const [maxSteals, setMaxSteals] = useState<number>(cfg.max_daily_steals ?? 5);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Agent editable fields
  const [agentName, setAgentName] = useState<string>("");
  const [scaAddress, setScaAddress] = useState<string>("");

  useEffect(() => {
    fetchAgentDetail(agentId)
      .then((data) => {
        setAgent(data);
        const config = data.strategyConfig || {};
        setMaxGas(config.max_daily_gas_okb ?? 0.05);
        setMaxUsdc(config.max_daily_spend_usdc ?? 10);
        setStopBalance(config.emergency_stop_balance ?? 1);
        // Strategy configs
        setPreferredCrops(config.preferred_crops ?? ["Wheat"]);
        setAutoHarvest(config.auto_harvest ?? true);
        setAutoReplant(config.auto_replant ?? true);
        setRadarLevel((config.radar_level as 1 | 2 | 3) ?? 2);
        setMaxSteals(config.max_daily_steals ?? 5);
        // Agent editable fields
        setAgentName(data.name || "");
        setScaAddress(data.scaAddress || "");
      })
      .catch(() => { });

    fetchSettings();
  }, [agentId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/settings`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch settings:", err);
    }
  };

  const toggleCrop = (crop: string) => {
    setPreferredCrops(prev =>
      prev.includes(crop) ? prev.filter(c => c !== crop) : [...prev, crop]
    );
  };

  const handleSave = async () => {
    if (!agent) return;
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      // Save settings
      const settingsResponse = await fetch(`/api/agents/${agentId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!settingsResponse.ok) throw new Error("Failed to save settings");

      // Save strategy config (只支持 farming 和 raider 两种策略)
      const config = agent.strategyType === "farming"
        ? { preferred_crops: preferredCrops, auto_harvest: autoHarvest, auto_replant: autoReplant, max_daily_gas_okb: maxGas, max_daily_spend_usdc: maxUsdc, emergency_stop_balance: stopBalance }
        : { radar_level: radarLevel, max_daily_steals: maxSteals, max_daily_gas_okb: maxGas, max_daily_spend_usdc: maxUsdc, emergency_stop_balance: stopBalance };

      await updateAgentConfig(agentId, config);

      // Save agent basic info
      await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: agentName }),
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save. Please try again");
    } finally {
      setIsSaving(false);
    }
  };

  if (!agent) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#252A31] rounded-2xl h-32" />
          ))}
        </div>
      </div>
    );
  }

  const agentType = agent.strategyType;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-[#252A31]">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold">Settings</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* Strategy Config - Farming (种植) */}
        {agentType === "farming" && (
          <Section title="Farming Strategy" icon="🌾">
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

        {/* Strategy Config - Raider (社交/偷菜) */}
        {agentType === "raider" && (
          <Section title="Raider Strategy" icon="⚔️">
            <div>
              <p className="text-xs text-gray-400 mb-2">Radar Level</p>
              <div className="flex gap-2">
                {[1, 2, 3].map(level => (
                  <button key={level} onClick={() => setRadarLevel(level as 1 | 2 | 3)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all
                    ${radarLevel === level
                        ? "border-purple-500 bg-purple-500/20 text-purple-400"
                        : "border-[#353B45] text-gray-400"}`}>
                    Level {level}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                Higher level = wider search range for targets
              </p>
            </div>
            <NumberInput
              label="Max Daily Steals"
              value={maxSteals}
              step={1}
              onChange={setMaxSteals}
              description="Maximum number of steal attempts per day"
            />
          </Section>
        )}

        {/* Agent Info */}
        <Section title="Agent Info" icon="📋">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-[#5964F5]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">SCA Address</label>
            <input
              type="text"
              value={scaAddress}
              readOnly
              className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-3 py-2 text-gray-500 text-sm outline-none cursor-not-allowed"
            />
          </div>
        </Section>
        
        {/* AI Model Selection */}
        <Section title="AI Model" icon="🤖">
          <select
            value={settings.aiModel}
            onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
            className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5]"
          >
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Recommended)</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="claude-3-haiku">Claude 3 Haiku (Cheapest)</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            <option value="gemini-pro">Gemini Pro</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">
            Different models affect decision quality and cost
          </p>
        </Section>

        {/* Custom Prompt */}
        <Section title="Custom Prompt" icon="✏️">
          <textarea
            value={settings.customPrompt}
            onChange={(e) => setSettings({ ...settings, customPrompt: e.target.value })}
            placeholder="Enter custom AI prompt to guide Agent decisions..."
            rows={6}
            className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5] resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            Leave empty to use default prompt. Custom prompts help tailor Agent behavior to your needs.
          </p>
        </Section>

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

        {/* Status Messages */}
        {saveSuccess && (
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">
            ✓ Settings saved
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

      </div>

      {/* Sticky Save Button */}
      <div className="shrink-0 px-4 py-4 bg-[#1A1F25] border-t border-[#252A31]">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all ${saveSuccess
              ? "bg-green-500"
              : isSaving
                ? "bg-[#5964F5]/60"
                : "bg-[#5964F5]"
            }`}
        >
          {saveSuccess ? "✓ Settings saved" : isSaving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45] space-y-4">
      <h3 className="font-bold text-sm text-gray-200 flex items-center gap-2">
        <span>{icon}</span>{title}
      </h3>
      {children}
    </div>
  );
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
  );
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
  );
}
