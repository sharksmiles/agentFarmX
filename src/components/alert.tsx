"use client"

import Image from "next/image"
import { useData } from "./context/dataContext"
import { useLanguage } from "./context/languageContext"
import Loader from "./loader/Loader"

const AgentFarmAlert = () => {
    const {
        notification,
        setNotification,
        friendFarmNotification,
        setFriendFarmNotification,
        radaring,
    } = useData()
    const { t } = useLanguage()
    const copyToClipboard = async (copyText: string) => {
        await navigator.clipboard.writeText(copyText)
        setNotification({
            notificationTitle: "Copied to clipboard",
            notificationMessage: "",
        })
    }
    return (
        <>
            {notification && (
                <div className="fixed w-full h-full flex justify-center items-center bg-light-dark z-[9999] background-blur">
                    <div className="flex flex-col gap-[12px] items-center bg-[#1A1F25] h-auto z-20 rounded-t-[32px] rounded-b-[20px] border-t-4 border-[#FBB602] max-h-[450px] w-[80%] py-[28px] px-[16px] text-white">
                        <div className="text-[24px] font-bold">
                            {t(notification.notificationTitle)}
                        </div>
                        <div className="text-[16px] break-all">
                            {t(notification.notificationMessage)}
                        </div>
                        {notification.progressBars != undefined &&
                            notification.progressTimeLeft != undefined &&
                            notification.leftHours != undefined &&
                            notification.leftMinutes != undefined && (
                                <>
                                    <div className="bg-[#2F2F34] w-full h-8 rounded-full overflow-hidden border-[5px] border-[#FBB602]">
                                        <div
                                            className="bg-[#74DB72] h-full border-[#2F2F34]"
                                            style={{
                                                width: notification.progressBars.toString() + "%",
                                            }}
                                        ></div>
                                    </div>
                                    <div className="text-white font-extrabold text-[24px]">
                                        {notification.leftHours > 0
                                            ? `${notification.leftHours} ${t("hrs")}`
                                            : ""}
                                        {notification.leftMinutes > 0
                                            ? `${notification.leftHours > 0 ? " : " : ""}${
                                                  notification.leftMinutes
                                              } ${t("mins")}`
                                            : ""}{" "}
                                        {t("left")}
                                    </div>
                                    <div></div>
                                </>
                            )}
                        <div className="w-full flex gap-4">
                            <button
                                onClick={() => {
                                    setNotification(null)
                                }}
                                className="bg-[#5964F5] w-full rounded-[16px] py-[12px] px-[16px] text-[16px] font-semibold"
                            >
                                {t("OK")}
                            </button>
                            {notification.needCopy === true && (
                                <button
                                    onClick={() => {
                                        copyToClipboard(notification.notificationMessage)
                                    }}
                                    className="min-w-[50px] p-[15px] bg-[#5964F5] rounded-2xl"
                                >
                                    <Image
                                        src="/svg/copy.svg"
                                        width={20}
                                        height={20}
                                        alt="copy"
                                        priority={true}
                                        loading="eager"
                                        quality={100}
                                    />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {radaring && (
                <div className="fixed top-0 left-0 z-[10000]">
                    <Loader ifRadar={true} />
                </div>
            )}
            {/* {friendFarmNotification && (
                <div
                    className="fixed w-full h-full flex justify-center items-center bg-light-dark z-[9999] background-blur"
                    onClick={() => {
                        setFriendFarmNotification(null)
                    }}
                >
                    <div className="flex flex-col gap-[12px] items-center bg-[#1A1F25] h-auto z-20 rounded-t-[32px] rounded-b-[20px] border-t-4 border-[#FBB602] max-h-[450px] w-[80%] py-[28px] px-[16px] text-white">
                        <div className="text-[24px] font-bold">
                            {t(friendFarmNotification.notificationTitle!)}
                        </div>
                        <div className="break-all flex justify-center items-center gap-[10px]">
                            <Image
                                src="/game/coin_big.png"
                                width={42}
                                height={42}
                                alt="coin"
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                            <p className="text-[24px] text-[#FBB602] font-semibold">
                                {t(friendFarmNotification.reward!.toString())} $COIN
                            </p>
                        </div>
                        <div className="text-[18px] font-extrabold">
                            {t("for helping")}{" "}
                            <span className="text-[#FC9069]">
                                {friendFarmNotification.friend_name!}
                            </span>{" "}
                            {t("to water You will receive extra")}{" "}
                            <span className="text-[#FBB602]">
                                {friendFarmNotification.more_reward!} $COIN
                            </span>{" "}
                            {t("when")}{" "}
                            <span className="text-[#49B641]">
                                {friendFarmNotification.friend_name!}
                            </span>{" "}
                            {friendFarmNotification.action === "Harvest" && t("harvest this crop")}
                        </div>
                        <div className="w-full flex gap-4">
                            <button
                                onClick={() => {
                                    setFriendFarmNotification(null)
                                }}
                                className="bg-[#5964F5] w-full rounded-[16px] py-[12px] px-[16px] text-[16px] font-semibold"
                            >
                                {t("OK")}
                            </button>
                        </div>
                    </div>
                </div>
            )} */}
        </>
    )
}

export default AgentFarmAlert
