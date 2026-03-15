"use client"

import { useUser } from "../context/userContext"
import ProgressBar from "./levelprogressbar"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { useEffect, useState, useCallback } from "react"
import CountUp from "react-countup"
import { useRouter } from "next/navigation"
import { useLanguage } from "../context/languageContext"
import { formatWalletAddress } from "../../utils/func/utils"

const GameStats = ({}) => {
    const { user, setUser } = useUser()
    const { t } = useLanguage()
    const router = useRouter()
    const {
        setActionType,
        gameStats,
        setGameStats,
        openBoost,
        setOpenBoost,
        setOpenEnergyModal,
        setOpenRadarModal,
        onBoardingStep,
        setOnBoardingStep,
        setOpenLeaderBoardPopupModal,
        OpenAgentFarmAlert,
    } = useData()
    const [prevBalance, setPrevBalance] = useState<number>(0)
    const [currentBalance, setCurrentBalance] = useState<number>(0)
    const [prevEnergy, setPrevEnergy] = useState<number>(0)
    const [currentEnergy, setCurrentEnergy] = useState<number>(0)
    const [openMoreButtons, setOpenMoreButtons] = useState<boolean>(false)
    const setupNextRestore = useCallback((nextRestoreTimeString: string) => {
        const nextRestoreTime = new Date(nextRestoreTimeString).getTime()
        const now = new Date().getTime()
        const timeUntilRestore = nextRestoreTime - now

        if (timeUntilRestore > 0 && currentEnergy < user?.farm_stats?.max_energy!) {
            const timer = setTimeout(() => {
                const newEnergy = currentEnergy + 1
                setUser((prev) => {
                    if (prev) {
                        const nextRestore =
                            newEnergy < prev.farm_stats.max_energy!
                                ? new Date(now + 1 * 60 * 1000).toISOString()
                                : null

                        return {
                            ...prev,
                            farm_stats: {
                                ...prev.farm_stats,
                                energy_left: newEnergy,
                                next_restore_time: nextRestore,
                            },
                        }
                    }
                    return prev
                })
                setCurrentEnergy(newEnergy)
            }, timeUntilRestore)

            return () => clearTimeout(timer)
        }
    }, [currentEnergy, user?.farm_stats?.max_energy, setUser])

    useEffect(() => {
        if (gameStats) {
            setGameStats(gameStats)
        }
    }, [gameStats, setGameStats])

    useEffect(() => {
        if (user?.farm_stats?.next_restore_time) {
            return setupNextRestore(user.farm_stats.next_restore_time)
        }
    }, [user?.farm_stats?.next_restore_time, setupNextRestore])

    useEffect(() => {
        setPrevEnergy(currentEnergy)
        setCurrentEnergy(user?.farm_stats?.energy_left || 0)
    }, [user?.farm_stats?.energy_left])

    useEffect(() => {
        setPrevBalance(currentBalance)
        setCurrentBalance(user?.farm_stats?.coin_balance || 0)
    }, [user?.farm_stats?.coin_balance])

    const currentLevel = user?.farm_stats?.level || 1
    const requiredExp = gameStats?.level_requirements[currentLevel]
        ? gameStats?.level_requirements[currentLevel]["Require Experience"]
        : "max"
    const levelExp = user?.farm_stats?.level_exp || 0
    const progress = requiredExp ? (requiredExp != "max" ? (levelExp / requiredExp) * 100 : 0) : 0

    const upgradeLevel = () => {
        if (currentLevel >= 40) {
            return
        }
        if (progress === 100) {
            setActionType("upgrade")
        }
    }
    return (
        <div className="fixed top-0 w-full h-auto flex flex-col items-center z-30">
            <div className="w-full flex justify-between gap-[12px] p-[12px] text-[12px]">
                <div className="flex w-full bg-light-dark rounded-[16px] p-[8px] justify-between items-center flex-col">
                    <p className="text-[#FC9069]">{t("User name")}</p>
                    <p className="text-white text-[16px] font-bold">
                        {user?.username || formatWalletAddress(user?.wallet_address!, "X Layer")}
                    </p>
                </div>
                <div className="flex w-full bg-light-dark rounded-[16px] p-[8px] justify-end items-center flex-col gap-[4px]">
                    <p className="text-[#FC9069]">
                        {t("Level")} {currentLevel}
                    </p>
                    <div className="px-[4px] w-full">
                        <ProgressBar progress={progress} />
                    </div>
                    {progress === 100 ? (
                        <button
                            className="text-[#80EE9E] underline font-semibold relative"
                            onClick={() => {
                                if (onBoardingStep) {
                                    setOnBoardingStep(null)
                                }
                                upgradeLevel()
                            }}
                        >
                            {onBoardingStep == 4 && currentLevel === 1 && (
                                <div className="absolute left-1/2 -translate-x-1/2 top-[12px] min-w-[233px] h-auto z-20 flex items-center justify-start flex-col">
                                    <Image
                                        className="animate-bounce"
                                        src="/game/Onboarding-Upgrade.png"
                                        width={40}
                                        height={41.62}
                                        alt="upgrade"
                                        quality={100}
                                    ></Image>
                                    <span className="z-10 bg-[#FDE8CE] text-[#5A4B23] font-medium text-[16px] flex justify-center items-center px-[40px] py-[16px] border-[1px] border-[#CF8052] rounded-[16px] whitespace-nowrap">
                                        {t("Click to upgrade level!")}
                                    </span>
                                </div>
                            )}
                            {currentLevel < 40 ? t("Upgrade") : t("Max Level")}
                        </button>
                    ) : (
                        <p className="">
                            <span className="text-[#80EE9E]">{levelExp}</span>
                            <span className="text-white">/{requiredExp}</span>
                        </p>
                    )}
                </div>
                <div className="flex w-full bg-light-dark rounded-[16px] p-[8px] justify-between items-center flex-col">
                    <p className="text-[#FBB602]">Coin</p>
                    {currentBalance ? (
                        <CountUp
                            start={prevBalance}
                            end={currentBalance}
                            duration={2}
                            separator=","
                            decimals={0}
                            className="text-white text-[16px] font-bold"
                        />
                    ) : (
                        <p className="text-white text-[16px] font-bold">0</p>
                    )}
                </div>
            </div>
            <div className="w-full flex justify-between gap-[9px] px-[12px] pt-[0px] text-[12px]">
                <div className="w-full flex flex-col gap-[14.4px]">
                    {openBoost ? (
                        <button
                            onClick={() => {
                                setOpenBoost(false)
                            }}
                            className="relative w-full h-[40px] rounded-[10.5px] z-0 flex justify-center items-center hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all bg-gradient-to-b from-[#a8ff98] to-[#6fcf5f] border-[2px] border-white shadow-[0_2px_0_#3e8e41]"
                        >
                            <Image
                                className="absolute left-[8px] top-1/2 -translate-y-1/2"
                                src="/game/Boost_Big.png"
                                width={24}
                                height={24}
                                alt="boost icon"
                                quality={100}
                            />
                            <div className="text-[#1b3d1c] text-[16px] font-bold whitespace-nowrap z-10 flex items-center justify-center w-full pl-6">
                                <span>{t("SELECT CROPS")}</span>
                            </div>

                            <span className="absolute top-1/2 -translate-y-1/2 right-[12px] text-nowrap flex">
                                <span className="text-[#1b3d1c] text-[16px] font-bold flex whitespace-nowrap">
                                    <span>{user?.farm_stats?.boost_left}/3</span>
                                </span>
                            </span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if ((user?.farm_stats?.boost_left || 0) > 0) {
                                    setOpenBoost(true)
                                } else {
                                    OpenAgentFarmAlert({
                                        notificationTitle: t("No Boosts"),
                                        notificationMessage: t("You have used all your daily boosts. Come back tomorrow!"),
                                    })
                                }
                            }}
                            className={`relative w-full h-[40px] rounded-[10.5px] z-0 flex justify-center items-center transition-all border-[2px] border-white shadow-[0_2px_0_#d14d2e] ${
                                (user?.farm_stats?.boost_left || 0) > 0 
                                    ? "bg-gradient-to-b from-[#ffcd4d] to-[#e69b00] hover:brightness-110 active:translate-y-[2px] active:shadow-none" 
                                    : "bg-gray-400 grayscale cursor-not-allowed"
                            }`}
                        >
                            <Image
                                className="absolute left-[8px] top-1/2 -translate-y-1/2"
                                src="/game/Boost_Big.png"
                                width={24}
                                height={24}
                                alt="boost icon"
                                quality={100}
                            />
                            <div className="text-[#5A4B23] w-full h-full flex justify-center items-center text-[16px] font-bold whitespace-nowrap z-10 pl-6">
                                {t("BOOST YOUR CROPS")}
                            </div>
                        </button>
                    )}
                    <div className="flex gap-2 w-full relative">
                        <button
                            onClick={() => {
                                setOpenMoreButtons(!openMoreButtons)
                            }}
                            className="relative max-w-[156px] min-w-[156px] h-[38px] text-white rounded-[10.5px] z-0 flex justify-center items-center border-[1px] shadow-regular bg-[rgba(148,231,109,0.8)] hover:opacity-90"
                        >
                            {gameStats?.raffle_live != 0 && gameStats?.raffle_live != null && (
                                <div className="absolute -right-[4px] -top-[8px] text-white font-semibold bg-[#D31A1A] flex px-[4px] rounded-lg opacity-90 z-50">
                                    {t("live now")} [{gameStats.raffle_live}]
                                </div>
                            )}
                            <div className="text-[rgba(81,53,20,0.82)] w-full h-full flex justify-center items-center text-[16px] font-bold whitespace-nowrap z-10 border-[1px] border-transparent gap-[4px]">
                                <Image
                                    className="w-[30px] h-[30px] mr-1"
                                    src="/game/combineicon.png"
                                    width={60}
                                    height={60}
                                    alt="combine icon"
                                    quality={100}
                                />
                                <span className="min-w-[40px]">{t("More")}</span>
                                <Image
                                    className={`w-[6px] h-[6px] ${
                                        openMoreButtons
                                            ? "transform transition-transform duration-500 ease-in-out"
                                            : "transform transition-transform duration-500 ease-in-out rotate-180"
                                    }`}
                                    src="/game/collap.png"
                                    width={12}
                                    height={12}
                                    alt="energy icon"
                                    quality={100}
                                />
                            </div>
                        </button>
                        {openMoreButtons && (
                            <div className="w-[156px] h-[120px] absolute top-[46px] bg-[rgba(37,42,49,0.8)] bg-blur rounded-[10px] px-[10px] flex flex-col">
                                <button
                                    className="w-full h-10 flex gap-2 items-center hover:opacity-80"
                                    onClick={() => {
                                        setOpenRadarModal(true)
                                    }}
                                >
                                    <Image
                                        className="w-[22px] h-[22px]"
                                        src="/game/radar.png"
                                        width={44}
                                        height={44}
                                        alt="guard"
                                        quality={100}
                                    />
                                    <div className="text-[17px] text-white font-semibold">
                                        {t("Radar")}
                                    </div>
                                </button>
                                <span className="w-full h-px min-h-[1px] bg-[rgba(255,255,255,0.1)]" />
                                <button
                                    className="w-full h-10 flex gap-2 items-center hover:opacity-80"
                                    onClick={() => {
                                        setOpenEnergyModal(true)
                                    }}
                                >
                                    <Image
                                        className="w-[22px] h-[22px]"
                                        src="/game/energy.png"
                                        width={44}
                                        height={44}
                                        alt="guard"
                                        quality={100}
                                    />
                                    <div className="w-full h-full flex flex-col justify-between items-start py-[7px]">
                                        <div className="text-[17px] text-white font-semibold leading-5">
                                            <CountUp
                                                start={prevEnergy}
                                                end={currentEnergy}
                                                duration={2}
                                                separator=","
                                                decimals={0}
                                                className="text-[#80EE9E]"
                                            />
                                            /{user?.farm_stats?.max_energy}
                                        </div>
                                        <div className="w-full">
                                            <ProgressBar
                                                progress={
                                                    currentEnergy >= user?.farm_stats?.max_energy!
                                                        ? 100
                                                        : Number(
                                                              (currentEnergy /
                                                                  user?.farm_stats?.max_energy!) *
                                                                  100
                                                          )
                                                }
                                            />
                                        </div>
                                    </div>
                                </button>
                                <span className="w-full h-px min-h-[1px] bg-[rgba(255,255,255,0.1)]" />
                                <button
                                    className="w-full h-10 flex gap-2 items-center hover:opacity-80"
                                    onClick={() => {
                                        router.push("/record")
                                    }}
                                >
                                    <Image
                                        className="w-[22px] h-[22px]"
                                        src="/game/record.png"
                                        width={44}
                                        height={44}
                                        alt="guard"
                                        quality={100}
                                    />
                                    <div className="text-[17px] text-white font-semibold">
                                        {t("Notes")}
                                    </div>
                                </button>
                                {/* <span className="w-full h-px min-h-[1px] bg-[rgba(255,255,255,0.1)]" />
                                <button
                                    className="w-full h-10 flex gap-2 items-center relative hover:opacity-80"
                                    onClick={() => {
                                        router.push("/raffle")
                                    }}
                                >
                                    {gameStats?.raffle_live != 0 &&
                                        gameStats?.raffle_live != null && (
                                            <div className="absolute left-[16px] top-[8px] w-2 h-2 border-[2px] border-white bg-[#D31A1A] rounded-full" />
                                        )}
                                    <Image
                                        className="w-[22px] h-[22px]"
                                        src="/game/raffle.png"
                                        width={44}
                                        height={44}
                                        alt="guard"
                                        quality={100}
                                    />
                                    <div className="text-[17px] text-white font-semibold">
                                        {t("Raffles")}
                                    </div>
                                </button> */}
                            </div>
                        )}

                        {/* <button
                            onClick={() => {
                                setOpenLeaderBoardPopupModal(true)
                            }}
                            className="top-1/2 -translate-y-1/2 left-[166px] absolute w-auto pl-3 pr-3 h-[37.69px] text-white rounded-[10.5px] z-0 flex justify-center items-center bg-[rgba(37,42,49,0.5)] hover:opacity-85"
                        >
                            <div className="text-whitew-full h-full flex justify-center items-center text-[16px] font-bold whitespace-nowrap z-10 border-[1px] border-transparent p-2">
                                <Image
                                    className="w-6 h-6 mr-1"
                                    src="/game/crown.png"
                                    width={24}
                                    height={24}
                                    alt="raffle"
                                    quality={100}
                                />
                                {t("LeaderBoard")}
                            </div>
                        </button> */}
                    </div>
                </div>
                <div className="flex flex-col gap-[14.4px]">
                    <button
                        className="relative w-[112px] h-[40px] rounded-[10.5px] z-0 flex justify-center items-center hover:brightness-110 active:translate-y-[2px] active:shadow-none transition-all bg-gradient-to-b from-[#ffcd4d] to-[#e69b00] border-[2px] border-white shadow-[0_2px_0_#d14d2e]"
                        onClick={() => {
                            setActionType("shop")
                        }}
                    >
                        <div className="text-[#5A4B23] w-full h-full flex justify-center items-center text-[16px] font-bold whitespace-nowrap z-10 gap-1">
                            <Image
                                className="w-[20.5px] h-[18.5px] -mt-1"
                                src="/game/market.png"
                                width={41}
                                height={37}
                                alt="market"
                                quality={100}
                            />
                            <span>{t("Market")}</span>
                        </div>
                    </button>

                    {/* <button className="relative max-w-[110.5px] min-w-[110.5px] h-[37.69px] text-white rounded-[10.5px] z-0 flex justify-center items-center border-[1px] shadow-regular hover:opacity-85">
                        <div className="absolute w-full h-[37.69px] border-[1px] border-white bg-[rgba(213,81,81,0.5)] rounded-[10.5px] -z-1 top-[2px]" />
                        <div className="absolute w-full h-[35.74px] border-[1px] border-white rounded-[10.5px] -z-1 -top-[2px] left-0" />
                        <div className="absolute w-full h-[37.69px] border-[1px] border-white bg-[rgba(156,248,141,0.8)] rounded-[10.5px] z-1 -top-[2px] left-0" />
                        {gameStats?.raffle_live != 0 && gameStats?.raffle_live != null && (
                            <div className="absolute -left-[4px] -top-[8px] text-white font-semibold bg-[#D31A1A] flex px-[4px] rounded-lg opacity-90 z-50">
                                {t("live now")} [{gameStats.raffle_live}]
                            </div>
                        )}
                        <div className="text-[rgba(81,53,20,0.82)] w-full h-full flex justify-center items-center text-[16px] font-bold whitespace-nowrap z-10 border-[1px] border-transparent">
                            <Image
                                className="w-[21px] h-[21px] mr-1"
                                src="/game/raffle.png"
                                width={21}
                                height={21}
                                alt="raffle"
                                quality={100}
                            />
                            {t("Raffles")}
                        </div>
                    </button> */}
                </div>
            </div>
        </div>
    )
}

export default GameStats
