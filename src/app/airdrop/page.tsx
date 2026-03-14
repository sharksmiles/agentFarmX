"use client"
import { AirdropPage } from "@/components/airdrop"
import { useData } from "@/components/context/dataContext"
import NotificationProvider from "@/components/context/notificationContext"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()
    useEffect(() => {
        setCurrentTab(null)
    }, [setCurrentTab])
    return (
        <main className="h-screen w-full flex justify-center items-center flex-col z-10">
            <NotificationProvider>
                <AirdropPage />
            </NotificationProvider>
        </main>
    )
}
