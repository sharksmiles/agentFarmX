"use client"

import { useUser } from "../context/userContext"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { DotLottiePlayer } from "@dotlottie/react-player"
import { ArrowUpFromDot } from "lucide-react"
import { useLanguage } from "../context/languageContext"

const PlantModal = () => {
    const observerRef = useRef<HTMLDivElement>(null)
    const { user, setUser } = useUser()
    const { t } = useLanguage()
    const [planting, setPlanting] = useState<boolean>(false)
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const {
        gameStats,
        selectedLandId,
        selectedCrop,
        setSelectedCrop,
        actionType,
        setSelectedLandId,
        setActionType,
        OpenAgentFarmAlert,
    } = useData()

    const plantCrop = async () => {
        if (actionType !== "plant") {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "Something went wrong.",
            })
            return
        }

        if (
            !selectedLandId ||
            !user?.farm_stats.growing_crops[selectedLandId - 1].land_owned ||
            user?.farm_stats.growing_crops[selectedLandId - 1].is_planted
        ) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "Invalid land selection or this land is already planted...",
            })
            return
        }

        if (!selectedCrop) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "No crop selected.",
            })
            return
        }

        const cropInInventory = user.farm_stats.inventory.find(
            (crop) => crop.crop_type === selectedCrop
        )
        if (!cropInInventory || cropInInventory.quantity <= 0) {
            OpenAgentFarmAlert({ notificationTitle: "Oops!", notificationMessage: "Selected crop not available or out of stock." })
            return
        }

        setPlanting(true)
        const cropInfo = gameStats?.crop_info.find((c) => c.name === selectedCrop)
        setTimeout(() => {
            setUser((prev) => {
                if (!prev) return prev
                const now = new Date()
                const crops = prev.farm_stats.growing_crops.map((c) =>
                    c.land_id === selectedLandId
                        ? {
                              ...c,
                              is_planted: true,
                              crop_details: {
                                  crop_id: `crop_${selectedLandId}_${Date.now()}`,
                                  crop_type: selectedCrop!,
                                  maturing_time: cropInfo?.mature_time ?? 60,
                                  growth_time_hours: (cropInfo?.mature_time ?? 60) / 60,
                                  planted_time: now.toISOString(),
                                  last_watered_time: now.toISOString(),
                                  next_watering_due: new Date(now.getTime() + (cropInfo?.watering_period ?? 30) * 60000).toISOString(),
                                  is_mature: false,
                                  status: "growing",
                              },
                          }
                        : c
                )
                const newInventory = prev.farm_stats.inventory.map((i) =>
                    i.crop_type === selectedCrop ? { ...i, quantity: i.quantity - 1 } : i
                ).filter((i) => i.quantity > 0)
                return { ...prev, farm_stats: { ...prev.farm_stats, growing_crops: crops, inventory: newInventory } }
            })
            setPlanting(false)
            setSelectedCrop(null)
            setSelectedLandId(null)
            setActionType(null)
        }, 800)
    }

    const scrollToTop = () => {
        observerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const toggleVisibility = useCallback(() => {
        const container = observerRef.current
        if (container && container.scrollTop > 20) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        const container = observerRef.current
        if (!container) return

        const handleScroll = () => toggleVisibility()

        container.addEventListener("scroll", handleScroll)

        return () => {
            container.removeEventListener("scroll", handleScroll)
        }
    }, [observerRef.current])

    useEffect(() => {
        if (actionType !== "plant") return
        if (user?.farm_stats.inventory && user?.farm_stats.inventory.length > 0) {
            setSelectedCrop(user?.farm_stats.inventory[0].crop_type)
        }
    }, [actionType])

    return (
        <AnimatePresence>
            {selectedLandId && actionType === "plant" && (
                <>
                    {planting && (
                        <div className="fixed h-full w-full top-0 left-0 justify-center items-center z-50 bg-light-dark">
                            <DotLottiePlayer
                                src="/lottie/Animation - 1717572561108.lottie"
                                autoplay
                                loop
                                style={{
                                    width: "100%",
                                    height: "100%",
                                }}
                            />
                        </div>
                    )}
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
                                setSelectedCrop(null)
                                setSelectedLandId(null)
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
                            <div className="font-extrabold text-white text-[28px] text-center w-full">
                                {t("Bag")}
                            </div>
                            {/* sub title */}
                            {user?.farm_stats.inventory.some((crop) => crop.quantity > 0) && (
                                <div className="font-semibod text-white text-[14px] text-center w-full flex justify-between px-[12px]">
                                    <p className="flex justify-start items-center w-full">
                                        {t("Select item")}
                                    </p>
                                    <p className="flex justify-center items-center w-full">
                                        {t("Quantity")}
                                    </p>
                                    <p className="flex justify-end items-center w-full">
                                        {t("Havest")}
                                    </p>
                                </div>
                            )}
                            {/* item list */}
                            <div
                                ref={observerRef}
                                className="w-full min-h-[50px] max-h-[220px] overflow-y-auto"
                            >
                                <div className="font text-white text-center w-full flex justify-between gap-[8px] flex-col">
                                    {user?.farm_stats.inventory.some(
                                        (crop) => crop.quantity > 0
                                    ) ? (
                                        user?.farm_stats.inventory.map((crop, index) => {
                                            if (crop.quantity <= 0) return null
                                            return (
                                                <div
                                                    key={index}
                                                    className={`w-full flex text-[16px] justify-between gap-[8px] h-[40px] items-center rounded-[40px] px-[12px] border-[1px] ${
                                                        selectedCrop === crop.crop_type
                                                            ? "bg-light-yellow border-[#FBB602]"
                                                            : "border-[transparent]"
                                                    }`}
                                                    onClick={() => setSelectedCrop(crop.crop_type)}
                                                >
                                                    <div className="flex justify-start items-center w-full">
                                                        <Image
                                                            className="-mt-[8px]"
                                                            src={`/crop/${crop.crop_type}.png`}
                                                            height={48}
                                                            width={36}
                                                            alt=""
                                                            priority={true}
                                                            loading="eager"
                                                            quality={100}
                                                        />
                                                        {t(crop.crop_type)}
                                                    </div>
                                                    <p className="flex justify-center items-center w-full">
                                                        {crop.quantity} {t("left")}
                                                    </p>
                                                    <p className="flex justify-end items-center w-full">
                                                        {gameStats?.crop_info
                                                            .find((c) => c.name === crop.crop_type)
                                                            ?.harvest_price.toLocaleString(
                                                                "en-US"
                                                            ) ?? 0}{" "}
                                                        $COIN
                                                    </p>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <button
                                            className="text-white h-20 flex justify-center items-center"
                                            onClick={() => {
                                                setSelectedCrop(null)
                                                setSelectedLandId(null)
                                                setActionType("shop")
                                            }}
                                        >
                                            {t("No seeds available, shop some seeds from Market.")}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* button component */}
                        <div className="w-full p-[16px]">
                            <button
                                onClick={() => {
                                    if (
                                        user?.farm_stats.inventory.some(
                                            (crop) => crop.quantity > 0
                                        ) &&
                                        selectedCrop
                                    ) {
                                        plantCrop()
                                    } else {
                                        setSelectedCrop(null)
                                        setSelectedLandId(null)
                                        setActionType("shop")
                                    }
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                {user?.farm_stats.inventory.some((crop) => crop.quantity > 0)
                                    ? planting
                                        ? `${t("planting")} ${t(selectedCrop!)}...`
                                        : `${t("Select")} ${
                                              selectedCrop ? t(selectedCrop!) : t("crop")
                                          }`
                                    : t("Go to Market")}
                            </button>
                        </div>
                        {isVisible && (
                            <button
                                onClick={scrollToTop}
                                className="fixed bottom-[87px] right-[28%] -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75"
                            >
                                <ArrowUpFromDot size={20} />
                            </button>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default PlantModal
