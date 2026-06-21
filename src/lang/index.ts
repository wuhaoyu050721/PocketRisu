import merge from "lodash/merge";
import { languageChinese } from "./cn";
import { languageChineseExtra } from "./cn.extra";
import { languageGerman } from "./de";
import { languageEnglish } from "./en";
import { languageKorean } from "./ko";
import { languageVietnamese } from "./vi";
import { languageChineseTraditional } from "./zh-Hant";
import { languageSpanish } from "./es";
import { safeStructuredClone } from "../ts/polyfill";

// 二开版默认使用简体中文：合并英文(保证键完整) → 简体主翻译 → 简体补全。
// 这样登录前界面（如密码框）也直接显示中文。
export let language:typeof languageEnglish & typeof languageChineseExtra = merge(
    safeStructuredClone(languageEnglish),
    languageChinese,
    languageChineseExtra,
)


export function changeLanguage(lang:string){
    if(lang === 'cn'){
        language = merge(safeStructuredClone(languageEnglish), languageChinese, languageChineseExtra)
    }
    else if(lang === 'de'){
        language = merge(safeStructuredClone(languageEnglish), languageChineseExtra, languageGerman)
    }
    else if(lang === 'ko'){
        language = merge(safeStructuredClone(languageEnglish), languageChineseExtra, languageKorean)
    }
    else if(lang === 'vi'){
        language = merge(safeStructuredClone(languageEnglish), languageChineseExtra, languageVietnamese)
    }
    else if(lang === 'zh-Hant'){
        language = merge(safeStructuredClone(languageEnglish), languageChineseExtra, languageChineseTraditional)
    }
    else if(lang === 'es'){
        language = merge(safeStructuredClone(languageEnglish), languageChineseExtra, languageSpanish)
    }
    else{
        language = merge(safeStructuredClone(languageEnglish), languageChineseExtra)
    }
    try { localStorage.setItem('risu-lang', lang) } catch {}
}

// BCP 47 locale for Intl APIs. Risu uses its own short codes internally
// (e.g. 'cn'/'zh-Hant') which are not valid IETF tags, so map to canonical
// forms when passing to Intl.RelativeTimeFormat / Intl.DateTimeFormat.
const LOCALE_MAP: Record<string, string> = {
    en: 'en',
    ko: 'ko',
    cn: 'zh-CN',
    'zh-Hant': 'zh-TW',
    de: 'de',
    vi: 'vi',
    es: 'es',
}

export function getCurrentLocale(): string {
    let cached: string | null = null
    try { cached = localStorage.getItem('risu-lang') } catch {}
    if (cached && LOCALE_MAP[cached]) return LOCALE_MAP[cached]
    return (typeof navigator !== 'undefined' && navigator.language) || 'en'
}

/**
 * Apply cached language before DB is loaded.
 * This allows pre-auth UI (e.g. password prompt) to appear in the user's language.
 */
export function applyEarlyLanguage(){
    try {
        const cached = localStorage.getItem('risu-lang')
        if(cached) changeLanguage(cached)
    } catch {}
}
