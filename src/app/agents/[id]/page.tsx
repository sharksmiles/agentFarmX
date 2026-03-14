"use client"
import { useParams, redirect } from "next/navigation"
import { useEffect } from "react"

export default function AgentDetailPage() {
    const params = useParams()
    const id = params.id as string

    useEffect(() => {
        redirect(`/agents/${id}/dashboard`)
    }, [id])

    return null
}
