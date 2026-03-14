"use client"

import { ActionTypes, GasEstimate } from "@/utils/types"
import { DotLottiePlayer } from "@dotlottie/react-player"
import Image from "next/image"
import { FC, useEffect, useState } from "react"
import { useUser } from "../context/userContext"
import { useRouter } from "next/navigation"
import { useData } from "../context/dataContext"
import { SingleLineSkeleton } from "../loader/skeleton"
import { Minus, Plus } from "lucide-react"

type TrasactionDetails = {
    action: ActionTypes
    walletResult: "+" | "-"
    coinAmount: number
    description: string
    displayImage: string
}

const TransactionPage: FC<{ action: ActionTypes; id: string }> = ({ action, id: _id }) => {
    const { wallet, coinBalance, artBalance } = useUser()
    const { setActionType, setSelectedShop } = useData()
    const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
    const [fetchingGas, setFetchingGas] = useState<boolean>(true)
    const router = useRouter()
    const [trasactionDetails, setTransactionDetails] = useState<TrasactionDetails | null>(null)
    const [submitting, setSubmitting] = useState<boolean>(false)
    const MOCK_TX_MAP: Record<ActionTypes, { walletResult: "+" | "-"; coinAmount: number; description: string; displayImage: string }> = {
        harvest:  { walletResult: "+", coinAmount: 500,  description: "Harvest crops and receive $COIN",   displayImage: "/game/coin_big.png" },
        plant:    { walletResult: "-", coinAmount: 50,   description: "Plant seeds on your land",           displayImage: "/game/coin_big.png" },
        water:    { walletResult: "+", coinAmount: 10,   description: "Water a crop for bonus rewards",    displayImage: "/game/coin_big.png" },
        upgrade:  { walletResult: "-", coinAmount: 2000, description: "Upgrade land to the next tier",     displayImage: "/game/coin_big.png" },
        buyland:  { walletResult: "-", coinAmount: 5000, description: "Purchase a new land plot",          displayImage: "/game/coin_big.png" },
        boost:    { walletResult: "-", coinAmount: 300,  description: "Boost crop growth speed",           displayImage: "/game/Boost_Big.png" },
        steal:    { walletResult: "+", coinAmount: 200,  description: "Steal crops from another farm",     displayImage: "/game/coin_big.png" },
        checksteal: { walletResult: "+", coinAmount: 0,  description: "Check steal opportunity",           displayImage: "/game/coin_big.png" },
    } as any

    const getTransactionDetails = () => {
        const details = MOCK_TX_MAP[action] ?? { walletResult: "+" as const, coinAmount: 0, description: action, displayImage: "/game/coin_big.png" }
        setTimeout(() => setTransactionDetails({ action, ...details }), 400)
    }

    const getBurnCoinGas = () => {
        setFetchingGas(true)
        setTimeout(() => {
            setGasEstimate({ gasPriceInWei: BigInt(1000000000), totalCostInART: 0.0001 } as any)
            setFetchingGas(false)
        }, 400)
    }

    const getMinCoinGas = () => {
        setFetchingGas(true)
        setTimeout(() => {
            setGasEstimate({ gasPriceInWei: BigInt(1000000000), totalCostInART: 0.0001 } as any)
            setFetchingGas(false)
        }, 400)
    }

    const submitTransaction = () => {
        setSubmitting(true)
        setTimeout(() => {
            setSubmitting(false)
            setActionType(null)
            setSelectedShop({ quantities: {}, selectedItemsNumber: 0, totalPrice: 0 })
            router.push("/")
        }, 1500)
    }

    const updateBalance = () => {}

    const enoughBalance =
        trasactionDetails?.walletResult === "-"
            ? Number(coinBalance) >= trasactionDetails?.coinAmount
            : true

    useEffect(() => {
        getTransactionDetails()
        updateBalance()
    }, [action])

    useEffect(() => {
        if (action === "upgrade") {
            getBurnCoinGas()
            const intervalId = setInterval(() => {
                getBurnCoinGas()
            }, 15000)

            return () => clearInterval(intervalId)
        } else {
            action === "harvest"
        }
        {
            getMinCoinGas()
            const intervalId = setInterval(() => {
                getMinCoinGas()
            }, 15000)

            return () => clearInterval(intervalId)
        }
    }, [action])

    return (
        <>
            {trasactionDetails !== null ? (
                submitting ? (
                    <div className="w-full h-full flex flex-col justify-center items-center">
                        <DotLottiePlayer
                            src="/lottie/Animation - 1717805367422.lottie"
                            autoplay
                            loop
                            style={{
                                width: "60%",
                                height: "40%",
                            }}
                        />
                        <p className="text-[#E5AA7A]">transaction submitting...</p>
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col justify-between items-center">
                        <div className="flex flex-col w-full h-full">
                            <p className="text-white font-semibold text-[17px] w-full text-center">
                                transaction overview
                            </p>
                            <div className="w-full h-[60px] flex justify-center items-center">
                                {trasactionDetails.displayImage && (
                                    <Image
                                        src={trasactionDetails.displayImage}
                                        width={96}
                                        height={96}
                                        alt="coin"
                                    />
                                )}
                            </div>
                            <p className="text-white font-extrabold text-[28px] w-full text-center px-[16px] py-[24px] overflow-auto max-h-[160px]">
                                {trasactionDetails.description}
                            </p>
                            <p className="px-[12px] py-[16px] text-white text-[16px] font-medium">
                                Details
                            </p>
                            <p className="py-[8px] px-[28px] flex gap-1 w-full text-[16px] text-white justify-between items-center">
                                <p>Wallet Change</p>
                                <div className="flex justify-center items-center gap-1">
                                    {trasactionDetails.walletResult == "+" ? (
                                        <Plus size={20} color="#FBB602" />
                                    ) : (
                                        <Minus size={20} color="#FBB602" />
                                    )}
                                    <Image
                                        src="/game/coin.png"
                                        width={12}
                                        height={12}
                                        alt="coin"
                                    />
                                    <p className="text-[#FBB602] font-semibold">
                                        {trasactionDetails.coinAmount} $COIN
                                    </p>
                                </div>
                            </p>
                            <p className="py-[8px] px-[28px] flex gap-1 w-full text-[16px] text-white justify-between items-center">
                                <p>Gas Price</p>
                                {fetchingGas ? (
                                    <SingleLineSkeleton />
                                ) : (
                                    <div className="flex justify-center items-center gap-1 text-white">
                                        {gasEstimate
                                            ? `${gasEstimate?.gasPriceInWei.toString()} wei`
                                            : `failed gas estimation`}
                                    </div>
                                )}
                            </p>
                            <p className="py-[8px] px-[28px] flex gap-1 w-full text-[16px] text-white justify-between items-center">
                                <p>Transaction Fee</p>
                                {fetchingGas ? (
                                    <SingleLineSkeleton />
                                ) : (
                                    <div className="flex justify-center items-center gap-1 text-white">
                                        <p className="text-[12px]">
                                            {gasEstimate
                                                ? `${gasEstimate?.totalCostInART.toString()} ART`
                                                : `failed gas estimation`}
                                        </p>
                                    </div>
                                )}
                            </p>
                            <p className="px-[12px] py-[16px] text-white text-[16px] font-medium flex items-center justify-between">
                                <p>Total (including fees)</p>
                                {fetchingGas ? (
                                    <SingleLineSkeleton />
                                ) : (
                                    <div className="flex justify-center items-center gap-1 text-white">
                                        <p className="text-[12px]">
                                            {gasEstimate
                                                ? `${gasEstimate?.totalCostInART.toString()} ART`
                                                : `failed gas estimation`}
                                        </p>
                                    </div>
                                )}
                            </p>
                            {coinBalance && enoughBalance ? (
                                <div className="p-[16px] flex">
                                    <div className="p-[16px] border-2 border-[#F6A112] bg-light-orange w-full h-auto flex gap-[8px] justify-start items-start">
                                        <Image
                                            className="min-w-[19px] min-h-[19px]"
                                            src="/icon/warning.png"
                                            width={18}
                                            height={18}
                                            alt="warning"
                                        />
                                        <div className="flex flex-col gap-[8px] w-full">
                                            <div className="text-[16px] font-semibold text-white h-[19px] flex items-center">
                                                <p>Please creafully review your transaction</p>
                                            </div>
                                            <p className="text-white text-[14px]">
                                                Note: Please wait at least one minute before
                                                retrying if your transaction has failed.
                                                <br /> thanks for your support and your
                                                understanding.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-[16px] flex">
                                    <div className="p-[16px] border-2 border-[#F6A112] bg-light-orange w-full h-auto flex gap-[8px] justify-start items-start">
                                        <Image
                                            className="min-w-[19px] min-h-[19px]"
                                            src="/icon/warning.png"
                                            width={18}
                                            height={18}
                                            alt="warning"
                                        />
                                        <div className="flex flex-col gap-[8px] w-full">
                                            <div className="text-[16px] font-semibold text-white h-[19px] flex items-center">
                                                <p>
                                                    Your account don&rsquo;t have not enough 10
                                                    $COIN
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-[16px] w-full h-auto flex flex-col text-white">
                            <div className="h-auto w-full flex justify-between py-[16px] text-[16px] px-[8px]">
                                <div className="flex gap-2">
                                    <p className="font-semibold">
                                        {Number(artBalance).toFixed(8)} $ART
                                    </p>{" "}
                                    <p className="">available</p>
                                </div>
                                <div className="flex gap-2">
                                    <Image
                                        src="/svg/walleticon.svg"
                                        width={18}
                                        height={18}
                                        alt="art wallet"
                                    />
                                    <p className="">
                                        {wallet?.address.slice(0, 4) +
                                            "..." +
                                            wallet?.address.slice(-4)}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    submitTransaction()
                                }}
                                disabled={!enoughBalance || !gasEstimate}
                                className=" rounded-[16px] text-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold"
                            >
                                submit transaction
                            </button>
                        </div>
                    </div>
                )
            ) : (
                <div className="w-full h-full flex justify-center items-center">
                    <DotLottiePlayer
                        src="/lottie/Animation - 1717804266542.lottie"
                        autoplay
                        loop
                        style={{
                            width: "60%",
                            height: "60%",
                        }}
                    />
                </div>
            )}
        </>
    )
}

export default TransactionPage
