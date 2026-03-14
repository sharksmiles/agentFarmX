"use client"
import { useData } from "@/components/context/dataContext"
import WalletInfo from "@/components/wallet/walletInfo"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Wallet")
    }, [setCurrentTab])

    return (
        <main className="h-screen w-full bg-[#F8F8F8] z-10">
            <WalletInfo />
        </main>
    )
}
