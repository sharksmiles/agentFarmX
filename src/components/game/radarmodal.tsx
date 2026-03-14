"use client"

import { useLanguage } from "../context/languageContext"
import { useData } from "../context/dataContext"
import { MOCK_FRIENDS } from "@/utils/mock/mockData"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

const RadarModal = () => {
    const { t } = useLanguage()
    const { openRadarModal, setOpenRadarModal, setNotification, radaring, setRadaring } = useData()
    const router = useRouter()
    const handleRadar = async () => {
        setRadaring(true)
        setTimeout(() => {
            const target = MOCK_FRIENDS[Math.floor(Math.random() * MOCK_FRIENDS.length)]
            router.push("/friends/farm/ra/" + target.id)
        }, 500)
    }

    useEffect(() => {
        return () => {
            if (setRadaring) {
                setRadaring(false)
            }
            setOpenRadarModal(false)
        }
    }, [setRadaring])

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
                                    "Explore the world and find farms to steal from, consuming $100 coines per attempt. Take your own risk."
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
