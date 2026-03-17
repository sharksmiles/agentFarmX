import Image from "next/image"
import { motion } from "framer-motion"
import { DotLottiePlayer } from "@dotlottie/react-player"
import { useLanguage } from "@/components/context/languageContext"
import { ALERT_WINDOW, scaleVariants, scaleVariants2 } from "../utils"

/**
 * 浇水指示器
 */
interface WateringIndicatorProps {
    isWatering: boolean
}

export function WateringIndicator({ isWatering }: WateringIndicatorProps) {
    if (isWatering) {
        return (
            <DotLottiePlayer
                src="/lottie/Animation - 1717795346299.lottie"
                autoplay
                loop
                className="absolute w-[81px] h-[100%] z-20 -top-[40%] -left-[20%]"
            />
        )
    }

    return (
        <motion.div className={ALERT_WINDOW} variants={scaleVariants} animate="animate">
            <Image
                className="w-[35px] h-[35px]"
                src="/game/watering.png"
                width={81}
                height={81}
                alt="watering"
                quality={100}
            />
        </motion.div>
    )
}

/**
 * 加速指示器
 */
export function BoostIndicator() {
    const { t } = useLanguage()

    return (
        <motion.div
            className="absolute w-[89px] h-[39px] z-20 -top-[50%] boosting-bubble flex items-center"
            variants={scaleVariants2}
            animate="animate"
        >
            <span className="w-full h-full text-[rgba(81,53,20,0.82)] text-[12px] font-extrabold text-center pt-[2px]">
                {t("Click to Boost")}
            </span>
        </motion.div>
    )
}

/**
 * Onboarding 指示器 - 显示在成熟作物上方引导用户点击
 */
export function OnboardingIndicator() {
    return (
        <div className="absolute w-[181px] z-20 -top-[50%] flex items-center justify-center flex-col">
            <Image
                className="animate-bounce z-[20]"
                src="/game/Onboarding-earn.png"
                width={40}
                height={41.62}
                alt="upgrade"
                quality={100}
            />
        </div>
    )
}
