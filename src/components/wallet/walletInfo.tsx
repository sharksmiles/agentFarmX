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
import { getOKBBalance } from "@/utils/func/onchain"

export default function WalletInfo() {
    const { t } = useLanguage()
    const { user, wallet, okbBalance, setOkbBalance } = useUser()
    const {
        walletSettingheight,
    } = useData()
    const [balanceLoading, setBalanceLoading] = useState(false)

    const fetchOKBBalance = useCallback(async () => {
        if (!wallet?.address) return
        
        const provider = (window as any).ethereum
        if (!provider) {
            console.warn("No wallet provider found")
            return
        }

        setBalanceLoading(true)
        try {
            const balance = await getOKBBalance(provider, wallet.address)
            setOkbBalance(balance)
        } catch (error) {
            console.error("Failed to fetch OKB balance:", error)
        } finally {
            setBalanceLoading(false)
        }
    }, [wallet?.address, setOkbBalance])

    useEffect(() => {
        fetchOKBBalance()
    }, [fetchOKBBalance])

    return (
        <>
            <WalletInfoTopBar />
            <div
                className="h-auto w-full bg-[#F8F8F8] overflow-auto hide-scrollbar"
                style={{ maxHeight: walletSettingheight! }}
            >
                {/* OKB Balance */}
                <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                    <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                        <Image
                            className="w-[23px] h-[20px]"
                            src="/xlayer.png"
                            width={23}
                            height={20}
                            alt="OKB icon"
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                    </div>
                    <div className="text-[#373583] font-medium">
                        {balanceLoading ? "Loading..." : `${okbBalance || "0"} OKB`}
                    </div>
                </div>
                <span className="w-full bg-[#E4E3FF] h-[2px] flex" />

                {/* COIN Balance */}
                <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                    <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                        <Image
                            className="w-[24px] h-[24px]"
                            src="/game/coin.png"
                            width={24}
                            height={24}
                            alt="COIN icon"
                        />
                    </div>
                    <div className="text-[#373583] font-medium">
                        {user?.farm_stats?.coin_balance?.toLocaleString("en-US") || 0} COIN
                    </div>
                </div>
                <span className="w-full bg-[#E4E3FF] h-[2px] flex" />

                {/* Network Info */}
                <div className="px-[32px] pt-[24px] flex gap-[16px] h-[36px] justify-start items-center">
                    <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                        <Image
                            className="w-[23px] h-[20px]"
                            src="/xlayer.png"
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

                {/* Wallet Status */}
                <div className="px-[32px] pt-[28px] pb-[24px]">
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
            </div>
        </>
    )
}
