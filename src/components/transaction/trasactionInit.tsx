"use client"

import { useEffect } from "react"
import { useData } from "../context/dataContext"

const TransactionInit = ({}) => {
    const { setCurrentTab } = useData()
    useEffect(() => {
        setCurrentTab(null)
    }, [])
    return null
}

export default TransactionInit
