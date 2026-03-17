"use client"
import { useUser } from "@/components/context/userContext"
import { CircleAlert, CircleCheck, Copy, Check, LogOut, ExternalLink, ChevronDown, ChevronUp } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { useData } from "../context/dataContext"
import { useLanguage } from "../context/languageContext"
import WalletInfoTopBar from "./walletInfoTopBar"
import { getOKBBalance } from "@/utils/func/onchain"

// Chain ID to network name mapping
const CHAIN_NAMES: Record<string, string> = {
    "0x1": "Ethereum",
    "0x89": "Polygon",
    "0xa86a": "Avalanche",
    "0x38": "BSC",
    "0xa4b1": "Arbitrum",
    "0xa": "Optimism",
    "0xc4": "X Layer",
    "0x115": "X Layer Testnet",
    "0xaa36a7": "Sepolia",
    "0x5": "Goerli",
}

// Supported networks for switching
const SUPPORTED_NETWORKS = [
    {
        chainId: "0xc4",
        chainIdDecimal: 196,
        name: "X Layer",
        rpcUrl: "https://rpc.xlayer.tech",
        blockExplorer: "https://www.okx.com/explorer/xlayer",
        nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
        icon: "/xlayer.png",
    },
    {
        chainId: "0x115",
        chainIdDecimal: 277,
        name: "X Layer Testnet",
        rpcUrl: "https://testrpc.xlayer.tech",
        blockExplorer: "https://www.okx.com/explorer/xlayer-test",
        nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
        icon: "/xlayer.png",
    },

]

async function getNetworkName(provider: any): Promise<string> {
    try {
        const chainId: string = await provider.request({ method: "eth_chainId" })
        return CHAIN_NAMES[chainId.toLowerCase()] || `Chain ${parseInt(chainId, 16)}`
    } catch {
        return "Unknown"
    }
}

