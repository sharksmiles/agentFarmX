"use client"

import { useUser } from "@/components/context/userContext"
import ConnectWallet from "@/components/wallet/connectWallet"
import { Loader2 } from "lucide-react"
import { ReactNode } from "react"
import { DotLottiePlayer } from "@dotlottie/react-player"

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
                    
                />
                <DotLottiePlayer
                    src="/lottie/Animation - 1717803683490.lottie"
                    autoplay
                    loop
                    style={{
                        width: "30%",
                        height: "30%",
                        position: "relative",
                        top: "-50%",
                    }}
                />
                <ConnectWallet />
            </div>
        )
    }

    return <>{children}</>
}
