"use client"
import { useData } from "@/components/context/dataContext"
import { useUser } from "@/components/context/userContext"
import BuylandModal from "@/components/game/buylandmodal"
import EnergyModal from "@/components/game/energymodal"
import GamePad from "@/components/game/gamepad"
import GameStats from "@/components/game/gamestats"
import HarvestModal from "@/components/game/harvestmodal"
import LeaderBoardPopUpModal from "@/components/game/leaderboardpopupmodal"
import LoadingModal from "@/components/game/loadingmodal"
import PlantModal from "@/components/game/plantmodal"
import RadarModal from "@/components/game/radarmodal"
import ShopModal from "@/components/game/shopmodal"
import UpgradeModal from "@/components/game/upgrademodal"
import { useEffect } from "react"

export default function Home() {
    const { setCurrentTab } = useData()
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
            <LoadingModal />
            <EnergyModal />
            <RadarModal />
            <LeaderBoardPopUpModal />
        </main>
    )
}
