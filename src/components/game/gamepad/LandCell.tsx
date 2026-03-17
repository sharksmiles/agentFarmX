import Image from "next/image"
import { LandIdTypes, GrowingCrop } from "@/utils/types"
import { getLandImagePath, getLandAriaLabel } from "./utils"
import {
    PlantIndicator,
    HarvestIndicator,
    BuyLandIndicator,
    WateringIndicator,
    BoostIndicator,
    OnboardingIndicator,
} from "./indicators"

interface LandCellProps {
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

export function LandCell({
    land,
    index,
    cropStage,
    needWater,
    stolen,
    isHighlightOnboarding,
    landWatering,
    openBoost,
    onBoardingStep,
    onAction,
}: LandCellProps) {
    const { crop_details } = land

    // 获取土地图片路径
    const landImageSrc = getLandImagePath(land.land_owned, needWater, land.is_planted, stolen)

    // 获取 aria-label
    const ariaLabel = getLandAriaLabel(land.land_owned, needWater, land.is_planted, stolen, land.land_id)

    return (
        <button
            key={index}
            className={`w-[96px] h-[76.85px] flex justify-center lands-center relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 rounded-lg ${
                isHighlightOnboarding ? "ring-4 ring-yellow-400 ring-opacity-75 animate-pulse" : ""
            }`}
            onClick={() => {
                onAction(land.land_id, land.crop_details.crop_id)
            }}
            type="button"
            aria-label={ariaLabel}
        >
            {/* 土地背景图片 */}
            <Image
                src={landImageSrc}
                width={140}
                height={114}
                alt={`Land ${land.land_id}`}
                loading="lazy"
                quality={100}
                style={{
                    transform: "rotateX(-15deg)",
                }}
            />

            {/* 作物图片 */}
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

            {/* 未拥有土地的占位 */}
            {!land.land_owned && (
                <div className="absolute w-full h-full flex justify-center items-center"></div>
            )}

            {/* Onboarding 指示器 - 成熟作物高亮 */}
            {onBoardingStep === 3 && land.is_planted && land.crop_details.is_mature && (
                <OnboardingIndicator />
            )}

            {/* 种植指示器 - 空地 */}
            {!openBoost && land.land_owned && !land.is_planted && onBoardingStep != 3 && (
                <PlantIndicator />
            )}

            {/* 收获指示器 - 成熟作物 */}
            {land.is_planted && land.crop_details.is_mature && <HarvestIndicator />}

            {/* 购买土地指示器 */}
            {!openBoost && land.land_can_buy && !land.land_owned && <BuyLandIndicator />}

            {/* 浇水指示器 */}
            {!openBoost && needWater && (
                <WateringIndicator isWatering={landWatering.includes(land.land_id)} />
            )}

            {/* 加速指示器 */}
            {openBoost && land.is_planted && !land.crop_details.is_mature && land.land_owned && (
                <BoostIndicator />
            )}
        </button>
    )
}
