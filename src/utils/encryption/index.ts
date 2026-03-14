import crypto from "crypto"
import { promisify } from "util"
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

const randomBytes = promisify(crypto.randomBytes)
const pbkdf2 = promisify(crypto.pbkdf2)

const getKeyFromUserId = async (userIdSalt: string, userId: string): Promise<Buffer> => {
    const salt = userIdSalt
    const key = await pbkdf2(userId, salt, 100000, 32, "sha256")
    return key
}

export const encrypt = async (
    data: any,
    userId: string,
    userIdSalt: string
): Promise<string> => {
    const key = await getKeyFromUserId(userId, userIdSalt)
    const iv = await randomBytes(16)
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv)
    let encrypted = cipher.update(JSON.stringify(data), "utf8", "base64")
    encrypted += cipher.final("base64")
    return iv.toString("base64") + ":" + encrypted
}

export const decrypt = async (
    encryptedData: string,
    userId: string,
    userIdSalt: string
): Promise<any> => {
    const key = await getKeyFromUserId(userId, userIdSalt)
    const parts = encryptedData.split(":")
    const iv = Buffer.from(parts.shift()!, "base64")
    const encryptedText = parts.join(":")
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv)
    let decrypted = decipher.update(encryptedText, "base64", "utf8")
    decrypted += decipher.final("utf8")

    try {
        const jsonData = JSON.parse(decrypted)
        // console.log("Parsed JSON:", jsonData)
        return jsonData
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
