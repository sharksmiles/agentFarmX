"use client"

import Image from "next/image"
import { useLanguage } from "../context/languageContext"
import { useData } from "../context/dataContext"
import { useRouter } from "next/navigation"

const LeaderBoardPopUpModal = () => {
    const { t } = useLanguage()
    const router = useRouter()
    const { openLeaderBoardPopupModal, setOpenLeaderBoardPopupModal } = useData()
    return (
        <>
            {openLeaderBoardPopupModal && (
                <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[2000] flex justify-center items-center px-5">
                    <div className="w-full h-[320px] bg-[#1E92FF]  rounded-[20px] flex flex-col pt-7 pb-4 px-4 gap-2 z-0 relative overflow-hidden">
                        <button
                            className="absolute text-white right-3 top-3"
                            onClick={() => {
                                setOpenLeaderBoardPopupModal(false)
                            }}
                        >
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M15 15L21 21"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeMiterlimit="10"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M3.47363 3.47363L11.7754 11.7754"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeMiterlimit="10"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                <path
                                    d="M20.0771 3.47363L3.47363 20.0771"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeMiterlimit="10"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </button>
                        <div className="w-full h-auto flex flex-col justify-center items-start pb-2 z-[10]">
                            <h1
                                className="outlinedtext-bold text-[28px] font-extrabold whitespace-nowrap"
                                data-content={`${t("Invite friends to earn")}`}
                            >
                                {t("Invite friends to earn")}
                            </h1>
                            <h2
                                className="outlinedtext-bold-gurdiant-text-color text-[22px] font-extrabold -mt-1"
                                data-content={`${t("Blueberry  and  $FARM")}`}
                            >
                                {t("Blueberry  and  $FARM")}
                            </h2>
                            <h3
                                className="outlinedtext text-[16px] mt-1 ml-px font-semibold"
                                data-content={`${t("Events time :  Jan 18 - 24 UTC")}`}
                            >
                                {t("Events time :  Jan 18 - 24 UTC")}
                            </h3>
                        </div>
                        <div className="flex w-full gap-4 z-[10] max-w-full overflow-auto">
                            <div className="w-14 h-14 reward-box-background relative rounded-[9px] overflow-hidden flex justify-center">
                                <div className="absolute flex justify-center items-center top-0 right-0 w-[23px] h-[10px] bg-gradient-to-br from-[#FDD500] to-[#FF9B04] rounded-bl-[9px] text-white">
                                    <p className="text-white text-[6px]">1st</p>
                                </div>
                                <Image
                                    className="absolute left-1/2 top-[10px] -translate-x-1/2 w-[47.6px] h-[26.88px] min-w-[47.6px] min-h-[26.88px]"
                                    src="/game/combine_rewards.png"
                                    width={47.6}
                                    height={26.88}
                                    alt="1st"
                                    quality={100}
                                    loading="eager"
                                    priority={true}
                                />
                                <div className="absolute left-0 bottom-0 ">
                                    <p
                                        className="outlinedtext text-[8px] mb-1 font-extrabold text-center leading-[8px]"
                                        data-content={`${t("$FARM & Blueberry")}`}
                                    >
                                        {t("$FARM & Blueberry")}
                                    </p>
                                </div>
                            </div>
                            <div className="w-14 h-14 reward-box-background relative rounded-[9px] overflow-hidden flex justify-center">
                                <div className="absolute flex justify-center items-center top-0 right-0 w-[23px] h-[10px] bg-gradient-to-br from-[#BCD5FF] to-[#9DBAEB] rounded-bl-[9px] text-white">
                                    <p className="text-white text-[6px]">2nd</p>
                                </div>
                                <Image
                                    className="absolute left-1/2 top-[10px] -translate-x-1/2 w-[47.6px] h-[26.88px] min-w-[47.6px] min-h-[26.88px]"
                                    src="/game/combine_rewards.png"
                                    width={47.6}
                                    height={26.88}
                                    alt="2nd"
                                    quality={100}
                                    loading="eager"
                                    priority={true}
                                />
                                <div className="absolute left-0 bottom-0 ">
                                    <p
                                        className="outlinedtext text-[8px] mb-1 font-extrabold text-center leading-[8px]"
                                        data-content={`${t("$FARM & Blueberry")}`}
                                    >
                                        {t("$FARM & Blueberry")}
                                    </p>
                                </div>
                            </div>
                            <div className="w-14 h-14 reward-box-background relative rounded-[9px] overflow-hidden flex justify-center">
                                <div className="absolute flex justify-center items-center top-0 right-0 w-[23px] h-[10px] bg-gradient-to-br from-[#FFC89F] to-[#E89354] rounded-bl-[9px] text-white">
                                    <p className="text-white text-[6px]">3rd</p>
                                </div>
                                <Image
                                    className="absolute left-1/2 top-[10px] -translate-x-1/2 w-[47.6px] h-[26.88px] min-w-[47.6px] min-h-[26.88px]"
                                    src="/game/combine_rewards.png"
                                    width={47.6}
                                    height={26.88}
                                    alt="3rd"
                                    quality={100}
                                    loading="eager"
                                    priority={true}
                                />
                                <div className="absolute left-0 bottom-0 ">
                                    <p
                                        className="outlinedtext text-[8px] mb-1 font-extrabold text-center leading-[8px]"
                                        data-content={`${t("$FARM & Blueberry")}`}
                                    >
                                        {t("$FARM & Blueberry")}
                                    </p>
                                </div>
                            </div>
                            <div className="w-14 h-14 reward-box-background relative rounded-[9px] overflow-hidden flex justify-center">
                                <div className="absolute flex justify-center items-center top-0 right-0 w-[23px] h-[10px] bg-gradient-to-br from-[#9feaff] to-[#54a0e8] rounded-bl-[9px] text-white">
                                    <p className="text-white text-[6px]">4-10</p>
                                </div>
                                <Image
                                    className="absolute left-1/2 top-[10px] -translate-x-1/2 w-[47.6px] h-[26.88px] min-w-[47.6px] min-h-[26.88px]"
                                    src="/game/combine_rewards.png"
                                    width={47.6}
                                    height={26.88}
                                    alt="3rd"
                                    quality={100}
                                    loading="eager"
                                    priority={true}
                                />
                                <div className="absolute left-0 bottom-0 ">
                                    <p
                                        className="outlinedtext text-[8px] mb-1 font-extrabold text-center leading-[8px]"
                                        data-content={`${t("$FARM & Blueberry")}`}
                                    >
                                        {t("$FARM & Blueberry")}
                                    </p>
                                </div>
                            </div>
                            <div className="w-14 h-14 reward-box-background relative rounded-[9px] overflow-hidden flex justify-center">
                                <div className="absolute flex justify-center items-center top-0 right-0 w-[23px] h-[10px] bg-gradient-to-br from-[#ffbcd1] to-[#eb9db7] rounded-bl-[9px] text-white">
                                    <p className="text-white text-[6px]">?</p>
                                </div>
                                <Image
                                    className="mt-[5.63px] w-[36.56px] h-[36.56px] min-w-[36.56px] min-h-[36.56px]"
                                    src="/game/Farm_token.png"
                                    width={36.56}
                                    height={36.56}
                                    alt="?"
                                    quality={100}
                                    loading="eager"
                                    priority={true}
                                />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
                                    <p
                                        className="outlinedtext text-[8px] mb-1 font-extrabold text-center leading-[8px]"
                                        data-content={`${t("$FARM")}`}
                                    >
                                        {t("$FARM")}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            className="w-auto h-[50px] rounded-2xl py-3 px-4 text-white hover:opacity-80 font-semibold mt-4 z-[10] relative flex justify-center items-center"
                            onClick={() => {
                                setOpenLeaderBoardPopupModal(false)
                                router.push("invitation-leaderboard")
                            }}
                        >
                            <p
                                className="outlinedtext-leaderboard font-extrabold"
                                data-content={`${t("View") + " " + t("LeaderBoard")}`}
                            >
                                {t("View") + " " + t("LeaderBoard")}
                            </p>
                            <Image
                                className="w-auto h-[50px] absolute top-0 left-1/2 -translate-x-1/2 z-[-10]"
                                src="/game/view-leaderboard-button.png"
                                width={288}
                                height={50}
                                alt="watering icon"
                            />
                        </button>
                        <div className="text-white text-[16px] font-semibold z-[10] text-center">
                            {t("Events Rules")}
                        </div>
                        <div className="absolute top-[40px] left-0 w-full h-[40px] bg-gradient-to-b from-[#1E92FF] to-[transparent] z-[2]"></div>
                        <div className="w-full h-[280px] absolute bottom-0 left-0 reward-popup-background"></div>
                    </div>
                </div>
            )}
        </>
    )
}

export default LeaderBoardPopUpModal
