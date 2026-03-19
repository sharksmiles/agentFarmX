import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { parsePaymentRequired, signX402Payment, signPreAuthorization, encodePaymentHeader, X402PaymentPayload, X402PaymentRequired } from "../func/x402"
import { getSelectedWalletProvider } from "../func/walletAuth"
import { ensureXLayer } from "../func/onchain"

/**
 * 预授权签名后调用confirm接口存储签名
 * 注意：必须使用 apiClient 而不是 axios，以便自动携带 Authorization 头
 */
async function confirmPreauthFromPayment(payReq: X402PaymentRequired, payment: X402PaymentPayload): Promise<void> {
    // 从resource中提取agentId，格式为 "agent_preauth:${agentId}"
    const agentId = payReq.resource?.replace("agent_preauth:", "")
    if (!agentId) return
    
    try {
        // 使用 apiClient 而不是 axios，确保携带 Authorization 头
        // 请求体结构需要匹配后端 PreauthConfirmRequest 接口
        await apiClient.post(`/api/agents/${agentId}/preauth/confirm`, {
            payment: {
                x402Version: payment.x402Version,
                scheme: payment.scheme,
                network: payment.network,
                payload: {
                    signature: payment.payload.signature,
                    authorization: {
                        from: payment.payload.authorization.from,
                        to: payment.payload.authorization.to,
                        value: payment.payload.authorization.value,
                        validAfter: payment.payload.authorization.validAfter,
                        validBefore: payment.payload.authorization.validBefore,
                        nonce: payment.payload.authorization.nonce,
                    },
                },
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
        const originalRequest = error.config

        if (status === 401 && !originalRequest._retry) {
            originalRequest._retry = true
            
            // 尝试使用 refreshToken 刷新 accessToken
            if (typeof window !== "undefined") {
                const refreshToken = localStorage.getItem('refreshToken')
                
                if (refreshToken) {
                    try {
                        const response = await axios.post('/api/auth/refresh', {
                            refreshToken
                        })
                        
                        if (response.data.tokens?.accessToken) {
                            localStorage.setItem('accessToken', response.data.tokens.accessToken)
                            localStorage.setItem('refreshToken', response.data.tokens.refreshToken)
                            
                            // 使用新 token 重试原请求
                            if (originalRequest.headers) {
                                originalRequest.headers.Authorization = `Bearer ${response.data.tokens.accessToken}`
                            }
                            return apiClient(originalRequest)
                        }
                    } catch (refreshError) {
                        // 刷新失败，清除登录状态
                        localStorage.removeItem('accessToken')
                        localStorage.removeItem('refreshToken')
                        window.dispatchEvent(new CustomEvent("auth:unauthorized"))
                        return Promise.reject(error)
                    }
                }
            }
            
            // 没有 refreshToken 或刷新失败，触发未授权事件
            window.dispatchEvent(new CustomEvent("auth:unauthorized"))
            return Promise.reject(error)
        }

        // ── x402 Payment Required ─────────────────────────────────────────
        if (status === 402 && typeof window !== "undefined") {
            // Try to get the user's selected wallet provider first
            let providerDetail = await getSelectedWalletProvider()
            
            // Fallback to window.ethereum if no selected provider found
            // This handles cases where user logged in before the fix was applied
            const provider = providerDetail?.provider ?? (window as any).ethereum
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
                
                // Ensure wallet is on X Layer network before signing
                await ensureXLayer(provider)
                
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
