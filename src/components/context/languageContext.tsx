"use client"

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
    FC,
    Dispatch,
    SetStateAction,
} from "react"
import { useData } from "./dataContext"

interface Translations {
    [key: string]: string
}

interface LanguageContextProps {
    language: string
    translations: Translations
    setLanguage: Dispatch<SetStateAction<string>>
    t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)
const translationsCache: { [key: string]: Translations } = {}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}

interface LanguageProviderProps {
    children: ReactNode
}

export const LanguageProvider: FC<LanguageProviderProps> = ({ children }) => {
    const { setLanguageReady } = useData()
    
    const [language, setLanguage] = useState<string>(() => {
        // if (typeof window !== "undefined") {
        //     return localStorage.getItem("language") || getDefaultLanguage()
        // }
        return "en"
    })

    const [translations, setTranslations] = useState<Translations>({})

    const fetchTranslations = async (lang: string): Promise<Translations> => {
        if (lang === "en") {
            return {}
        }
        if (translationsCache[lang]) {
            return translationsCache[lang]
        } else {
            const res = await fetch(`/api/translations/${lang}`)
            const data = await res.json()
            translationsCache[lang] = data
            return data
        }
    }

    const switchLanguage = async (lang: string) => {
        const data = await fetchTranslations(lang)
        setLanguage(lang)
        setTranslations(data)
        if (typeof window !== "undefined") {
            localStorage.setItem("language", lang)
        }
        setTimeout(() => setLanguageReady(true), 500)
    }

    function t(key: string): string {
        if (language === "en") {
            return key
        }
        return translations[key] || key
    }

    useEffect(() => {
        setLanguageReady(false)
        switchLanguage(language)
    }, [language])

    return (
        <LanguageContext.Provider value={{ language, setLanguage, translations, t }}>
            {children}
        </LanguageContext.Provider>
    )
}
