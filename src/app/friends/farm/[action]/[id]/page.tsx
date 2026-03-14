"use server"

import FriendFarm from "@/components/friends/farm/friendfarm"
import NotificationProvider from "@/components/context/notificationContext"

export default async function Page({
    params,
}: {
    params: { id: string; action: "r" | "s" | "f" | "i" | "re" | "ra" | "il" }
}) {
    return (
        <main className="h-screen w-full flex justify-center items-center flex-col z-10">
            <NotificationProvider>
                <FriendFarm id={params.id} action={params.action} />
            </NotificationProvider>
        </main>
    )
}
