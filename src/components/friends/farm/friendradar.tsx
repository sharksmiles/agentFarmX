"use client"
import Image from "next/image"
import React from "react"
import { MOCK_FRIENDS } from "@/utils/mock/mockData"
import { useRouter } from "next/navigation"
import { useData } from "@/components/context/dataContext"

export const FriendRadar = () => {
    const router = useRouter()
    const { setRadaring, setNotification } = useData()
    const handleRadar = async () => {
        setRadaring(true)
        setTimeout(() => {
            const target = MOCK_FRIENDS[Math.floor(Math.random() * MOCK_FRIENDS.length)]
            router.push("/friends/farm/ra/" + target.id)
            setRadaring(false)
        }, 600)
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
