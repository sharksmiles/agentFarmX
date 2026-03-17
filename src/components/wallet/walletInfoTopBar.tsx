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
                {/* Airdrop announcement */}
                <div className="absolute top-0 w-full flex justify-center items-center">
                    <Image
                        className="max-h-[88px] max-w-[90%] w-auto"
                        src={"/game/wallet-banner.png"}
                        width={1313}
                        height={277}
                        alt="coin"
                        priority={true}
                        loading="eager"
                        quality={100}
                    />
                    {
                        <button
                            onClick={() => {
                                router.push("/airdrop")
                            }}
                            className="absolute bottom-[8px] left-1/2 -translate-x-1/2 z-10 flex text-[12px] justify-center font-semibold items-center text-[#543D30] w-[127px] h-[30px] rounded-[8px] bg-[#FBDA02] hover:opacity-85 active:opacity-55"
                        >
                            {t("Check It Now")}
                            <svg
                                width="9"
                                height="8"
                                viewBox="0 0 9 8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M3.1665 1.33301L5.83317 3.99967L3.1665 6.66634"
                                    stroke="#543D30"
                                    strokeWidth="1.33333"
                                    strokeMiterlimit="10"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                    }
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
