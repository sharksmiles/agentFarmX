import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios"
import { parsePaymentRequired, signX402Payment, encodePaymentHeader, X402PaymentPayload, X402PaymentRequired } from "../func/x402"
import { getSelectedWalletProvider } from "../func/walletAuth"
import { ensureXLayer } from "../func/onchain"
import { permit2Preauth, Permit2PreauthPayload, Permit2PreauthRequest } from "../func/permit2"

/**
 * Permit2 预授权签名后调用confirm接口存储签名
 */
async function confirmPermit2Preauth(agentId: string, payload: Permit2PreauthPayload): Promise<void> {
    try {
        await apiClient.post(`/api/agents/${agentId}/preauth/permit2`, {
            permit2Version: payload.permit2Version,
            scheme: payload.scheme,
            network: payload.network,
            payload: {
                signature: payload.payload.signature,
                permitSingle: {
                    details: {
                        token: payload.payload.permitSingle.details.token,
                        amount: payload.payload.permitSingle.details.amount,
                        expiration: payload.payload.permitSingle.details.expiration,
                        nonce: payload.payload.permitSingle.details.nonce,
                    },
                    spender: payload.payload.permitSingle.spender,
                    sigDeadline: payload.payload.permitSingle.sigDeadline,
                },
            },
        })
    } catch (err) {
        console.error("Failed to confirm Permit2 preauth:", err)
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
            console.log('[Preauth] Received 402, starting payment flow...')
            
            // Try to get the user's selected wallet provider first
            let providerDetail = await getSelectedWalletProvider()
            
            // Fallback to window.ethereum if no selected provider found
            // This handles cases where user logged in before the fix was applied
            const provider = providerDetail?.provider ?? (window as any).ethereum
            if (!provider) {
                console.error('[Preauth] No wallet provider found')
                return Promise.reject(new Error('请先连接钱包'))
            }
            console.log('[Preauth] Using wallet:', providerDetail?.info?.name || 'window.ethereum')

            const headerVal =
                error.response.headers["x-payment-required"] ??
                error.response.headers["www-authenticate"] ??
                ""
            const payReq = parsePaymentRequired(headerVal)
            if (!payReq) {
                console.error('[Preauth] Failed to parse X-Payment-Required header')
                return Promise.reject(new Error('支付请求格式错误'))
            }
            console.log('[Preauth] Payment request:', payReq)

            // 区分预授权请求和普通支付请求
            const isPreauth = payReq.resource?.startsWith("agent_preauth:")
            console.log('[Preauth] Is preauth request:', isPreauth, 'resource:', payReq.resource)

            try {
                const accounts: string[] = await provider.request({ method: "eth_requestAccounts" })
                const from = accounts[0]
                console.log('[Preauth] Connected account:', from)
                
                // Ensure wallet is on X Layer network before signing
                console.log('[Preauth] Ensuring X Layer network...')
                await ensureXLayer(provider)
                console.log('[Preauth] Network confirmed')
                
                if (isPreauth) {
                    // 预授权使用 Permit2 流程
                    const THIRTY_DAYS = 30 * 24 * 60 * 60
                    const agentId = payReq.resource?.replace("agent_preauth:", "")
                    console.log('[Preauth] Starting Permit2 flow for agent:', agentId)
                    
                    const permit2Request: Permit2PreauthRequest = {
                        network: payReq.network,
                        asset: payReq.asset,
                        spender: payReq.payTo,
                        amount: payReq.maxAmountRequired,
                        expirationSeconds: THIRTY_DAYS,
                    }
                    console.log('[Preauth] Permit2 request:', permit2Request)
                    
                    // 执行 Permit2 预授权流程（可能需要先 approve Permit2）
                    const permit2Payload = await permit2Preauth(provider, from, permit2Request)
                    console.log('[Preauth] Permit2 signature obtained')
                    
                    // 调用后端存储预授权
                    if (agentId) {
                        console.log('[Preauth] Confirming with backend...')
                        await confirmPermit2Preauth(agentId, permit2Payload)
                        console.log('[Preauth] Backend confirmation done')
                    }
                    
                    // 重试原始请求
                    console.log('[Preauth] Retrying original request...')
                    const originalConfig = error.config as AxiosRequestConfig
                    return apiClient(originalConfig)
                } else {
                    // 普通支付使用 x402 单次签名
                    const payment = await signX402Payment(provider, from, payReq)
                    const encoded = encodePaymentHeader(payment)
                    const originalConfig = error.config as AxiosRequestConfig
                    const retryHeaders = { ...(originalConfig.headers as Record<string, string>), "X-Payment": encoded }
                    return apiClient({ ...originalConfig, headers: retryHeaders })
                }
            } catch (preauthError: any) {
                // 详细记录预授权失败原因
                console.error('[Preauth] Failed:', {
                    message: preauthError?.message || 'Unknown error',
                    code: preauthError?.code,
                    data: preauthError?.data,
                })
                // 重新抛出包含更多信息的错误
                const enhancedError = new Error(
                    preauthError?.message || '预授权失败，请检查钱包连接'
                )
                return Promise.reject(enhancedError)
            }
        }

        return Promise.reject(error)
    }
)

export default apiClient
