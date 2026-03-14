"use client";

import { useParams } from "next/navigation";
import { useAgentSkills } from "@/hooks/useAgentSkills";
import { Zap, Clock, Star, TrendingUp } from "lucide-react";

const CATEGORY_COLORS = {
  farming: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  trading: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  social: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  strategy: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function AgentSkillsPage() {
  const params = useParams();
  const agentId = params.id as string;
  const { skills, isLoading } = useAgentSkills(agentId);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#252A31] rounded-2xl h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">可用技能</h2>
        <div className="text-sm text-gray-400">{skills.length} 个技能</div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {skills.map((skill) => (
          <SkillCard key={skill.id} skill={skill} />
        ))}
      </div>

      {skills.length === 0 && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-3">⚡</p>
          <p className="text-lg font-semibold">暂无可用技能</p>
          <p className="text-sm mt-1">技能系统正在开发中</p>
        </div>
      )}
    </div>
  );
}

function SkillCard({ skill }: { skill: any }) {
  const categoryColor = CATEGORY_COLORS[skill.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.strategy;

  return (
    <div className="bg-[#252A31] rounded-2xl p-4 border border-[#353B45]">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-bold text-base">{skill.displayName}</h3>
            {skill.recommended && (
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            )}
          </div>
          <span className={`inline-block px-2 py-1 rounded-lg text-xs font-medium ${categoryColor}`}>
            {skill.category}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
        {skill.description}
      </p>

      {/* 使用统计 */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>使用 {skill.usageCount || 0} 次</span>
        </div>
        {skill.successRate > 0 && (
          <div>成功率 {skill.successRate.toFixed(0)}%</div>
        )}
      </div>

      {/* 限制条件 */}
      <div className="flex items-center gap-2">
        {skill.energyCost > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-[#1A1F25] rounded-lg text-xs">
            <Zap className="w-3 h-3 text-yellow-500" />
            <span>{skill.energyCost} 能量</span>
          </div>
        )}
        {skill.cooldown > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-[#1A1F25] rounded-lg text-xs">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>{skill.cooldown}s 冷却</span>
          </div>
        )}
      </div>
    </div>
  );
}
