"use client"

import Image from "next/image"
import { useLanguage } from "@/components/context/languageContext"
import { ActionTypes, FriendStats, StealConfirmationTypes } from "@/utils/types"
import SuccessRateCircle from "@/components/friends/farm/successratecircle"
import StealConfirmationBackground from "./friendstealbg"
import { truncateText } from "@/utils/func/utils"
import { useState } from "react"
import { useNotification } from "@/components/context/notificationContext"
import { DotLottiePlayer } from "@dotlottie/react-player"

const FriendStealConfirmation = ({
    setFriendStats,
    friendStats,
    stealConfirmation,
    setStealConfirmation,
    stealLoading,
    setStealLoading,
}: {
    setFriendStats: React.Dispatch<React.SetStateAction<FriendStats | null>>
    friendStats: FriendStats
    stealConfirmation: StealConfirmationTypes | null
    setStealConfirmation: React.Dispatch<React.SetStateAction<StealConfirmationTypes | null>>
    stealLoading: "caculate" | "steal" | null
    setStealLoading: React.Dispatch<React.SetStateAction<"caculate" | "steal" | null>>
}) => {
    const [stealResult, setStealResult] = useState<{
        showSuccess: boolean
        stealSuccess: boolean
    }>({
        showSuccess: false,
        stealSuccess: false,
    })
    const { t } = useLanguage()
    const { addNotification } = useNotification()
    const stealStats = {
        "Skill Gap": stealConfirmation?.success_rate_details?.level_diff || "0",
        "Buddy Boost": stealConfirmation?.success_rate_details?.friendship_diff || "0",
        "Invite Edge": stealConfirmation?.success_rate_details?.invite_diff || "0",
        "Harvest Stage": stealConfirmation?.success_rate_details?.crop_level_diff || "0",
        "is Online": stealConfirmation?.success_rate_details?.online || "0",
        // "Theft Attempts": stealConfirmation?.success_rate_details?.level_diff || "0",
        "Newbie Shield": stealConfirmation?.success_rate_details?.new_farmer || "0",
        "Familiar Face": stealConfirmation?.success_rate_details?.recidivist || "0",
    }

    const stealStatsList = Object.entries(stealStats)
    const mainColor = (successRate: number) => {
        switch (true) {
            case successRate < 10:
                return "#5964F5"
            case successRate >= 10 && successRate < 20:
                return "#2EB9FF"
            case successRate >= 20 && successRate <= 25:
                return "#FF7E2E"
            case successRate > 25:
                return "#BE61F9"
            default:
                return "#5964F5"
        }
    }

    const onClose = () => {
        setStealResult({
            showSuccess: false,
            stealSuccess: false,
        })
        setStealConfirmation(null)
    }

    const stealCrop = (crop_id: string) => {
        if (crop_id === undefined) return
        setStealLoading("steal")
        setTimeout(() => {
            const success = Math.random() < (stealConfirmation?.success_rate_details?.final_success_rate ?? 50) / 100
            setStealLoading(null)
            setStealResult({ showSuccess: true, stealSuccess: success })
            if (success) {
                setFriendStats(prev => {
                    if (!prev) return prev
                    const crops = [...prev.farm_stats.growing_crops]
                    const idx = crops.findIndex(c => c.crop_details?.crop_id === crop_id)
                    if (idx >= 0) crops[idx] = { ...crops[idx], crop_details: { ...crops[idx].crop_details, status: "Stolen" } }
                    return { ...prev, farm_stats: { ...prev.farm_stats, growing_crops: crops } }
                })
            }
        }, 1000)
    }

    return (
        <>
            {stealLoading === "caculate" && (
                <div className="fixed left-0 top-0 h-full w-full flex justify-center items-center z-[500]">
                    <DotLottiePlayer
                        src="/lottie/Animation - 17209114754523.lottie"
                        autoplay
                        loop
                        className="w-[50%] h-[40%]"
                    />
                </div>
            )}
            {stealLoading === "steal" && (
                <div className="fixed left-0 top-0 h-full w-full flex justify-center items-center z-[500]">
                    <DotLottiePlayer
                        src="/lottie/Animation - 17209114754533.lottie"
                        autoplay
                        loop
                        className="w-[70%] h-[60%]"
                    />
                </div>
            )}
            {stealConfirmation && (
                <div
                    className="fixed top-0 w-full h-full px-5 flex flex-col items-center justify-center z-[20] bg-[rgba(26,31,37,0.7)]"
                    onClick={(e) => {
                        e.stopPropagation()
                        onClose()
                    }}
                >
                    {stealResult.showSuccess ? (
                        <div
                            onClick={onClose}
                            className="w-full h-auto flex flex-col justify-center items-center px-8 py-7 bg-white rounded-[20px] relative z-0 overflow-hidden gap-[10px]"
                        >
                            <div
                                className="outlinedtexttitle text-[24px] font-extrabold"
                                data-content={`${
                                    stealResult.stealSuccess ? t("You got it") : t("You failed")
                                }`}
                            >
                                {stealResult.stealSuccess ? t("You got it") : t("You failed")}
                            </div>
                            {stealResult.stealSuccess ? (
                                <Image
                                    src="/game/success-steal.png"
                                    width={140}
                                    height={140}
                                    alt="crop"
                                    quality={100}
                                    loading="eager"
                                />
                            ) : (
                                <Image
                                    src="/game/fail-steal.png"
                                    width={140}
                                    height={140}
                                    alt="crop"
                                    quality={100}
                                    loading="eager"
                                />
                            )}
                            {stealResult.stealSuccess ? (
                                <div className="flex flex-col gap-1">
                                    <div className="flex gap-1">
                                        <Image
                                            className="w-5 h-5"
                                            src="/game/coin_big.png"
                                            width={49}
                                            height={51}
                                            alt="crop"
                                        />
                                        <p className="text-[16px] font-bold">
                                            +{stealConfirmation?.stealing_earning}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <Image
                                            className="w-5 h-5"
                                            src="/game/exp.png"
                                            width={48}
                                            height={48}
                                            alt="crop"
                                        />
                                        <p className="text-[16px] font-bold">
                                            +{stealConfirmation?.stealing_exp}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-1">
                                    <Image
                                        className="w-5 h-5"
                                        src="/game/coin_big.png"
                                        width={49}
                                        height={51}
                                        alt="crop"
                                        quality={100}
                                        loading="eager"
                                    />
                                    <p className="text-[16px] font-bold">
                                        -{stealConfirmation?.stealing_cost}
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div
                            onClick={(e) => {
                                e.stopPropagation()
                            }}
                            className="w-full h-auto flex flex-col justify-center items-center px-8 py-4 bg-white rounded-[20px] relative z-0 overflow-hidden"
                        >
                            <div
                                className="outlinedtexttitle text-[24px] font-extrabold"
                                data-content={`${t("Steal")} ${t(
                                    stealConfirmation.stealing_crop_name
                                )}`}
                            >
                                {t("Steal")} {t(stealConfirmation.stealing_crop_name)}
                            </div>

                            <Image
                                className="-mt-10 -mb-5 min-w-[80px] "
                                src={`/crop/${stealConfirmation?.stealing_crop_name}.png`}
                                width={32}
                                height={48}
                                alt="crop"
                                quality={100}
                                loading="eager"
                            />
                            <div className="w-full flex justify-between gap-[64px]">
                                <div className="flex flex-col justify-start items-center gap-[10px]">
                                    <p
                                        className="outlinedtext text-[16px] font-regular"
                                        data-content={t("Success Rate")}
                                    >
                                        {t("Success Rate")}
                                    </p>
                                    <SuccessRateCircle
                                        percentage={Number(
                                            (stealConfirmation.success_rate_details
                                                .final_success_rate /
                                                100) *
                                                100
                                        )}
                                        mainColor={mainColor(
                                            stealConfirmation.success_rate_details
                                                .final_success_rate
                                        )}
                                    />
                                </div>
                                <div className="flex flex-col justify-start items-center gap-[10px]">
                                    <p
                                        className="outlinedtext text-[16px] font-regular"
                                        data-content={t("Predict Income")}
                                    >
                                        {t("Predict Income")}
                                    </p>
                                    <div className="flex flex-col gap-3">
                                        <span className="flex gap-1">
                                            <Image
                                                className="w-6 h-6"
                                                src="/game/coin_big.png"
                                                width={49}
                                                height={51}
                                                alt="crop"
                                            />
                                            <p className="text-[16px] font-bold text-black">
                                                {stealConfirmation.stealing_earning}
                                            </p>
                                        </span>
                                        <span className="flex gap-1">
                                            <Image
                                                className="w-6 h-6"
                                                src="/game/exp.png"
                                                width={48}
                                                height={48}
                                                alt="crop"
                                            />
                                            <p className="text-[16px] font-bold text-black">
                                                {stealConfirmation.stealing_exp}
                                            </p>
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col w-full mt-5">
                                {stealStatsList.map(([key, value], index) => {
                                    if (key === "is Online") {
                                        if (Number(value) > 0) {
                                            key = `${truncateText(friendStats.user_name, 15)} ${t(
                                                "is Offline"
                                            )}`
                                        } else {
                                            key = `${truncateText(friendStats.user_name, 15)} ${t(
                                                "is Online"
                                            )}`
                                        }
                                    } else {
                                        key = t(key)
                                    }
                                    if (value === "0") return null
                                    return (
                                        <li key={index} className="flex justify-between">
                                            <p
                                                className="outlinedtext text-[16px] font-regular"
                                                data-content={key}
                                            >
                                                {key}
                                            </p>
                                            <p className="text-[16px] font-bold text-black">
                                                {Number(value) > 0 ? `+${value}` : value}%
                                            </p>
                                        </li>
                                    )
                                })}
                            </div>
                            <button
                                disabled={stealLoading === "steal"}
                                onClick={() => {
                                    stealCrop(stealConfirmation?.crop_id)
                                }}
                                className="mt-4 rounded-2xl w-full px-4 py-3 flex justify-center items-center gap-1"
                                style={{
                                    background: mainColor(
                                        stealConfirmation.success_rate_details.final_success_rate
                                    ),
                                }}
                            >
                                <Image
                                    className="w-6 h-6"
                                    src="/game/coin_big.png"
                                    width={49}
                                    height={51}
                                    alt="crop"
                                />
                                <p className="text-[16px] font-semibold text-white">
                                    {t("Spend")} {stealConfirmation.stealing_cost} {t("to steal")}
                                </p>
                            </button>
                            <Image
                                className="absolute top-4 right-4 cursor-pointer"
                                src="/icon/close.svg"
                                width={24}
                                height={24}
                                alt=""
                                priority={true}
                                loading="eager"
                                onClick={onClose}
                            />
                            <StealConfirmationBackground
                                percentage={
                                    stealConfirmation.success_rate_details.final_success_rate
                                }
                            />
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default FriendStealConfirmation
