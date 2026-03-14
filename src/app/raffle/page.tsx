"use client"
import { useData } from "@/components/context/dataContext"
import RafflePage from "@/components/raffle/rafflepage"
import RafflePageEntry from "@/components/raffle/rafflepageentry"
import RafflePageResult from "@/components/raffle/rafflepageresult"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()
    useEffect(() => {
        setCurrentTab(null)
    }, [])

    return (
        <main className="h-screen w-full z-10 raffle-background-image">
            <RafflePageEntry />
            <RafflePageResult />
            <RafflePage />
        </main>
    )
}
