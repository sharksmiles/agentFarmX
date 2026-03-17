import Image from "next/image"
import { useUser } from "../context/userContext"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { fetchTasks, claimGameReward } from "@/utils/api/tasks"
import { useData } from "../context/dataContext"
import { ArrowUpFromDot } from "lucide-react"
import { useLanguage } from "../context/languageContext"

const EarnPage = () => {
    const { user, setUser } = useUser()
    const router = useRouter()
    const {
        setArtelaTask,
        setDailyTask,
        taskHeight,
        setGameTask,
        setHarvestCoinAmount,
        setHarvestSuccess,
        renaissanceTask,
        setRenaissanceTask,
        inGameTask,
        setInGameTask,
        dailyRewardList,
        setDailyRewardList,
        claimable,
        setClaimable,
        gameReward,
        setGameReward,
        stone,
        crystal,
        setStone,
        setCrystal,
        completed,
        setCompleted,
    } = useData()
    const { t } = useLanguage()
    const containerRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const [isGameWallet, setIsGameWallet] = useState<boolean>(false)
    const [claimingReward, setClaimingReward] = useState<boolean>(false)
    const [loading, setLoading] = useState<boolean>(true)
    const isFetchingRef = useRef<boolean>(false)

    const getTask = useCallback(async () => {
        if (!user?.id || isFetchingRef.current) return
        
        isFetchingRef.current = true
        setLoading(true)
        
        fetchTasks(user.id)
            .then((data) => {
                setInGameTask(data.game_tasks)
                setDailyRewardList(data.daily_reward)
                setGameReward(data.game_reward)
                setCompleted(data.completed ? 1 : 0)
                if (data.renaissance_tasks?.length) {
                    setRenaissanceTask(data.renaissance_tasks)
                }
            })
            .catch((err) => {
                console.error('Failed to fetch tasks:', err)
                setInGameTask([])
                setDailyRewardList([])
                setGameReward(0)
                setCompleted(0)
            })
            .finally(() => {
                setLoading(false)
                isFetchingRef.current = false
            })
    }, [user?.id, setCompleted, setDailyRewardList, setGameReward, setInGameTask, setRenaissanceTask])

    const scrollToTop = () => {
        containerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const toggleVisibility = useCallback(() => {
        const container = containerRef.current
        if (container && container.scrollTop > 20) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        getTask()
    }, [getTask])

    useEffect(() => {
        const container = containerRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [toggleVisibility])

    useEffect(() => {
        if (user?.wallet_address_type === "game") {
            setIsGameWallet(true)
        } else {
            setIsGameWallet(false)
        }
    }, [user])

    return (
        <div
            className="h-full w-full flex flex-col px-[16px] text-white overflow-y-scroll relative"
            style={{ maxHeight: taskHeight! }}
            ref={containerRef}
        >
            {isVisible && (
                <button
                    onClick={scrollToTop}
                    className="fixed bottom-[110px] left-1/2 -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75"
                >
                    <ArrowUpFromDot size={24} />
                </button>
            )}

            {/* Invite Section */}
            <div className="w-full mt-4 mb-2">
                <div 
                    onClick={() => router.push('/invite')}
                    className="w-full bg-gradient-to-r from-[#5964F5] to-[#343A8F] rounded-2xl p-4 flex justify-between items-center cursor-pointer shadow-lg hover:opacity-90 transition-opacity"
                >
                    <div>
                        <h2 className="text-xl font-bold">{t("Invite Friends")}</h2>
                        <p className="text-sm text-gray-200">{t("Earn coins and energy!")}</p>
                    </div>
                    <Image
                        src="/icon/invitetab.png" 
                        width={40}
                        height={40}
                        alt="Invite"
                    />
                </div>
            </div>

            {/* <div className="flex justify-center items-center gap-[8px] py-[6px]">
                <Image
                    src="/game/coin_big.png"
                    width={35}
                    height={35}
                    alt="coin"
                    priority={true}
                    loading="eager"
                    quality={100}
                />
                <h1 className="text-[28px] text-white font-extrabold">Earn more coins</h1>
            </div> */}
            {/* Daily Tasks */}
            <div className="h-auto w-full flex flex-col justify-center items-center text-[20px] pt-[24px] pb-[12px]">
                {t("Daily Tasks")}
            </div>
            {loading ? (
                <div className="min-h-[38px] w-full flex justify-between items-center py-[6px]">
                    <div className="skeleton" />
                </div>
            ) : dailyRewardList?.length > 0 ? (
                <div
                    onClick={() => {
                        setGameTask(null)
                        setArtelaTask(null)
                        setDailyTask(dailyRewardList)
                    }}
                    className="h-auto w-full flex justify-between items-center py-[6px] border-b-2 border-[#252A31]"
                >
                    <div className="flex flex-col justify-start">
                        <p className="text-[16px] font-medium">{t("Daily reward")}</p>
                    </div>
                    <div>
                        <Image
                            src="/svg/next.svg"
                            width={20}
                            height={20}
                            alt="yes"
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                    </div>
                </div>
            ) : (
                <div className="min-h-[38px] w-full flex justify-between items-center py-[6px]">
                    <p className="text-gray-400">{t("No daily rewards available")}</p>
                </div>
            )}

            <div className="h-auto w-full flex flex-col justify-center items-center text-[20px] pt-[24px] pb-[12px]">
                {t("Game Tasks")}
            </div>
            <button
                onClick={() => {
                    if (gameReward > 0 && !claimingReward) {
                        setClaimingReward(true)
                        claimGameReward()
                            .then(({ reward, updated_user }) => {
                                setHarvestCoinAmount(reward ?? gameReward)
                                setHarvestSuccess(true)
                                setGameReward(0)
                                if (updated_user) setUser(updated_user)
                                else setUser((prev) => prev ? { ...prev, farm_stats: { ...prev.farm_stats, coin_balance: prev.farm_stats?.coin_balance + gameReward } } : prev)
                            })
                            .catch(() => {
                                setHarvestCoinAmount(gameReward)
                                setHarvestSuccess(true)
                                setGameReward(0)
                                setUser((prev) => prev ? { ...prev, farm_stats: { ...prev.farm_stats, coin_balance: prev.farm_stats?.coin_balance + gameReward } } : prev)
                            })
                            .finally(() => setClaimingReward(false))
                    }
                }}
                disabled={gameReward === 0 || claimingReward}
                className={`w-full p-[16px] ${
                    gameReward > 0 ? "bg-[#5964F5]" : "bg-[#272A2F]"
                } rounded-2xl font-semibold text-[16px] text-white mb-2`}
            >
                {gameReward > 0
                    ? `${t("Claim ")}${gameReward}${t(" coins")}`
                    : t("No coins to claim")}
            </button>
            <div className="flex flex-col h-[calc(100vh-280px)] overflow-auto">
                {loading ? (
                    <>
                        {Array.from({ length: 5 }, (_, i) => (
                            <div
                                key={i}
                                className="min-h-[62px] w-full flex justify-between items-center py-[6px]"
                            >
                                <div className="skeleton" />
                            </div>
                        ))}
                    </>
                ) : inGameTask?.length > 0 ? (
                    inGameTask.map((task, index) => {
                        return (
                            <div
                                onClick={() => {
                                    // 已完成的任务不再弹出提示
                                    if (task.completed) return
                                    setArtelaTask(null)
                                    setDailyTask(null)
                                    setGameTask(task)
                                }}
                                key={index}
                                className={`h-auto w-full flex justify-between items-center py-[6px] border-b-2 border-[#252A31] ${task.completed ? 'opacity-60' : 'cursor-pointer'}`}
                            >
                                <div className="flex flex-col justify-start">
                                    <p className="text-[16px] font-medium">{t(task.title)}</p>
                                    <div className="flex justify-start items-center gap-1 text-[14px]">
                                        <Image
                                            className="w-[16px] h-[16px]"
                                            src="/game/coin_big.png"
                                            width={16}
                                            height={16}
                                            alt=""
                                            priority={true}
                                            loading="eager"
                                            quality={100}
                                        />
                                        <p className="text-[#FBB602] text-[16px] font-semibold">
                                            +{task.reward.toLocaleString("en-US")}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <Image
                                        src={task.completed ? "/svg/yes.svg" : "/svg/next.svg"}
                                        width={20}
                                        height={20}
                                        alt={task.completed ? "yes" : "next"}
                                        priority={true}
                                        loading="eager"
                                        quality={100}
                                    />
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="w-full text-center py-4">
                        <p className="text-gray-400">{t("No game tasks available")}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EarnPage
