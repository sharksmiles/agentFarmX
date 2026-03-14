// WheelComponent.tsx
import React, { useState, useEffect, useRef } from "react"

interface WheelOption {
    text: string
    color: string
}

interface WheelProps {
    options: WheelOption[]
}

const WheelComponent: React.FC<WheelProps> = ({ options }) => {
    const [rotation, setRotation] = useState<number>(0)
    const [isSpinning, setIsSpinning] = useState<boolean>(false)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        drawWheel()
    }, [rotation])

    const drawWheel = (): void => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const numOptions = options.length
        const arcSize = (2 * Math.PI) / numOptions
        const outerRadius = 240 // Adjusted to fit the borders
        const innerRadius = 200
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Draw main sections of the wheel
        options.forEach((option, i) => {
            const angle = rotation + i * arcSize
            ctx.beginPath()
            ctx.fillStyle = option.color
            ctx.moveTo(250, 250)
            ctx.arc(250, 250, outerRadius, angle, angle + arcSize)
            ctx.lineTo(250, 250)
            ctx.fill()

            // Add text
            ctx.fillStyle = "black"
            ctx.font = "16px Arial"
            ctx.textAlign = "right"
            ctx.fillText(
                option.text,
                250 + Math.cos(angle + arcSize / 2) * 180,
                250 + Math.sin(angle + arcSize / 2) * 180
            )
        })

        // Draw outer border
        ctx.strokeStyle = "#000000" // Black border
        ctx.lineWidth = 60
        ctx.beginPath()
        ctx.arc(250, 250, 255, 0, 2 * Math.PI)
        ctx.stroke()

        // Draw inner border of outer ring
        ctx.strokeStyle = "#FFD700" // Gold border
        ctx.lineWidth = 20
        ctx.beginPath()
        ctx.arc(250, 250, 245, 0, 2 * Math.PI)
        ctx.stroke()

        // Draw lights around the border
        for (let i = 0; i < numOptions; i++) {
            const angle = rotation + i * arcSize + arcSize / 2
            ctx.fillStyle = "#FFFF00" // Yellow lights
            ctx.beginPath()
            ctx.arc(250 + Math.cos(angle) * 230, 250 + Math.sin(angle) * 230, 10, 0, Math.PI * 2)
            ctx.fill()
        }

        // Draw the pointer
        ctx.fillStyle = "red"
        ctx.beginPath()
        ctx.moveTo(250, 10)
        ctx.lineTo(240, 50)
        ctx.lineTo(260, 50)
        ctx.closePath()
        ctx.fill()
    }

    const spinWheel = (): void => {
        if (isSpinning) return

        const spinDuration = Math.random() * 4000 + 3000 // Random spin duration between 3000ms and 7000ms
        const startAngle = rotation
        let startTime: number

        const rotate = (timestamp: number): void => {
            if (!startTime) startTime = timestamp
            const elapsedTime = timestamp - startTime
            const progress = elapsedTime / spinDuration
            const easeProgress = easeOutCubic(progress)

            setRotation(startAngle + easeProgress * 20 * Math.PI)

            if (progress < 1) {
                requestAnimationFrame(rotate)
            } else {
                setIsSpinning(false)
            }
        }

        setIsSpinning(true)
        requestAnimationFrame(rotate)
    }

    function easeOutCubic(x: number): number {
        return 1 - Math.pow(1 - x, 3)
    }

    return (
        <div>
            <canvas
                ref={canvasRef}
                width="500"
                height="500"
                style={{ border: "5px solid #ccc", borderRadius: "50%" }}
            />
            <button
                onClick={spinWheel}
                disabled={isSpinning}
                style={{ marginTop: "20px", padding: "10px 20px" }}
            >
                {isSpinning ? "旋转中..." : "旋转"}
            </button>
        </div>
    )
}

export default WheelComponent
