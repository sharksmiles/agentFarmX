import React from "react"
import { useData } from "../context/dataContext"
import { useLanguage } from "../context/languageContext"
import Image from "next/image"

const DeleteComponent: React.FC = () => {
    const { openDeleteFriendModel, setOpenDeleteFriendModel, setFriendList, setNotification } =
        useData()
    const { t } = useLanguage()
    const deleteFriend = async (friendId: string) => {
        setFriendList((prev) => prev.filter((item) => item.id !== friendId))
        setOpenDeleteFriendModel(null)
    }
    return (
        <>
            {openDeleteFriendModel != null && (
                <div className="fixed w-full h-full flex justify-center items-center bg-light-dark z-[9999] background-blur">
                    <div className="flex flex-col gap-[12px] items-center bg-[#1A1F25] h-auto z-20 div-with-gradient-border-delete-modal max-h-[450px] w-[80%] py-[28px] px-[16px] text-white">
                        <Image
                            src="/game/delete-freind.png"
                            width={38}
                            height={39}
                            alt="copy"
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                        <div className="text-[20px] font-extrabold max-w-[223px] text-center">
                            {t("Are you sure to unfriend")} {openDeleteFriendModel.name}
                        </div>
                        <div className="w-full flex gap-4">
                            <button
                                onClick={() => {
                                    deleteFriend(openDeleteFriendModel.id)
                                }}
                                className="bg-[#5964F5] border-2 border-[#5964F5] w-full rounded-[15px] h-[27px] text-[15px] font-semibold"
                            >
                                {t("Yes")}
                            </button>
                            <button
                                onClick={() => {
                                    setOpenDeleteFriendModel(null)
                                }}
                                className="bg-transparent border-2 border-[#5964F5] w-full rounded-[16px] h-[27px] text-[15px] font-semibold"
                            >
                                {t("No")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default DeleteComponent
