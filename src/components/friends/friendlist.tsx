import { FC, Dispatch, SetStateAction, useState } from "react"
import { useSwipeable } from "react-swipeable"
import Image from "next/image"
import { FriendsData } from "./friendsearchpage"
import { timeAgo, truncateText } from "@/utils/func/utils"
import { useLanguage } from "../context/languageContext"
import { useRouter } from "next/navigation"
import { useData } from "../context/dataContext"

const FriendItem: FC<{
    friend: FriendsData
    swipedFriend: string | null
    setSwipedFriend: Dispatch<SetStateAction<string | null>>
}> = ({ friend, swipedFriend, setSwipedFriend }) => {
    const router = useRouter()
    const { t } = useLanguage()
    const { setOpenDeleteFriendModel } = useData()
    const [swipeOffset, setSwipeOffset] = useState<number>(0)
    const handlers = useSwipeable({
        onSwiped: ({ dir }) => {
            if (dir === "Right") {
                setSwipedFriend(null)
            }
        },
        onSwiping: ({ deltaX }) => {
            const newOffset = Math.min(100, Math.max(0, -deltaX))
            if (newOffset > 0) {
                setSwipedFriend(friend.id)
            }
            if (newOffset === 0) {
                setSwipedFriend(null)
            }

            setSwipeOffset(newOffset)
        },
        trackMouse: true,
    })

    let last_login = timeAgo(friend.last_login)
    return (
        <div
            {...handlers}
            className={`relative w-full bg-[#252A31] h-[70px] py-[12px] px-[16px] rounded-2xl flex justify-between items-center transition-transform duration-300 cursor-default select-none`}
            style={{
                backgroundPosition: "top",
                backgroundRepeat: "no-repeat",
            }}
        >
            {/* Main content */}
            <div className="flex flex-col justify-between gap-[7px] items-start text-[14px] overflow-hidden">
                <span className="text-[16px] font-bold">
                    {truncateText(friend.user_name, 18)}
                </span>
                <div className="flex justify-between gap-[12px] items-center text-[14px]">
                    <span>Lv{friend.user_game_level}</span>
                    <span className="flex gap-[4px] items-center">
                        <Image
                            className="w-[16px] h-[16px] flex justify-center items-center"
                            src="/game/coin_big.png"
                            width={16}
                            height={16}
                            alt=""
                            style={{ display: "block" }}
                            priority={true}
                            loading="eager"
                            quality={100}
                        />
                        <p className="text-[#FBB602] font-semibold flex justify-center items-center text-[14px]">
                            {friend.user_coin_balance
                                ? friend.user_coin_balance.toLocaleString("en-US")
                                : 0}
                        </p>
                    </span>
                </div>
            </div>
            {/* Delete button */}
            {swipedFriend === friend.id && swipeOffset > 15 ? (
                <button
                    onClick={() =>
                        setOpenDeleteFriendModel({ id: friend.id, name: friend.user_name })
                    }
                    style={{
                        width: `${swipeOffset}px`,
                    }}
                    className=" absolute right-[0px] top-0 h-full max-w-[41px] bg-red-500 text-white rounded-r-2xl flex justify-center items-center"
                >
                    <svg
                        width="16"
                        height="18"
                        viewBox="0 0 16 18"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            d="M12.008 5.41744L11.3136 15.4057H4.5184L3.824 5.41744H2.2224L2.9216 15.5211C2.94996 15.9315 3.13053 16.3157 3.42689 16.5961C3.72324 16.8766 4.11332 17.0324 4.5184 17.0323H11.3136C11.7184 17.032 12.1081 16.876 12.4041 16.5956C12.7001 16.3151 12.8805 15.9312 12.9088 15.5211L13.6112 5.41744H12.008ZM8.5248 5.92116V13.503H10.1248V5.91953H8.5248V5.92116ZM5.6 5.92116V13.503H7.2V5.91953H5.6V5.92116ZM16 2.70872H0V4.33362H16V2.70872ZM4.6608 0V1.62491H11.0608V0H4.6608Z"
                            fill="white"
                        />
                    </svg>
                </button>
            ) : (
                <>
                    {/* Water and harvest buttons */}
                    <div
                        className="flex justify-between gap-[8px] items-center text-[14px]"
                        onClick={() => {
                            router.push("/friends/farm/f/" + friend.id)
                        }}
                    >
                        <div className="min-h-[48px] min-w-[46px] flex flex-col justify-between">
                            {friend.need_water !== 0 && (
                                <div className="rounded-[5px] w-[41px] flex justify-center items-center border-2 border-[#26C7C7] text-[8px] h-[19px]">
                                    {t("Water")}
                                </div>
                            )}
                            {friend.need_harvest > 4 && (
                                <div className="rounded-[5px] w-[41px] flex justify-center items-center border-2 border-[#33C14A] text-[8px] h-[19px]">
                                    {t("Harvest")}
                                </div>
                            )}
                        </div>

                        <button>
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 20 20"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M17.7094 10H2.29047"
                                    stroke="#CFCFCF"
                                    strokeWidth="2"
                                    strokeMiterlimit="10"
                                    strokeLinecap="round"
                                />
                                <path
                                    d="M10.7094 3L17.7094 10L10.7094 17"
                                    stroke="#CFCFCF"
                                    strokeWidth="2"
                                    strokeMiterlimit="10"
                                    strokeLinecap="round"
                                />
                            </svg>
                        </button>
                    </div>

                    {/* Online status */}
                    <div
                        className={`absolute right-0 top-0 text-[8px] font-extrabold rounded-bl-[16px] rounded-tr-[16px] w-auto h-auto py-[1px] px-[12px] flex justify-center items-center text-white ${
                            last_login === "online" ? "bg-[#249A37]" : "bg-gray-600"
                        }`}
                    >
                        {t(last_login)}
                    </div>
                </>
            )}
        </div>
    )
}

const FriendList: FC<{
    friendList: FriendsData[]
    swipedFriend: string | null
    setSwipedFriend: Dispatch<SetStateAction<string | null>>
}> = ({ friendList, swipedFriend, setSwipedFriend }) => {
    return (
        <>
            {friendList.map((friend, index) => (
                <FriendItem
                    key={index}
                    friend={friend}
                    swipedFriend={swipedFriend}
                    setSwipedFriend={setSwipedFriend}
                />
            ))}
        </>
    )
}

export default FriendList
