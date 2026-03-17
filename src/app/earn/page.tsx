"use client"
import { useData } from "@/components/context/dataContext"
import DailyTaskModal from "@/components/earn/dailyTaskModal"
import EarnPage from "@/components/earn/earnpage"
import InGameTaskModal from "@/components/earn/inTaskModal"
import GameModal from "@/components/game/gameModal"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Earn")
    }, [setCurrentTab])

    return (
        <main className="h-screen w-full flex justify-start items-center flex-col z-10">
            <EarnPage />
            <DailyTaskModal />
            <InGameTaskModal />
            <GameModal />
        </main>
    )
}
