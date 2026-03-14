/**
 * x402 Payment Protocol handler
 *
 * When the server returns HTTP 402 with a payment requirement header,
 * this module signs the payment payload using the connected EIP-1193 wallet
 * and retries the original request with the X-Payment header.
 *
 * Spec: https://x402.org/
 */

export interface X402PaymentRequired {
    scheme: "exact"
    network: string
    maxAmountRequired: string
    resource: string
    description: string
    mimeType: string
    payTo: string
    maxTimeoutSeconds: number
    asset: string
    extra?: Record<string, unknown>
}

export interface X402PaymentPayload {
    x402Version: 1
    scheme: "exact"
    network: string
    payload: {
        signature: string
        authorization: {
            from: string
            to: string
            value: string
            validAfter: string
            validBefore: string
            nonce: string
        }
    }
}

/**
 * Parse the WWW-Authenticate or X-Payment-Required header returned with a 402
 */
export function parsePaymentRequired(headerValue: string): X402PaymentRequired | null {
    try {
        const decoded = atob(headerValue.replace(/^x402 /, ""))
        return JSON.parse(decoded) as X402PaymentRequired
    } catch {
        try {
            return JSON.parse(headerValue) as X402PaymentRequired
        } catch {
            return null
        }
    }
}

/**
 * Build and sign an x402 payment authorization using the injected EIP-1193 provider.
 * Uses EIP-3009 transferWithAuthorization style.
 */
export async function signX402Payment(
    provider: any,
    fromAddress: string,
    req: X402PaymentRequired
): Promise<X402PaymentPayload> {
    const now = Math.floor(Date.now() / 1000)
    const validAfter  = String(now - 30)
    const validBefore = String(now + (req.maxTimeoutSeconds ?? 300))
    const nonce = `0x${crypto.getRandomValues(new Uint8Array(32)).reduce((s, b) => s + b.toString(16).padStart(2, "0"), "")}`

    const domain = {
        name: "USD Coin",
        version: "2",
        chainId: parseInt(req.network.replace(/\D/g, "")) || 196,
        verifyingContract: req.asset,
    }

    const types = {
        TransferWithAuthorization: [
            { name: "from",        type: "address" },
            { name: "to",          type: "address" },
            { name: "value",       type: "uint256" },
            { name: "validAfter",  type: "uint256" },
            { name: "validBefore", type: "uint256" },
            { name: "nonce",       type: "bytes32" },
        ],
    }

    const message = {
        from:        fromAddress,
        to:          req.payTo,
        value:       req.maxAmountRequired,
        validAfter,
        validBefore,
        nonce,
    }

    const signature: string = await provider.request({
        method: "eth_signTypedData_v4",
        params: [
            fromAddress,
            JSON.stringify({ types, domain, primaryType: "TransferWithAuthorization", message }),
        ],
    })

    return {
        x402Version: 1,
        scheme: "exact",
        network: req.network,
        payload: {
            signature,
            authorization: {
                from:        fromAddress,
                to:          req.payTo,
                value:       req.maxAmountRequired,
                validAfter,
                validBefore,
                nonce,
            },
        },
    }
}

/**
 * Encode payment payload to base64 for the X-Payment request header
 */
export function encodePaymentHeader(payment: X402PaymentPayload): string {
    return btoa(JSON.stringify(payment))
}
