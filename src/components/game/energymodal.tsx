"use client"

import Image from "next/image"
import { useLanguage } from "../context/languageContext"
import { useData } from "../context/dataContext"
import { useUser } from "../context/userContext"

const EnergyModal = () => {
    const { t } = useLanguage()
    const { user } = useUser()
    const { openEnergyModal, setOpenEnergyModal } = useData()
    return (
        <>
            {openEnergyModal && (
                <div className="fixed w-full h-full bg-[rgba(0,0,0,0.65)] z-[100] flex justify-center items-center px-5">
                    <div className="w-full h-auto bg-gradient-to-b from-[#E0E6F7] to-white rounded-[20px] flex flex-col pt-7 pb-4 px-4 gap-2">
                        <div className="w-full h-auto flex justify-center items-center pb-2">
                            <h1
                                className="outlinedtexttitle text-[24px] font-extrabold"
                                data-content={`${t("Usage of Energy")}`}
                            >
                                {t("Usage of Energy")}
                            </h1>
                        </div>
                        <div className="flex gap-1 items-start">
                            <Image
                                className="w-[18px] h-[18px] mt-[2px] min-w-[18px]"
                                src="/game/watericon.png"
                                width={36}
                                height={36}
                                alt="watering icon"
                            />
                            <p className="text-[16px] text-black font-bold">
                                {t("water friends' crops for guaranteed returns.")}
                            </p>
                        </div>
                        <div className="flex gap-1 items-start">
                            <Image
                                className="w-[18px] h-[18px] mt-[2px] min-w-[18px]"
                                src="/game/stealicon.png"
                                width={36}
                                height={36}
                                alt="watering icon"
                            />
                            <p className="text-[16px] text-black font-bold">
                                {t("stealing crops, take the riskier for higher rewards.")}
                            </p>
                        </div>
                        <div className="flex gap-1 items-start">
                            <Image
                                className="w-[18px] h-[18px] mt-[2px] min-w-[18px]"
                                src="/game/energyicon.png"
                                width={36}
                                height={36}
                                alt="watering icon"
                            />
                            <p className="text-[16px] text-black font-bold">
                                {t("Current upper limit:")}
                                {user?.farm_stats?.max_energy} (40 + {t("Level")} * 2).
                                <br />
                                {t("Energy recover: 1 energy every 5 minutes.")}
                            </p>
                        </div>
                        <button
                            className="rounded-2xl bg-[#5964F5] py-3 px-4 text-white hover:opacity-80 font-semibold mt-4"
                            onClick={() => {
                                setOpenEnergyModal(false)
                            }}
                        >
                            {t("got it")}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}

export default EnergyModal
