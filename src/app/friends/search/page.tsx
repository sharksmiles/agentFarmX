"use client"
import { useData } from "@/components/context/dataContext"
import FriendRequest from "@/components/friends/friendsearchpage"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()
    useEffect(() => {
        setCurrentTab(null)
    }, [setCurrentTab])

    return (
        <main className="h-screen w-full z-10">
            <FriendRequest />
        </main>
    )
}
