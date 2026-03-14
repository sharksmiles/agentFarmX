"use client"

import { useUser } from "../context/userContext"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"

const HarvestModal = () => {
    const { user, setUser } = useUser()
    const {
        gameStats,
        selectedCropId,
        actionType,
        setSelectedCropId,
        setActionType,
        setHarvesting,
        setHarvestCoinAmount,
        setHarvestSuccess,
    } = useData()

    const harvestCrop = async () => {
        setHarvesting(true)
        const cropType = user?.farm_stats.growing_crops.find(
            (c) => c.crop_details.crop_id === selectedCropId
        )?.crop_details.crop_type
        const harvestPrice = gameStats?.crop_info.find((c) => c.name === cropType)?.harvest_price ?? 20
        setTimeout(() => {
            setUser((prev) => {
                if (!prev) return prev
                const crops = prev.farm_stats.growing_crops.map((c) =>
                    c.crop_details.crop_id === selectedCropId
                        ? { ...c, is_planted: false, crop_details: {} }
                        : c
                )
                return { ...prev, farm_stats: { ...prev.farm_stats, growing_crops: crops, coin_balance: prev.farm_stats.coin_balance + harvestPrice } }
            })
            setHarvestCoinAmount(harvestPrice)
            setHarvestSuccess(true)
            setHarvesting(false)
            setActionType(null)
            setSelectedCropId(null)
        }, 600)
    }

    return (
        <AnimatePresence>
            {selectedCropId && actionType === "harvest" && (
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
                                setSelectedCropId(null)
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
                        <div className="w-full h-full flex pt-[24px] px-[16px] gap-[16px] flex-col">
                            {/* title */}
                            <div className="font-extrabold text-white text-[28px] text-center w-full flex justify-center items-center gap-2">
                                <p>Harvest</p>
                                <p>
                                    {
                                        user?.farm_stats.growing_crops.find(
                                            (crop) => crop.crop_details.crop_id === selectedCropId
                                        )?.crop_details.crop_type
                                    }
                                </p>
                                <Image
                                    className="w-[48px] h-[72px] -mt-[16px] -ml-4"
                                    src={`/crop/${
                                        user?.farm_stats.growing_crops.find(
                                            (crop) => crop.crop_details.crop_id === selectedCropId
                                        )?.crop_details.crop_type
                                    }.png`}
                                    width={24}
                                    height={36}
                                    alt=""
                                    priority={true}
                                    loading="eager"
                                    quality={100}
                                />
                            </div>
                            {/* rewards */}
                            <div className="font-semibod text-white text-[16px] text-center w-full flex justify-between px-[12px] h-[39px]">
                                <p className="flex justify-start items-center w-full">Rewards:</p>
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
                                            gameStats?.crop_info.find(
                                                (crop_info) =>
                                                    crop_info.name ==
                                                    user?.farm_stats.growing_crops.find(
                                                        (crop) =>
                                                            crop.crop_details.crop_id ===
                                                            selectedCropId
                                                    )?.crop_details.crop_type
                                            )?.harvest_price
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
                                    harvestCrop()
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                harvest
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default HarvestModal
