"use client"

import { useLanguage } from "../context/languageContext"
import { useData } from "../context/dataContext"
import { exploreFarm } from "@/utils/api/social"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useUser } from "../context/userContext"

const RadarModal = () => {
    const { t } = useLanguage()
    const router = useRouter()
    const { setUser } = useUser()
    const {
        openRadarModal,
        setOpenRadarModal,
        radaring,
        setRadaring,
        OpenAgentFarmAlert,
    } = useData()
    const handleRadar = () => {
        setRadaring(true)
        exploreFarm()
            .then((res) => {
                // 更新用户金币（扣除20金币）
                setUser((prev) => {
                    if (!prev) return prev
                    return {
                        ...prev,
                        farm_stats: {
                            ...prev.farm_stats,
                            coin_balance: prev.farm_stats.coin_balance - res.cost
                        }
                    }
                })
                
                // 直接跳转到目标农场，不显示中间弹窗
                router.push(`/friends/farm/ra/${res.friend.id}`)
                setOpenRadarModal(false)
            })
            .catch((err) => {
                OpenAgentFarmAlert({
                    notificationTitle: "Error",
                    notificationMessage: err.response?.data?.error || "Radar feature unavailable"
                })
            })
            .finally(() => {
                setRadaring(false)
            })
    }

    useEffect(() => {
        return () => {
            if (setRadaring) {
                setRadaring(false)
            }
            setOpenRadarModal(false)
        }
    }, [setRadaring, setOpenRadarModal])

    return (
        <>
            {openRadarModal && (
                <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center px-5">
                    <div className="w-full h-auto bg-gradient-to-b from-[#E0E6F7] to-white rounded-[20px] flex flex-col pt-7 pb-4 px-4 gap-2">
                        <div className="w-full h-auto flex justify-center items-center">
                            <h1
                                className="outlinedtexttitle text-[24px] font-extrabold"
                                data-content={`${t("What is Radar?")}`}
                            >
                                {t("What is Radar?")}
                            </h1>
                        </div>
                        <div className="flex gap-1 items-start">
                            <p className="text-[16px] text-black font-bold">
                                {t(
                                    "Explore the world and find farms to steal from, consuming $20 coins per attempt. Take your own risk."
                                )}
                            </p>
                        </div>
                        {/* <div className="w-full h-auto flex justify-center items-center">
                            <h1
                                className="outlinedtexttitle text-[24px] font-extrabold"
                                data-content={`${t("Matching rules")}`}
                            >
                                {t("Matching rules")}
                            </h1>
                        </div>
                        <div className="flex gap-1 items-start">
                            <svg
                                width="4"
                                height="4"
                                viewBox="0 0 4 4"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="min-w-[4px] mt-[10px]"
                            >
                                <circle cx="2" cy="2" r="2" fill="black" />
                            </svg>

                            <p className="text-[16px] text-black font-bold">
                                {t("Farm level greater or equal to the current level.")}
                            </p>
                        </div>
                        <div className="flex gap-1 items-start">
                            <svg
                                width="4"
                                height="4"
                                viewBox="0 0 4 4"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="min-w-[4px] mt-[10px]"
                            >
                                <circle cx="2" cy="2" r="2" fill="black" />
                            </svg>

                            <p className="text-[16px] text-black font-bold">
                                {t(
                                    "Farm level greater than or equal to the current level minus 5."
                                )}
                            </p>
                        </div> */}
                        <div className="flex justify-between mt-4 gap-3">
                            <button
                                className="w-full rounded-2xl bg-[rgba(89,100,245,0.2)] py-3 px-4 text-[#5964F5] hover:opacity-80 font-semibold"
                                onClick={() => {
                                    setOpenRadarModal(false)
                                }}
                            >
                                {t("Cancel")}
                            </button>
                            <button
                                className="w-full rounded-2xl bg-[#5964F5] py-3 px-4 text-white hover:opacity-80 font-semibold"
                                onClick={handleRadar}
                            >
                                {t("Continue")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default RadarModal
