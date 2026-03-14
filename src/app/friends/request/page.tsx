"use client"
import { useData } from "@/components/context/dataContext"
import FriendsRequestsPage from "@/components/friends/friendsrequesetspage"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()
    useEffect(() => {
        setCurrentTab(null)
    }, [])

    return (
        <main className="h-screen w-full z-10">
            <FriendsRequestsPage />
        </main>
    )
}
