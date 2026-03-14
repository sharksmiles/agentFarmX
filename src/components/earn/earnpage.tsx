import Image from "next/image"
import { useUser } from "../context/userContext"
import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { MOCK_TASKS, MOCK_DAILY_REWARD } from "@/utils/mock/mockData"
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

    const getTask = async () => {
        setInGameTask(MOCK_TASKS)
        setDailyRewardList(MOCK_DAILY_REWARD.daily_reward)
        setGameReward(MOCK_DAILY_REWARD.game_reward)
        setCompleted(MOCK_DAILY_REWARD.completed)
    }

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
    }, [])

    useEffect(() => {
        const container = containerRef.current
        container?.addEventListener("scroll", toggleVisibility)
        return () => {
            container?.removeEventListener("scroll", toggleVisibility)
        }
    }, [])

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
            {dailyRewardList?.length > 0 ? (
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
                        {/* <Image
                            src="/svg/yes.svg"
                            width={20}
                            height={20}
                            alt="yes"
                            priority={true}
                            loading="eager"
                            quality={100}
                        /> */}
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
                    <div className="skeleton" />
                </div>
            )}

            <div className="h-auto w-full flex flex-col justify-center items-center text-[20px] pt-[24px] pb-[12px]">
                {t("Game Tasks")}
            </div>
            <button
                onClick={() => {
                    if (gameReward > 0) {
                        setHarvestCoinAmount(gameReward)
                        setHarvestSuccess(true)
                        setGameReward(0)
                        setUser((prev) => prev ? { ...prev, farm_stats: { ...prev.farm_stats, coin_balance: prev.farm_stats.coin_balance + gameReward } } : prev)
                    }
                }}
                disabled={gameReward === 0}
                className={`w-full p-[16px] ${
                    gameReward > 0 ? "bg-[#5964F5]" : "bg-[#272A2F]"
                } rounded-2xl font-semibold text-[16px] text-white mb-2`}
            >
                {gameReward > 0
                    ? `${t("Claim ")}${gameReward}${t(" coins")}`
                    : t("No coins to claim")}
            </button>
            <div className="flex flex-col min-h-[280px] max-h-[280px] overflow-auto">
                {inGameTask?.length > 0 ? (
                    inGameTask.map((task, index) => {
                        if (!isGameWallet && task.id === 5) {
                            return null
                        }
                        if (
                            (task.id === 3 || task.id === 4 || task.id === 5 || task.id === 9) &&
                            completed
                        ) {
                            return null
                        }

                        return (
                            <div
                                onClick={() => {
                                    setArtelaTask(null)
                                    setDailyTask(null)
                                    setGameTask(task)
                                }}
                                key={index}
                                className="h-auto w-full flex justify-between items-center py-[6px] border-b-2 border-[#252A31]"
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
                )}
            </div>
            {/* Artela Renaissance Tasks */}
            {/* <div className="h-auto w-full flex flex-col justify-center items-center text-[20px] pt-[24px] pb-[12px]">
                {t("Artela Renaissance Tasks")}
            </div>
            <div className="h-auto w-full flex flex-col justify-center items-center text-[20px] mb-5">
                <p className="text-[#FBB602] text-[16px] font-semibold mb-2">
                    {t("My Reward Balance")}
                </p>
                <div className="flex items-center justify-center gap-4 text-[14px]">
                    <div className="flex items-center gap-1">
                        <Image
                            className="w-[16px] h-[16px]"
                            src="/icon/stone.png"
                            width={16}
                            height={16}
                            alt=""
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                        <p className="text-[#FBB602] text-[16px] font-semibold">{stone}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <Image
                            className="w-[16px] h-[16px]"
                            src="/icon/crystal.png"
                            width={16}
                            height={16}
                            alt=""
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                        <p className="text-[#FBB602] text-[16px] font-semibold">{crystal}</p>
                    </div>
                </div>
            </div>
            {renaissanceTask.length > 0 ? (
                <>
                    {isGameWallet && (
                        <div className="text-[14px] mb-[4px] font-semibold">
                            *
                            {t(
                                "make sure you finished 'Export Your Wallet Account' task in order to complete Artela Renaissance Tasks from below."
                            )}
                        </div>
                    )}
                    <button
                        onClick={() => {
                            if (claimable > 0) {
                                let rewardAmount = claimable
                                getArtelaRenaisanceTaskRequest.post(1).then(async (res) => {
                                    const response = await authorizationRequest.get()
                                    setUser({
                                        ...response,
                                        farm_stats: response.farm_stats,
                                    })
                                    setHarvestCoinAmount(rewardAmount)
                                    setHarvestSuccess(true)
                                    setRenaissanceTask(res.data)
                                    setClaimable(0)
                                    setStone(res.stone)
                                    setCrystal(res.crystal)
                                })
                            }
                        }}
                        disabled={claimable === 0}
                        className={`w-full p-[16px] ${
                            claimable > 0 ? "bg-[#5964F5]" : "bg-[#272A2F]"
                        } rounded-2xl font-semibold text-[16px] text-white`}
                    >
                        {claimable > 0
                            ? `${t("Claim ")}${gameReward}${t(" coins")}`
                            : t("No coins to claim")}
                    </button>
                    {renaissanceTask.map((task, index) => (
                        <div
                            key={index}
                            onClick={() => {
                                setGameTask(null)
                                setDailyTask(null)
                                setArtelaTask(task)
                            }}
                            className="h-auto w-full flex justify-between items-center py-[12px] border-b-2 border-[#252A31]"
                        >
                            <div className="flex flex-col justify-start">
                                <div className="flex items-center gap-[5px]">
                                    <Image src={task.logoUrl} alt="logo" width={15} height={15} />
                                    <p className="text-[16px] font-medium">{task.name}</p>
                                </div>
                                <div className="flex justify-start items-center gap-4 ml-5">
                                    <div className="flex items-center justify-center gap-1">
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
                                            +{task.reward}
                                        </p>
                                    </div>

                                    {task.stone !== 0 && (
                                        <div className="flex items-center gap-1 text-[14px]">
                                            <Image
                                                className="w-[16px] h-[16px]"
                                                src="https://renaissance.artela.network/_next/static/media/stone.6817d82a.svg"
                                                width={16}
                                                height={16}
                                                alt=""
                                                priority={true}
                                                loading="eager"
                                                quality={100}
                                            />
                                            <p className="text-[#FBB602] text-[16px] font-semibold">
                                                +{task.stone}
                                            </p>
                                        </div>
                                    )}

                                    {task.crystal !== 0 && (
                                        <div className="flex items-center gap-1 text-[14px]">
                                            <Image
                                                className="w-[16px] h-[16px]"
                                                src="https://renaissance.artela.network/_next/static/media/crystal.2a1c67a5.svg"
                                                width={16}
                                                height={16}
                                                alt=""
                                                priority={true}
                                                loading="eager"
                                                quality={100}
                                            />
                                            <p className="text-[#FBB602] text-[16px] font-semibold">
                                                +{task.crystal}
                                            </p>
                                        </div>
                                    )}
                                </div>
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
                    ))}
                </>
            ) : (
                <>
                    {Array.from({ length: 12 }, (_, i) => (
                        <div
                            key={i}
                            className="min-h-[62px] w-full flex justify-between items-center py-[6px]"
                        >
                            <div className="skeleton" />
                        </div>
                    ))}
                </>
            )} */}
        </div>
    )
}

export default EarnPage
