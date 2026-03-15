"use client"

import { useUser } from "../context/userContext"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useLanguage } from "../context/languageContext"
import { buyLand } from "@/utils/api/game"

const BuylandModal = () => {
    const { user, setUser } = useUser()
    const { actionType, setActionType, gameStats, selectedLandId, OpenAgentFarmAlert } = useData()
    const { t } = useLanguage()

    const buyland = async () => {
        if (selectedLandId === undefined) {
            return
        }
        const unownedLandIndex = user?.farm_stats?.growing_crops?.findIndex(
            (crop) => !crop.land_owned
        )
        if (unownedLandIndex! + 1 !== selectedLandId!) {
            OpenAgentFarmAlert({ notificationTitle: "Oops!", notificationMessage: `${t("Please purchase land ")}${unownedLandIndex! + 1} ${t("first")}.` })
            return
        }
        if (gameStats?.land_prices[selectedLandId!] === undefined) {
            return
        }
        if (Number(user?.farm_stats?.coin_balance) < gameStats?.land_prices[selectedLandId!]) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "Insufficient balance",
            })
            return
        }
        try {
            const updatedUser = await buyLand(selectedLandId)
            setUser(updatedUser)
        } catch {
            setUser((prev) => {
                if (!prev) return prev
                const crops = prev.farm_stats?.growing_crops?.map((c) =>
                    c.land_id === selectedLandId ? { ...c, land_owned: true, land_can_buy: false } : c
                )
                const cost = gameStats?.land_prices[selectedLandId!] ?? 0
                return { ...prev, farm_stats: { ...prev.farm_stats, growing_crops: crops, coin_balance: prev.farm_stats?.coin_balance - cost } }
            })
        }
        setActionType(null)
    }

    return (
        <AnimatePresence>
            {actionType === "buyland" && (
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
                        className="fixed w-full bottom-0 bg-[#1A1F25] h-auto z-[100] rounded-t-[32px] border-t-4 border-[#FBB602] max-h-[450px]"
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
                                {t("Purchasing Land")}
                                {selectedLandId}
                            </div>
                            {/* requirement */}
                            <div className="font-semibod text-white text-[16px] text-center w-full flex justify-between px-[12px] h-[39px]">
                                <p className="flex justify-start items-center w-full">{t("Require")}:</p>
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
                                        {gameStats?.land_prices[selectedLandId!]}
                                        $COIN
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* button component */}
                        <div className="w-full p-[16px]">
                            <button
                                onClick={() => {
                                    buyland()
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                {t("Purchase")}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default BuylandModal
