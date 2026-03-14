"use client"
import { useUser } from "@/components/context/userContext"
import { formatMnemonicForAlert, getMnemonic, getPrivateKey } from "@/utils/encryption"
import {
    ArchiveRestore,
    CircleAlert,
    CircleCheck,
    Download,
    Earth,
    TimerResetIcon,
} from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useData } from "../context/dataContext"
import { useLanguage } from "../context/languageContext"
import WalletInfoTopBar from "./walletInfoTopBar"

export default function WalletInfo() {
    const { t } = useLanguage()
    const { user, wallet, artBalance, setArtBalance } = useUser()
    const {
        walletSettingheight,
        OpenAgentFarmAlert,
        stone,
        crystal,
        setStone,
        setCrystal,
        setOpenLanguageSetting,
    } = useData()
    const router = useRouter()
    const [tabOpen, setTabOpen] = useState<"assets" | "Settings" | "history" | "Airdrop">("assets")
    // const [settingsOpen, setSettingsOpen] = useState<boolean>(false)
    // const [transactions, setTrasactions] = useState<TransactionHistory[]>([])

    const getStoneAngCrystalBalance = async () => {
        // Mock: stone/crystal already set via context init
    }

    async function displayPrivateKey() {
        if (user && user.id) {
            const ok = window.confirm(t("You are about to see your wallet private key. Continue?"))
            if (ok) {
                const privateKey = await getPrivateKey(user.id, user.td)
                if (privateKey) {
                    OpenAgentFarmAlert({
                        notificationTitle: t("private key"),
                        notificationMessage: privateKey.toString(),
                        needCopy: true,
                    })
                } else {
                    OpenAgentFarmAlert({ notificationTitle: t("Oops!"), notificationMessage: t("Failed to retrieve private key") })
                }
            }
        }
    }

    async function displayMnemonic() {
        if (user && user.id) {
            const ok = window.confirm(t("You are about to see your recovery phrase. Continue?"))
            if (ok) {
                const mnemonic = await getMnemonic(user.id, user.td)
                if (mnemonic) {
                    OpenAgentFarmAlert({
                        notificationTitle: t("Recovery Phrase"),
                        notificationMessage: formatMnemonicForAlert("", mnemonic),
                        needCopy: true,
                    })
                } else {
                    OpenAgentFarmAlert({ notificationTitle: t("Oops!"), notificationMessage: t("Failed to retrieve recovery phrase") })
                }
            }
        }
    }

    async function resetWallet() {
        const ok = window.confirm(
            t("You are about to reset your wallet. Make sure you have backed up your recovery phrase and private key. AgentFarm X is not responsible for any loss. Continue?")
        )
        if (ok) {
            router.push("/new-wallet")
        }
    }

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text)
        } catch (err) {
            console.error("Failed to copy: ", err)
        }
    }

    const updateBalance = async () => {
        setArtBalance("10.5")
    }

    useEffect(() => {
        updateBalance()
        getStoneAngCrystalBalance()
    }, [])

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
                            <div className="text-[#373583] font-medium">{artBalance} ART</div>
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
                                <p className="text-[#373583] font-medium">Artela {t("Network")}</p>
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
                        {wallet && wallet.hasPrivateKey && (
                            <>
                                <button
                                    className="w-full pl-[32px] h-[60px] flex items-center gap-[16px]"
                                    onClick={displayPrivateKey}
                                >
                                    <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                        <Download size={20} color="#807DC0" />
                                    </div>
                                    <p className="text-[#807DC0]">{t("Export Private Key")}</p>
                                </button>
                                <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                            </>
                        )}
                        {wallet && wallet.hasMnemonic && (
                            <>
                                <button
                                    className="w-full pl-[32px] h-[60px] flex items-center gap-[16px]"
                                    onClick={displayMnemonic}
                                >
                                    <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                        <ArchiveRestore size={20} color="#807DC0" />
                                    </div>
                                    <p className="text-[#807DC0]">{t("Backup Recovery Phase")}</p>
                                </button>
                                <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                            </>
                        )}
                        <>
                            <button
                                className="w-full pl-[32px] h-[60px] flex items-center gap-[16px]"
                                onClick={resetWallet}
                            >
                                <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                    <TimerResetIcon size={20} color="#807DC0" />
                                </div>
                                <p className="text-[#807DC0]">{t("Reset or Import Wallet")}</p>
                            </button>
                            <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                        </>
                        <div className="pl-[32px] pt-[28px] pb-[12px]">
                            <div className="flex flex-col justify-end gap-[10px] mb-auto">
                                <p className="text-[#373583] font-medium">{t("Game")}</p>
                            </div>
                        </div>
                        <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                        <>
                            <button
                                className="w-full pl-[32px] h-[60px] flex items-center gap-[16px]"
                                onClick={() => {
                                    // setNotification({
                                    //     notificationTitle: "Oops",
                                    //     notificationMessage: "This feature is not available yet",
                                    // })
                                    setOpenLanguageSetting(true)
                                }}
                            >
                                <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                                    <Earth size={20} color="#807DC0" />
                                </div>
                                <p className="text-[#807DC0]">{t("Language")}</p>
                            </button>
                            <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                        </>
                    </div>
                </>
            )}
        </>
    )
}
