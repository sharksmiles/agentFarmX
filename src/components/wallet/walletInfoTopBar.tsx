"use client"
import { useUser } from "@/components/context/userContext"
import { useState } from "react"
import Image from "next/image"
import { useLanguage } from "../context/languageContext"
import { useRouter } from "next/navigation"
import { BadgeCheck, CircleCheck } from "lucide-react"

export default function WalletInfoTopBar() {
    const { t } = useLanguage()
    const { user, wallet } = useUser()
    const router = useRouter()
    const [copied, setCopied] = useState(false)
    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        } catch (err) {
            console.error("Failed to copy: ", err)
        }
    }

    return (
        <div className="w-full bg-[#1a1f25] h-[212px] flex flex-col justify-end relative">
            <div>
                <div className="absolute top-0 left-0 w-full">
                    <Image
                        className="w-full h-auto"
                        src={"/banner/banner.png"}
                        width={1313}
                        height={277}
                        alt="coin"
                        priority={true}
                        loading="eager"
                        quality={100}
                    />
                </div>
                {/* top bar */}
                <div className="pl-[32px] pr-[24px] py-[12px] flex justify-between items-center">
                    <div className="flex gap-[16px] items-center">
                        <Image
                            className="w-[33px] h-[34px]"
                            src="/svg/walletPfp.svg"
                            width={33}
                            height={34}
                            alt="wallet icon"
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                        <div
                            className="flex flex-col text-white cursor-pointer"
                            onClick={() => copyToClipboard(wallet?.address!)}
                        >
                            <p className="text-[16px]">{user?.username}</p>
                            <div className="text-[12px] text-white flex items-center gap-1">
                                {wallet?.address?.slice(0, 5)}...{wallet?.address?.slice(-5)}
                                {copied && <CircleCheck size={12} className="text-green-400" />}
                            </div>
                        </div>
                    </div>
                    {/* <button
                            onClick={() => {
                                setSettingsOpen(!settingsOpen)
                            }}
                        >
                            {settingsOpen ? (
                                <X size={24} color="white" />
                            ) : (
                                <SlidersHorizontal size={24} color="white" />
                            )}
                        </button> */}
                </div>
                {/* balance */}
                {/* {okbBalance && (
                        <div className="pl-[32px]">
                            <p className="text-white text-[28px] h-[36px]">
                                {Number(okbBalance) * 304.2} USD
                            </p>
                            <p className="text-white text-[12px]">{okbBalance} OKB</p>
                        </div>
                    )} */}
            </div>
        </div>
    )
}
