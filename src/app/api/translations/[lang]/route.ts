import { NextApiRequest, NextApiResponse } from "next"

import esTranslations from "../../../../../public/translations/es.json"
import deTranslations from "../../../../../public/translations/de.json"
import faTranslations from "../../../../../public/translations/fa.json"
import ptTranslations from "../../../../../public/translations/pt.json"
import filTranslations from "../../../../../public/translations/fil.json"
import haTranslations from "../../../../../public/translations/ha.json"
import hiTranslations from "../../../../../public/translations/hi.json"
import idTranslations from "../../../../../public/translations/id.json"
import ruTranslations from "../../../../../public/translations/ru.json"
import ukTranslations from "../../../../../public/translations/uk.json"
import viTranslations from "../../../../../public/translations/vi.json"
import zhTranslations from "../../../../../public/translations/zh.json"
import yoTranslations from "../../../../../public/translations/yo.json"
import { NextRequest } from "next/server"

const translationsMap: { [key: string]: any } = {
    es: esTranslations,
    pt: ptTranslations,
    de: deTranslations,
    fa: faTranslations,
    fil: filTranslations,
    ha: haTranslations,
    hi: hiTranslations,
    id: idTranslations,
    ru: ruTranslations,
    uk: ukTranslations,
    vi: viTranslations,
    zh: zhTranslations,
    yo: yoTranslations,
}

export async function GET(req: NextRequest, { params }: { params: { lang: string } }) {
    const { lang } = params
    if (typeof lang !== "string") {
        return new Response(JSON.stringify({ message: `` }), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
            },
        })
    }

    const translations = translationsMap[lang]

    if (!translations) {
        return new Response(JSON.stringify(null), {
            status: 404,
            headers: {
                "Content-Type": "application/json",
            },
        })
    }

    return new Response(JSON.stringify(translations), {
        status: 200,
        headers: {
            "Content-Type": "application/json",
        },
    })
}
