import { useState, useEffect } from 'react';

export interface AgentSkill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'farming' | 'trading' | 'social' | 'strategy';
  parameters: any;
  energyCost: number;
  cooldown: number;
  requiredLevel: number;
  isActive: boolean;
  totalUsages: number;
  successCount: number;
  usageCount?: number;
  recommended?: boolean;
  successRate?: number;
}

export function useAgentSkills(agentId: string, category?: string) {
  const [skills, setSkills] = useState<AgentSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSkills();
  }, [agentId, category]);

  const fetchSkills = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      
      const response = await fetch(`/api/agents/${agentId}/skills?${params}`);
      if (!response.ok) throw new Error('Failed to fetch skills');
      
      const data = await response.json();
      setSkills(data.skills || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    skills,
    isLoading,
    error,
    refetch: fetchSkills,
  };
}
