"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import CountUp from "react-countup"
import { useLanguage } from "@/components/context/languageContext"
import ProgressBar from "@/components/game/levelprogressbar"
import { useData } from "@/components/context/dataContext"
import { FriendStats } from "@/utils/types"

const FriendGameStats = ({
    setFriendStats,
    friendStats,
}: {
    setFriendStats: React.Dispatch<React.SetStateAction<FriendStats | null>>
    friendStats: FriendStats
}) => {
    const { t } = useLanguage()
    const { gameStats, setNotification } = useData()
    const [prevBalance, setPrevBalance] = useState<number>(0)
    const [currentBalance, setCurrentBalance] = useState<number>(0)
    useEffect(() => {
        setPrevBalance(currentBalance)
        setCurrentBalance(friendStats?.farm_stats.coin_balance || 0)
    }, [friendStats?.farm_stats.coin_balance, currentBalance])
    const currentLevel = friendStats?.farm_stats.level || 1
    const requiredExp = gameStats?.level_requirements[currentLevel]
        ? gameStats?.level_requirements[currentLevel]["Require Experience"]
        : "max"
    const levelExp = friendStats?.farm_stats?.level_exp || 0
    const progress = requiredExp ? (requiredExp != "max" ? (levelExp / requiredExp) * 100 : 0) : 0

    const handleAcceptRequest = (_user_id: string) => {
        setFriendStats(prev => prev ? { ...prev, if_friend_status: "friend" } : prev)
        setNotification({ notificationTitle: "Success", notificationMessage: "Friend request accepted" })
    }

    const handleDeclineRequest = (_user_id: string) => {
        setFriendStats(prev => prev ? { ...prev, if_friend_status: "not_friend" } : prev)
        setNotification({ notificationTitle: "Success", notificationMessage: "Friend request declined" })
    }

    const handleSendFriendsRequest = (_user_id: string) => {
        setFriendStats(prev => prev ? { ...prev, if_friend_status: "request_sent" } : prev)
        setNotification({ notificationTitle: "Success", notificationMessage: "Friend request sent" })
    }

    return (
        <div className="fixed top-0 w-full h-auto flex flex-col items-center">
            <div className="w-full flex justify-between gap-[12px] p-[12px] text-[12px]">
                <div className="flex w-full bg-light-dark rounded-[16px] p-[8px] justify-between items-center flex-col">
                    <p className="text-[#FC9069]">{t("User name")}</p>
                    <p className="text-white text-[16px] font-bold">{friendStats?.user_name}</p>
                </div>
                <div className="flex w-full bg-light-dark rounded-[16px] p-[8px] justify-end items-center flex-col gap-[4px]">
                    <p className="text-[#FC9069]">
                        {t("Level")} {currentLevel}
                    </p>
                    <div className="px-[4px] w-full">
                        <ProgressBar progress={progress} />
                    </div>
                    <p className="">
                        <span className="text-[#80EE9E]">{levelExp}</span>
                        <span className="text-white">/{requiredExp}</span>
                    </p>
                </div>
                <div className="flex w-full bg-light-dark rounded-[16px] p-[8px] justify-between items-center flex-col">
                    <p className="text-[#FBB602]">Coin</p>
                    {currentBalance ? (
                        <CountUp
                            start={prevBalance}
                            end={currentBalance}
                            duration={2}
                            separator=","
                            decimals={0}
                            className="text-white text-[16px] font-bold"
                        />
                    ) : (
                        <p className="text-white text-[16px] font-bold">0</p>
                    )}
                </div>
            </div>
            <div className="w-full p-[12px] pt-0 flex justify-center items-end flex-col">
                {friendStats?.if_friend_status === "not_friend" && (
                    <button
                        className="bg-light-dark rounded-[16px] py-[8px] px-[12px] flex flex-col justify-center items-center"
                        onClick={() => {
                            handleSendFriendsRequest(friendStats!.id)
                        }}
                    >
                        <Image src="/icon/addfriend.png" width={32} height={32} alt="friends" />
                        <p className="text-[10px] font-semibold text-white">{t("Add Friend")}</p>
                    </button>
                )}
                {friendStats?.if_friend_status === "request_received" && (
                    <div className="flex flex-col bg-light-dark w-full px-[24px] py-[9px] items-center text-white rounded-[16px]">
                        <p className="text-white">
                            {friendStats?.user_name} {t("has sent you a friend request.")}
                        </p>
                        <div className="w-full flex justify-between gap-[12px]">
                            <button
                                className="w-full border-2 border-transparent bg-[#5964F5] rounded-[15px] text-[16px] font-semibold z-10 h-[26px]"
                                onClick={() => {
                                    handleAcceptRequest(friendStats!.id)
                                }}
                            >
                                {t("Accept")}
                            </button>
                            <button
                                className="w-full border-2 border-[#5964F5] rounded-[15px] text-[16px] bg-light-dark font-semibold z-10 h-[26px]"
                                onClick={() => {
                                    handleDeclineRequest(friendStats!.id)
                                }}
                            >
                                {t("Decline")}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default FriendGameStats
