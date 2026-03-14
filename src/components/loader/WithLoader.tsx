"use client"
import React, { FC, ReactNode, useEffect, useState } from "react"
import { AnimatePresence } from "framer-motion"
import Loader from "./Loader"
import { useData } from "../context/dataContext"
import DisabledPage from "./disabledpage"
import { motion } from "framer-motion"

interface WithLoaderProps {
    children: ReactNode
}

const WithLoader: FC<WithLoaderProps> = ({ children }) => {
    const { isDataFetched, imgLoaded } = useData()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const handleWindowLoad = () => {
            setLoading(false)
        }

        if (document.readyState === "complete") {
            handleWindowLoad()
        } else {
            window.addEventListener("load", handleWindowLoad)
        }

        return () => {
            window.removeEventListener("load", handleWindowLoad)
        }
    }, [])
    return (
        <div>
            <AnimatePresence>
                {!isDataFetched || loading || !imgLoaded ? (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1 }}
                        style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1000,
                        }}
                    >
                        <Loader />
                    </motion.div>
                ) : (
                    children
                )}
            </AnimatePresence>
        </div>
    )
}

export default WithLoader
