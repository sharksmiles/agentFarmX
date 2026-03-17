import { parseISO, differenceInMinutes } from "date-fns"
import { GrowingCrop } from "@/utils/types"
import { LandCellCalculation } from "./types"
import type { Variants } from "framer-motion"

// 动画变体配置
export const scaleVariants: Variants = {
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

export const scaleVariants2: Variants = {
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

// 样式常量
export const ALERT_WINDOW = "absolute h-auto z-20 -top-[40%] -left-[10%]"
export const ALERT_SIZE = "w-[35px] h-[35px]"

/**
 * 计算土地单元格的作物状态
 */
export function calculateLandCellState(
    land: GrowingCrop,
    now: Date
): LandCellCalculation {
    const { crop_details } = land
    let cropStage: number = 0
    let needWater: boolean = false
    const stolen: boolean = crop_details?.status === "Stolen"

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
                growthTime + differenceInMinutes(nextWateringDue, lastWateringTime)
        }

        cropStage = Math.floor((currentGrowthTime / growthDuration) * 8)
        cropStage = Math.min(cropStage, 7)
    }

    return { cropStage, needWater, stolen }
}

/**
 * 获取土地图片路径
 */
export function getLandImagePath(
    landOwned: boolean,
    needWater: boolean,
    isPlanted: boolean,
    stolen: boolean
): string {
    if (stolen) return "/game/Stolen.png"
    if (landOwned) {
        if (!needWater && isPlanted) return "/game/Farmed.png"
        return "/game/Default.png"
    }
    return "/game/Notowned.png"
}

/**
 * 获取土地的 aria-label 描述
 */
export function getLandAriaLabel(
    landOwned: boolean,
    needWater: boolean,
    isPlanted: boolean,
    stolen: boolean,
    landId: number
): string {
    let status: string
    if (stolen) {
        status = "Stolen"
    } else if (landOwned) {
        status = !needWater && isPlanted ? "Farmed" : "Ready to farm"
    } else {
        status = "Not owned"
    }
    return `Land ${landId} - ${status}`
}
