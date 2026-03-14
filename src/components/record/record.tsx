import React, { useCallback, useEffect, useState } from "react"
import { useLanguage } from "../context/languageContext"
import Image from "next/image"
import { fetchActivityRecords, ActivityRecord } from "@/utils/api/invite"
import { MOCK_RECORDS } from "@/utils/mock/mockData"
import { useRouter } from "next/navigation"
import { timeAgo, timeAgoString, truncateText } from "@/utils/func/utils"
import { ArrowUpFromDot } from "lucide-react"

export type RecordData = ActivityRecord

const Record = () => {
    const { language, t } = useLanguage()
    const router = useRouter()
    const [loadingRecords, setLoadingRecords] = useState<boolean>(true)
    const [recordResults, setRecordResults] = useState<RecordData[]>([])
    const [cursor, setCursor] = useState<string | null>(null)
    const observerRef = React.useRef<HTMLDivElement>(null)
    const [recordFilter, setRecordFilter] = useState<"" | "watered" | "failed stealing" | "stole">(
        ""
    )
    const [isVisible, setIsVisible] = useState(false)

    const fetchRecords = (reset: boolean, cur: string | null) => {
        setLoadingRecords(true)
        fetchActivityRecords(cur)
            .then(({ results, next }) => {
                setRecordResults((prev) => reset ? results : [...prev, ...results])
                setCursor(next)
            })
            .catch(() => {
                if (reset) {
                    setRecordResults(MOCK_RECORDS as any)
                    setCursor(null)
                }
            })
            .finally(() => setLoadingRecords(false))
    }

    useEffect(() => {
        fetchRecords(true, null)
    }, [])

    const loadMoreRecord = async () => {
        if (cursor && !loadingRecords) fetchRecords(false, cursor)
    }

    const scrollToTop = () => {
        observerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const toggleVisibility = useCallback(() => {
        const container = observerRef.current
        if (container && container.scrollTop > 20) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        setRecordResults([])
        setCursor(null)
        fetchRecords(true, null)
    }, [recordFilter])

    useEffect(() => {
        const handleScroll = () => {
            if (observerRef.current) {
                const { scrollTop, scrollHeight, clientHeight } = observerRef.current
                // Check if we are close to the bottom of the container
                if (scrollTop + clientHeight >= scrollHeight - 10 && cursor && !loadingRecords) {
                    loadMoreRecord()
                }
            }
        }

        const currentRef = observerRef.current
        if (currentRef) {
            currentRef.addEventListener("scroll", handleScroll)
        }

        return () => {
            if (currentRef) {
                currentRef.removeEventListener("scroll", handleScroll)
            }
        }
    }, [cursor, recordFilter, loadingRecords])

    useEffect(() => {
        const container = observerRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [toggleVisibility, cursor])

    const formatDateHeader = (dateString: string) => {
        const today = new Date().toDateString()
        const yesterday = new Date(Date.now() - 86400000).toDateString()
        const date = new Date(dateString).toDateString()
        if (date === today) return "today"
        if (date === yesterday) return "yesterday"
        const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" }

        return new Date(dateString).toLocaleDateString(language, options)
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-[17px] font-bold w-full text-center text-white p-[11px]">
                {t("Scarecrow Notes")}
            </h1>
            <div
                className="h-full w-full px-4 py-6 flex flex-col text-white gap-3 overflow-auto"
                ref={observerRef}
            >
                {recordResults ? (
                    recordResults.map((record, index) => {
                        if (record.user_coin_balance && record.user_game_level) {
                            let last_login = timeAgo(record.last_login)
                            let { value, unit } = timeAgoString(record.action_time)

                            const previousRecordDate = recordResults[index - 1]?.action_time
                            const currentRecordDate = record.action_time

                            const showDateHeader =
                                !previousRecordDate ||
                                new Date(previousRecordDate).toDateString() !==
                                    new Date(currentRecordDate).toDateString()

                            return (
                                <div key={index}>
                                    {showDateHeader && (
                                        <div className="text-white font-semibold text-lg py-2 max-h-[60px]">
                                            {t(formatDateHeader(currentRecordDate))}
                                        </div>
                                    )}
                                    <div
                                        key={index}
                                        className="w-full bg-[#252A31] max-h-[60px] py-[2px] px-[16px] rounded-2xl flex justify-between items-center div-with-gradient-border"
                                        style={{
                                            backgroundPosition: "top",
                                            backgroundRepeat: "no-repeat",
                                        }}
                                    >
                                        <div className="flex flex-col items-start text-[14px] overflow-hidden">
                                            <span className="text-[18px] font-bold h-[12px] text-left absolute top-[8px] left-[52px]">
                                                {truncateText(record.user_name, 18)}{" "}
                                            </span>
                                            <div className="flex gap-[7px] items-center h-[40px] mt-[20px] -mb-[1px]">
                                                <Image
                                                    className="-ml-[4px] -mr-[2px] min-w-[36px] h-[48px] -mt-4 flex justify-center items-center scale-150"
                                                    src={`/crop/${record.crop_name}.png`}
                                                    height={48}
                                                    width={36}
                                                    alt={`${record.crop_name}`}
                                                    priority={true}
                                                    loading="eager"
                                                    quality={100}
                                                />
                                                <p
                                                    className={`${
                                                        record.action === "watered"
                                                            ? "text-[#26C7C7]"
                                                            : "text-[#33C14A]"
                                                    } font-semibold`}
                                                >
                                                    {t(record.action)}
                                                </p>
                                                <p className="-ml-[3px]">{t("your")}</p>

                                                <p className="-ml-[5px]">
                                                    {t(record.crop_name)} {value} {t(unit)}{" "}
                                                    {t("ago")}
                                                </p>
                                            </div>
                                            {record.user_earning > 0 && (
                                                <div className="absolute bottom-1 right-12 flex gap-1 justify-center items-center">
                                                    <Image
                                                        src="/game/coin_big.png"
                                                        width={16}
                                                        height={16}
                                                        alt="coin"
                                                    />
                                                    <p className="font-semibold">
                                                        +{record.user_earning}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex justify-between gap-[8px] items-center text-[14px]">
                                            <button
                                                className="ml-[12px]"
                                                onClick={() => {
                                                    router.push(
                                                        "/friends/farm/re/" + record.user_id
                                                    )
                                                }}
                                            >
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        d="M17.7094 10H2.29047"
                                                        stroke="#CFCFCF"
                                                        stroke-width="2"
                                                        stroke-miterlimit="10"
                                                        stroke-linecap="round"
                                                    />
                                                    <path
                                                        d="M10.7094 3L17.7094 10L10.7094 17"
                                                        stroke="#CFCFCF"
                                                        stroke-width="2"
                                                        stroke-miterlimit="10"
                                                        stroke-linecap="round"
                                                    />
                                                </svg>
                                            </button>
                                        </div>
                                        <div
                                            className={`absolute right-[2px] top-[2px] text-[8px] font-extrabold rounded-bl-[16px] rounded-tr-[16px] w-auto h-auto py-[1px] px-[12px] flex justify-center items-center text-white
                                        ${last_login === "online" ? "bg-[#249A37]" : "bg-gray-600"}
                                        `}
                                        >
                                            {t(last_login)}
                                        </div>
                                    </div>
                                </div>
                            )
                        }
                    })
                ) : (
                    <div>
                        <div className="flex w-full justify-center items-center text-white font-semibold text-md py-2 max-h-[60px]">
                            {t("No scarecrow notes found...")}
                        </div>
                    </div>
                )}
                <>
                    {loadingRecords &&
                        Array.from({ length: 20 }).map((_, index) => (
                            <div className="skeleton min-h-[54px]" key={index} />
                        ))}
                </>
            </div>
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-[24px] left-1/2 -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75 z-[100]"
                >
                    <ArrowUpFromDot size={24} />
                </button>
            )}
        </div>
    )
}

export default Record
