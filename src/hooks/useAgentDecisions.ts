import { useState, useEffect, useCallback } from 'react';
import { fetchAgentDecisions as fetchDecisionsApi } from '@/utils/api/agents';
import { AgentDecision } from '@/utils/types/agent';

// Re-export for convenience
export type { AgentDecision };

export function useAgentDecisions(
  agentId: string,
  options?: { limit?: number; offset?: number }
) {
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalTokens: 0,
    totalCost: 0,
    avgLatency: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = useCallback(async () => {
    if (!agentId) return;
    
    try {
      setIsLoading(true);
      // 使用 apiClient 发送请求，自动携带 Authorization 头
      const data = await fetchDecisionsApi(agentId, options?.limit || 10);
      setDecisions(data.decisions || []);
      setTotal(data.total || 0);
      setStats(data.stats || { totalTokens: 0, totalCost: 0, avgLatency: 0 });
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch decisions');
    } finally {
      setIsLoading(false);
    }
  }, [agentId, options?.limit, options?.offset]);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);

  return {
    decisions,
    total,
    stats,
    isLoading,
    error,
    refetch: fetchDecisions,
  };
}
