import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { parsePaymentRequired, signX402Payment, signPreAuthorization, encodePaymentHeader, X402PaymentPayload, X402PaymentRequired } from "../func/x402"

/**
 * 预授权签名后调用confirm接口存储签名
 */
async function confirmPreauthFromPayment(payReq: X402PaymentRequired, payment: X402PaymentPayload): Promise<void> {
    // 从resource中提取agentId，格式为 "agent_preauth:${agentId}"
    const agentId = payReq.resource?.replace("agent_preauth:", "")
    if (!agentId) return
    
    try {
        await axios.post(`/api/agents/${agentId}/preauth/confirm`, {
            auth: {
                from: payment.payload.authorization.from,
                to: payment.payload.authorization.to,
                value: payment.payload.authorization.value,
                validAfter: payment.payload.authorization.validAfter,
                validBefore: payment.payload.authorization.validBefore,
                nonce: payment.payload.authorization.nonce,
                signature: payment.payload.signature,
            },
        })
    } catch (err) {
        console.error("Failed to confirm preauth:", err)
        // 不抛出错误，允许重试原请求
    }
}

const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "",
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
})

// 请求拦截器：自动添加 Authorization header
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("accessToken")
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`
            }
        }
        return config
    },
    (error) => Promise.reject(error)
)

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

            // 区分预授权请求和普通支付请求
            const isPreauth = payReq.resource?.startsWith("agent_preauth:")

            try {
                const accounts: string[] = await provider.request({ method: "eth_requestAccounts" })
                const from = accounts[0]
                
                // 预授权使用30天有效期签名，普通支付使用单次签名
                const payment = isPreauth 
                    ? await signPreAuthorization(provider, from, payReq)
                    : await signX402Payment(provider, from, payReq)
                const encoded = encodePaymentHeader(payment)

                // 预授权签名后，调用confirm接口存储签名
                if (isPreauth) {
                    await confirmPreauthFromPayment(payReq, payment)
                }

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
