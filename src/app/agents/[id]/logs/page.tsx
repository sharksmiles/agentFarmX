"use client";

import { useParams, useRouter } from "next/navigation";
import { useAgentDecisions } from "@/hooks/useAgentDecisions";
import { Brain, CheckCircle, XCircle, Clock, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export default function AgentDecisionsPage() {
  const params = useParams();
  const router = useRouter();
  const agentId = params.id as string;
  const { decisions, stats, isLoading } = useAgentDecisions(agentId, { limit: 20 });

  if (isLoading) {
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

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-3 border-b border-[#252A31]">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold">Logs</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Statistics card */}
      <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
        <h3 className="font-bold text-sm mb-3 text-gray-300">Log Statistics</h3>
        <div className="grid grid-cols-3 gap-3">
          <StatItem label="Total Tokens" value={stats.totalTokens.toLocaleString()} />
          <StatItem label="Total Cost" value={`$${stats.totalCost.toFixed(4)}`} />
          <StatItem label="Avg Latency" value={`${stats.avgLatency.toFixed(0)}ms`} />
        </div>
      </div>

      {/* Log list */}
      <div>
        <h2 className="text-xl font-bold mb-3">Log History</h2>
        <div className="space-y-3">
          {decisions.map((decision) => (
            <DecisionCard key={decision.id} decision={decision} />
          ))}
        </div>
      </div>

      {decisions.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-semibold">No logs yet</p>
          <p className="text-sm mt-1">Agent execution logs will appear here</p>
        </div>
      )}
      </div>
    </div>
  );
}

function DecisionCard({ decision }: { decision: any }) {
  const skillCount = decision.decisions?.length || 0;
  const timeAgo = formatDistanceToNow(new Date(decision.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  return (
    <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
      <div className="flex items-start gap-3">
        {/* Status icon */}
        <div className="mt-1">
          {decision.executed ? (
            decision.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )
          ) : (
            <Clock className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* Decision content */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-medium text-sm">
              {decision.executed ? "Executed" : "Pending"} · {skillCount} tasks
            </p>
            <span className="text-xs text-gray-500">{timeAgo}</span>
          </div>

          {/* Reasoning */}
          {decision.reasoning && (
            <p className="text-sm text-gray-400 line-clamp-2">
              {decision.reasoning}
            </p>
          )}

          {/* Skills list */}
          {decision.decisions && decision.decisions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {decision.decisions.slice(0, 3).map((d: any, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-[#1A1F25] rounded-lg text-xs text-gray-300"
                >
                  {d.skillName}
                </span>
              ))}
              {skillCount > 3 && (
                <span className="px-2 py-1 bg-[#1A1F25] rounded-lg text-xs text-gray-500">
                  +{skillCount - 3}
                </span>
              )}
            </div>
          )}

          {/* Cost info */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Model: {decision.model}</span>
            <span>Token: {decision.tokensUsed}</span>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {decision.cost.toFixed(4)}
            </span>
            <span>{decision.latency}ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1A1F25] rounded-xl px-3 py-2.5">
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}
