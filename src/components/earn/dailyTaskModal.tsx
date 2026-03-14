"use client"

import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useData } from "../context/dataContext"
import { useEffect, useRef, useState } from "react"
import { fetchDailyCheckIn, claimDailyReward } from "@/utils/api/tasks"
import { MOCK_DAILY_REWARD } from "@/utils/mock/mockData"
import { useUser } from "../context/userContext"
import dynamic from "next/dynamic"
import { useLanguage } from "../context/languageContext"
const Wheel = dynamic(() => import("react-custom-roulette").then((mod) => mod.Wheel), {
    ssr: false,
})

const wheelData = [
    {
        option: "500 Coin",
        style: {
            backgroundColor: "#6FCF97",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
    {
        option: "30,000 Coin",
        style: {
            backgroundColor: "#27AE60",
            fontSize: 20,
            fontWeight: 750,
            textColor: "white",
        },
    },
    {
        option: "1,000 Coin",
        style: {
            backgroundColor: "#BB6BD9",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
    {
        option: "20,000 Coin",
        style: {
            backgroundColor: "#9B51E0",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
    {
        option: "2,000 Coin",
        style: {
            backgroundColor: "#56CCF2",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
    {
        option: "10,000 Coin",
        style: {
            backgroundColor: "#2F80ED",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
    {
        option: "3,000 Coin",
        style: {
            backgroundColor: "#F2994A",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
    {
        option: "5,000 Coin",
        style: {
            backgroundColor: "#EB5757",
            fontSize: 20,
            fontWeight: 750,
            fontFamily: "sans-serif",
            textColor: "white",
        },
    },
]

const DailyTaskModal = () => {
    const { setUser } = useUser()
    const { t } = useLanguage()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const {
        dailyTask,
        setDailyTask,
        setHarvestSuccess,
        setHarvestCoinAmount,
        setDailyRewardList,
    } = useData()
    const [checkInDays, setCheckInDays] = useState<number>(0)
    const [canCheckIn, setCanCheckIn] = useState<boolean>(false)
    const [checkingIn, setCheckingIn] = useState<boolean>(false)
    const [mustSpin, setMustSpin] = useState(false)
    const [prizeNumber, setPrizeNumber] = useState(0)
    const [openSpin, setOpenSpin] = useState<boolean>(false)

    const handleSpinClick = (winnerNumber: number) => {
        setMustSpin(true)
        setPrizeNumber(winnerNumber)
    }

    useEffect(() => {
        fetchDailyCheckIn()
            .then((data) => {
                setCheckInDays(data.total_days_checked_in)
                setCanCheckIn(data.can_check_in_today)
            })
            .catch(() => {
                setCheckInDays(MOCK_DAILY_REWARD.total_days_checked_in)
                setCanCheckIn(MOCK_DAILY_REWARD.can_check_in_today)
            })
    }, [])

    useEffect(() => {
        setTimeout(() => {
            if (containerRef.current) {
                containerRef.current.scrollTo({
                    top: containerRef.current.scrollHeight,
                    behavior: "smooth",
                })
            }
        }, 250)
    }, [dailyTask])

    const checkIn = () => {
        if (!canCheckIn) return
        setCheckingIn(true)
        claimDailyReward()
            .then(({ reward, updated_user }) => {
                setHarvestCoinAmount(reward)
                setHarvestSuccess(true)
                setCheckInDays((prev) => prev + 1)
                setCanCheckIn(false)
                if (updated_user) setUser(updated_user)
            })
            .catch(() => {
                const reward = MOCK_DAILY_REWARD.daily_reward[checkInDays] ?? 500
                setHarvestCoinAmount(reward)
                setHarvestSuccess(true)
                setCheckInDays((prev) => prev + 1)
                setCanCheckIn(false)
            })
            .finally(() => setCheckingIn(false))
    }
    const pointerProps = {
        src: "/raffle/pointer.png",
        style: {
            scale: 2.0,
            marginRight: "4px",
            marginTop: "10px",
            filter: "drop-shadow(0px 20px 20px rgba(0,0,0,0.5))",
        },
    }
    return (
        <>
            {typeof window !== "undefined" && (
                <div
                    className={`${
                        openSpin ? "block" : "hidden"
                    } bg-light-dark z-[400] absolute h-full w-full max-w-full flex justify-center items-center flex-col overflow-hidden text-[20px] text-white`}
                >
                    <div
                        style={{
                            display: openSpin ? "block" : "none",
                        }}
                        className="scale-[65%] w-auto h-auto overflow-hidden"
                    >
                        <Wheel
                            mustStartSpinning={mustSpin}
                            prizeNumber={prizeNumber}
                            data={wheelData}
                            pointerProps={pointerProps}
                            outerBorderColor={"#C23030"}
                            outerBorderWidth={16}
                            innerRadius={0}
                            innerBorderColor="#F2C94C"
                            innerBorderWidth={30}
                            radiusLineColor="transparent"
                            radiusLineWidth={2}
                            textDistance={57}
                            spinDuration={0.5}
                            fontSize={12}
                            onStopSpinning={() => {
                                setMustSpin(false)
                                setOpenSpin(false)
                                setHarvestSuccess(true)
                                setDailyRewardList(MOCK_DAILY_REWARD.daily_reward)
                                setDailyTask(MOCK_DAILY_REWARD.daily_reward as any)
                                setCheckInDays((prev) => prev + 1)
                                setCanCheckIn(false)
                            }}
                        />
                    </div>
                    {t("drawing daily rewards...")}
                </div>
            )}
            <AnimatePresence>
                {dailyTask && (
                    <>
                        <motion.div
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={{
                                hidden: { y: "100%" },
                                visible: { y: 0 },
                            }}
                            transition={{ duration: 0.3 }}
                            className="fixed w-full bottom-0 bg-[#1A1F25] h-auto p-[16px] z-20 rounded-t-[32px] border-t-4 border-[#FBB602] max-h-[95%] overflow-y-auto"
                        >
                            {/* close button */}
                            <button
                                className="absolute text-white right-[24px] top-[24px]"
                                onClick={() => {
                                    setDailyTask(null)
                                }}
                            >
                                <Image
                                    src="/icon/close.svg"
                                    width={24}
                                    height={24}
                                    alt=""
                                    priority={true}
                                    loading="eager"
                                />
                            </button>
                            {/* task details */}
                            <div className="w-full flex flex-col justify-start items-center py-[12px]">
                                <Image
                                    src="/game/calendar.png"
                                    width={100}
                                    height={100}
                                    alt="daily rewards"
                                />
                                <div className="flex flex-col items-center mt-[8px]">
                                    <p className="text-white text-[28px] font-extrabold">
                                        {t("Daily reward")}
                                    </p>
                                    <p className="text-white text-[16px] ">
                                        {t("Come back every day to claim your reward")}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-center items-center w-full overflow-auto">
                                <div
                                    ref={containerRef}
                                    className="min-w-[312px] max-w-[312px] h-[350px] max-h-[350px] overflow-auto flex flex-wrap justify-start gap-[8px] pb-[12px] hide-scrollbar"
                                >
                                    {dailyTask.map((dailyReward, index) => (
                                        <div
                                            key={index}
                                            className={`min-w-[72px] max-w-[72px] ${
                                                checkInDays - 1 >= index
                                                    ? "bg-linear-green"
                                                    : "bg-[#252A31]"
                                            } py-2 px-2 rounded-lg flex flex-col items-center gap-1`}
                                        >
                                            <p className="text-white font-medium text-lg">
                                                {t("Day ")}
                                                {index + 1}
                                            </p>
                                            <Image
                                                src="/game/coin_big.png"
                                                width={32}
                                                height={32}
                                                alt="Coin image"
                                            />
                                            <p className="text-yellow-400 font-bold">
                                                +
                                                {dailyReward
                                                    ? dailyReward.toLocaleString("en-US")
                                                    : "?"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="w-full px-[16px]">
                                <button
                                    onClick={checkIn}
                                    disabled={!canCheckIn}
                                    className={`z-3 w-full py-[12px] px-[16px] text-[16px] text-white font-bold rounded-[16px] h-[60px] ${
                                        canCheckIn ? "bg-[#5964F5]" : "bg-[#272A2F]"
                                    }`}
                                >
                                    {checkingIn
                                        ? t("checking in...")
                                        : canCheckIn
                                        ? t("Check in")
                                        : t("Come back tomorrow")}
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

export default DailyTaskModal
