import { DotLottiePlayer } from "@dotlottie/react-player"
import Image from "next/image"
import React, { FC, useRef, useState } from "react"
import { CapilaTypes, FriendStats } from "@/utils/types"
import { useLanguage } from "../context/languageContext"

const FriendCapila: FC<{ friendStats: FriendStats; friendCapilaStats: CapilaTypes | null }> = ({
    friendStats,
    friendCapilaStats,
}) => {
    const [show, setShow] = useState(false)
    const [currentIndex, setCurrentIndex] = useState<number>(0)
    const tokenRefs = useRef<(HTMLDivElement | null)[]>([])
    const containerRef = useRef<HTMLDivElement | null>(null)

    const handleScroll = () => {
        if (containerRef.current) {
            const container = containerRef.current
            const scrollLeft = container.scrollLeft

            let closestIndex = 0
            let minDistance = Number.MAX_VALUE

            tokenRefs.current.forEach((ref, index) => {
                if (ref) {
                    const tokenLeft = ref.offsetLeft
                    const distance = Math.abs(tokenLeft - scrollLeft)
                    if (distance < minDistance) {
                        minDistance = distance
                        closestIndex = index
                    }
                }
            })

            setCurrentIndex(closestIndex)
        }
    }

    const scrollToToken = (index: number) => {
        tokenRefs.current[index]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        })
    }

    const { t } = useLanguage()
    const openDetails = (taskUrl: string) => {
        window.open(taskUrl, "_blank")
    }

    const platforms = [
        {
            name: "OKX Marketplace",
            url: `https://www.okx.com/web3/marketplace/nft/asset/base/0x37d706c8a44c389408f866f953fab5e33be08855/`,
            logo: "/capila/okx-logo.png",
        },
        {
            name: "Magic Eden",
            url: `https://magiceden.us/item-details/base/0x37d706c8a44c389408f866f953fab5e33be08855/`,
            logo: "/capila/magiceden.png",
        },
        {
            name: "OpenSea",
            url: `https://opensea.io/assets/base/0x37d706c8a44c389408f866f953fab5e33be08855/`,
            logo: "/capila/opensea-logo.svg",
        },
    ]

    return (
        <>
            {friendCapilaStats?.owned && !show && (
                <div
                    className="absolute left-[16px] bottom-[16px] z-[10] cursor-pointer animate-slideInFromBottomLeft"
                    onClick={() => {
                        setShow(true)
                    }}
                >
                    <Image
                        src="/capila/capila.webp"
                        height="60"
                        width="60"
                        alt="Capila"
                        quality={100}
                        priority={true}
                        loading="eager"
                    />
                    <DotLottiePlayer
                        src="/lottie/srating.lottie"
                        autoplay
                        className="absolute w-[50px] z-20 right-[20px] -top-1"
                    />
                    <DotLottiePlayer
                        src="/lottie/starblinking.lottie"
                        autoplay
                        loop
                        className="absolute w-[40px] z-20 -right-[5px] bottom-[5px] opacity-90"
                    />
                </div>
            )}
            {friendCapilaStats?.owned && show && (
                <div
                    className="w-full h-full fixed flex justify-center items-center z-[1000]"
                    onClick={(e) => {
                        e.stopPropagation()
                        setShow(false)
                    }}
                >
                    <div className="flex justify-center items-center p-[16px] w-full flex-col">
                        <div
                            className="relative bg-gradient-to-r from-yellow-200 via-yellow-300 to-orange-200 rounded-lg flex-col h-auto max-w-[300px] shadow-2xl py-2 animate-slideInFromBottomLeft"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="pt-2 w-full text-center">
                                <span className=" font-semibold">
                                    {friendStats?.user_name}
                                    {"'"}s Artela Capila
                                </span>
                            </div>
                            <div className="pb-2 w-full text-right px-6">
                                <span className="text-[12px]">
                                    &quot;{t("Don't Worry, Be Happy!")}&quot;
                                </span>
                            </div>
                            <div
                                className="flex gap-6 overflow-auto pb-6 hide-scrollbar"
                                ref={containerRef}
                                onScroll={handleScroll}
                            >
                                {friendCapilaStats?.token_list.map((token, index) => {
                                    return (
                                        <div
                                            key={token.token_id}
                                            className="min-w-[300px] flex flex-col items-center relative"
                                            ref={(el) => {
                                                tokenRefs.current[index] = el
                                            }}
                                        >
                                            <Image
                                                className="rounded-lg shadow-lg"
                                                src={token.picture_url}
                                                height="250"
                                                width="250"
                                                alt="Capila"
                                                quality={100}
                                                loading="eager"
                                            />
                                            <div className="absolute flex flex-col bottom-2 right-2 gap-2">
                                                {platforms.map((platform, index) => (
                                                    <button
                                                        key={index}
                                                        onClick={() =>
                                                            openDetails(
                                                                platform.url + token.token_id
                                                            )
                                                        }
                                                        className="bg-[rgb(255,255,255,0.4)] py-2 px-2 rounded-lg flex gap-2 items-center hover:opacity-80"
                                                    >
                                                        <Image
                                                            src={platform.logo}
                                                            height="16"
                                                            width="16"
                                                            alt={platform.name}
                                                            quality={90}
                                                            loading="eager"
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="z-[1000] flex justify-center items-center absolute bottom-[70px] left-1/2 -translate-x-1/2">
                                {friendCapilaStats.token_list.map((token, index) => (
                                    <div
                                        key={token.token_id}
                                        onClick={() => scrollToToken(index)}
                                        className={`w-2 h-2 rounded-full mx-1 cursor-pointer ${
                                            index === currentIndex
                                                ? "bg-yellow-500"
                                                : "bg-gray-200"
                                        }`}
                                    ></div>
                                ))}
                            </div>
                            <div className="py-2 w-full flex justify-center items-center">
                                <button
                                    className="py-2 px-4 rounded-lg bg-[rgb(255,255,255,0.3)] relative z-0 hover:opacity-80"
                                    onClick={() => {
                                        openDetails(
                                            "https://renaissance.artela.network/arthome/capila"
                                        )
                                    }}
                                >
                                    <span className="z-[1000]">
                                        🪐{t("Explore the Capila Planet")}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default FriendCapila
