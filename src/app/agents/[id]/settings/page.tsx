"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Save, AlertCircle } from "lucide-react";

interface AgentSettings {
  aiModel: string;
  customPrompt: string;
  temperature: number;
  strategyType: string;
  personality: string;
}

export default function AgentSettingsPage() {
  const params = useParams();
  const agentId = params.id as string;

  const [settings, setSettings] = useState<AgentSettings>({
    aiModel: "gpt-3.5-turbo",
    customPrompt: "",
    temperature: 0.7,
    strategyType: "balanced",
    personality: "balanced",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveSuccess(false);

      const response = await fetch(`/api/agents/${agentId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Agent 设置</h2>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-[#5964F5] hover:bg-[#4854E4] px-4 py-2 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? "保存中..." : "保存设置"}
        </button>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-sm text-green-400">
          ✓ 设置已保存
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* AI 模型选择 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">AI 模型</h3>
        <select
          value={settings.aiModel}
          onChange={(e) => setSettings({ ...settings, aiModel: e.target.value })}
          className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5]"
        >
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo (推荐)</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
          <option value="claude-3-haiku">Claude 3 Haiku (最便宜)</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          <option value="gemini-pro">Gemini Pro</option>
        </select>
        <p className="text-xs text-gray-500 mt-2">
          选择不同的模型会影响决策质量和成本
        </p>
      </div>

      {/* 温度参数 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">温度参数</h3>
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings.temperature}
            onChange={(e) =>
              setSettings({ ...settings, temperature: parseFloat(e.target.value) })
            }
            className="w-full"
          />
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">保守 (0.0)</span>
            <span className="font-bold text-[#5964F5]">{settings.temperature.toFixed(1)}</span>
            <span className="text-gray-500">创新 (2.0)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          较低的温度使输出更确定，较高的温度使输出更随机
        </p>
      </div>

      {/* 策略类型 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">策略类型</h3>
        <div className="grid grid-cols-3 gap-3">
          {["farming", "trading", "social"].map((type) => (
            <button
              key={type}
              onClick={() => setSettings({ ...settings, strategyType: type })}
              className={`px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                settings.strategyType === type
                  ? "bg-[#5964F5] text-white"
                  : "bg-[#1A1F25] text-gray-400 hover:bg-[#5964F5]/20"
              }`}
            >
              {type === "farming" && "🌾 种植"}
              {type === "trading" && "📈 交易"}
              {type === "social" && "👥 社交"}
            </button>
          ))}
        </div>
      </div>

      {/* 性格设置 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">性格</h3>
        <div className="grid grid-cols-3 gap-3">
          {["aggressive", "balanced", "conservative"].map((personality) => (
            <button
              key={personality}
              onClick={() => setSettings({ ...settings, personality })}
              className={`px-4 py-3 rounded-xl font-medium text-sm transition-colors ${
                settings.personality === personality
                  ? "bg-[#5964F5] text-white"
                  : "bg-[#1A1F25] text-gray-400 hover:bg-[#5964F5]/20"
              }`}
            >
              {personality === "aggressive" && "⚔️ 激进"}
              {personality === "balanced" && "⚖️ 平衡"}
              {personality === "conservative" && "🛡️ 保守"}
            </button>
          ))}
        </div>
      </div>

      {/* 自定义提示词 */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">自定义提示词</h3>
        <textarea
          value={settings.customPrompt}
          onChange={(e) => setSettings({ ...settings, customPrompt: e.target.value })}
          placeholder="输入自定义的 AI 提示词，用于指导 Agent 的决策行为..."
          rows={6}
          className="w-full bg-[#1A1F25] border border-[#353B45] rounded-xl px-4 py-3 text-white outline-none focus:border-[#5964F5] resize-none"
        />
        <p className="text-xs text-gray-500 mt-2">
          留空则使用默认提示词。自定义提示词可以让 Agent 更符合你的需求。
        </p>
      </div>

      {/* 危险区域 */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4">
        <h3 className="font-bold text-sm mb-3 text-red-400">危险区域</h3>
        <button className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-3 rounded-xl font-semibold text-sm transition-colors">
          重置为默认设置
        </button>
      </div>
    </div>
  );
}
