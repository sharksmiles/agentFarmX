import { useState, useEffect } from 'react';

export interface AgentDecision {
  id: string;
  agentId: string;
  model: string;
  prompt: string;
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
}

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

  useEffect(() => {
    fetchDecisions();
  }, [agentId, options?.limit, options?.offset]);

  const fetchDecisions = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const response = await fetch(`/api/agents/${agentId}/decisions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch decisions');

      const data = await response.json();
      setDecisions(data.decisions || []);
      setTotal(data.total || 0);
      setStats(data.stats || { totalTokens: 0, totalCost: 0, avgLatency: 0 });
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    decisions,
    total,
    stats,
    isLoading,
    error,
    refetch: fetchDecisions,
  };
}
