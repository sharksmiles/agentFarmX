"use client"

import { useUser } from "@/components/context/userContext"
import ConnectWallet from "@/components/wallet/connectWallet"
import { Loader2 } from "lucide-react"
import { ReactNode } from "react"

interface AuthGateProps {
    children: ReactNode
}

export default function AuthGate({ children }: AuthGateProps) {
    const { isAuthenticated, isSessionRestored } = useUser()

    if (!isSessionRestored) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1A1F25]">
                <Loader2 size={36} className="animate-spin text-[#5964F5]" />
            </div>
        )
    }

    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-end bg-[#1A1F25]">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse at 30% 20%, rgba(89,100,245,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(89,100,245,0.10) 0%, transparent 60%)",
                    }}
                />
                <ConnectWallet />
            </div>
        )
    }

    return <>{children}</>
}
