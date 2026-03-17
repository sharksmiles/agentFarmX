import { GrowingCrop, LandIdTypes } from "@/utils/types"

// 土地单元格计算结果
export interface LandCellCalculation {
    cropStage: number
    needWater: boolean
    stolen: boolean
}

// 土地单元格渲染属性
export interface LandCellProps {
    land: GrowingCrop
    index: number
    cropStage: number
    needWater: boolean
    stolen: boolean
    isHighlightOnboarding: boolean
    landWatering: LandIdTypes[]
    openBoost: boolean
    onBoardingStep: number | null
    onAction: (landId: LandIdTypes, cropId: string | undefined) => void
}
