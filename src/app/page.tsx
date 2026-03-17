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
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab, setOnBoardingStep } = useData()
    const { user, refreshUser, isAuthenticated } = useUser()

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
    useEffect(() => {
        if (user && user.onboarding_step !== undefined) {
            // 如果 onboarding_step 为 0（新用户），设置为 1 开始引导
            if (user.onboarding_step === 0) {
                setOnBoardingStep(1)
            } else if (user.onboarding_step < 5) {
                // 如果正在引导中，恢复状态
                setOnBoardingStep(user.onboarding_step)
            }
            // 如果 onboarding_step === 5，引导已完成，不需要设置
        }
    }, [user, setOnBoardingStep])

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
