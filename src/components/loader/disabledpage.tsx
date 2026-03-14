import Image from "next/image"
import React from "react"

const DisabledPage = () => {
    return (
        <div className="disabled-page w-full font-semibold">
            <div>Device Unsupported</div>
            <div className="h-auto w-[80%] flex justify-center items-center">
                <Image src="/game/QRcode.png" alt="QR code" width={400} height={400} />
            </div>
            <div className="text-center">
                Please Scan the QR code to play AgentFarm X game on your phone
            </div>
        </div>
    )
}

export default DisabledPage
