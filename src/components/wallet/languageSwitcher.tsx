"use client"

import { useUser } from "../context/userContext"
import { useData } from "../context/dataContext"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowUpFromDot } from "lucide-react"
import { useLanguage } from "../context/languageContext"
import { ChoicelanguageList } from "@/utils/func/language"
import { useRouter } from "next/navigation"

const LanguageSwitcher = () => {
    const observerRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { t, language, setLanguage } = useLanguage()
    const [pendingLanguage, setPendingLanguage] = useState<string>(language)
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const { openLanguageSetting, setOpenLanguageSetting } = useData()

    const confirmLanguage = async () => {
        if (pendingLanguage !== language) {
            setLanguage(pendingLanguage)
        }
        setOpenLanguageSetting(false)
        router.push("/")
    }
    const scrollToTop = () => {
        observerRef.current?.scrollTo({
            top: 0,
            behavior: "smooth",
        })
    }

    const toggleVisibility = useCallback(() => {
        const container = observerRef.current
        if (container && container.scrollTop > 20) {
            setIsVisible(true)
        } else {
            setIsVisible(false)
        }
    }, [])

    useEffect(() => {
        const container = observerRef.current
        if (!container) return

        const handleScroll = () => toggleVisibility()

        container.addEventListener("scroll", handleScroll)

        return () => {
            container.removeEventListener("scroll", handleScroll)
        }
    }, [observerRef.current])

    return (
        <AnimatePresence>
            {openLanguageSetting && (
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
                        className="fixed w-full bottom-0 bg-[#1A1F25] h-auto z-20 rounded-t-[32px] border-t-4 border-[#FBB602] max-h-[80%]"
                    >
                        {/* close button */}
                        <button
                            className="absolute text-white right-[24px] top-[24px]"
                            onClick={() => {
                                setOpenLanguageSetting(false)
                            }}
                        >
                            <Image
                                src="/icon/close.svg"
                                width={24}
                                height={24}
                                alt=""
                                priority={true}
                                loading="eager"
                                quality={100}
                            />
                        </button>
                        {/* info component */}
                        <div className="w-full h-full flex pt-[24px] px-[16px] gap-[16px] flex-col">
                            {/* title */}
                            <div className="font-extrabold text-white text-[28px] text-center w-full">
                                {t("Languages")}
                            </div>
                            {/* item list */}
                            <div
                                ref={observerRef}
                                className="w-full min-h-[50px] max-h-[300px] overflow-y-auto"
                            >
                                <div className="font text-white text-center w-full flex justify-between items-center gap-[8px] flex-col">
                                    {ChoicelanguageList.map((lang, index) => {
                                        return (
                                            <div
                                                onClick={() => {
                                                    setPendingLanguage(lang.code)
                                                }}
                                                key={index}
                                                className="px-[16px] py-[12px] bg-[#252A31] rounded-[16px] w-[80%] flex justify-between items-center"
                                            >
                                                <p
                                                    className={`font-bold text-[16px] ${
                                                        pendingLanguage == lang.code
                                                            ? "text-[#5964F5]"
                                                            : "text-[#FFFFFF]"
                                                    } `}
                                                >
                                                    {t(lang.name)}
                                                </p>
                                                <div className="relative inline-block">
                                                    <span className="w-4 h-4 border-[1px] border-white rounded-full flex items-center justify-center">
                                                        {pendingLanguage == lang.code && (
                                                            <span className="w-2 h-2 bg-[#5964F5] rounded-full" />
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                        {/* button component */}
                        <div className="w-full p-[16px]">
                            <button
                                onClick={() => {
                                    confirmLanguage()
                                }}
                                className="rounded-[16px] bg-[#5964F5] w-full h-[50px] py-[12px] px-[16px] font-semibold text-[16px] text-white"
                            >
                                Select Language
                            </button>
                        </div>
                        {isVisible && (
                            <button
                                onClick={scrollToTop}
                                className="fixed bottom-[87px] left-1/2 -translate-x-1/2 bg-deep-dark text-white px-2 py-2 rounded-full cursor-pointer hover:opacity-75"
                            >
                                <ArrowUpFromDot size={20} />
                            </button>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

export default LanguageSwitcher
