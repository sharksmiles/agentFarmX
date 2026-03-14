"use client"
import { useData } from "@/components/context/dataContext"
import FriendsPage from "@/components/friends/friendspage"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Friends")
    }, [])

    return (
        <main className="h-screen w-full flex justify-center items-center flex-col z-10">
            <FriendsPage />
        </main>
    )
}
