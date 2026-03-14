"use client"

import { useUser } from "../context/userContext"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "../context/languageContext"
import { upgradeFarm } from "@/utils/api/game"

const UpgradeModal = () => {
    const { user, setUser } = useUser()
    const { t } = useLanguage()
    const { actionType, setActionType, gameStats, OpenAgentFarmAlert } = useData()

    const upgrade = async () => {
        if (
            Number(user?.farm_stats.coin_balance) <
            gameStats!.level_requirements[user?.farm_stats?.level!]?.["Upgrade Cost"]
        ) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage:
                    "Your coin balance is low. Earn more coins by inviting friends, completing tasks, or engaging in farming activities!",
            })
            return
        }
        try {
            const updatedUser = await upgradeFarm()
            setUser(updatedUser)
        } catch {
            setUser((prev) => {
                if (!prev) return prev
                const cost = gameStats!.level_requirements[prev.farm_stats.level]?.["Upgrade Cost"] ?? 0
                return {
                    ...prev,
                    farm_stats: {
                        ...prev.farm_stats,
                        level: prev.farm_stats.level + 1,
                        level_exp: 0,
                        coin_balance: prev.farm_stats.coin_balance - cost,
                    },
                }
            })
        }
        OpenAgentFarmAlert({ notificationTitle: t("Congratulation!"), notificationMessage: t("You have upgraded to the next level!") })
        setActionType(null)
    }

    return (
        <AnimatePresence>
            {actionType === "upgrade" && (
                <>
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                            hidden: { y: "100%" },
                            visible: { y: 0 },
                        }}
                        transition={{ duration: 0.3 }}
                        className="fixed w-full bottom-0 bg-[#1A1F25] h-auto z-20 rounded-t-[32px] border-t-4 border-[#FBB602] max-h-[450px]"
                    >
                        {/* close button */}
                        <button
                            className="absolute text-white right-[24px] top-[24px]"
                            onClick={() => {
                                setActionType(null)
                            }}
                        >
                            <Image
                                src="/icon/close.svg"
                                width={24}
                                height={24}
                                alt=""
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                        </button>
                        {/* info component */}
                        <div className="w-full h-full flex pt-[24px] px-[16px] gap-[24px] flex-col">
                            {/* title */}
                            <div className="font-extrabold text-white text-[28px] text-center w-full">
                                {t("Upgrade Lv")}
                                {user?.farm_stats.level && user?.farm_stats.level + 1}
                            </div>
                            {/* requirement */}
                            <div className="font-semibod text-white text-[16px] text-center w-full flex justify-between px-[12px] h-[39px]">
                                <p className="flex justify-start items-center w-full">
                                    {t("Require")}:
                                </p>
                                <div className="flex justify-end items-center w-full gap-[12px]">
                                    <Image
                                        src="/game/coin.png"
                                        width={24}
                                        height={24}
                                        alt=""
                                        priority={true}
                                        loading="eager"
                                        quality={100}
                                    />
                                    <p className="text-[24px] text-[#FBB602] font-semibold">
                                        {
                                            gameStats?.level_requirements[
                                                user?.farm_stats?.level!
                                            ]?.["Upgrade Cost"]
                                        }
                                        $COIN
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* button component */}
                        <div className="w-full p-[16px]">
                            <button
                                onClick={() => {
                                    upgrade()
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                {t("Upgrade")}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default UpgradeModal
