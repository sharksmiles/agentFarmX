"use client";

import { Brain, CheckCircle, XCircle, Clock, DollarSign, X } from "lucide-react";
import { useEffect } from "react";

interface DecisionDetailModalProps {
  decision: {
    id: string;
    model: string;
    prompt?: string;
    response: string;
    decisions: Array<{
      skillName: string;
      parameters: any;
      reasoning?: string;
    }>;
    reasoning?: string;
    tokensUsed: number;
    cost: number;
    latency: number;
    executed: boolean;
    success: boolean;
    createdAt: string;
  } | null;
  open: boolean;
  onClose: () => void;
}

export function DecisionDetailModal({ decision, open, onClose }: DecisionDetailModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open || !decision) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1F25] rounded-2xl w-full max-w-3xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1A1F25] border-b border-[#353B45] p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-bold">AI 决策详情</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="决策 ID" value={decision.id.slice(0, 8)} />
            <InfoItem label="模型" value={decision.model} />
            <InfoItem label="Token 消耗" value={decision.tokensUsed.toLocaleString()} />
            <InfoItem label="成本" value={`$${decision.cost.toFixed(4)}`} />
            <InfoItem label="延迟" value={`${decision.latency}ms`} />
            <InfoItem
              label="状态"
              value={
                <StatusBadge
                  executed={decision.executed}
                  success={decision.success}
                />
              }
            />
          </div>

          <div className="border-t border-[#353B45]" />

          {/* 决策理由 */}
          {decision.reasoning && (
            <>
              <div>
                <h3 className="font-semibold mb-2">决策理由</h3>
                <div className="bg-[#252A31] p-4 rounded-xl border border-[#353B45]">
                  <p className="text-sm text-gray-300">{decision.reasoning}</p>
                </div>
              </div>
              <div className="border-t border-[#353B45]" />
            </>
          )}

          {/* Skills 执行序列 */}
          <div>
            <h3 className="font-semibold mb-3">
              执行计划 ({decision.decisions.length} 个任务)
            </h3>
            <div className="space-y-3">
              {decision.decisions.map((d, index) => (
                <SkillExecutionItem key={index} skill={d} index={index} />
              ))}
            </div>
          </div>

          {/* LLM 原始响应 */}
          <details className="border border-[#353B45] rounded-xl p-4">
            <summary className="cursor-pointer font-semibold text-sm">
              LLM 原始响应
            </summary>
            <pre className="mt-3 text-xs bg-[#252A31] p-3 rounded-lg overflow-x-auto text-gray-300">
              {decision.response}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ executed, success }: { executed: boolean; success: boolean }) {
  if (!executed) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-500/20 text-gray-400 rounded-lg text-xs">
        <Clock className="w-3 h-3" />
        待执行
      </span>
    );
  }

  return success ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs">
      <CheckCircle className="w-3 h-3" />
      成功
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs">
      <XCircle className="w-3 h-3" />
      失败
    </span>
  );
}

function SkillExecutionItem({ skill, index }: { skill: any; index: number }) {
  return (
    <div className="flex items-start gap-3 p-3 border border-[#353B45] rounded-xl bg-[#252A31]">
      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-semibold shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm mb-1">{skill.skillName}</p>
        {skill.reasoning && (
          <p className="text-xs text-gray-400 mb-2">{skill.reasoning}</p>
        )}
        <div className="inline-block px-2 py-1 bg-[#1A1F25] rounded-lg text-xs text-gray-400">
          参数: {JSON.stringify(skill.parameters)}
        </div>
      </div>
    </div>
  );
}
