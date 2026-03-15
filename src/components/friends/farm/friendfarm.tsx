"use client"

import React, { useEffect, useState } from "react"
import FriendGameStats from "./friendgamestats"
import FriendGamePad from "./friendgamepad"
import { useData } from "@/components/context/dataContext"
import { useRouter } from "next/navigation"
import Loader from "@/components/loader/Loader"
import { AnimatePresence } from "framer-motion"
import { motion } from "framer-motion"
import { FriendStats, StealConfirmationTypes } from "@/utils/types"
import FriendStealConfirmation from "./friendstealconfirmation"
import { FriendRadar } from "@/components/friends/farm/friendradar"

const FriendFarm = ({
    id,
    action,
}: {
    id: string
    action: "f" | "r" | "s" | "i" | "re" | "ra" | "il"
}) => {
    const { setCurrentTab } = useData()
    const [friendStats, setFriendStats] = useState<FriendStats | null>(null)
    const [stealLoading, setStealLoading] = useState<"caculate" | "steal" | null>(null)
    const [stealConfirmation, setStealConfirmation] = useState<StealConfirmationTypes | null>(null)
    const router = useRouter()

    useEffect(() => {
        setCurrentTab(null)
        setFriendStats(null)
    }, [id, setCurrentTab])

    return (
        <AnimatePresence>
            {friendStats ? (
                <>
                    <div className="background-image bg-cover" />
                    <FriendGameStats friendStats={friendStats} setFriendStats={setFriendStats} />
                    <FriendGamePad
                        friendStats={friendStats}
                        setFriendStats={setFriendStats}
                        setStealConfirmation={setStealConfirmation}
                        setStealLoading={setStealLoading}
                    />
                    <FriendStealConfirmation
                        setFriendStats={setFriendStats}
                        friendStats={friendStats}
                        stealConfirmation={stealConfirmation}
                        setStealConfirmation={setStealConfirmation}
                        stealLoading={stealLoading}
                        setStealLoading={setStealLoading}
                    />
                    {action === "ra" && <FriendRadar />}
                </>
            ) : (
                <motion.div
                    key="loader"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1 }}
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                    }}
                >
                    <Loader ifRadar={action == "ra"} />
                </motion.div>
            )}
        </AnimatePresence>
    )
}

export default FriendFarm