export default function WalletInfo() {
    const { t } = useLanguage()
    const { user, wallet, okbBalance, setOkbBalance, disconnectWallet } = useUser()
    const { walletSettingheight } = useData()
    const [balanceLoading, setBalanceLoading] = useState(false)
    const [networkName, setNetworkName] = useState<string>("Loading...")
    const [currentChainId, setCurrentChainId] = useState<string>("")
    const [copied, setCopied] = useState(false)
    const [showNetworkDropdown, setShowNetworkDropdown] = useState(false)
    const [switchingNetwork, setSwitchingNetwork] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    // Truncate wallet address for display
    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    // Copy address to clipboard
    const copyAddress = async () => {
        if (wallet?.address) {
            await navigator.clipboard.writeText(wallet.address)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Open block explorer
    const openExplorer = () => {
        if (wallet?.address) {
            window.open(`https://www.okx.com/explorer/xlayer/address/${wallet.address}`, "_blank")
        }
    }

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

    // Fetch current network name
    const fetchNetworkName = useCallback(async () => {
        const provider = (window as any).ethereum
        if (!provider) {
            setNetworkName("No Provider")
            return
        }
        try {
            const chainId: string = await provider.request({ method: "eth_chainId" })
            setCurrentChainId(chainId.toLowerCase())
            const name = CHAIN_NAMES[chainId.toLowerCase()] || `Chain ${parseInt(chainId, 16)}`
            setNetworkName(name)
        } catch {
            setNetworkName("Unknown")
        }
    }, [])

    // Switch network
    const switchNetwork = async (network: typeof SUPPORTED_NETWORKS[0]) => {
        const provider = (window as any).ethereum
        if (!provider) {
            console.warn("No wallet provider found")
            return
        }

        setSwitchingNetwork(true)
        setShowNetworkDropdown(false)

        try {
            // Try to switch to the network
            await provider.request({
                method: "wallet_switchEthereumChain",
                params: [{ chainId: network.chainId }],
            })
        } catch (switchError: any) {
            // If the network is not added, add it first
            if (switchError.code === 4902) {
                try {
                    await provider.request({
                        method: "wallet_addEthereumChain",
                        params: [{
                            chainId: network.chainId,
                            chainName: network.name,
                            rpcUrls: [network.rpcUrl],
                            blockExplorerUrls: [network.blockExplorer],
                            nativeCurrency: network.nativeCurrency,
                        }],
                    })
                } catch (addError) {
                    console.error("Failed to add network:", addError)
                }
            } else {
                console.error("Failed to switch network:", switchError)
            }
        } finally {
            setSwitchingNetwork(false)
        }
    }

    // Handle logout
    const handleLogout = async () => {
        setIsLoggingOut(true)
        try {
            await disconnectWallet()
        } catch (error) {
            console.error("Logout failed:", error)
        } finally {
            setIsLoggingOut(false)
        }
    }

    useEffect(() => {
        fetchOKBBalance()
        fetchNetworkName()
    }, [fetchOKBBalance, fetchNetworkName])

    // Listen for network changes
    useEffect(() => {
        const provider = (window as any).ethereum
        if (!provider) return

        const handleChainChanged = () => {
            fetchNetworkName()
        }

        provider.on("chainChanged", handleChainChanged)
        return () => {
            provider.removeListener("chainChanged", handleChainChanged)
        }
    }, [fetchNetworkName])

    return (
        <>
            <WalletInfoTopBar />
            <div
                className="h-auto w-full bg-[#F8F8F8] overflow-auto hide-scrollbar"
            >
                {/* Network Info */}
                <div className="relative px-[32px] py-[24px] h-auto w-full">
                    <div
                        className="flex justify-start items-center gap-[16px] cursor-pointer hover:bg-white/50 rounded-lg transition-colors -mx-[8px] px-[8px] py-[8px]"
                        onClick={() => setShowNetworkDropdown(!showNetworkDropdown)}
                    >
                        <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                            <Image
                                className="w-[24px] h-[24px]"
                                src="/xlayer.png"
                                width={24}
                                height={24}
                                alt="wallet icon"
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                        </div>
                        <div className="flex-1">
                            <p className="text-[#373583] font-medium">
                                {switchingNetwork ? t("Switching...") : `${networkName} ${t("Network")}`}
                            </p>
                        </div>
                        {showNetworkDropdown ? (
                            <ChevronUp className="w-[20px] h-[20px] text-[#373583]" />
                        ) : (
                            <ChevronDown className="w-[20px] h-[20px] text-[#373583]" />
                        )}
                    </div>

                    {/* Network Dropdown */}
                    {showNetworkDropdown && (
                        <div className="absolute left-[32px] right-[32px] top-full mt-[8px] bg-white rounded-lg shadow-lg border border-[#E4E3FF] z-50 overflow-hidden">
                            {SUPPORTED_NETWORKS.map((network) => {
                                const isSelected = currentChainId === network.chainId.toLowerCase()
                                return (
                                    <div
                                        key={network.chainId}
                                        className={`flex items-center gap-[12px] px-[16px] py-[12px] cursor-pointer transition-colors ${
                                            isSelected ? "bg-[#E4E3FF]" : "hover:bg-[#F8F8F8]"
                                        }`}
                                        onClick={() => {
                                            if (!isSelected && !switchingNetwork) {
                                                switchNetwork(network)
                                            }
                                        }}
                                    >
                                        <div className="w-[24px] h-[24px] bg-[#F8F8F8] rounded-full flex justify-center items-center overflow-hidden">
                                            <Image
                                                className="w-[18px] h-[18px]"
                                                src={network.icon}
                                                width={18}
                                                height={18}
                                                alt={`${network.name} icon`}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = "none"
                                                }}
                                            />
                                        </div>
                                        <span className={`flex-1 text-sm ${isSelected ? "text-[#373583] font-semibold" : "text-[#666]"}`}>
                                            {network.name}
                                        </span>
                                        {isSelected && (
                                            <Check className="w-[16px] h-[16px] text-[#373583]" />
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                <span className="w-full bg-[#E4E3FF] h-[2px] flex" />
                {/* OKB Balance */}
                <div className="px-[32px] py-[24px] h-auto w-full flex justify-start items-center gap-[16px]">
                    <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                        <Image
                            className="w-[24px] h-[24px]"
                            src="/xlayer.png"
                            width={24}
                            height={24}
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

                {/* Logout Button */}
                <div className="px-[32px] py-[24px] h-auto w-full">
                    <div
                        className={`flex justify-start items-center gap-[16px] cursor-pointer hover:bg-white/50 rounded-lg transition-colors -mx-[8px] px-[8px] py-[8px] ${
                            isLoggingOut ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                        onClick={() => !isLoggingOut && handleLogout()}
                    >
                        <div className="w-[32px] h-[32px] bg-white rounded-full flex justify-center items-center">
                            <LogOut className="w-[20px] h-[20px] text-[#FF6B6B]" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[#FF6B6B] font-medium">
                                {isLoggingOut ? t("Logging out...") : t("Disconnect Wallet")}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
