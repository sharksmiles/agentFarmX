"use client"
import Image from "next/image"
import React from "react"
import { fetchMockFriends } from "@/utils/api/mock"
import { useRouter } from "next/navigation"
import { useData } from "@/components/context/dataContext"

export const FriendRadar = () => {
    const router = useRouter()
    const { setRadaring, setNotification } = useData()
    const handleRadar = async () => {
        setRadaring(true)
        try {
            const mockFriends = await fetchMockFriends()
            setTimeout(() => {
                const target = mockFriends[Math.floor(Math.random() * mockFriends.length)]
                if (target) {
                    router.push("/friends/farm/ra/" + target.id)
                }
                setRadaring(false)
            }, 600)
        } catch (error) {
            console.error("Radar failed", error)
            setRadaring(false)
        }
    }

    return (
        <>
            <div
                className="absolute right-[16px] bottom-[16px] z-[10] cursor-pointer bg-light-dark rounded-full hover:opacity-90"
                onClick={handleRadar}
            >
                <Image
                    src="/game/radar-big.png"
                    height={60}
                    width={60}
                    alt="Radar"
                    quality={100}
                    priority={true}
                    loading="eager"
                    className=""
                />
            </div>
        </>
    )
}
