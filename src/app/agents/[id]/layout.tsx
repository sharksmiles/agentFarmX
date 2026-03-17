"use client";

export default function AgentDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="w-full min-h-screen bg-[#1A1F25] text-white">
      {/* Tab Content */}
      <div className="pb-32">{children}</div>
    </div>
  );
}
