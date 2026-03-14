import chroma from "chroma-js"
import { FC } from "react"

const BackgroundGuradian: FC<{ id: number; baseColor: string }> = ({ id, baseColor }) => {
    function generateGradient() {
        try {
            const color = chroma(baseColor)
            const baseHue = color.get("hsl.h")
            const colors = [
                color
                    .set("hsl.h", baseHue - 50)
                    .brighten(1)
                    .saturate(1)
                    .hex(),
                color
                    .set("hsl.h", baseHue + 50)
                    .brighten(1)
                    .saturate(1)
                    .hex(),
                chroma(baseColor).brighten(1).saturate(1).hex(),
                color
                    .set("hsl.h", baseHue + 100)
                    .brighten(1)
                    .saturate(1)
                    .hex(),
                color.brighten(1).saturate(1).hex(),
            ]
            return `linear-gradient(to bottom left, ${colors.join(", ")})`
        } catch (e) {
            // alert(id)
            // alert(baseColor)
            // alert(e)
        }
    }

    return (
        <>
            <div className={`absolute bg-[rgba(26,24,24,0.7)] w-full h-full -z-[10]`}></div>
            <div className={`absolute background-raffle-${id}  w-full h-full z-1 opacity-30`}>
                <style>
                    {`
            @keyframes skeleton-loading {
                0%, 100% {
                    background-position: 100% 50%;
                }
                50% {
                    background-position: 0% 50%;
                }
            }

            .background-raffle-${id} {
                width: 100%;
                background: ${generateGradient()};
                background-size: 200% 100%;
                animation: skeleton-loading 5s infinite linear;
                border-radius: 16px;
                display: block;
                z-index: -1;
            }
        `}
                </style>
            </div>
        </>
    )
}

export default BackgroundGuradian
