"use client";

import { Brain, Zap, RefreshCw, TrendingUp } from "lucide-react";
import { useState } from "react";

interface QuickActionsPanelProps {
  agentId: string;
  onTriggerDecision?: () => Promise<any>;
  onRefresh?: () => void;
}

export function QuickActionsPanel({ agentId, onTriggerDecision, onRefresh }: QuickActionsPanelProps) {
  const [isDeciding, setIsDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDecision = async () => {
    if (!onTriggerDecision) return;
    
    try {
      setIsDeciding(true);
      setError(null);
      const result = await onTriggerDecision();
      
      // 显示成功提示
      if (typeof window !== 'undefined' && result) {
        alert(`AI 决策完成！生成 ${result.decisions?.length || 0} 个任务`);
      }
    } catch (err: any) {
      setError(err.message || '决策失败，请重试');
    } finally {
      setIsDeciding(false);
    }
  };

  return (
    <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-yellow-500" />
        <h3 className="font-bold text-base">快速操作</h3>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleDecision}
          disabled={isDeciding}
          className="w-full flex items-center gap-2 px-4 py-3 bg-[#1A1F25] hover:bg-[#5964F5]/20 border border-[#353B45] hover:border-[#5964F5] rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium">
            {isDeciding ? "思考中..." : "触发 AI 决策"}
          </span>
        </button>

        <button
          onClick={onRefresh}
          className="w-full flex items-center gap-2 px-4 py-3 bg-[#1A1F25] hover:bg-[#5964F5]/20 border border-[#353B45] hover:border-[#5964F5] rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium">刷新状态</span>
        </button>

        <button
          className="w-full flex items-center gap-2 px-4 py-3 bg-[#1A1F25] hover:bg-[#5964F5]/20 border border-[#353B45] hover:border-[#5964F5] rounded-xl transition-colors"
        >
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">查看性能报告</span>
        </button>
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
