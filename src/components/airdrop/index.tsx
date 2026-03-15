"use client"

import Image from "next/image"
import { useUser } from "../context/userContext"
import { useEffect, useRef } from "react"
import { claimAirdrop } from "@/utils/api/airdrop"
import { useNotification } from "../context/notificationContext"
import { useLanguage } from "../context/languageContext"

export const AirdropPage = () => {
    const { airdropInfo, wallet } = useUser()
    const { addNotification } = useNotification()
    const { t } = useLanguage()
    const containerRef = useRef<HTMLDivElement | null>(null)

    const handleClaim = async (airdropId: string) => {
        try {
            await claimAirdrop(airdropId)
            addNotification(
                {
                    notificationTitle: "Success",
                    notificationMessage: "Airdrop claimed successfully!",
                },
                5000
            )
        } catch (error) {
            addNotification(
                {
                    notificationTitle: "Claim failed",
                    notificationMessage: "Please try again later.",
                },
                3000
            )
        }
    }

    useEffect(() => {
        if (airdropInfo && containerRef.current) {
            requestAnimationFrame(() => {
                if (containerRef.current) containerRef.current.classList.add("active")
            })
        }
    }, [airdropInfo])

    return (
        <>
            {airdropInfo && (
                <div
                    ref={containerRef}
                    className="slide-in h-full w-full flex flex-col justify-start items-center bg-[#1a1f25] relative"
                >
                    <div className="relative shadow-lg w-full h-full flex flex-col justify-between div-with-gradient-border-airdrop p-6">
                        <div className="absolute -left-[96px] -top-[105px] z-[100] bg-gradient-to-b from-[rgba(238,180,53,0.35)] to-transparent blur-bg-color rounded-[80px] min-w-[395px] min-h-[389px]" />
                        <div className="absolute -right-[155px] -top-[105px] z-[100] bg-gradient-to-b from-[rgba(34,218,255,0.35)] to-transparent blur-bg-color rounded-[80px] min-w-[395px] min-h-[389px]" />
                        <div className="absolute -right-[255px] -top-[105px] z-[100] bg-gradient-to-b from-[rgba(238,53,56,0.35)] to-transparent blur-bg-color rounded-[80px] min-w-[395px] min-h-[389px]" />
                        <div className="w-full h-auto flex flex-col justify-start items-start">
                            <div className="w-full h-auto flex justify-center items-center">
                                <div
                                    className="outlinedtexttitle text-[28px] font-extrabold"
                                    data-content={`${t("My Airdrops")}`}
                                >
                                    {t("My Airdrops")}
                                </div>
                            </div>

                            <div className="relative font-semibold rounded-[8px] flex justify-center items-center pl-8 pr-6 py-[10px] bg-[rgba(0,0,0,0.3)] w-auto h-[48px] ml-[31px] mt-9">
                                <Image
                                    src="/game/FarmCoin.png"
                                    width={50}
                                    height={50}
                                    alt="airdrop"
                                    quality={100}
                                    loading="eager"
                                    priority
                                    className="absolute -left-[31px] bottom-[2px] w-[50px] h-[50px]"
                                />
                                <p className="text-[#FBB602] text-[28px] font-bold">
                                    {airdropInfo.airdrops?.[0]?.airdrop_amount?.toLocaleString(
                                        "en-US"
                                    ) || "0"}
                                </p>
                            </div>
                            <div className="flex justify-center items-start gap-[10px] mt-[18px] ml-1">
                                <div className="mt-[10px]">
                                    <svg
                                        className="w-[4px] h-[4px]"
                                        width="4"
                                        height="4"
                                        viewBox="0 0 4 4"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <circle cx="2" cy="2" r="2" fill="white" />
                                    </svg>
                                </div>
                                <div className="w-auto flex flex-col text-white">
                                    <p className="text-[14px]">{t("Wallet address")}</p>
                                    <p className="text-[16px] font-bold">
                                        {wallet?.address.slice(0, 10)}...
                                        {wallet?.address.slice(-10)}
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-center items-start gap-[10px] mt-5 ml-1">
                                <div className="mt-[10px]">
                                    <svg
                                        className="w-[4px] h-[4px]"
                                        width="4"
                                        height="4"
                                        viewBox="0 0 4 4"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <circle cx="2" cy="2" r="2" fill="white" />
                                    </svg>
                                </div>
                                <div className="w-auto flex flex-col text-white">
                                    <p className="text-[14px]">{t("Period 1:")}</p>
                                    <p className="text-[16px] font-bold">
                                        07/08/2024 - 11/15/2024
                                    </p>
                                </div>
                            </div>
                            {airdropInfo.airdrops?.[0]?.remarks?.map && (
                                <div className="ml-1 flex flex-wrap gap-[11px] mt-5">
                                    {airdropInfo.airdrops?.[0]?.remarks?.map((remark: string, index: number) => {
                                        return (
                                            <div
                                                key={index}
                                                className="bg-[rgba(0,0,0,0.3)] w-auto h-auto px-[8px] py-[3px] rounded-[4px] flex justify-center items-center"
                                            >
                                                <p className="text-white text-[10px] font-semibold leading-3">
                                                    {t(remark)}
                                                </p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        {airdropInfo.airdrops?.[0]?.eligible ? (
                            <button
                                className="w-full font-semibold bg-[#FBB602] flex flex-col py-3 px-4 justify-center items-center rounded-2xl shadow-md mb-[34px] disabled:opacity-50"
                                onClick={() => handleClaim(airdropInfo.airdrops?.[0]?.id || "")}
                            >
                                <p className="text-[#543D30] font-[16px] leading-[26px]">
                                    {t("Claim $FARM")}
                                </p>
                            </button>
                        ) : (
                            <button
                                className="w-full font-semibold bg-[#FBB602] flex flex-col py-3 px-4 justify-center items-center rounded-2xl shadow-md mb-[34px]"
                                disabled
                            >
                                <p className="text-[#543D30] font-[16px] leading-[26px]">
                                    {t("Your farm is ineligible for this airdrop.")}
                                </p>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
