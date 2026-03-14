"use client"

import {
    createContext,
    useContext,
    useState,
    ReactNode,
    FC,
    Dispatch,
    SetStateAction,
} from "react"

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
    
    const [language, setLanguage] = useState<string>("en")
    const [translations] = useState<Translations>({})

    function t(key: string): string {
        return key
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, translations, t }}>
            {children}
        </LanguageContext.Provider>
    )
}
