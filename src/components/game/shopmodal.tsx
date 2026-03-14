"use client"

import { useUser } from "../context/userContext"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRightFromLine, Minus, Plus } from "lucide-react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useLanguage } from "../context/languageContext"
import { CropTypes } from "@/utils/types"

const ShopModal = () => {
    const { user, setUser } = useUser()
    const { t } = useLanguage()
    const [purchasing, setPurchasing] = useState<boolean>(false)
    const {
        gameStats,
        actionType,
        setActionType,
        selectedShop,
        setSelectedShop,
        OpenAgentFarmAlert,
    } = useData()
    const containerRef = useRef<HTMLDivElement>(null)
    const [isVisible, setIsVisible] = useState<boolean>(true)
    const scrollToRight = () => {
        const container = containerRef.current
        if (container) {
            container.scrollTo({
                left: container.scrollWidth - container.clientWidth,
                behavior: "smooth",
            })
        }
    }

    const toggleVisibility = useCallback(() => {
        const container = containerRef.current
        if (!container) return

        const maxScrollLeft = container.scrollWidth - container.clientWidth
        if (container.scrollLeft >= maxScrollLeft - 30) {
            setIsVisible(false)
        } else {
            setIsVisible(true)
        }
    }, [])

    useLayoutEffect(() => {
        const container = containerRef.current
        if (!container) return

        container.addEventListener("scroll", toggleVisibility)
        return () => {
            container.removeEventListener("scroll", toggleVisibility)
        }
    }, [scrollToRight])

    useEffect(() => {
        if (!gameStats?.crop_info) return

        const newTotalPrice = gameStats.crop_info.reduce((total, crop) => {
            const quantity = selectedShop.quantities[crop.name] || 0
            return total + quantity * crop.seed_price
        }, 0)

        const newSelectedItemsNumber = Object.values(selectedShop.quantities).reduce(
            (total, quantity) => total + quantity,
            0
        )
        setSelectedShop((prev) => ({
            ...prev,
            totalPrice: newTotalPrice,
            selectedItemsNumber: newSelectedItemsNumber,
        }))
    }, [selectedShop.quantities, gameStats?.crop_info])

    const handleQuantityChange = (cropName: string, delta: number) => {
        setSelectedShop((prev) => {
            const newQuantities = { ...prev.quantities }
            const currentQuantity = newQuantities[cropName] || 0
            const newQuantity = currentQuantity + delta

            if (newQuantity < 0) {
                return prev
            } else if (newQuantity === 0) {
                delete newQuantities[cropName]
            } else {
                newQuantities[cropName] = newQuantity
            }

            return { ...prev, quantities: newQuantities }
        })
    }

    const buyItmes = async () => {
        if (selectedShop.selectedItemsNumber === 0) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "Please select at least one item.",
            })
            return
        }

        if (
            user?.farm_stats.coin_balance == 0 ||
            Number(user?.farm_stats.coin_balance) < selectedShop.totalPrice
        ) {
            OpenAgentFarmAlert({
                notificationTitle: "Oops!",
                notificationMessage: "Insufficient balance to purchase selected items.",
            })
            return
        }
        setPurchasing(true)
        setTimeout(() => {
            setUser((prev) => {
                if (!prev) return prev
                const newInventory = [...prev.farm_stats.inventory]
                Object.entries(selectedShop.quantities).forEach(([cropName, qty]) => {
                    const existing = newInventory.find((i) => i.crop_type === cropName)
                    if (existing) {
                        existing.quantity += qty
                    } else {
                        newInventory.push({ crop_type: cropName as CropTypes, quantity: qty })
                    }
                })
                return {
                    ...prev,
                    farm_stats: {
                        ...prev.farm_stats,
                        inventory: newInventory,
                        coin_balance: prev.farm_stats.coin_balance - selectedShop.totalPrice,
                    },
                }
            })
            OpenAgentFarmAlert({ notificationTitle: t("Purchased Success!"), notificationMessage: t("Seeds added to inventory.") })
            setActionType(null)
            setSelectedShop({ quantities: {}, selectedItemsNumber: 0, totalPrice: 0 })
            setPurchasing(false)
        }, 600)
    }

    return (
        <AnimatePresence>
            {actionType === "shop" && (
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
                        className="fixed w-full bottom-0 bg-[#1A1F25] h-auto z-20 rounded-t-[32px] border-t-4 border-[#FBB602] max-h-[90%]"
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
                        <div className="w-full h-full flex pt-[24px] px-[16px] gap-[16px] flex-col">
                            {/* title */}
                            <div className="font-extrabold text-white text-[28px] text-center w-full flex justify-center items-center gap-2">
                                <p>{t("Farm Shop")}</p>
                            </div>
                            <div
                                ref={containerRef}
                                className="flex gap-[20px] max-h-[300px] overflow-x-auto overflow-y-hidden w-full relative hide-scrollbar"
                            >
                                {/* shop item */}
                                {gameStats?.crop_info
                                    .slice()
                                    .reverse()
                                    .map(
                                        (crop, index) =>
                                            user?.farm_stats?.level != undefined &&
                                            user?.farm_stats?.level >= crop.unlock_level - 1 && (
                                                <div
                                                    key={index}
                                                    className="flex flex-col justify-center items-center min-w-[98px]"
                                                >
                                                    <Image
                                                        src={`/crop/${crop.name}.png`}
                                                        className="-mt-4"
                                                        width={72}
                                                        height={96}
                                                        quality={100}
                                                        alt=""
                                                        priority={true}
                                                        loading="eager"
                                                    />
                                                    <p className="text-white -mt-6">
                                                        {t(crop.name)}
                                                    </p>
                                                    <p className="text-white font-bold mb-1 whitespace-nowrap">
                                                        {crop.seed_price.toLocaleString("en-US")}{" "}
                                                        $COIN
                                                    </p>
                                                    <div className="flex gap-[8px] justify-between items-center">
                                                        <button
                                                            onClick={() => {
                                                                if (
                                                                    user?.farm_stats?.level <
                                                                    crop.unlock_level
                                                                ) {
                                                                    OpenAgentFarmAlert({
                                                                        notificationTitle: "Oops!",
                                                                        notificationMessage: `${t(
                                                                            crop.name
                                                                        )} ${t(
                                                                            "will unlock at Lv"
                                                                        )}${
                                                                            user?.farm_stats
                                                                                ?.level + 1
                                                                        }.`,
                                                                    })
                                                                } else {
                                                                    handleQuantityChange(
                                                                        crop.name,
                                                                        -1
                                                                    )
                                                                }
                                                            }}
                                                            className="flex justify-center items-center w-[20px] h-[20px] rounded-full bg-[#5964F5]"
                                                        >
                                                            <Minus size={10} color="white" />
                                                        </button>
                                                        <div className="bg-[#4D4F51] h-[28px] w-[28px] rounded-[4px] flex items-center justify-center font-medium text-white">
                                                            {selectedShop.quantities[crop.name] ||
                                                                0}
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                if (
                                                                    user?.farm_stats?.level <
                                                                    crop.unlock_level
                                                                ) {
                                                                    OpenAgentFarmAlert({
                                                                        notificationTitle: "Oops!",
                                                                        notificationMessage: `${t(
                                                                            crop.name
                                                                        )} ${t(
                                                                            "will unlock at Lv"
                                                                        )}${
                                                                            user?.farm_stats
                                                                                ?.level + 1
                                                                        }.`,
                                                                    })
                                                                } else {
                                                                    handleQuantityChange(
                                                                        crop.name,
                                                                        1
                                                                    )
                                                                }
                                                            }}
                                                            className="flex justify-center items-center w-[20px] h-[20px] rounded-full bg-[#5964F5]"
                                                        >
                                                            <Plus size={10} color="white" />
                                                        </button>
                                                    </div>
                                                    <div className="h-[14px] text-[#D5D0C9] text-[12px]">
                                                        {user?.farm_stats?.level >=
                                                        crop.unlock_level
                                                            ? ``
                                                            : `${t("Unlock on Lv")}${
                                                                  crop.unlock_level
                                                              }`}
                                                    </div>
                                                </div>
                                            )
                                    )}
                            </div>
                        </div>
                        {/* button component */}
                        <div className="w-full p-[16px] flex flex-col gap-[16px]">
                            <div className="font-semibod text-white text-[16px] text-center w-full flex justify-between px-[12px] h-[39px]">
                                <p className="flex justify-start items-center w-full">
                                    {t("Selected")} {selectedShop.selectedItemsNumber} {t("items")}
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
                                        {selectedShop.totalPrice}
                                        $COIN
                                    </p>
                                </div>
                            </div>
                            <button
                                disabled={purchasing}
                                onClick={() => {
                                    buyItmes()
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                {purchasing ? t("checking out...") : t("shop")}
                            </button>
                        </div>
                        {isVisible && (
                            <div
                                className="fixed right-[14px] bottom-[204px] bg-deep-dark rounded-full p-2 hover:opacity-75"
                                onClick={scrollToRight}
                            >
                                <ArrowRightFromLine color="white" width={20} />
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default ShopModal
