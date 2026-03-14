"use client"

import { MOCK_RAFFLES } from "@/utils/mock/mockData"
import { useEffect, useRef, useState } from "react"
import Countdown from "./countdown"
import { useData } from "../context/dataContext"
import { DotLottiePlayer } from "@dotlottie/react-player"
import Image from "next/image"
import { Raffle } from "@/utils/types"
import { useLanguage } from "../context/languageContext"
import BackgroundGuradian from "./gardiantbackground"

const RafflePage = ({}) => {
    const { t } = useLanguage()
    const { setOpenRaffleEntry, raffleList, setRaffleList, setOpenRaffleResult, setNotification } =
        useData()
    const [paddingWidth, _] = useState<number>(window.innerWidth)
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const [raffleListLoading, setRaffleListLoading] = useState<boolean>(true)
    const [selectedButton, setSelectedButton] = useState<"inProgress" | "ended">("inProgress")

    const getRaffleList = async () => {
        if (MOCK_RAFFLES.filter((raffle: Raffle) => !raffle.ended).length === 0) {
            setSelectedButton("ended")
        }
        setRaffleList(MOCK_RAFFLES)
        setRaffleListLoading(false)
    }

    const checkAndMaybeRefresh = () => {
        const now = new Date()
        const hasEndedRaffle = raffleList.some(
            (raffle) => new Date(raffle.end_time) < now && !raffle.drawed
        )

        if (hasEndedRaffle) {
            setTimeout(() => {
                getRaffleList()
            }, 20000)
        }
    }

    useEffect(() => {
        checkIntervalRef.current = setInterval(() => {
            checkAndMaybeRefresh()
        }, 20000)

        return () => {
            if (checkIntervalRef.current) {
                clearInterval(checkIntervalRef.current)
            }
        }
    }, [raffleList])

    const scrollToFirstRaffle = (ended: boolean) => {
        const firstRaffleIndex = raffleList.findIndex((raffle) => raffle.ended === ended)
        if (firstRaffleIndex !== -1) {
            const raffleElement = document.querySelector(
                `.raffle-${firstRaffleIndex}`
            ) as HTMLElement
            if (raffleElement) {
                const container = document.querySelector(".raffle-container") as HTMLElement
                if (container) {
                    const containerWidth = container.clientWidth
                    const elementOffsetLeft = raffleElement.offsetLeft
                    const elementWidth = raffleElement.clientWidth

                    const scrollTo = elementOffsetLeft - containerWidth / 2 + elementWidth / 2

                    container.scroll({
                        left: scrollTo,
                        behavior: "smooth",
                    })
                }
            }
        }
    }

    const handleButtonClick = (button: "inProgress" | "ended") => {
        setSelectedButton(button)
        scrollToFirstRaffle(button === "ended")
    }

    useEffect(() => {
        getRaffleList()
    }, [])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const raffleId = entry.target.getAttribute("data-raffle-id")
                        if (raffleId) {
                            const raffle = raffleList[parseInt(raffleId)]
                            if (raffle) {
                                setSelectedButton(raffle.ended ? "ended" : "inProgress")
                            }
                        }
                    }
                })
            },
            {
                root: null,
                rootMargin: "0px",
                threshold: 0.5,
            }
        )

        raffleList.forEach((_, index) => {
            const raffleElement = document.querySelector(`.raffle-${index}`)
            if (raffleElement) {
                observer.observe(raffleElement)
            }
        })

        return () => {
            observer.disconnect()
        }
    }, [raffleList])

    return (
        <div className="w-full h-full flex flex-col text-white">
            {/* top bar */}
            <div className="w-full h-[78px] bg-[rgba(45,42,40,0.9)] flex flex-col px-[28px] py-[9px] justify-center items-center gap-[13px]">
                <p className="text-[17px] font-semibold h-[20px]">{t("AgentFarm X Raffles")}</p>
                <div className="w-full flex justify-between gap-[11px] h-[24px] text-[12px] font-semibold">
                    <button
                        className={`w-full rounded-[88px] h-[24px] ${
                            selectedButton === "inProgress"
                                ? "bg-[#DD7C10] border-[2px] border-transparent"
                                : "bg-[#2A2A2A] border-[2px] border-[#DD7C10]"
                        }`}
                        onClick={() => handleButtonClick("inProgress")}
                    >
                        {t("In progress")}
                    </button>
                    <button
                        className={`w-full rounded-[88px] h-[24px] ${
                            selectedButton === "ended"
                                ? "bg-[#DD7C10] border-[2px] border-transparent"
                                : "bg-[#2A2A2A] border-[2px] border-[#DD7C10]"
                        }`}
                        onClick={() => handleButtonClick("ended")}
                    >
                        {t("Ended")}
                    </button>
                </div>
            </div>
            {/* raffle details */}
            <div className="raffle-container flex overflow-x-auto py-6 h-full">
                <div className="flex-none" style={{ width: paddingWidth * 0.082 }}></div>
                <div className="flex w-auto h-full gap-3.5">
                    {raffleList.map((raffle, index) => {
                        let words: string[] = raffle.reward_detail.split(" ")
                        let translatedWords: string[] = words.map((word) => t(word))
                        let rewardDetail: string = translatedWords.join(" ")
                        if (raffle.end_time < new Date().toISOString() && !raffle.drawed) {
                            return (
                                <div
                                    key={index}
                                    data-raffle-id={index}
                                    className={`raffle-${index} flex-none flex flex-col justify-center items-center h-full rounded-[30px] border-[3px] overflow-hidden relative bg-[rgba(26,24,24,0.8)]`}
                                    style={{
                                        width: paddingWidth * 0.836,
                                        borderColor: raffle.main_color,
                                    }}
                                >
                                    <DotLottiePlayer
                                        src="/lottie/Animation - 1720911375454.lottie"
                                        autoplay
                                        loop
                                        style={{
                                            width: "100%",
                                            height: "80%",
                                        }}
                                    />
                                    {/* <BackgroundGuradian
                                        baseColor={raffle.main_color}
                                        id={raffle.id}
                                    /> */}
                                    <p className="w-full flex justify-center items-center text-[50px]">
                                        {t("Drawing...")}
                                    </p>
                                </div>
                            )
                        } else if (raffle.drawed) {
                            return (
                                <div
                                    key={index}
                                    data-raffle-id={index}
                                    className={`raffle-${index} w-full h-full relative`}
                                    style={{
                                        width: paddingWidth * 0.836,
                                    }}
                                >
                                    <div
                                        className={`flex-none flex flex-col justify-between h-full relative rounded-[30px] border-[3px] bg-[rgba(26,24,24,0.8)] overflow-hidden`}
                                        style={{
                                            borderColor: raffle.main_color,
                                        }}
                                    >
                                        {/* <BackgroundGuradian
                                            baseColor={raffle.main_color}
                                            id={raffle.id}
                                        /> */}

                                        <div>
                                            <p
                                                className={`w-full text-center text-[15px] font-semibold py-[8px] border-b-[4px] overflow-hidden`}
                                                style={{
                                                    backgroundColor: raffle.title_background_color,
                                                    borderColor: raffle.main_color,
                                                }}
                                            >
                                                {t(raffle.name)}
                                            </p>
                                            <div className="w-full h-full pt-[10px] flex flex-col justify-start px-[10px]">
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Prize")}
                                                    </p>
                                                    <p
                                                        className="text-[14px] font-semibold"
                                                        style={{
                                                            color: raffle.description_text_color,
                                                        }}
                                                    >
                                                        {rewardDetail}
                                                    </p>
                                                </div>
                                                <div className="mt-[6px] w-full border-b-[#6c6c6c] border-b-[1px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Raffle Description")}
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] flex justify-between items-center">
                                                    <p
                                                        className="text-[15px] font-semibold py-[6px]"
                                                        style={{
                                                            color: raffle.description_text_color,
                                                        }}
                                                    >
                                                        {raffle.description}
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Ticket Price")}
                                                    </p>
                                                    <p className="text-[14px] font-semibold text-white">
                                                        ${raffle.ticket_price} COIN
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Max Ticket per Farmer")}
                                                    </p>
                                                    <p
                                                        className="text-[14px] font-semibold py-[3px] px-[15px] rounded-[8px]"
                                                        style={{
                                                            backgroundColor:
                                                                raffle.title_background_color,
                                                        }}
                                                    >
                                                        {raffle.max_tickets_per_user}
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Requirement")}
                                                    </p>
                                                    <p className="text-[14px] font-semibold text-white">
                                                        {raffle.requirement_level &&
                                                            t("Level") +
                                                                " " +
                                                                raffle.requirement_level}
                                                        {raffle.requirement_invite != 0 &&
                                                            raffle.requirement_level &&
                                                            " & "}
                                                        {raffle.requirement_invite != 0 &&
                                                            raffle.requirement_invite +
                                                                " Invited Friends"}
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Total Participants")}
                                                    </p>
                                                    <p className="text-[14px] font-semibold text-white">
                                                        {raffle.total_participants}
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Total Ticket Entered")}
                                                    </p>
                                                    <p className="text-[14px] font-semibold text-white">
                                                        {raffle.total_tickets}
                                                    </p>
                                                </div>
                                                <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Number of Winners")}
                                                    </p>
                                                    <p className="text-[14px] font-semibold text-white">
                                                        {raffle.total_winners}
                                                    </p>
                                                </div>
                                                <div className="w-full pt-[6px] pb-[4px] flex justify-between items-center">
                                                    <p className="text-[15px] font-semibold">
                                                        {t("Ended")}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full mb-[15px] flex justify-center items-center">
                                            <button
                                                onClick={() => {
                                                    if (
                                                        raffle.end_time < new Date().toISOString()
                                                    ) {
                                                        setOpenRaffleResult(raffle)
                                                    }
                                                }}
                                                className="flex justify-center items-center rounded-[16px] text-white py-[5px] px-[25px] text-[24px] whitespace-nowrap hover:opacity-90"
                                                style={{ backgroundColor: raffle.main_color }}
                                            >
                                                {t("Check Result")}
                                            </button>
                                        </div>
                                    </div>
                                    {raffle.is_winner && (
                                        <div className="absolute -left-[10px] -top-[15px] z-20">
                                            <Image
                                                src="/raffle/winner.png"
                                                width={74}
                                                height={82.8}
                                                alt=""
                                                quality={100}
                                                loading="eager"
                                                priority={true}
                                            />
                                        </div>
                                    )}
                                    {raffle.participated && !raffle.is_winner && (
                                        <div className="absolute -left-[20px] -top-[7px] z-20">
                                            <Image
                                                src="/raffle/unlucky.png"
                                                width={70}
                                                height={70}
                                                alt=""
                                                quality={100}
                                                loading="eager"
                                                priority={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            )
                        } else {
                            return (
                                <div
                                    key={index}
                                    data-raffle-id={index}
                                    className={`raffle-${index} flex-none flex flex-col justify-between h-full relative rounded-[30px] border-[3px] overflow-hidden ${
                                        !raffle.name.includes("USDT") && "bg-[rgba(26,24,24,0.8)]"
                                    }`}
                                    style={{
                                        width: paddingWidth * 0.836,
                                        borderColor: raffle.main_color,
                                        // boxShadow: `0px 0px 5px 0px ${raffle.main_color}`,
                                    }}
                                >
                                    {raffle.name.includes("USDT") && (
                                        <BackgroundGuradian
                                            baseColor={raffle.main_color}
                                            id={raffle.id}
                                        />
                                    )}
                                    <div>
                                        <p
                                            className={`w-full text-center text-[15px] font-semibold py-[2px] border-b-[4px] overflow-hidden`}
                                            style={{
                                                backgroundColor: raffle.title_background_color,
                                                borderColor: raffle.main_color,
                                            }}
                                        >
                                            {t(raffle.name)}
                                            {raffle.start_time > new Date().toISOString() ? (
                                                <p className="text-[10px]">
                                                    {t("Not Started Yet")}
                                                </p>
                                            ) : (
                                                <p className="text-[10px]">
                                                    {t("Raffle Pool")}:{" "}
                                                    <span className="font-extrabold text-[14px]">
                                                        {raffle.total_user_tickets}
                                                    </span>{" "}
                                                    {t("tickets entered")}
                                                </p>
                                            )}
                                        </p>
                                        <div className="w-full h-full pt-[10px] flex flex-col justify-start px-[10px]">
                                            <div className="w-full border-b-[#6c6c6c] border-b-[1px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {t("Prize")}
                                                </p>
                                                <p
                                                    className="text-[14px] font-semibold"
                                                    style={{
                                                        color: raffle.description_text_color,
                                                    }}
                                                >
                                                    {rewardDetail}
                                                </p>
                                            </div>
                                            <div className="mt-[6px] w-full border-b-[#6c6c6c] border-b-[1px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {t("Raffle Description")}
                                                </p>
                                            </div>
                                            <div className="w-full border-b-[#6c6c6c] border-b-[1px] flex justify-between items-center">
                                                <p
                                                    className="text-[15px] font-semibold py-[6px]"
                                                    style={{
                                                        color: raffle.description_text_color,
                                                    }}
                                                >
                                                    {raffle.description}
                                                </p>
                                            </div>
                                            <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {t("Ticket Price")}
                                                </p>
                                                <p className="text-[14px] font-semibold text-white">
                                                    ${raffle.ticket_price} COIN
                                                </p>
                                            </div>
                                            <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {t("Max Ticket per Farmer")}
                                                </p>
                                                <p
                                                    className="text-[14px] font-semibold py-[3px] px-[15px] rounded-[8px]"
                                                    style={{
                                                        backgroundColor:
                                                            raffle.title_background_color,
                                                    }}
                                                >
                                                    {raffle.ticket_count}/
                                                    {raffle.max_tickets_per_user}
                                                </p>
                                            </div>
                                            <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {t("Requirement")}
                                                </p>
                                                <p className="text-[14px] font-semibold text-white">
                                                    {raffle.requirement_level &&
                                                        t("Level") +
                                                            " " +
                                                            raffle.requirement_level}
                                                    {raffle.requirement_invite != 0 &&
                                                        raffle.requirement_level &&
                                                        " & "}
                                                    {raffle.requirement_invite != 0 &&
                                                        raffle.requirement_invite +
                                                            " Invited Friends"}
                                                </p>
                                            </div>
                                            <div className="w-full border-b-[#6c6c6c] border-b-[1px] pt-[6px] pb-[4px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {t("Number of Winners")}
                                                </p>
                                                <p className="text-[14px] font-semibold text-white">
                                                    {raffle.total_winners}
                                                </p>
                                            </div>
                                            <div className="w-full pt-[6px] pb-[4px] flex justify-between items-center">
                                                <p className="text-[15px] font-semibold">
                                                    {raffle.start_time > new Date().toISOString()
                                                        ? t("Starts in")
                                                        : t("Ending in")}
                                                </p>
                                                {raffle.start_time > new Date().toISOString() ? (
                                                    <Countdown
                                                        endTime={raffle.start_time}
                                                        onEnd={() => {
                                                            setRaffleList((oldList) => [
                                                                ...oldList,
                                                            ])
                                                            setTimeout(() => {
                                                                getRaffleList()
                                                            }, 20000)
                                                        }}
                                                    />
                                                ) : (
                                                    <Countdown
                                                        endTime={raffle.end_time}
                                                        onEnd={() => {
                                                            setRaffleList((oldList) => [
                                                                ...oldList,
                                                            ])
                                                            setTimeout(() => {
                                                                getRaffleList()
                                                            }, 20000)
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full mb-[15px] flex justify-center items-center">
                                        <button
                                            onClick={() => {
                                                if (
                                                    raffle.end_time > new Date().toISOString() &&
                                                    raffle.start_time < new Date().toISOString()
                                                ) {
                                                    setOpenRaffleEntry(raffle)
                                                } else if (
                                                    raffle.start_time > new Date().toISOString()
                                                ) {
                                                    setNotification({
                                                        notificationTitle: "Oops!",
                                                        notificationMessage:
                                                            "Raffle has not started yet, please wait.",
                                                    })
                                                }
                                            }}
                                            className="flex justify-center items-center rounded-[16px] text-white py-[5px] px-[25px] text-[24px] whitespace-nowrap hover:opacity-90"
                                            style={{ backgroundColor: raffle.main_color }}
                                        >
                                            {t("Buy Tickets")}
                                        </button>
                                    </div>
                                </div>
                            )
                        }
                    })}
                    {raffleListLoading && (
                        <>
                            <div
                                className="flex-none h-full"
                                style={{ width: paddingWidth * 0.836 }}
                            >
                                <div className="skeleton-raffle h-full" />
                            </div>
                            <div
                                className="flex-none h-full"
                                style={{ width: paddingWidth * 0.836 }}
                            >
                                <div className="skeleton-raffle h-full" />
                            </div>
                        </>
                    )}
                </div>
                <div
                    className="flex"
                    style={{ minWidth: paddingWidth * 0.082, width: paddingWidth * 0.082 }}
                ></div>
            </div>
        </div>
    )
}

export default RafflePage
