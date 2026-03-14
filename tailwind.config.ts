import type { Config } from "tailwindcss"

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-conic":
                    "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
                "linear-green": "linear-gradient(180deg, #7FE070 0%, #27961F 100%)",
                "linear-orange":
                    "linear-gradient(to right, rgba(251, 182, 2, 0.9) 34%, rgba(251, 182, 2, 0.6) 100%)",
            },
            backgroundColor: {
                "light-yellow": "rgba(251, 182, 2, 0.2)",
                "light-orange": "rgba(246, 161, 18, 0.2)",
                "light-dark": "rgba(37, 42, 49, 0.5)",
                "deep-dark": "rgba(255, 255, 255, 0.2)",
                "main-bg": "#1a1f25",
                "card-bg": "#252A31",
            },
            screens: {
                promax: "430px",
                pro: "375px",
                se: "360px",
            },
            colors: {
                brown: {
                    text: "#5A4B23",
                    border: "#9D6441",
                    dark: "#521a00",
                },
                green: {
                    DEFAULT: "#7abf61",
                    light: "#eaffe1",
                },
                blue: {
                    DEFAULT: "#4578b3",
                    stroke: "#60b5ff",
                },
                yellow: {
                    text: "#FBB602",
                },
                skeleton: {
                    dark: "#3b4049",
                },
            },
            backdropFilter: {
                none: "none",
                blur: "blur(20px)",
            },
            boxShadow: {
                regular: "0 10px 4px rgba(0, 0, 0, 0.3)",
            },
        },
    },
    plugins: [],
}
export default config
