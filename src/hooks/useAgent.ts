import { useState, useEffect } from 'react';

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'idle' | 'paused' | 'error' | 'out_of_funds';
  personality?: 'aggressive' | 'conservative' | 'balanced';
  strategyType?: 'farming' | 'trading' | 'social';
  aiModel?: string;
  customPrompt?: string;
  temperature?: number;
  totalProfit: number;
  totalTasks: number;
  successRate: number;
  balance_okb: number;
  balance_usdc: number;
  sca_address: string;
  stats: {
    total_actions: number;
    total_earned_coin: number;
    win_rate: number;
    ranking: number;
    steal_success_count?: number;
    steal_fail_count?: number;
    total_spent_gas: number;
    total_spent_usdc: number;
  };
  logs?: any[];
  last_active_at: string;
}

export function useAgent(agentId: string) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgent();
  }, [agentId]);

  const fetchAgent = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/agents/${agentId}`);
      if (!response.ok) throw new Error('Failed to fetch agent');
      const data = await response.json();
      setAgent(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/start`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to start agent');
      const data = await response.json();
      setAgent(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const stopAgent = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/stop`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to stop agent');
      const data = await response.json();
      setAgent(data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const triggerDecision = async () => {
    try {
      const response = await fetch(`/api/agents/${agentId}/decide`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to trigger decision');
      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    agent,
    isLoading,
    error,
    startAgent,
    stopAgent,
    triggerDecision,
    refetch: fetchAgent,
  };
}
