"use client"
import { useData } from "@/components/context/dataContext"
import { useUser } from "@/components/context/userContext"
import BuylandModal from "@/components/game/buylandmodal"
import EnergyModal from "@/components/game/energymodal"
import GamePad from "@/components/game/gamepad"
import GameStats from "@/components/game/gamestats"
import HarvestModal from "@/components/game/harvestmodal"
import LeaderBoardPopUpModal from "@/components/game/leaderboardpopupmodal"
import GameModal from "@/components/game/gameModal"
import PlantModal from "@/components/game/plantmodal"
import RadarModal from "@/components/game/radarmodal"
import ShopModal from "@/components/game/shopmodal"
import UpgradeModal from "@/components/game/upgrademodal"
import { useEffect, useRef } from "react"
import { updateOnboardingStep } from "@/utils/api/game"

export default function Home() {
    const { setCurrentTab, setOnBoardingStep, onBoardingStep } = useData()
    const { user, refreshUser, isAuthenticated } = useUser()
    // 用于标记是否正在进行 onboarding 状态更新，避免 useEffect 覆盖
    const isUpdatingOnboarding = useRef(false)

    useEffect(() => {
        setCurrentTab("Farm")
    }, [setCurrentTab])

    // 当返回农场页面时，确保用户数据存在
    useEffect(() => {
        if (isAuthenticated && !user) {
            refreshUser().catch(console.error)
        }
    }, [isAuthenticated, user, refreshUser])

    // 当用户数据加载完成后，设置 onBoardingStep
    // 注意：只在初始化时设置，不覆盖用户交互导致的状态变化
    useEffect(() => {
        // 如果正在更新中，跳过
        if (isUpdatingOnboarding.current) {
            return
        }
        
        if (user && user.onboarding_step !== undefined) {
            // 如果 onboarding_step 为 0（新用户），设置为 1 开始引导并同步到后端
            if (user.onboarding_step === 0) {
                isUpdatingOnboarding.current = true
                setOnBoardingStep(1)
                // 同步到后端，确保刷新页面后状态一致
                updateOnboardingStep(1).catch((error) => {
                    console.error("Failed to sync onboarding step:", error)
                }).finally(() => {
                    isUpdatingOnboarding.current = false
                })
            } else if (user.onboarding_step < 5) {
                // 如果正在引导中，恢复状态（仅当本地状态为 null 时）
                if (onBoardingStep === null) {
                    setOnBoardingStep(user.onboarding_step)
                }
            }
            // 如果 onboarding_step === 5，引导已完成，不需要设置
        }
    }, [user, setOnBoardingStep, onBoardingStep])

    return (
        <main className="h-screen w-full flex justify-center items-center flex-col z-10">
            <div className="background-image bg-cover" />
            <GameStats />
            <GamePad />
            <PlantModal />
            <UpgradeModal />
            <HarvestModal />
            <ShopModal />
            <BuylandModal />
            <GameModal />
            <EnergyModal />
            <RadarModal />
            <LeaderBoardPopUpModal />
        </main>
    )
}
