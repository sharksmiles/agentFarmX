import axios, { AxiosRequestConfig } from "axios"
import { parsePaymentRequired, signX402Payment, encodePaymentHeader } from "../func/x402"

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status

        if (status === 401) {
            if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("auth:unauthorized"))
            }
            return Promise.reject(error)
        }

        // ── x402 Payment Required ─────────────────────────────────────────
        if (status === 402 && typeof window !== "undefined") {
            const provider = (window as any).ethereum
            if (!provider) return Promise.reject(error)

            const headerVal =
                error.response.headers["x-payment-required"] ??
                error.response.headers["www-authenticate"] ??
                ""
            const payReq = parsePaymentRequired(headerVal)
            if (!payReq) return Promise.reject(error)

            try {
                const accounts: string[] = await provider.request({ method: "eth_requestAccounts" })
                const from = accounts[0]
                const payment = await signX402Payment(provider, from, payReq)
                const encoded = encodePaymentHeader(payment)

                const originalConfig = error.config as AxiosRequestConfig
                const retryHeaders = { ...(originalConfig.headers as Record<string, string>), "X-Payment": encoded }
                return apiClient({ ...originalConfig, headers: retryHeaders })
            } catch {
                return Promise.reject(error)
            }
        }

        return Promise.reject(error)
    }
)

export default apiClient
