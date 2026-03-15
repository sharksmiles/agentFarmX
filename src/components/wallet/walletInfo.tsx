"use client"
import { useUser } from "@/components/context/userContext"
import {
    CircleAlert,
    CircleCheck,
} from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { useData } from "../context/dataContext"
import { useLanguage } from "../context/languageContext"
import WalletInfoTopBar from "./walletInfoTopBar"

export default function WalletInfo() {
    const { t } = useLanguage()
    const { user, wallet, artBalance, setArtBalance } = useUser()
    const {
        walletSettingheight,
        stone,
        crystal,
    } = useData()
    const [tabOpen, setTabOpen] = useState<"assets" | "Settings" | "history" | "Airdrop">("assets")

    const getStoneAngCrystalBalance = async () => {
        // Mock: stone/crystal already set via context init
    }

    const updateBalance = useCallback(async () => {
        setArtBalance("10.5")
    }, [setArtBalance])

    useEffect(() => {
        updateBalance()
        getStoneAngCrystalBalance()
    }, [updateBalance])

    return (
        <>
            <WalletInfoTopBar tabOpen={tabOpen} setTabOpen={setTabOpen} />
            {tabOpen == "assets" &&
                (user?.farm_stats?.coin_balance || artBalance ? (
                    <div className="w-full h-auto max-h-[420px] flex flex-col overflow-auto">
                        <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                            <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                <Image
                                    className="w-[23px] h-[20px]"
                                    src="/artela.png"
                                    width={23}
                                    height={20}
                                    alt="wallet icon"
                                    priority={true}
                                    loading="eager"
                                    quality={100}
                                />
                            </div>
                            <div className="text-[#373583] font-medium">{artBalance} OKB</div>
                        </div>
                        <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                        <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                            <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                <Image
                                    className="w-[24px] h-[24px]"
                                    src="/game/coin.png"
                                    width={24}
                                    height={24}
                                    alt="wallet icon"
                                />
                            </div>
                            <div className="text-[#373583] font-medium">
                                {user?.farm_stats?.coin_balance.toLocaleString("en-US")} COIN
                            </div>
                        </div>
                        <span className="w-full bg-[#E4E3FF] h-[2px] flex" />

                        <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                            <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                <Image
                                    className="w-[24px] h-[24px]"
                                    src="/icon/stone.png"
                                    width={24}
                                    height={24}
                                    alt="wallet icon"
                                />
                            </div>
                            <div className="text-[#373583] font-medium">
                                {stone.toLocaleString("en-US")} Stone
                            </div>
                        </div>
                        <span className="w-full bg-[#E4E3FF] h-[2px] flex" />

                        <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                            <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                <Image
                                    className="w-[24px] h-[24px]"
                                    src="/icon/crystal.png"
                                    width={24}
                                    height={24}
                                    alt="wallet icon"
                                />
                            </div>
                            <div className="text-[#373583] font-medium">
                                {crystal.toLocaleString("en-US")} Crystal
                            </div>
                        </div>
                        <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                    </div>
                ) : (
                    <div className="flex justify-center items-center text-[#373583] mt-10">
                        You have no assets available
                    </div>
                ))}
            {tabOpen == "Settings" && (
                <>
                    <div
                        className="h-full pt-[22px] w-full bg-[#F8F8F8] overflow-auto hide-scrollbar"
                        style={{ maxHeight: walletSettingheight! }}
                    >
                        <div className="pl-[32px] flex gap-[16px] h-[36px] justify-start items-center">
                            <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                <Image
                                    className="w-[23px] h-[20px]"
                                    src="/artela.png"
                                    width={23}
                                    height={20}
                                    alt="wallet icon"
                                    priority={true}
                                    loading="eager"
                                    quality={100}
                                />
                            </div>
                            <div>
                                <p className="text-[#373583] font-medium">X Layer {t("Network")}</p>
                            </div>
                        </div>
                        <div className="pl-[32px] pt-[28px] pb-[12px]">
                            <div className="flex gap-1">
                                <p className="text-[#373583] font-medium pr-2">{t("Wallet")}</p>
                                {wallet && wallet.hasPrivateKey ? (
                                    <>
                                        <p className="text-[#373583] text-[10px] font-semibold mt-[2px]">
                                            {t("connected")}
                                        </p>
                                        <CircleCheck size={15} color="#373583" className="mb-px" />
                                    </>
                                ) : (
                                    <>
                                        <CircleAlert size={15} color="#373583" className="mb-px" />
                                        <p className="text-[#373583] text-[10px] font-semibold">
                                            {t("unavailable")}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                        <span className="w-full bg-[#E4E3FF] h-[2px] flex" />

                    </div>
                </>
            )}
        </>
    )
}
