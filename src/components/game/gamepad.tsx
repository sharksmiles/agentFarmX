"use client"

import Image from "next/image"
import { useUser } from "../context/userContext"
import { Vault } from "lucide-react"
import { parseISO, differenceInMinutes } from "date-fns"
import { useEffect, useState } from "react"
import { useData } from "../context/dataContext"
import { ActionTypes, LandIdTypes } from "@/utils/types"
import { motion } from "framer-motion"
import { DotLottiePlayer } from "@dotlottie/react-player"
import { useLanguage } from "../context/languageContext"
import { waterCrop, harvestCrop, boostCrop } from "@/utils/api/game"

const alertWindow = "absolute h-auto z-20 -top-[40%] -left-[10%]"
const alertSize = "w-[35px] h-[35px]"

const GamePad = ({}) => {
    const { user, setUser } = useUser()
    const { t } = useLanguage()
    const {
        padHeight,
        gameStats,
        setActionType,
        setSelectedLandId,
        OpenAgentFarmAlert,
        openBoost,
        setOpenBoost,
        setBoosting,
        setHarvesting,
        setHarvestCoinAmount,
        setHarvestSuccess,
        onBoardingStep,
        setOnBoardingStep,
    } = useData()
    const [now, setNow] = useState(new Date())
    const [landWatering, setLandWatering] = useState<LandIdTypes[]>([])
    const scaleVariants = {
        animate: {
            scale: [1, 1.1, 1],
            x: [0, "-5%", 0],
            y: [0, "-5%", 0],
            transition: {
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
            },
        },
    }
    const scaleVariants2 = {
        animate: {
            scale: [1, 1.05, 1],
            x: [0, 0, 0],
            y: [0, 0, 0],
            transition: {
                duration: 2,
                ease: "easeInOut",
                repeat: Infinity,
            },
        },
    }

    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date())
        }, 60000)

        return () => clearInterval(interval)
    }, [])

    const handleAction = async (landId: LandIdTypes, crop_id: string | undefined) => {
        if (onBoardingStep === 3) {
            setOnBoardingStep(4)
        }
        if (
            !user?.farm_stats?.growing_crops?.[landId - 1]?.land_owned &&
            !user?.farm_stats?.growing_crops?.[landId - 1]?.land_can_buy
        ) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "Land not owned, level up to buy this land.",
            })
            return
        } else if (openBoost && user?.farm_stats?.growing_crops?.[landId - 1]?.land_owned && user?.farm_stats?.growing_crops?.[landId - 1]?.is_planted && !user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.is_mature) {
            if ((user?.farm_stats?.boost_left || 0) <= 0) {
                setOpenBoost(false)
                OpenAgentFarmAlert({
                    notificationTitle: t("No Boosts"),
                    notificationMessage: t("You have used all your daily boosts. Come back tomorrow!"),
                })
                return
            }
            setBoosting(true)
            boostCrop(landId)
                .then((updatedUser) => {
                    setUser(updatedUser)
                    // If boosting instantly matures, you might want to show some feedback here
                })
                .catch((err) => {
                    console.error("Boosting error:", err)
                    OpenAgentFarmAlert({
                        notificationTitle: t("Error"),
                        notificationMessage: err.response?.data?.error || t("Failed to boost crop. Please try again."),
                    })
                })
                .finally(() => {
                    setBoosting(false)
                })
        } else if (
            user?.farm_stats?.growing_crops?.[landId - 1]?.land_owned &&
            !user?.farm_stats?.growing_crops?.[landId - 1]?.is_planted
        ) {
            setActionType("plant")
            setSelectedLandId(landId)
        } else if (
            user?.farm_stats?.growing_crops?.[landId - 1]?.land_owned &&
            user?.farm_stats?.growing_crops?.[landId - 1]?.is_planted &&
            user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.next_watering_due &&
            !user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.is_mature
        ) {
            if (crop_id === undefined) return
            const nextWateringDue = new Date(
                user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.next_watering_due ??
                    new Date().toISOString()
            )
            if (nextWateringDue > new Date()) {
                const messages = [
                    "[crop] is not ready for watering yet!",
                    "[crop] doesn't need water right now.",
                    "Come back later to water [crop]!",
                ]
                const randomIndex = Math.floor(Math.random() * messages.length)
                const randomMessage = t(messages[randomIndex]).replace(
                    "[crop]",
                    t(user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.crop_type!)
                )
                const { crop_details } = user?.farm_stats?.growing_crops[landId - 1]
                if (
                    crop_details.maturing_time &&
                    crop_details.growth_time_hours != undefined &&
                    crop_details.planted_time &&
                    crop_details.last_watered_time &&
                    crop_details.next_watering_due
                ) {
                    const lastWateringTime = parseISO(crop_details.last_watered_time)
                    const growthTime = crop_details.growth_time_hours * 60
                    const growthDuration = crop_details.maturing_time * 60
                    const now = new Date()
                    let currentGrowthTime = differenceInMinutes(now, lastWateringTime) + growthTime

                    const growthProgress = Math.min(
                        (currentGrowthTime / growthDuration) * 100,
                        100
                    )

                    const remainingMinutesUntilMaturity = Math.max(
                        growthDuration - currentGrowthTime,
                        0
                    )
                    const leftHours = Math.floor(remainingMinutesUntilMaturity / 60)
                    const leftMinutes = remainingMinutesUntilMaturity % 60
                    currentGrowthTime
                    OpenAgentFarmAlert({
                        notificationTitle: "Crop Status",
                        notificationMessage: randomMessage,
                        progressBars: growthProgress,
                        progressTimeLeft: 0,
                        leftHours: leftHours,
                        leftMinutes: leftMinutes,
                    })
                }
            } else {
                if ((user?.farm_stats?.energy_left || 0) < 1) {
                    OpenAgentFarmAlert({
                        notificationTitle: t("No Energy"),
                        notificationMessage: t("You don't have enough energy to water crops. Please wait or buy more energy!"),
                    })
                    return
                }
                setLandWatering((prev) =>
                    prev.includes(landId) ? prev : [...prev, landId]
                )
                waterCrop(landId)
                    .then((updatedUser) => setUser(updatedUser))
                    .catch((err) => {
                        console.error("Watering error:", err)
                        OpenAgentFarmAlert({
                            notificationTitle: t("Error"),
                            notificationMessage: err.response?.data?.error || t("Failed to water crop. Please try again."),
                        })
                    })
                    .finally(() => setLandWatering((prev) => prev.filter((id) => id !== landId)))
            }
        } else if (
            user?.farm_stats?.growing_crops?.[landId - 1]?.land_owned &&
            user?.farm_stats?.growing_crops?.[landId - 1]?.is_planted &&
            user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.is_mature
        ) {
            setHarvesting(true)
            setActionType("harvest")
            const cropType = user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.crop_type
            const harvestPrice = gameStats?.crop_info?.find((c) => c.name === cropType)?.harvest_price ?? 20
            harvestCrop(landId)
                .then((updatedUser) => {
                    setUser(updatedUser)
                    const earned = updatedUser.farm_stats?.coin_balance - (user?.farm_stats?.coin_balance ?? 0)
                    setHarvestCoinAmount(earned > 0 ? earned : harvestPrice)
                    setHarvestSuccess(true)
                })
                .catch((err) => {
                    console.error("Harvesting error:", err)
                    OpenAgentFarmAlert({
                        notificationTitle: t("Error"),
                        notificationMessage: err.response?.data?.error || t("Failed to harvest crop. Please try again."),
                    })
                })
                .finally(() => {
                    setActionType(null)
                    setHarvesting(false)
                })
        } else if (user?.farm_stats?.growing_crops?.[landId - 1]?.land_can_buy) {
            setActionType("buyland")
            setSelectedLandId(landId)
        }
    }
    return (
        padHeight != null && (
            <div
                className={"h-full w-full flex items-end"}
                style={{ marginBottom: `${((padHeight - 140) / 2).toString()}px` }}
            >
                <div className="flex overflow-x-auto px-6 pt-40 gap-5 hide-scrollbar w-full justify-center">
                    <div className="grid grid-cols-3 gap-x-3 gap-y-7  min-w-max">
                        {user?.farm_stats?.growing_crops?.map((land, index) => {
                            const { crop_details } = land
                            let cropStage: number = 0
                            let needWater: boolean = false
                            let stolen: boolean = crop_details?.status === "Stolen"
                            if (
                                land.is_planted &&
                                crop_details.maturing_time &&
                                crop_details.growth_time_hours != undefined &&
                                crop_details.planted_time &&
                                crop_details.last_watered_time &&
                                crop_details.next_watering_due &&
                                !stolen
                            ) {
                                const nextWateringDue = parseISO(crop_details.next_watering_due)
                                const lastWateringTime = parseISO(crop_details.last_watered_time)
                                const growthTime = crop_details.growth_time_hours * 60
                                const growthDuration = crop_details.maturing_time * 60
                                let currentGrowthTime: number =
                                    differenceInMinutes(now, lastWateringTime) + growthTime

                                if (now > nextWateringDue && !land.crop_details.is_mature) {
                                    needWater = true
                                    currentGrowthTime =
                                        growthTime +
                                        differenceInMinutes(nextWateringDue, lastWateringTime)
                                }

                                cropStage = Math.floor((currentGrowthTime / growthDuration) * 8)
                                cropStage = Math.min(cropStage, 7)
                            }

                            return (
                                <button
                                    key={index}
                                    className="w-[96px] h-[76.85px] flex justify-center lands-center relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg"
                                    onClick={() => {
                                        handleAction(land.land_id, land.crop_details.crop_id)
                                    }}
                                    type="button"
                                    aria-label={`Land ${land.land_id} - ${
                                        stolen
                                            ? "Stolen"
                                            : land.land_owned
                                            ? !needWater && land.is_planted
                                                ? "Farmed"
                                                : "Ready to farm"
                                            : "Not owned"
                                    }`}
                                >
                                    <Image
                                        src={`/game/${
                                            stolen
                                                ? "Stolen"
                                                : land.land_owned
                                                ? !needWater && land.is_planted
                                                    ? "Farmed"
                                                    : "Default"
                                                : "Notowned"
                                        }.png`}
                                        width={140}
                                        height={114}
                                        alt={`Land ${land.land_id}`}
                                        loading="lazy"
                                        quality={100}
                                        style={{
                                            transform: "rotateX(-15deg)",
                                        }}
                                    />
                                    {land.is_planted && !stolen && (
                                        <Image
                                            src={`/crop/${crop_details.crop_type}_${cropStage}.png`}
                                            width={24}
                                            height={32}
                                            alt={`${crop_details.crop_type} crop`}
                                            className="absolute w-[64px] h-[96px] z-20 bottom-[16.85px]"
                                            quality={100}
                                        />
                                    )}
                                    {!land.land_owned && (
                                        <div className="absolute w-full h-full flex justify-center items-center"></div>
                                    )}
                                    {onBoardingStep === 3 &&
                                        land.is_planted &&
                                        land.crop_details.is_mature && (
                                            <div className="absolute w-[181px] z-20 -top-[150%] flex items-center justify-center flex-col">
                                                <span className="z-10 text-[#5A4B23] font-medium text-[16px] px-[40px] py-[16px] bg-[#FDE8CE] border-[1px] border-[#9D6441] flex justify-center items-start rounded-[16px]">
                                                    {t("click to earn")}
                                                </span>
                                                <Image
                                                    className="animate-bounce z-[20]"
                                                    src="/game/Onboarding-earn.png"
                                                    width={40}
                                                    height={41.62}
                                                    alt="upgrade"
                                                    quality={100}
                                                />
                                            </div>
                                        )}
                                    {!openBoost &&
                                        land.land_owned &&
                                        !land.is_planted &&
                                        onBoardingStep != 3 && (
                                            <motion.div
                                                className={alertWindow}
                                                variants={scaleVariants}
                                                animate="animate"
                                            >
                                                <Image
                                                    className={alertSize}
                                                    src="/game/seeding.png"
                                                    width={81}
                                                    height={81}
                                                    alt="seeding"
                                                    quality={100}
                                                />
                                            </motion.div>
                                        )}
                                    {land.is_planted && land.crop_details.is_mature && (
                                        <motion.div
                                            className={alertWindow}
                                            variants={scaleVariants}
                                            animate="animate"
                                        >
                                            <Image
                                                className={alertSize}
                                                src="/game/harvesting.png"
                                                width={81}
                                                height={81}
                                                alt="harvesting"
                                                quality={100}
                                            />
                                        </motion.div>
                                    )}
                                    {!openBoost && land.land_can_buy && !land.land_owned && (
                                        <motion.div
                                            className={alertWindow}
                                            variants={scaleVariants}
                                            animate="animate"
                                        >
                                            <Image
                                                className={alertSize}
                                                src="/game/seeding.png"
                                                width={81}
                                                height={81}
                                                alt="seeding"
                                                quality={100}
                                            />
                                        </motion.div>
                                    )}
                                    {!openBoost &&
                                        needWater &&
                                        (landWatering.includes(land.land_id) ? (
                                            <DotLottiePlayer
                                                src="/lottie/Animation - 1717795346299.lottie"
                                                autoplay
                                                loop
                                                className="absolute w-[81px] h-[100%] z-20 -top-[40%] -left-[20%]"
                                            />
                                        ) : (
                                            <motion.div
                                                className={alertWindow}
                                                variants={scaleVariants}
                                                animate="animate"
                                            >
                                                <Image
                                                    className={alertSize}
                                                    src="/game/watering.png"
                                                    width={81}
                                                    height={81}
                                                    alt="watering"
                                                    quality={100}
                                                />
                                            </motion.div>
                                        ))}
                                    {openBoost &&
                                        land.is_planted &&
                                        !land.crop_details.is_mature &&
                                        land.land_owned && (
                                            <motion.div
                                                className="absolute w-[89px] h-[39px] z-20 -top-[50%] boosting-bubble flex items-center"
                                                variants={scaleVariants2}
                                                animate="animate"
                                            >
                                                <span className="w-full h-full text-[rgba(81,53,20,0.82)] text-[12px] font-extrabold text-center pt-[2px]">
                                                    {t("Click to Boost")}
                                                </span>
                                            </motion.div>
                                        )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    )
}

export default GamePad
