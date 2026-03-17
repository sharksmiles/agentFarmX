"use client"

import { DotLottiePlayer } from "@dotlottie/react-player"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { useLanguage } from "../context/languageContext"
import { updateOnboardingStep } from "@/utils/api/game"

const GameModal = () => {
    const { t } = useLanguage()
    const {
        onBoardingStep,
        setOnBoardingStep,
        boosting,
        harvesting,
        setHarvestCoinAmount,
        setHarvestSuccess,
        harvestCoinAmount,
        harvestSuccess,
    } = useData()
    const openDetails = (taskUrl: string) => {
        window.open(taskUrl, "_blank")
    }
    
    // 同步 onboarding 步骤到后端
    const handleSetOnBoardingStep = async (step: number) => {
        setOnBoardingStep(step)
        try {
            await updateOnboardingStep(step)
        } catch (error) {
            console.error("Failed to update onboarding step:", error)
        }
    }
    return (
        <>
            {onBoardingStep == 1 && (
                <div
                    className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center"
                    onClick={() => {
                        handleSetOnBoardingStep(2)
                    }}
                >
                    <Image
                        className="w-auto h-auto"
                        src="/game/onBoarding1.png"
                        width={390}
                        height={658}
                        alt=""
                        priority={true}
                        loading="eager"
                        quality={100}
                    />
                </div>
            )}
            {onBoardingStep == 2 && (
                <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center">
                    <div className="p-[29px] w-[80%] h-auto flex justify-center items-center border-2 border-[#FBB602] rounded-3xl bg-[#1A1F25] flex-col">
                        <p className="text-[28px] font-extrabold text-white whitespace-nowrap">
                            {t("You received")}
                        </p>
                        <div className="flex justify-center items-center gap-[10px] mt-[14px] mb-[19px]">
                            <Image
                                className="w-[51px] h-[52px]"
                                src="/game/coin_big.png"
                                width={51}
                                height={52}
                                alt=""
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                            <p className="font-semibold text-[24px] text-[#FBB602]">500 $COIN</p>
                        </div>
                        <p className="text-[20px] font-extrabold text-white whitespace-nowrap">
                            {t("from ")}Papa doge
                        </p>
                        <button
                            onClick={() => {
                                handleSetOnBoardingStep(3)
                            }}
                            className="mt-[36px] w-full p-[12px] bg-[#5964F5] text-white font-semibold rounded-xl"
                        >
                            {t("I can't wait, Start Farming")}🌿
                        </button>
                        <button
                            onClick={() => {
                                openDetails(
                                    "https://medium.com/@AgentFarm Xgame/artela-renaissance-event-tutorial-bc2a25de8694"
                                )
                            }}
                            className="mt-[12px] w-full p-[12px] bg-[#e1a102] text-white font-semibold rounded-xl"
                        >
                            {t("I am confused, Help")}👩🏼‍⚕�?                        </button>
                    </div>
                </div>
            )}
            {onBoardingStep == 3 && (
                <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[10] flex justify-center items-center"></div>
            )}
            {boosting && (
                // <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center">
                //     <DotLottiePlayer
                //         src="/lottie/Animation - 1719129157618.lottie"
                //         autoplay
                //         loop
                //         style={{
                //             width: "50%",
                //             height: "50%",
                //         }}
                //     />
                // </div>
                <div className="fixed w-full h-full z-[2000] flex justify-center items-center">
                    <div className="relative success-background w-[358px] h-[192px] flex flex-col justify-center items-center gap-[8px]">
                        <Image
                            className="animate-pulse w-[189px] h-[162px]"
                            src="/game/booststep.png"
                            width={189}
                            height={162}
                            alt=""
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                    </div>
                </div>
            )}
            {harvesting && (
                <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center">
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
            {harvestSuccess && harvestCoinAmount != 0 && (
                <div
                    onClick={() => {
                        setHarvestSuccess(false)
                        setHarvestCoinAmount(0)
                    }}
                    className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center background-blur"
                >
                    <div className="relative success-background w-[358px] h-[192px] flex flex-col justify-center items-center gap-[8px]">
                        <div className="absolute -top-[67px] left-1/2 -translate-x-1/2 w-[200px] h-[101px]">
                            <Image
                                className="w-[200px] h-[101px]"
                                src="/game/success-banner.png"
                                width={200}
                                height={100}
                                alt=""
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                            <span className="absolute -top-[30px] left-1/2 -translate-x-1/2 font-extrabold text-[36px] text-[#FFF9ED] flex flex-col gap-0 text-center">
                                <p>{t("YOU")}</p>
                                <p className="-mt-6">{t("RECEIVED")}</p>
                            </span>
                        </div>
                        <Image
                            className="w-[80px] h-[80px]"
                            src="/game/coin_big.png"
                            width={80}
                            height={80}
                            alt=""
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                        <span className="font-semibold text-[20px] text-white">
                            {harvestCoinAmount.toLocaleString("en-US")} $COIN
                        </span>
                    </div>
                </div>
            )}
        </>
    )
}

export default GameModal
