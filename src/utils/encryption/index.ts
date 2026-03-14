import { ethers } from "ethers"

export const formatMnemonicForAlert = (formattedMnemonic: string, mnemonic: string): string => {
    const words = mnemonic.split(" ")
    for (let i = 0; i < words.length; i++) {
        formattedMnemonic += `${i + 1}. ${words[i]}\n`
    }
    return formattedMnemonic.trim()
}

export const createWalletFromMnemonic = () => {
    const wallet = ethers.Wallet.createRandom()

    if (!wallet.mnemonic) {
        throw new Error("Failed to create a wallet")
    }

    const mnemonic = wallet.mnemonic.phrase

    const walletFromMnemonic = ethers.Wallet.fromPhrase(mnemonic)

    const address = walletFromMnemonic.address
    const privateKey = walletFromMnemonic.privateKey

    return { mnemonic, address, privateKey }
}

export const createOrRestoreWallet = (
    input: string,
    OpenAgentFarmXAlert?: (alert: { notificationTitle: string; notificationMessage: string }) => void
): {
    mnemonic: string | null
    address: string
    privateKey: string
} | null => {
    try {
        input = input.trim()

        const isLikelyPrivateKey = !input.includes(" ") && ethers.isHexString("0x" + input)

        if (isLikelyPrivateKey && !input.startsWith("0x")) {
            input = "0x" + input
        }

        if (input.startsWith("0x") && ethers.isHexString(input)) {
            try {
                const wallet = new ethers.Wallet(input)
                return { mnemonic: null, address: wallet.address, privateKey: wallet.privateKey }
            } catch (error) {
                throw new Error("Private key error: invalid private key format")
            }
        }

        try {
            const wallet = ethers.Wallet.fromPhrase(input)
            return { mnemonic: input, address: wallet.address, privateKey: wallet.privateKey }
        } catch (error) {
            throw new Error("Recovery phrase error: invalid recovery phrase format")
        }
    } catch (error) {
        if (OpenAgentFarmXAlert) {
            OpenAgentFarmXAlert({
                notificationTitle: "Error",
                notificationMessage: (error as Error).message,
            })
        }

        return null
    }
}

const getKeyFromUserId = async (userIdSalt: string, userId: string): Promise<CryptoKey> => {
    const enc = new TextEncoder()
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(userId),
        "PBKDF2",
        false,
        ["deriveKey"]
    )
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: enc.encode(userIdSalt),
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-CBC", length: 256 },
        false,
        ["encrypt", "decrypt"]
    )
}

export const encrypt = async (
    data: any,
    userId: string,
    userIdSalt: string
): Promise<string> => {
    const key = await getKeyFromUserId(userIdSalt, userId)
    const iv = window.crypto.getRandomValues(new Uint8Array(16))
    const enc = new TextEncoder()
    const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        key,
        enc.encode(JSON.stringify(data))
    )
    const ivBase64 = btoa(Array.from(iv, (b) => String.fromCharCode(b)).join(""))
    const encBase64 = btoa(Array.from(new Uint8Array(encrypted), (b) => String.fromCharCode(b)).join(""))
    return ivBase64 + ":" + encBase64
}

export const decrypt = async (
    encryptedData: string,
    userId: string,
    userIdSalt: string
): Promise<any> => {
    const key = await getKeyFromUserId(userIdSalt, userId)
    const parts = encryptedData.split(":")
    const ivBase64 = parts.shift()!
    const encBase64 = parts.join(":")
    const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0))
    const encrypted = Uint8Array.from(atob(encBase64), (c) => c.charCodeAt(0))

    try {
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-CBC", iv },
            key,
            encrypted
        )
        const dec = new TextDecoder()
        return JSON.parse(dec.decode(decrypted))
    } catch (error) {
        console.error("Failed to parse decrypted data as JSON", error)
        return null
    }
}

export const getPrivateKey = async (
    userId: string,
    userIdSalt: string
): Promise<string | null> => {
    const storedEncryptedWallet = localStorage.getItem("a")
    if (storedEncryptedWallet) {
        try {
            const decryptedWallet = await decrypt(storedEncryptedWallet, userId, userIdSalt)
            // console.log("Decrypted wallet:", decryptedWallet)
            if (decryptedWallet && decryptedWallet.privateKey) {
                return decryptedWallet.privateKey
            }
        } catch (error) {
            console.error("Failed to decrypt wallet", error)
        }
    }
    return null
}

export const getMnemonic = async (userId: string, userIdSalt: string): Promise<string | null> => {
    const storedEncryptedWallet = localStorage.getItem("a")
    if (storedEncryptedWallet) {
        try {
            const decryptedWallet = await decrypt(storedEncryptedWallet, userId, userIdSalt)
            // console.log("Decrypted wallet:", decryptedWallet)
            if (decryptedWallet && decryptedWallet.mnemonic) {
                return decryptedWallet.mnemonic
            }
        } catch (error) {
            console.error("Failed to decrypt wallet", error)
        }
    }
    return null
}
