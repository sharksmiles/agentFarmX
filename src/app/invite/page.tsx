"use client"
import { useData } from "@/components/context/dataContext"
import InvitesPage from "@/components/invite/invitespage"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()

    useEffect(() => {
        setCurrentTab("Invite")
    }, [])

    return (
        <main className="h-screen w-full flex justify-center items-center flex-col z-10">
            <InvitesPage />
        </main>
    )
}
