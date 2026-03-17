import { useRef, useCallback } from "react"
import { parseISO, differenceInMinutes } from "date-fns"
import { useUser } from "@/components/context/userContext"
import { useData } from "@/components/context/dataContext"
import { useLanguage } from "@/components/context/languageContext"
import { LandIdTypes, User, GameStats } from "@/utils/types"
import { waterCrop, harvestCrop, boostCrop, updateOnboardingStep } from "@/utils/api/game"

interface UseGamePadActionsReturn {
    handleAction: (landId: LandIdTypes, cropId: string | undefined) => Promise<void>
    isUpdatingOnboarding: React.MutableRefObject<boolean>
}

export function useGamePadActions(
    gameStats: GameStats | null,
    setLandWatering: React.Dispatch<React.SetStateAction<LandIdTypes[]>>
): UseGamePadActionsReturn {
    const { user, setUser, refreshUser } = useUser()
    const { t } = useLanguage()
    const {
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

    const isUpdatingOnboardingRef = useRef(false)

    /**
     * 处理 onboarding step 3 的逻辑
     */
    const handleOnboardingStep3 = useCallback(
        async (landId: LandIdTypes) => {
            const clickedLand = user?.farm_stats?.growing_crops?.find((l) => l.land_id === landId)
            const isMatureCrop = clickedLand?.is_planted && clickedLand?.crop_details?.is_mature

            if (!isMatureCrop) {
                OpenAgentFarmAlert({
                    notificationTitle: t("Harvest Ready"),
                    notificationMessage: t("Click the highlighted land with the mature crop to harvest!"),
                })
                return { shouldProceed: false }
            }

            if (!isUpdatingOnboardingRef.current) {
                isUpdatingOnboardingRef.current = true
                setOnBoardingStep(4)
                try {
                    await updateOnboardingStep(4)
                    if (refreshUser) {
                        await refreshUser()
                    }
                } catch (error) {
                    console.error("Failed to update onboarding step:", error)
                } finally {
                    isUpdatingOnboardingRef.current = false
                }
            }
            return { shouldProceed: true }
        },
        [user?.farm_stats?.growing_crops, OpenAgentFarmAlert, t, setOnBoardingStep, refreshUser]
    )

    /**
     * 处理 boost 操作
     */
    const handleBoostAction = useCallback(
        async (landId: LandIdTypes) => {
            if ((user?.farm_stats?.boost_left || 0) <= 0) {
                setOpenBoost(false)
                OpenAgentFarmAlert({
                    notificationTitle: t("No Boosts"),
                    notificationMessage: t("You have used all your daily boosts. Come back tomorrow!"),
                })
                return
            }

            setBoosting(true)
            try {
                const updatedUser = await boostCrop(landId)
                setUser(updatedUser)
            } catch (err: any) {
                console.error("Boosting error:", err)
                OpenAgentFarmAlert({
                    notificationTitle: t("Error"),
                    notificationMessage:
                        err.response?.data?.error || t("Failed to boost crop. Please try again."),
                })
            } finally {
                setBoosting(false)
            }
        },
        [user?.farm_stats?.boost_left, setOpenBoost, OpenAgentFarmAlert, t, setBoosting, setUser]
    )

    /**
     * 处理浇水操作
     */
    const handleWaterAction = useCallback(
        async (landId: LandIdTypes, cropId: string | undefined) => {
            if (cropId === undefined) return

            const cropDetails = user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details
            const nextWateringDue = new Date(cropDetails?.next_watering_due ?? new Date().toISOString())

            if (nextWateringDue > new Date()) {
                // 作物还没准备好浇水
                const messages = [
                    "[crop] is not ready for watering yet!",
                    "[crop] doesn't need water right now.",
                    "Come back later to water [crop]!",
                ]
                const randomIndex = Math.floor(Math.random() * messages.length)
                const randomMessage = t(messages[randomIndex]).replace(
                    "[crop]",
                    t(cropDetails?.crop_type!)
                )

                if (
                    cropDetails?.maturing_time &&
                    cropDetails?.growth_time_hours != undefined &&
                    cropDetails?.planted_time &&
                    cropDetails?.last_watered_time &&
                    cropDetails?.next_watering_due
                ) {
                    const lastWateringTime = parseISO(cropDetails.last_watered_time)
                    const growthTime = cropDetails.growth_time_hours * 60
                    const growthDuration = cropDetails.maturing_time * 60
                    const now = new Date()
                    const currentGrowthTime = differenceInMinutes(now, lastWateringTime) + growthTime

                    const growthProgress = Math.min((currentGrowthTime / growthDuration) * 100, 100)
                    const remainingMinutesUntilMaturity = Math.max(growthDuration - currentGrowthTime, 0)
                    const leftHours = Math.floor(remainingMinutesUntilMaturity / 60)
                    const leftMinutes = remainingMinutesUntilMaturity % 60

                    OpenAgentFarmAlert({
                        notificationTitle: "Crop Status",
                        notificationMessage: randomMessage,
                        progressBars: growthProgress,
                        progressTimeLeft: 0,
                        leftHours,
                        leftMinutes,
                    })
                }
                return
            }

            // 检查能量
            if ((user?.farm_stats?.energy_left || 0) < 1) {
                OpenAgentFarmAlert({
                    notificationTitle: t("No Energy"),
                    notificationMessage: t("You don't have enough energy to water crops. Please wait or buy more energy!"),
                })
                return
            }

            // 执行浇水
            setLandWatering((prev) => (prev.includes(landId) ? prev : [...prev, landId]))
            try {
                const updatedUser = await waterCrop(landId)
                setUser(updatedUser)
            } catch (err: any) {
                console.error("Watering error:", err)
                OpenAgentFarmAlert({
                    notificationTitle: t("Error"),
                    notificationMessage:
                        err.response?.data?.error || t("Failed to water crop. Please try again."),
                })
            } finally {
                setLandWatering((prev) => prev.filter((id) => id !== landId))
            }
        },
        [user?.farm_stats, OpenAgentFarmAlert, t, setLandWatering, setUser]
    )

    /**
     * 处理收获操作
     */
    const handleHarvestAction = useCallback(
        async (landId: LandIdTypes) => {
            setHarvesting(true)
            setActionType("harvest")

            const cropType = user?.farm_stats?.growing_crops?.[landId - 1]?.crop_details?.crop_type
            const harvestPrice =
                gameStats?.crop_info?.find((c) => c.name === cropType)?.harvest_price ?? 20

            try {
                const updatedUser = await harvestCrop(landId)
                setUser(updatedUser)
                const earned = updatedUser.farm_stats?.coin_balance - (user?.farm_stats?.coin_balance ?? 0)
                setHarvestCoinAmount(earned > 0 ? earned : harvestPrice)
                setHarvestSuccess(true)
            } catch (err: any) {
                console.error("Harvesting error:", err)
                const errorMessage =
                    err.response?.data?.error || err.message || t("Failed to harvest crop. Please try again.")

                if (errorMessage.includes("No crop")) {
                    OpenAgentFarmAlert({
                        notificationTitle: t("Sync Required"),
                        notificationMessage: t("Your farm data needs to be refreshed. Please reload the page."),
                    })
                } else {
                    OpenAgentFarmAlert({
                        notificationTitle: t("Error"),
                        notificationMessage: errorMessage,
                    })
                }
            } finally {
                setActionType(null)
                setHarvesting(false)
            }
        },
        [
            user?.farm_stats,
            gameStats?.crop_info,
            setHarvesting,
            setActionType,
            setUser,
            setHarvestCoinAmount,
            setHarvestSuccess,
            OpenAgentFarmAlert,
            t,
        ]
    )

    /**
     * 主操作处理函数
     */
    const handleAction = useCallback(
        async (landId: LandIdTypes, cropId: string | undefined) => {
            const landData = user?.farm_stats?.growing_crops?.[landId - 1]

            // onboarding step 3 特殊处理
            if (onBoardingStep === 3) {
                const result = await handleOnboardingStep3(landId)
                if (!result.shouldProceed) return
            }

            // 土地不可用
            if (!landData?.land_owned && !landData?.land_can_buy) {
                OpenAgentFarmAlert({
                    notificationTitle: "Oops!",
                    notificationMessage: "Land not owned, level up to buy this land.",
                })
                return
            }

            // Boost 模式
            if (
                openBoost &&
                landData?.land_owned &&
                landData?.is_planted &&
                !landData?.crop_details?.is_mature
            ) {
                await handleBoostAction(landId)
                return
            }

            // 种植 - 空地
            if (landData?.land_owned && !landData?.is_planted) {
                setActionType("plant")
                setSelectedLandId(landId)
                return
            }

            // 浇水 - 已种植未成熟
            if (
                landData?.land_owned &&
                landData?.is_planted &&
                landData?.crop_details?.next_watering_due &&
                !landData?.crop_details?.is_mature
            ) {
                await handleWaterAction(landId, cropId)
                return
            }

            // 收获 - 已成熟
            if (landData?.land_owned && landData?.is_planted && landData?.crop_details?.is_mature) {
                await handleHarvestAction(landId)
                return
            }

            // 购买土地
            if (landData?.land_can_buy) {
                setActionType("buyland")
                setSelectedLandId(landId)
            }
        },
        [
            user?.farm_stats?.growing_crops,
            onBoardingStep,
            openBoost,
            handleOnboardingStep3,
            handleBoostAction,
            handleWaterAction,
            handleHarvestAction,
            OpenAgentFarmAlert,
            setActionType,
            setSelectedLandId,
        ]
    )

    return {
        handleAction,
        isUpdatingOnboarding: isUpdatingOnboardingRef,
    }
}
