"use client"

import Image from "next/image"
import { parseISO, differenceInMinutes, add } from "date-fns"
import { useEffect, useState } from "react"
import { ActionTypes, FriendStats, LandIdTypes, StealConfirmationTypes } from "@/utils/types"
import { motion } from "framer-motion"
import { DotLottiePlayer } from "@dotlottie/react-player"
import { waterFriendCrop, checkSteal } from "@/utils/api/social"
import { useLanguage } from "@/components/context/languageContext"
import { useData } from "@/components/context/dataContext"
import { useUser } from "@/components/context/userContext"
import { useNotification } from "@/components/context/notificationContext"

const alertWindow = "absolute h-auto z-20 -top-[60%]"
const alertSize = "w-[101px] h-[46px]"

const FriendGamePad = ({
    setFriendStats,
    friendStats,
    setStealConfirmation,
    setStealLoading,
}: {
    setFriendStats: React.Dispatch<React.SetStateAction<FriendStats | null>>
    friendStats: FriendStats
    setStealConfirmation: React.Dispatch<React.SetStateAction<StealConfirmationTypes | null>>
    setStealLoading: React.Dispatch<React.SetStateAction<"caculate" | "steal" | null>>
}) => {
    const { setNotification } = useData()
    const { addNotification } = useNotification()
    const { t } = useLanguage()
    const { setUser } = useUser()
    const { padHeight, OpenAgentFarmAlert } = useData()
    const [now, setNow] = useState(new Date())
    const [landWatering, setLandWatering] = useState<LandIdTypes[]>([])

    const scaleVariants2 = {
        animate: {
            scale: [1, 1.03, 1],
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
        if (friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details?.status === "Stolen") {
            addNotification(
                {
                    notificationTitle: "Oops!",
                    notificationMessage: "Crop has been stolen",
                },
                3000
            )
        } else if (
            friendStats?.farm_stats.growing_crops[landId - 1]?.land_owned &&
            friendStats?.farm_stats.growing_crops[landId - 1]?.is_planted &&
            friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details?.next_watering_due &&
            !friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details?.is_mature
        ) {
            if (crop_id === undefined) return
            const nextWateringDue = new Date(
                friendStats.farm_stats.growing_crops[landId - 1].crop_details.next_watering_due ??
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
                    t(friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details.crop_type!)
                )
                const { crop_details } = friendStats?.farm_stats?.growing_crops[landId - 1]
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
                if (friendStats.if_friend_status != "friend") {
                    setNotification({
                        notificationTitle: "Hang tight!",
                        notificationMessage:
                            "You will be able to help watering this crop once you are friends.",
                    })
                    return
                }
                setLandWatering((prev) => {
                    if (!prev.includes(landId)) return [...prev, landId]
                    return prev
                })
                waterFriendCrop(friendStats.id, landId)
                    .then(({ reward, updatedSelf }) => {
                        const newNextWatering = new Date(Date.now() + 3600000).toISOString()
                        setFriendStats((prev) => {
                            if (!prev || !prev.farm_stats) return prev
                            const crops = [...prev.farm_stats.growing_crops]
                            crops[landId - 1] = {
                                ...crops[landId - 1],
                                crop_details: {
                                    ...crops[landId - 1].crop_details,
                                    last_watered_time: new Date().toISOString(),
                                    next_watering_due: newNextWatering,
                                },
                            }
                            return { ...prev, farm_stats: { ...prev.farm_stats, growing_crops: crops } }
                        })
                        setUser(updatedSelf)
                        addNotification({ notificationTitle: "Watered!", notificationMessage: `You helped water their crop +${reward} COIN`, reward, friend_name: friendStats.user_name, action: "Harvest" } as any, 3000)
                    })
                    .catch((error) => {
                        console.error('Water friend crop error:', error)
                        addNotification({ notificationTitle: "Error!", notificationMessage: "Failed to water crop. Please try again." }, 3000)
                    })
                    .finally(() => {
                        setLandWatering((prev) => prev.filter((i) => i !== landId))
                    })
            }
        } else if (
            friendStats?.farm_stats.growing_crops[landId - 1]?.land_owned &&
            friendStats?.farm_stats.growing_crops[landId - 1]?.is_planted &&
            friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details?.is_mature
        ) {
            const currentGrowthTime =
                differenceInMinutes(
                    now,
                    friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details
                        ?.last_watered_time!
                ) +
                friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details
                    ?.growth_time_hours! *
                    60
            const growthDuration =
                friendStats?.farm_stats.growing_crops[landId - 1]?.crop_details?.maturing_time! *
                60

            if (currentGrowthTime >= growthDuration) {
                const maturityExceededTime = currentGrowthTime - growthDuration
                if (maturityExceededTime > 15) {
                    setStealLoading("caculate")
                    // 传入 landId - 1 作为 plotIndex，而不是 crop_id
                    checkSteal(friendStats.id, String(landId - 1))
                        .then((data) => setStealConfirmation(data))
                        .catch(() => setNotification({ notificationTitle: "Error", notificationMessage: "Failed to calculate steal odds" }))
                        .finally(() => setStealLoading(null))
                } else {
                    setNotification({
                        notificationTitle: "Hang tight!",
                        notificationMessage: "It is ready for harvesting",
                    })
                }
            }
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
                        {friendStats?.farm_stats.growing_crops.map((land, index) => {
                            const { crop_details } = land
                            let cropStage: number = 0
                            let needWater: boolean = false
                            let needSteal: boolean = false
                            let stolen: boolean = crop_details?.status === "Stolen"
                            
                            // 简化判断逻辑，与好友列表 API 一致
                            if (land.is_planted && !stolen) {
                                // 判断是否需要浇水：next_watering_due <= now && !is_mature
                                if (crop_details?.next_watering_due && !crop_details?.is_mature) {
                                    const nextWateringDue = parseISO(crop_details.next_watering_due)
                                    if (now > nextWateringDue) {
                                        needWater = true
                                    }
                                }
                                
                                // 判断是否可以偷取：is_mature && 成熟超过15分钟
                                if (crop_details?.is_mature && crop_details?.harvest_at) {
                                    const harvestAt = parseISO(crop_details.harvest_at)
                                    const minutesSinceMature = differenceInMinutes(now, harvestAt)
                                    if (minutesSinceMature > 15) {
                                        needSteal = true
                                    }
                                }
                                
                                // 计算作物生长阶段（用于显示图片）
                                if (
                                    crop_details?.maturing_time &&
                                    crop_details?.growth_time_hours != undefined &&
                                    crop_details?.planted_time &&
                                    crop_details?.last_watered_time
                                ) {
                                    const lastWateringTime = parseISO(crop_details.last_watered_time)
                                    const growthTime = crop_details.growth_time_hours * 60
                                    const growthDuration = crop_details.maturing_time * 60
                                    let currentGrowthTime: number =
                                        differenceInMinutes(now, lastWateringTime) + growthTime

                                    cropStage = Math.floor((currentGrowthTime / growthDuration) * 8)
                                    cropStage = Math.min(cropStage, 7)
                                } else if (crop_details?.is_mature) {
                                    cropStage = 7 // 成熟作物显示最高阶段
                                }
                            }

                            return (
                                <div
                                    key={index}
                                    className="w-[96px] h-[76.85px] flex justify-center lands-center relative"
                                    onClick={() => {
                                        handleAction(land.land_id, land.crop_details.crop_id)
                                    }}
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
                                        alt={`${land}`}
                                        loading="eager"
                                        priority={true}
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
                                            alt="crop"
                                            className="absolute w-[64px] h-[96px] z-20 bottom-[16.85px]"
                                            loading="eager"
                                            priority={true}
                                            quality={100}
                                        />
                                    )}
                                    {!land.land_owned && (
                                        <div className="absolute w-full h-full flex justify-center items-center"></div>
                                    )}
                                    {needSteal &&
                                        land.is_planted &&
                                        land.crop_details.is_mature && (
                                            <motion.div
                                                className={alertWindow}
                                                variants={scaleVariants2}
                                                animate="animate"
                                            >
                                                <span className="absolute text-[8px] top-[2px] font-bold text-[#6D4819] left-1/2 -translate-x-1/2 whitespace-nowrap">
                                                    {t("steal crop")}
                                                </span>
                                                <Image
                                                    className={alertSize}
                                                    src="/game/need_steal.png"
                                                    width={101}
                                                    height={46}
                                                    alt="steal crop"
                                                    priority={true}
                                                    loading="eager"
                                                    quality={100}
                                                />
                                            </motion.div>
                                        )}
                                    {needWater &&
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
                                                variants={scaleVariants2}
                                                animate="animate"
                                            >
                                                <span className="absolute text-[8px] top-[2px] font-bold text-[#6D4819] left-1/2 -translate-x-1/2 whitespace-nowrap">
                                                    {t("help water")}
                                                </span>
                                                <Image
                                                    className={alertSize}
                                                    src="/game/help_water.png"
                                                    width={101}
                                                    height={46}
                                                    alt="help watering"
                                                    priority={true}
                                                    loading="eager"
                                                    quality={100}
                                                />
                                            </motion.div>
                                        ))}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        )
    )
}

export default FriendGamePad
