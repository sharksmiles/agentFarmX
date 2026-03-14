"use client"
import Image from "next/image"
import { useEffect, useState, useRef, useCallback } from "react"
import { useData } from "../context/dataContext"
import { ArrowUpFromDot } from "lucide-react"
import { useUser } from "../context/userContext"
import { useLanguage } from "../context/languageContext"

type ParticipantsType = {
    id: string
    username: string
    level: number
}

const RafflePageResult = ({}) => {
    const { t } = useLanguage()
    const { openRaffleResult, setOpenRaffleResult } = useData()
    const { user } = useUser()
    const [winnerList, setWinnerList] = useState<ParticipantsType[]>([])
    const [participantList, setParticipantList] = useState<ParticipantsType[]>([])
    const [participantsCursor, setParticipantsCursor] = useState<string>("")
    const [winnerLoading, setWinnerLoading] = useState<boolean>(true)
    const [participantLoading, setParticipantLoading] = useState<boolean>(true)
    const loadMoreRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState<boolean>(false)

    const scrollToTop = () => {
        loadMoreRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const toggleVisibility = useCallback(() => {
        const container = loadMoreRef.current
        if (container && container.scrollTop > 20) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        if (participantList.length === 0) {
            return
        }
        const container = loadMoreRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [toggleVisibility, participantList.length])

    const MOCK_WINNERS: ParticipantsType[] = [
        { id: "w1", username: "TopFarmer",   level: 18 },
        { id: "w2", username: "LuckyPlanter", level: 12 },
        { id: "w3", username: "CryptoHarvest", level: 9 },
    ]
    const MOCK_PARTICIPANTS: ParticipantsType[] = [
        { id: "p1", username: "AliceGrower",   level: 12 },
        { id: "p2", username: "BobTheFarmer",  level: 7  },
        { id: "p3", username: "CharlieXYZ",    level: 18 },
        { id: "p4", username: "Diana_Web3",    level: 4  },
        { id: "p5", username: "Eve_Planter",   level: 10 },
    ]

    const getRaffleWinner = useCallback((_raffle_id: number) => {
        setTimeout(() => { setWinnerList(MOCK_WINNERS); setWinnerLoading(false) }, 300)
    }, [])

    const getRaffleParticipants = useCallback((_raffle_id: number) => {
        setTimeout(() => { setParticipantList(MOCK_PARTICIPANTS); setParticipantLoading(false) }, 300)
    }, [])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && participantsCursor && openRaffleResult) {
                    setParticipantLoading(true)
                    getRaffleParticipants(openRaffleResult.id)
                }
            },
            { threshold: 0.5 }
        )

        const currentRef = loadMoreRef.current
        if (currentRef) {
            observer.observe(currentRef)
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef)
            }
        }
    }, [participantsCursor, openRaffleResult, getRaffleParticipants])

    useEffect(() => {
        if (openRaffleResult) {
            getRaffleWinner(openRaffleResult.id)
            getRaffleParticipants(openRaffleResult.id)
        }

        return () => {
            setWinnerList([])
            setParticipantList([])
            setParticipantsCursor("")
            setWinnerLoading(true)
            setParticipantLoading(true)
        }
    }, [openRaffleResult, getRaffleWinner, getRaffleParticipants])

    return (
        <>
            {openRaffleResult !== null && (
                <div
                    className="fixed w-full h-full flex justify-center items-center bg-light-dark z-[9999] background-blur"
                    onClick={() => {
                        setOpenRaffleResult(null)
                    }}
                >
                    <div
                        ref={loadMoreRef}
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        className="relative flex flex-col items-center bg-[#1A1F25] z-20 rounded-[32px] border-[2px] w-[80%] pt-[44px] px-[25px] pb-[5px] text-white overflow-y-auto max-h-[80%] hide-scrollbar"
                        style={{ borderColor: openRaffleResult.main_color }}
                    >
                        <button
                            className="absolute text-white right-[12px] top-[12px]"
                            onClick={() => {
                                setOpenRaffleResult(null)
                            }}
                        >
                            <Image
                                src="/icon/close.svg"
                                width={24}
                                height={24}
                                alt=""
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                        </button>
                        <p className="text-[20px] font-semibold">
                            {openRaffleResult.name} {t("Results")}
                        </p>
                        <p
                            className="text-[18px] font-semibold pb-[5px]"
                            style={{ color: openRaffleResult.main_color }}
                        >
                            {t("Winners")} {`(${openRaffleResult.total_winners})`}
                        </p>
                        <div
                            className="flex flex-col gap-[12px] items-center z-20 rounded-t-[16px] rounded-b-[20px] border-t-2 h-auto w-[100%] px-[10px] text-white"
                            style={{ borderColor: openRaffleResult.main_color }}
                        >
                            <div className="h-[10px]"></div>
                            {winnerList.map((winner, index) => {
                                return (
                                    <div
                                        key={index}
                                        className="flex justify-between w-full bg-[#252A31] py-[11.5px] px-[16px] rounded-[16px]"
                                    >
                                        <p className="text-[16px] font-semibold">
                                            {winner.username}{" "}
                                            <span
                                                className=""
                                                style={{
                                                    color: openRaffleResult.main_color,
                                                }}
                                            >
                                                {user?.id === winner.id && "(You)"}
                                            </span>
                                        </p>
                                        <p className="text-[14px]">Lv {winner.level}</p>
                                    </div>
                                )
                            })}
                            {winnerLoading && (
                                <div className="w-full flex flex-col gap-[12px]">
                                    {Array.from({ length: openRaffleResult.total_winners }).map(
                                        (_, index) => (
                                            <div key={index} className="skeleton" />
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                        <p className="text-[18px] font-semibold pb-[5px] pt-[15px]">
                            {t("ALL Participants")} {`(${openRaffleResult.total_participants})`}
                        </p>
                        <div className="flex flex-col gap-[12px] items-center z-20 rounded-t-[16px] rounded-b-[20px] border-white border-t-2 h-auto w-[100%] px-[10px] pb-[30px] text-white">
                            <div className="h-[10px]"></div>
                            {participantList.map((participant, index) => {
                                return (
                                    <div
                                        key={index}
                                        className="flex justify-between w-full bg-[#252A31] py-[11.5px] px-[16px] rounded-[16px]"
                                    >
                                        <p className="text-[16px] font-semibold">
                                            {participant.username}
                                            <span
                                                className=""
                                                style={{
                                                    color: openRaffleResult.main_color,
                                                }}
                                            >
                                                {user?.id === participant.id && "(You)"}
                                            </span>
                                        </p>
                                        <p className="text-[14px]">Lv {participant.level}</p>
                                    </div>
                                )
                            })}
                            {participantLoading && (
                                <div className="w-full flex flex-col gap-[12px]">
                                    {Array.from({
                                        length:
                                            openRaffleResult.total_participants! > 10
                                                ? 10
                                                : openRaffleResult.total_participants!,
                                    }).map((_, index) => (
                                        <div key={index} className="skeleton" />
                                    ))}
                                </div>
                            )}
                        </div>
                        {isVisible && (
                            <button
                                onClick={scrollToTop}
                                className="sticky bottom-[20px] bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75 z-[5000]"
                            >
                                <ArrowUpFromDot size={20} />
                            </button>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default RafflePageResult
