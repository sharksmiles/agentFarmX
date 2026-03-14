import type { Metadata } from "next"
import type { Viewport } from "next"
import { Baloo_Bhai_2 } from "next/font/google"
import "./globals.css"
import { ViewTransitions } from "next-view-transitions"
import InitTelegram from "@/components/init"
import WithLoader from "@/components/loader/WithLoader"
import { DataProvider } from "@/components/context/dataContext"
import { UserProvider } from "@/components/context/userContext"
import BottomBar from "@/components/bottom/bottombar"
import AgentFarmAlert from "@/components/alert"
import { LanguageProvider } from "@/components/context/languageContext"

const inter = Baloo_Bhai_2({ subsets: ["latin"] })

export const metadata: Metadata = {
    title: "AgentFarm X",
    description: "AgentFarm X - AI Agent Playground on X Layer",
}

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <ViewTransitions>
            <html lang="en">
                <body className={inter.className}>
                    <DataProvider>
                        <LanguageProvider>
                            <UserProvider>
                                    <InitTelegram />
                                    <AgentFarmAlert />
                                    <WithLoader>{children}</WithLoader>
                                    <BottomBar />
                            </UserProvider>
                        </LanguageProvider>
                    </DataProvider>
                </body>
            </html>
        </ViewTransitions>
    )
}
