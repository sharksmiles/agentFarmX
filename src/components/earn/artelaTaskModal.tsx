"use client"

import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useData } from "../context/dataContext"
import { useUser } from "../context/userContext"
import { useLanguage } from "../context/languageContext"

const ArtelaTaskModal = () => {
    const { t } = useLanguage()
    const { artelaTask, setArtelaTask } = useData()
    const { user } = useUser()
    const openDetails = (taskUrl: string) => {
        window.open(taskUrl, "_blank")
    }
    return (
        <AnimatePresence>
            {artelaTask && (
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
                                setArtelaTask(null)
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
                                <Image src={artelaTask.logoUrl} width={50} height={50} alt="" />
                                <p className="ml-[10px] text-white text-[28px]">
                                    {artelaTask.name}
                                </p>
                            </div>
                        </div>
                        <div className="mt-[20px] flex flex-col p-2 justify-start items-start gap-1">
                            <p className=" text-[18px] text-white">{t(artelaTask.Context)}</p>
                            <p className=" text-[18px] text-white flex justify-center items-center gap-1">
                                <p className="text-[#FBB602]">
                                    {t("AgentFarm X rewards:")}
                                    {"  "}
                                </p>
                                <Image src="/game/coin_big.png" width={20} height={20} alt="" />
                                <p className="text-[#FBB602]">{artelaTask.reward}</p>
                            </p>
                            {artelaTask.stone !== 0 && (
                                <p className="text-[18px] text-white flex justify-center items-center gap-1">
                                    <p className="text-[#FBB602]">
                                        {t("Artela Renaissence rewards:")}
                                        {"  "}
                                    </p>
                                    <Image
                                        src="https://renaissance.artela.network/_next/static/media/stone.6817d82a.svg"
                                        width={20}
                                        height={20}
                                        alt=""
                                    />
                                    <p className="text-[#FBB602]">{artelaTask.stone}</p>
                                </p>
                            )}
                            {artelaTask.crystal !== 0 && (
                                <p className="text-[18px] text-white flex justify-center items-center gap-1">
                                    <p className="text-[#FBB602]">
                                        {t("Artela Renaissence rewards:")}
                                        {"  "}
                                    </p>
                                    <Image
                                        src="https://renaissance.artela.network/_next/static/media/crystal.2a1c67a5.svg"
                                        width={20}
                                        height={20}
                                        alt=""
                                    />
                                    <p className="text-[#FBB602]">{artelaTask.crystal}</p>
                                </p>
                            )}
                            {user?.wallet_address_type === "game" && (
                                <p className="text-[12px] text-white">
                                    *{" "}
                                    {t(
                                        "To ensure your earnings, please connect with the same wallet used in the game to Artela Renaissance."
                                    )}
                                </p>
                            )}
                        </div>
                        <div className="flex justify-between gap-2 mt-[20px]">
                            <button
                                onClick={() => {
                                    openDetails(artelaTask.url)
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                {t("go to task page")}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default ArtelaTaskModal
