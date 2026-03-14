"use client"
import { useData } from "@/components/context/dataContext"
import ArtelaTaskModal from "@/components/earn/artelaTaskModal"
import DailyTaskModal from "@/components/earn/dailyTaskModal"
import EarnPage from "@/components/earn/earnpage"
import InGameTaskModal from "@/components/earn/inTaskModal"
import LoadingModal from "@/components/game/loadingmodal"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Earn")
    }, [])

    return (
        <main className="h-screen w-full flex justify-start items-center flex-col z-10">
            <EarnPage />
            <ArtelaTaskModal />
            <DailyTaskModal />
            <InGameTaskModal />
            <LoadingModal />
        </main>
    )
}
