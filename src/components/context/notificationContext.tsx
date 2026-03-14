"use client"
import React, { createContext, useState, useContext, ReactNode } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FriendPageNotificationTypes } from "@/utils/types"
import Image from "next/image"
import { useLanguage } from "./languageContext"

// Define the context type
interface NotificationContextType {
    addNotification: (notif: Omit<FriendPageNotificationTypes, "id">, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = (): NotificationContextType => {
    const context = useContext(NotificationContext)
    if (context === undefined) {
        throw new Error("useNotification must be used within a NotificationProvider")
    }
    return context
}

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<FriendPageNotificationTypes[]>([])

    const addNotification = (notif: Omit<FriendPageNotificationTypes, "id">, duration = 3000) => {
        const id = new Date().getTime()
        setNotifications((prev) => [...prev, { ...notif, id }])

        setTimeout(() => {
            setNotifications((prev) => prev.filter((notification) => notification.id !== id))
        }, duration)
    }

    return (
        <NotificationContext.Provider value={{ addNotification }}>
            {children}
            <AnimatePresence>
                {notifications.map((notification) => (
                    <NotificationComponent
                        key={notification.id}
                        notification={notification}
                        dismissNotification={() =>
                            setNotifications((prev) =>
                                prev.filter((n) => n.id !== notification.id)
                            )
                        }
                    />
                ))}
            </AnimatePresence>
        </NotificationContext.Provider>
    )
}

interface NotificationComponentProps {
    notification: FriendPageNotificationTypes
    dismissNotification: () => void
}

const NotificationComponent: React.FC<NotificationComponentProps> = ({
    notification,
    dismissNotification,
}) => {
    const { t } = useLanguage()
    return (
        <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed top-0 inset-x-0 flex justify-center items-center z-50 mt-2 px-3"
            onClick={dismissNotification}
        >
            <div className="flex flex-col gap-[4px] items-center bg-[#1A1F25] h-auto z-20 rounded-t-[32px] rounded-b-[20px] border-t-4 border-[#FBB602] max-h-[450px] w-[100%] p-[16px] text-white">
                <div className="text-[18px] font-bold">{t(notification.notificationTitle!)}</div>
                {notification.notificationMessage != undefined && (
                    <div className="text-[15px] font-extrabold">
                        {t(notification.notificationMessage!)}
                    </div>
                )}
                {notification.reward != undefined &&
                    notification.friend_name != undefined &&
                    notification.more_reward != undefined &&
                    notification.action != undefined && (
                        <>
                            <div className="break-all flex justify-center items-center gap-[10px]">
                                <Image
                                    src="/game/coin_big.png"
                                    width={30}
                                    height={30}
                                    alt="coin"
                                    priority={true}
                                    loading="eager"
                                    quality={100}
                                />
                                <p className="text-[20px] text-[#FBB602] font-semibold">
                                    {t(notification.reward!.toString())} $COIN
                                </p>
                            </div>
                            <div className="text-[15px] font-extrabold">
                                {t("for helping")}{" "}
                                <span className="text-[#FC9069]">{notification.friend_name!}</span>{" "}
                                {t("to water You will receive extra")}{" "}
                                <span className="text-[#FBB602]">
                                    {notification.more_reward!} $COIN
                                </span>{" "}
                                {t("when")}{" "}
                                <span className="text-[#49B641]">{notification.friend_name!}</span>{" "}
                                {notification.action === "Harvest" && t("harvest this crop")}.
                            </div>
                            <div className="w-full flex">
                                <button
                                    onClick={dismissNotification}
                                    className="bg-[#5964F5] w-full rounded-[16px] py-[8px] px-[16px] text-[14px] font-semibold"
                                >
                                    {t("OK")}
                                </button>
                            </div>
                        </>
                    )}
            </div>
        </motion.div>
    )
}

export default NotificationProvider
