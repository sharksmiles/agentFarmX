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
    // 用于标记是否已初始化过 onboarding 状态
    const hasInitializedRef = useRef(false)
    // 用于追踪上一次的认证状态，检测登录事件
    const prevIsAuthenticatedRef = useRef(isAuthenticated)

    useEffect(() => {
        setCurrentTab("Farm")
    }, [setCurrentTab])

    // 监听认证状态变化，当用户登录时重置初始化标志
    useEffect(() => {
        // 如果从非认证变为认证（用户登录），重置初始化标志
        if (!prevIsAuthenticatedRef.current && isAuthenticated) {
            hasInitializedRef.current = false
        }
        prevIsAuthenticatedRef.current = isAuthenticated
    }, [isAuthenticated])

    // 当返回农场页面时，确保用户数据存在
    useEffect(() => {
        if (isAuthenticated && !user) {
            refreshUser().catch(console.error)
        }
    }, [isAuthenticated, user, refreshUser])

    // 当用户数据加载完成后，初始化 onBoardingStep
    // 只在首次加载或页面刷新时执行一次
    useEffect(() => {
        // 如果已经初始化过，跳过
        if (hasInitializedRef.current) {
            return
        }
        
        if (user && user.onboarding_step !== undefined) {
            // 判断是否是老用户（通过 farm_stats 中的数据判断）
            // 老用户特征：有收获记录、有种植记录、或等级>1
            const isExistingUser = user.farm_stats && 
                (user.farm_stats.level > 1 || 
                 (user.farm_stats.growing_crops && user.farm_stats.growing_crops.some(c => c.is_planted)))
            
            // 老用户且 onboarding_step 为 0：直接标记为已完成，不显示引导
            if (user.onboarding_step === 0) {
                // 标记已初始化
                hasInitializedRef.current = true
                
                if (isExistingUser) {
                    // 老用户：直接设置为已完成
                    setOnBoardingStep(null)
                    updateOnboardingStep(5).catch((error) => {
                        console.error("Failed to mark onboarding as completed:", error)
                    })
                } else {
                    // 新用户：开始引导
                    setOnBoardingStep(1)
                    updateOnboardingStep(1).catch((error) => {
                        console.error("Failed to start onboarding:", error)
                    })
                }
            } else if (user.onboarding_step < 5) {
                // 如果正在引导中，恢复状态
                // 标记已初始化
                hasInitializedRef.current = true
                setOnBoardingStep(user.onboarding_step)
            } else {
                // 引导已完成，设置为 null 隐藏引导 UI
                hasInitializedRef.current = true
                setOnBoardingStep(null)
            }
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
