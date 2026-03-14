"use client"
import { useUser } from "../../context/userContext"
import { useLanguage } from "../../context/languageContext"
import { fetchLeaderboard } from "@/utils/api/invite"
import { MOCK_LEADERBOARD } from "@/utils/mock/mockData"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { truncateText } from "@/utils/func/utils"
import { CrownIcon, GoIcon, InvitesIcon } from "../icon"
import { useRouter } from "next/navigation"

type LeaderboardItem = {
    rank: number
    user_id: string
    name: string
    total_invites: number
}

type LeaderboardResponse = {
    results: LeaderboardItem[]
    next: string | null
}

// 将计算排名的函数移到组件外部避免重复创建
const calculateRanks = (items: LeaderboardItem[]): LeaderboardItem[] => {
    // 首先按 total_invites 降序排序
    const sorted = [...items].sort((a, b) => b.total_invites - a.total_invites)

    let currentRank = 1
    let currentScore: number | null = null
    let skipCount = 0

    return sorted.map((item, index) => {
        if (currentScore !== item.total_invites) {
            currentRank = currentRank + skipCount
            currentScore = item.total_invites
            skipCount = 0
        }
        skipCount++

        return {
            ...item,
            rank: currentRank,
        }
    })
}

const LeaderBoard = (): JSX.Element => {
    const router = useRouter()
    const { t } = useLanguage()
    const [data, setData] = useState<LeaderboardItem[]>([])
    const [nextCursor, setNextCursor] = useState<string | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const observerTarget = useRef<HTMLDivElement | null>(null)

    const rankedData = useMemo(() => calculateRanks(data), [data])

    const extractNextCursor = useCallback((next: string | null): string | null => {
        if (!next) return null
        const cursorMatch = next.match(/cursor=([^&]*)/)
        return cursorMatch ? cursorMatch[1] : null
    }, [])

    const loadInitial = useCallback(async (): Promise<void> => {
        setLoading(true)
        fetchLeaderboard("invite")
            .then(({ results, next }) => {
                setData(results)
                setNextCursor(extractNextCursor(next))
            })
            .catch(() => {
                setData(MOCK_LEADERBOARD.results as LeaderboardItem[])
                setNextCursor(null)
            })
            .finally(() => setLoading(false))
    }, [extractNextCursor])

    const loadMore = useCallback(async (): Promise<void> => {
        if (!nextCursor || loading) return
        setLoading(true)
        fetchLeaderboard("invite", nextCursor)
            .then(({ results, next }) => {
                setData((prev) => [...prev, ...results])
                setNextCursor(extractNextCursor(next))
            })
            .catch(() => setNextCursor(null))
            .finally(() => setLoading(false))
    }, [nextCursor, loading, extractNextCursor])

    const handleObserver = useCallback(
        (entries: IntersectionObserverEntry[]): void => {
            const [target] = entries
            if (target.isIntersecting && nextCursor) {
                loadMore()
            }
        },
        [nextCursor, loadMore]
    )

    useEffect(() => {
        const observer = new IntersectionObserver(handleObserver, {
            root: null,
            rootMargin: "20px",
            threshold: 0.1,
        })

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => observer.disconnect()
    }, [handleObserver])

    useEffect(() => {
        loadInitial()
    }, [loadInitial])

    const renderLeaderboardItems = useMemo(
        () =>
            rankedData.map((item) => (
                <div
                    className="min-h-[54px] w-full flex justify-between items-center bg-[#252A31] py-3 px-4 rounded-2xl"
                    key={item.user_id}
                >
                    <div className="flex items-center gap-3 w-full">
                        <span className="flex justify-center items-center relative w-[30px] h-[30px] min-w-[30px] min-h-[30px]">
                            {item.rank <= 3 ? (
                                <>
                                    <div className="h-full">
                                        <CrownIcon rank={item.rank} />
                                    </div>
                                    <p className="text-white text-[12px] font-extrabold absolute left-1/2 -translate-x-1/2 top-[9px]">
                                        {item.rank}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-white text-[16px] font-bold">{item.rank}</p>
                                </>
                            )}
                        </span>
                        <span className="text-white text-[16px] font-bold leading-[19px]">
                            {truncateText(item.name, 18)}
                        </span>
                    </div>
                    <div className="flex gap-2 justify-center items-center w-[89px] h-full">
                        <div className="flex justify-center items-center gap-1">
                            <span className="w-4 h-4">
                                <InvitesIcon />
                            </span>
                            <p className="text-[#FBB602] text-[14px] font-semibold">
                                {item.total_invites.toLocaleString("en-US")}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                console.log("Go to profile")
                                router.push(`/friends/farm/il/${item.user_id}`)
                            }}
                        >
                            <GoIcon />
                        </button>
                    </div>
                </div>
            )),
        [rankedData, t, router]
    )

    return (
        <div className="w-full h-[calc(100vh-290px)] -mt-[30px] z-[7] flex justify-start items-center flex-col pt-4">
            <h1 className="mb-3">
                <span className="text-white font-medium text-[20px]">{t("current period:")}</span>{" "}
                <span className="text-white text-[14px]">(1/18/2025-1/24/2025)</span>
            </h1>
            <div className="w-full h-full flex flex-col gap-3 overflow-y-auto p-4">
                {renderLeaderboardItems}
                <div ref={observerTarget} className="w-full flex flex-col gap-3">
                    {loading &&
                        Array.from({ length: 25 }).map((_, index) => (
                            <div className="skeleton min-h-[54px] w-full" key={index} />
                        ))}
                </div>
            </div>
        </div>
    )
}

export default LeaderBoard
