"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/components/context/userContext"
import { useData } from "@/components/context/dataContext"
import { LandIdTypes } from "@/utils/types"
import { calculateLandCellState } from "./utils"
import { useGamePadActions } from "./useGamePadActions"
import { LandCell } from "./LandCell"

const GamePad = () => {
    const { user } = useUser()
    const { padHeight, gameStats, openBoost, onBoardingStep } = useData()

    // 当前时间状态
    const [now, setNow] = useState(new Date())
    // 正在浇水的土地
    const [landWatering, setLandWatering] = useState<LandIdTypes[]>([])

    // 自定义 hook 处理所有操作逻辑
    const { handleAction } = useGamePadActions(gameStats, setLandWatering)

    // 更新当前时间的定时器
    useEffect(() => {
        const interval = setInterval(() => {
            setNow(new Date())
        }, 60000)

        return () => clearInterval(interval)
    }, [])

    if (padHeight == null) {
        return null
    }

    return (
        <div
            className={"h-full w-full flex items-end"}
            style={{ marginBottom: `${((padHeight - 140) / 2).toString()}px` }}
        >
            <div className="flex overflow-x-auto px-6 pt-40 gap-5 hide-scrollbar w-full justify-center">
                <div className="grid grid-cols-3 gap-x-3 gap-y-7 min-w-max">
                    {user?.farm_stats?.growing_crops?.map((land, index) => {
                        // 计算土地状态
                        const { cropStage, needWater, stolen } = calculateLandCellState(land, now)

                        // 判断是否高亮显示 (onboarding step 3)
                        const isHighlightOnboarding =
                            onBoardingStep === 3 && land.is_planted && !!land.crop_details?.is_mature

                        return (
                            <LandCell
                                key={index}
                                land={land}
                                index={index}
                                cropStage={cropStage}
                                needWater={needWater}
                                stolen={stolen}
                                isHighlightOnboarding={isHighlightOnboarding}
                                landWatering={landWatering}
                                openBoost={openBoost}
                                onBoardingStep={onBoardingStep}
                                onAction={handleAction}
                            />
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default GamePad
