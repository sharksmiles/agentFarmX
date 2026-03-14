import { DotLottiePlayer } from "@dotlottie/react-player"
import React from "react"

const Loader = ({ ifRadar }: { ifRadar?: boolean }) => {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                width: "100vw",
                background: "#1a1f25",
            }}
        >
            {ifRadar ? (
                <DotLottiePlayer
                    src="/lottie/radar.lottie"
                    autoplay
                    loop
                    style={{
                        width: "60%",
                        height: "30%",
                    }}
                />
            ) : (
                <DotLottiePlayer
                    src="/lottie/Animation - 1717803683490.lottie"
                    autoplay
                    loop
                    style={{
                        width: "30%",
                        height: "30%",
                    }}
                />
            )}
        </div>
    )
}

export default Loader
