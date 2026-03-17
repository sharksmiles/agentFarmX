import Image from "next/image"
import { motion } from "framer-motion"
import { ALERT_WINDOW, ALERT_SIZE, scaleVariants } from "../utils"

/**
 * 种植指示器 - 显示在空地上方
 */
export function PlantIndicator() {
    return (
        <motion.div className={ALERT_WINDOW} variants={scaleVariants} animate="animate">
            <Image
                className={ALERT_SIZE}
                src="/game/seeding.png"
                width={81}
                height={81}
                alt="seeding"
                quality={100}
            />
        </motion.div>
    )
}

/**
 * 收获指示器 - 显示在成熟作物上方
 */
export function HarvestIndicator() {
    return (
        <motion.div className={ALERT_WINDOW} variants={scaleVariants} animate="animate">
            <Image
                className={ALERT_SIZE}
                src="/game/harvesting.png"
                width={81}
                height={81}
                alt="harvesting"
                quality={100}
            />
        </motion.div>
    )
}

/**
 * 购买土地指示器
 */
export function BuyLandIndicator() {
    return (
        <motion.div className={ALERT_WINDOW} variants={scaleVariants} animate="animate">
            <Image
                className={ALERT_SIZE}
                src="/game/seeding.png"
                width={81}
                height={81}
                alt="seeding"
                quality={100}
            />
        </motion.div>
    )
}
