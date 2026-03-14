"use client"
import { useUser } from "@/components/context/userContext"
import { Loader2, Wallet, X } from "lucide-react"
import Image from "next/image"

interface ConnectWalletProps {
    onClose?: () => void
}

export default function ConnectWallet({ onClose }: ConnectWalletProps) {
    const { availableProviders, connectWallet, isAuthLoading } = useUser()

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
            <div className="w-full max-w-md bg-[#1A1F25] rounded-t-3xl p-6 pb-10 border-t border-[#353B45]">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-white text-lg font-bold">Connect Wallet</h2>
                        <p className="text-gray-400 text-xs mt-0.5">Sign in with your Web3 wallet</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {isAuthLoading ? (
                    <div className="flex flex-col items-center py-8 gap-3">
                        <Loader2 size={32} className="animate-spin text-[#5964F5]" />
                        <p className="text-gray-400 text-sm">Waiting for signature...</p>
                    </div>
                ) : availableProviders.length === 0 ? (
                    <div className="flex flex-col items-center py-8 gap-3 text-center">
                        <Wallet size={40} className="text-gray-600" />
                        <p className="text-gray-400 text-sm">No wallets detected.</p>
                        <p className="text-gray-500 text-xs">
                            Install OKX Wallet or MetaMask to continue.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {availableProviders.map((p) => (
                            <button
                                key={p.info.uuid}
                                onClick={() => connectWallet(p)}
                                className="w-full flex items-center gap-4 bg-[#252A31] hover:bg-[#2e3440] border border-[#353B45] hover:border-[#5964F5] rounded-2xl px-4 py-3 transition-colors"
                            >
                                <Image
                                    src={p.info.icon}
                                    alt={p.info.name}
                                    width={36}
                                    height={36}
                                    className="rounded-xl"
                                    unoptimized
                                />
                                <div className="text-left">
                                    <p className="text-white font-semibold text-sm">{p.info.name}</p>
                                    <p className="text-gray-500 text-xs">{p.info.rdns}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
