"use client"
import { useUser } from "../context/userContext"
import { useLanguage } from "../context/languageContext"
import Image from "next/image"
import LeaderBoardPageBanner from "./banner"
import LeaderBoard from "./board"

const LeaderBoardPage = () => {
    const { user } = useUser()
    const { t } = useLanguage()

    return (
        <div className="flex flex-col w-full h-full ">
            <LeaderBoardPageBanner />
            <LeaderBoard />
        </div>
    )
}
export default LeaderBoardPage
