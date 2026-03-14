"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { Brain, LayoutDashboard, Zap, History, TrendingUp, Settings } from "lucide-react";

const TABS = [
  { id: "dashboard", label: "面板", icon: LayoutDashboard, href: "" },
  { id: "skills", label: "Skills", icon: Zap, href: "/skills" },
  { id: "decisions", label: "决策", icon: Brain, href: "/decisions" },
  { id: "performance", label: "性能", icon: TrendingUp, href: "/performance" },
  { id: "settings", label: "设置", icon: Settings, href: "/settings" },
];

export default function AgentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const agentId = params.id as string;

  const getActiveTab = () => {
    if (pathname.endsWith("/skills")) return "skills";
    if (pathname.endsWith("/decisions")) return "decisions";
    if (pathname.endsWith("/performance")) return "performance";
    if (pathname.endsWith("/settings")) return "settings";
    return "dashboard";
  };

  const activeTab = getActiveTab();

  return (
    <div className="w-full min-h-screen bg-[#1A1F25] text-white">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-10 bg-[#1A1F25] border-b border-[#353B45]">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/agents">
            <button className="text-gray-400 hover:text-white transition-colors">
              ← 返回
            </button>
          </Link>
          <h1 className="text-xl font-bold">Agent 详情</h1>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide border-t border-[#353B45]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const href = `/agents/${agentId}${tab.href}`;

            return (
              <Link key={tab.id} href={href} className="flex-shrink-0">
                <button
                  className={`
                    px-4 py-3 flex items-center gap-2 border-b-2 transition-colors
                    ${
                      isActive
                        ? "border-[#5964F5] text-white"
                        : "border-transparent text-gray-400 hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="pb-32">{children}</div>
    </div>
  );
}
