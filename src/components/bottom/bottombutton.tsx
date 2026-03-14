"use client"
import React, { useEffect } from "react"
import { Link } from "next-view-transitions"
import { motion } from "framer-motion"
import Image from "next/image"
import { useLanguage } from "../context/languageContext"
import { useData } from "../context/dataContext"
import { currentTabTypes } from "@/utils/types"

const BouncingButton: React.FC<{
    href: string
    buttonName: string
    currentTab: currentTabTypes
    icon: string
}> = ({ href, buttonName, currentTab, icon }) => {
    const { t } = useLanguage()
    const { friendInfo } = useData()

    return (
        <Link className="w-full h-full relative" href={href}>
            {buttonName === "Friends" && friendInfo.pendingRequest > 0 && (
                <span className="absolute w-[25px] h-[25px] right-0 rounded-full  bg-gradient-to-b from-[#FBB602] to-[#DE6F0D] text-white flex justify-center items-center z-50">
                    {friendInfo.pendingRequest}
                </span>
            )}
            <motion.div
                whileTap={{ scale: 0.9 }}
                onClick={() => {}}
                className={`${
                    currentTab === buttonName && "bg-[#1A1F25]"
                } rounded-2xl w-auto h-full flex justify-center items-center cursor-pointer text-white flex-col py-[8px] px-[2px]`}
            >
                <Image
                    className="w-[36px] h-[36px]"
                    src={icon}
                    width={4000}
                    height={4000}
                    alt={`${buttonName + "icon"}`}
                    priority={true}
                    loading="eager"
                    quality={100}
                />
                <p className="text-[11px] leading-tight text-center mt-1 font-medium">{t(buttonName)}</p>
            </motion.div>
        </Link>
    )
}

export default BouncingButton
