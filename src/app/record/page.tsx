"use client"
import { useData } from "@/components/context/dataContext"
import Record from "@/components/record/record"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()
    useEffect(() => {
        setCurrentTab(null)
    }, [setCurrentTab])

    return (
        <main className="h-screen w-full z-10">
            <Record />
        </main>
    )
}
