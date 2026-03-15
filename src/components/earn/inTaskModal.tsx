"use client"

import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useData } from "../context/dataContext"
import { useUser } from "../context/userContext"
import { useLanguage } from "../context/languageContext"

const InGameTaskModal = () => {
    const { user } = useUser()
    const { t } = useLanguage()
    const {
        gameTask,
        setGameTask,
        setInGameTask,
        setDailyRewardList,
        setGameReward,
        setCompleted,
    } = useData()
    const openDetails = (taskUrl: string) => {
        window.open(taskUrl, "_blank")
    }

    const shareMessage = () => {
        if (user?.invite_link) {
            navigator.clipboard.writeText(user.invite_link)
        }
    }

    return (
        <AnimatePresence>
            {gameTask && (
                <>
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={{
                            hidden: { y: "100%" },
                            visible: { y: 0 },
                        }}
                        transition={{ duration: 0.3 }}
                        className="fixed w-full bottom-0 bg-[#1A1F25] h-auto p-4 z-[100] rounded-t-[32px] border-t-4 border-[#FBB602] max-h-[80%]"
                    >
                        {/* close button */}
                        <button
                            className="absolute text-white right-[24px] top-[24px]"
                            onClick={() => {
                                setGameTask(null)
                            }}
                        >
                            <Image
                                src="/icon/close.svg"
                                width={24}
                                height={24}
                                alt=""
                                priority={true}
                                loading="eager"
                            />
                        </button>
                        {/* task details */}
                        <div className="flex flex-col px-2 justify-start items-start">
                            <div className="flex gap-2 items-center">
                                <p className="text-white">{t(gameTask.title)}</p>
                            </div>
                        </div>
                        <div className="flex flex-col p-2 justify-start items-start gap-1">
                            <p className=" text-[12px] text-white">{t(gameTask.content)}</p>
                            <p className=" text-[12px] text-white flex justify-center items-center gap-1">
                                <p className="text-[#FBB602]">
                                    {t("AgentFarm X rewards:")}
                                    {"  "}
                                </p>
                                <Image src="/game/coin_big.png" width={20} height={20} alt="" />
                                <p className="text-[#FBB602]">{gameTask.reward}</p>
                            </p>
                            {gameTask.id == 5 && (
                                <Image
                                    src={`/banner/${gameTask.banner!}`}
                                    alt=""
                                    width={838}
                                    height={625}
                                    priority={true}
                                    loading="eager"
                                />
                            )}
                        </div>
                        <div className="flex justify-between gap-2 mt-[20px]">
                            {gameTask.url != undefined && (
                                <button
                                    onClick={() => {
                                        if (gameTask.click) {
                                            openDetails(gameTask.url!)
                                            setGameTask(null)
                                        }
                                    }}
                                    className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                                >
                                    {t("go to task page")}
                                </button>
                            )}
                            {gameTask.id == 3 && (
                                <button
                                    onClick={() => {
                                        shareMessage()
                                    }}
                                    className="w-full p-[16px] bg-[#5964F5] rounded-2xl font-semibold text-[16px] text-white"
                                >
                                    {t("Invite a friend")}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default InGameTaskModal
