"use client"

import Image from "next/image"
import { useData } from "../context/dataContext"
import { Minus, Plus } from "lucide-react"
import { useState } from "react"
import { useUser } from "../context/userContext"
import { useLanguage } from "../context/languageContext"

const RafflePageEntry = ({}) => {
    const { t } = useLanguage()
    const { openRaffleEntry, setOpenRaffleEntry, setNotification, setRaffleList } = useData()
    const { user, setUser } = useUser()
    const [wantToPurchaseTicketCount, setWantToPurchaseTicketCount] = useState<number>(0)
    const [submitting, setSubmitting] = useState<boolean>(false)
    const [checkReady, setCheckReady] = useState<boolean>(false)
    const confirmTicketPurchase = async (
        raffle_id: number,
        ticket_count: number,
        totalAmount: number
    ) => {
        if (ticket_count === 0) {
            setNotification({
                notificationTitle: "Oops!",
                notificationMessage: "You can't buy 0 ticket.",
            })
            return
        }
        if (user?.farm_stats?.coin_balance && totalAmount > user?.farm_stats?.coin_balance) {
            setNotification({
                notificationTitle: "Insufficient Balance",
                notificationMessage: "You don't have enough balance to buy this ticket.",
            })
            return
        }
        if (
            openRaffleEntry?.max_tickets_per_user &&
            openRaffleEntry?.ticket_count &&
            ticket_count > openRaffleEntry?.max_tickets_per_user - openRaffleEntry?.ticket_count
        ) {
            setNotification({
                notificationTitle: "Reach Max Ticket Limit",
                notificationMessage: "You can't buy more tickets than the limit.",
            })
            return
        }

        setSubmitting(true)

        let new_ticket_count: number = openRaffleEntry?.ticket_count
            ? openRaffleEntry?.ticket_count + ticket_count
            : ticket_count

        let new_total_ticket_count: number = openRaffleEntry?.ticket_count
            ? openRaffleEntry?.total_user_tickets + ticket_count
            : ticket_count

        let postData = {
            raffle_id,
            ticket_count,
        }

        setTimeout(() => {
            setUser((prev) => {
                if (!prev) return prev
                return { ...prev, farm_stats: { ...prev.farm_stats, coin_balance: prev.farm_stats.coin_balance - totalAmount } }
            })
            setRaffleList((prev) => prev.map((raffle) => {
                if (raffle.id === raffle_id) {
                    return { ...raffle, participated: true, ticket_count: new_ticket_count, total_user_tickets: new_total_ticket_count }
                }
                return raffle
            }))
            setWantToPurchaseTicketCount(0)
            setNotification({ notificationTitle: "Success", notificationMessage: "Tickets purchased successfully!" })
            setOpenRaffleEntry(null)
            setSubmitting(false)
        }, 600)
    }

    return (
        <>
            {openRaffleEntry !== null && (
                <div
                    className="fixed w-full h-full flex justify-center items-center bg-light-dark z-[9999] background-blur"
                    onClick={() => {
                        setOpenRaffleEntry(null)
                        setWantToPurchaseTicketCount(0)
                    }}
                >
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        className="relative flex flex-col items-center bg-[#1A1F25] h-auto z-20 rounded-[32px] border-[2px] max-h-[450px] w-[80%] pt-[44px] pb-[22px] px-[25px] text-white"
                        style={{ borderColor: openRaffleEntry.main_color }}
                    >
                        <button
                            className="absolute text-white right-[24px] top-[12px]"
                            onClick={() => {
                                setOpenRaffleEntry(null)
                                setWantToPurchaseTicketCount(0)
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
                        <p className="text-[18px] font-semibold">{t(openRaffleEntry.name)}</p>

                        {openRaffleEntry.is_twitter_task ? (
                            <>
                                <Image
                                    className="mt-[16px]"
                                    src="/game/twitter.png"
                                    width={68}
                                    height={68}
                                    alt="twitter logo"
                                />
                                <p className="text-[24px] font-bold">{t("*Task Required")}</p>
                                <p className="text-center py-[36px] text-[16px] font-semibold">
                                    {t(
                                        "Please comment, retweet and like the tweet below on X(Twitter) to participant this Raffle"
                                    )}
                                </p>
                                {checkReady ? (
                                    <button
                                        className="rounded-[16px] w-full h-[46px] flx justify-center items-center text-[16px] font-semibold"
                                        style={{ backgroundColor: openRaffleEntry.main_color }}
                                        onClick={() => {
                                            confirmTicketPurchase(openRaffleEntry.id, 1, 0)
                                        }}
                                    >
                                        {submitting ? t("Checking...") : t("Check")}
                                    </button>
                                ) : (
                                    <button
                                        className="rounded-[16px] w-full h-[46px] flx justify-center items-center text-[16px] font-semibold"
                                        style={{ backgroundColor: openRaffleEntry.main_color }}
                                        onClick={() => {
                                            window.open(openRaffleEntry.twitter_link, "_blank")
                                            setTimeout(() => { setCheckReady(true) }, 3000)
                                        }}
                                    >
                                        {t("Go to X.com")}
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <p className="text-[18px] font-semibold">{t("Buy Tickets")}</p>
                                <div className="flex gap-[30px] justify-between items-center py-[16px]">
                                    <button
                                        onClick={() => {
                                            setWantToPurchaseTicketCount((prev) =>
                                                prev > 0 ? prev - 1 : prev
                                            )
                                        }}
                                        className="flex justify-center items-center w-[26px] h-[26px] rounded-full"
                                        style={{ backgroundColor: openRaffleEntry.main_color }}
                                    >
                                        <Minus size={20} color="white" />
                                    </button>
                                    <div className="bg-[#4D4F51] h-[35px] w-[35px] rounded-[4px] flex items-center justify-center font-medium text-white">
                                        {wantToPurchaseTicketCount}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setWantToPurchaseTicketCount((prev) =>
                                                prev + 1 <=
                                                openRaffleEntry.max_tickets_per_user -
                                                    openRaffleEntry.ticket_count
                                                    ? prev + 1
                                                    : prev
                                            )
                                        }}
                                        className="flex justify-center items-center w-[26px] h-[26px] rounded-full"
                                        style={{ backgroundColor: openRaffleEntry.main_color }}
                                    >
                                        <Plus size={20} color="white" />
                                    </button>
                                </div>
                                <p className="text-[12px]">
                                    {t("Max Tickets")}:{" "}
                                    {openRaffleEntry.ticket_count + wantToPurchaseTicketCount} /{" "}
                                    {openRaffleEntry.max_tickets_per_user}
                                </p>

                                <p className="font-bold text-[20px] pt-[24px]">
                                    {t("Total")}:{" "}
                                    {(
                                        openRaffleEntry.ticket_price * wantToPurchaseTicketCount
                                    ).toLocaleString("en-US")}{" "}
                                    $COIN
                                </p>
                                <p className="w-full flex justify-end text-[12px] pt-[12px] px-[16px]">
                                    {t("wallet balance")}:{" "}
                                    {user?.farm_stats?.coin_balance.toLocaleString("en-US")} $COIN
                                </p>
                                <button
                                    className="rounded-[16px] w-full h-[46px] flx justify-center items-center text-[16px] font-semibold"
                                    style={{ backgroundColor: openRaffleEntry.main_color }}
                                    onClick={() => {
                                        confirmTicketPurchase(
                                            openRaffleEntry.id,
                                            wantToPurchaseTicketCount,
                                            openRaffleEntry.ticket_price *
                                                wantToPurchaseTicketCount
                                        )
                                    }}
                                >
                                    {submitting ? t("Confirming...") : t("Confirm")}
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

export default RafflePageEntry
