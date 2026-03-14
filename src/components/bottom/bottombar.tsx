"use client"

import BouncingButton from "./bottombutton"
import { useData } from "../context/dataContext"
import { useEffect } from "react"

const ButtonList = [
    {
        name: "Farm",
        href: "/",
        icon: "/icon/farmtab.png",
    },
    {
        name: "Agents",
        href: "/agents",
        icon: "/icon/farmtab.png", // TODO: Replace with actual agent icon
    },
    {
        name: "Friends",
        href: "/friends",
        icon: "/icon/friendstab.png",
    },
    {
        name: "Earn",
        href: "/earn",
        icon: "/icon/earntab.png",
    },
    {
        name: "Wallet",
        href: "/me",
        icon: "/icon/wallettab.png",
    },
]
const BottomBar = ({}) => {
    const { currentTab } = useData()

    return (
        <>
            {currentTab && (
                <div className="fixed bottom-[16px] w-full px-[16px] h-[79px] flex justify-center items-center z-50">
                    <div className="bg-[#252A31] w-full h-full rounded-2xl p-1 flex justify-between">
                        {ButtonList.map((button, index) => {
                            return (
                                <BouncingButton
                                    key={index}
                                    href={button.href}
                                    buttonName={button.name}
                                    currentTab={currentTab}
                                    icon={button.icon}
                                />
                            )
                        })}
                    </div>
                </div>
            )}
        </>
    )
}

export default BottomBar
