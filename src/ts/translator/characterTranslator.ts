import { alertStore, notifyError } from "../alert";
import { globalFetch } from "../globalApi.svelte";
import type { OpenAIChat } from "../process/index.svelte";
import { requestChatData, type requestDataResponse } from "../process/request/request";
import { getDatabase, type character, type loreBook } from "../storage/database.svelte";
import { jsonOutputTrimmer } from "../util";
import { safeStructuredClone } from "../polyfill";

type TranslatableCharacterFields = {
    name?: string;
    nickname?: string;
    desc?: string;
    firstMessage?: string;
    personality?: string;
    scenario?: string;
    systemPrompt?: string;
    creatorNotes?: string;
    notes?: string;
    exampleMessage?: string;
    replaceGlobalNote?: string;
    additionalText?: string;
    alternateGreetings?: string[];
    group_only_greetings?: string[];
    globalLore?: {
        comment?: string;
        content?: string;
    }[];
}

type SingleLorePayload = {
    globalLore: {
        comment?: string;
        content?: string;
    };
}

type TextChunkPayload = {
    text: string;
}

type CharacterTranslationPayload = TranslatableCharacterFields | SingleLorePayload | TextChunkPayload;

const longTextChunkSize = 2400;
const characterTranslationRequestTimeoutMs = 120000;
const maxConsecutiveCharacterTranslationFailures = 2;

type CharacterTranslationRunState = {
    consecutiveFailures: number;
    successfulRequests: number;
    stopped: boolean;
}

const characterTranslatorFields: (keyof TranslatableCharacterFields)[] = [
    "name",
    "nickname",
    "desc",
    "firstMessage",
    "personality",
    "scenario",
    "systemPrompt",
    "creatorNotes",
    "notes",
    "exampleMessage",
    "replaceGlobalNote",
    "additionalText",
    "alternateGreetings",
    "group_only_greetings",
    "globalLore",
];

function hasText(value: unknown): boolean {
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.some(hasText);
    return false;
}

function pickCharacterFields(char: character): TranslatableCharacterFields {
    const fields: TranslatableCharacterFields = {};

    for (const key of characterTranslatorFields) {
        if (key === "globalLore") {
            const lore = char.globalLore ?? [];
            const pickedLore = lore.map((entry) => ({
                comment: entry.comment ?? "",
                content: entry.content ?? "",
            }));
            if (pickedLore.some((entry) => hasText(entry.comment) || hasText(entry.content))) {
                fields.globalLore = pickedLore;
            }
            continue;
        }

        const value = (char as unknown as Record<string, unknown>)[key];
        if (hasText(value)) {
            (fields as Record<string, unknown>)[key] = value;
        }
    }

    return fields;
}

function extractJsonObject(text: string): string {
    const trimmed = jsonOutputTrimmer(text);
    try {
        JSON.parse(trimmed);
        return trimmed;
    } catch {
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return trimmed.slice(start, end + 1);
        }
        return trimmed;
    }
}

function stripReasoningBlocks(text: string): string {
    return text
        .replace(/<Thoughts>[\s\S]*?<\/Thoughts>/g, "")
        .replace(/<think>[\s\S]*?<\/think>/gi, "")
        .trim();
}

function unwrapCodeBlock(text: string): string {
    const trimmed = text.trim();
    const match = trimmed.match(/^```(?:json|JSON)?\s*([\s\S]*?)\s*```$/);
    return match ? match[1].trim() : trimmed;
}

function readModelContent(value: unknown): string | null {
    if (typeof value === "string") return value;
    if (!value || typeof value !== "object") return null;

    const data = value as Record<string, unknown>;
    const choices = data.choices;
    if (Array.isArray(choices) && choices.length > 0) {
        const firstChoice = choices[0] as Record<string, unknown>;
        const message = firstChoice?.message as Record<string, unknown> | undefined;
        const messageContent = message?.content;
        if (typeof messageContent === "string") return messageContent;
        if (Array.isArray(messageContent)) {
            const text = messageContent
                .map((part) => {
                    if (typeof part === "string") return part;
                    if (part && typeof part === "object") {
                        const item = part as Record<string, unknown>;
                        return typeof item.text === "string" ? item.text : "";
                    }
                    return "";
                })
                .join("");
            if (text.trim()) return text;
        }
        if (typeof firstChoice?.text === "string") return firstChoice.text;
    }

    const output = data.output;
    if (Array.isArray(output)) {
        const text = output
            .flatMap((item) => {
                if (!item || typeof item !== "object") return [];
                const content = (item as Record<string, unknown>).content;
                return Array.isArray(content) ? content : [];
            })
            .map((part) => {
                if (!part || typeof part !== "object") return "";
                const item = part as Record<string, unknown>;
                return typeof item.text === "string" ? item.text : "";
            })
            .join("");
        if (text.trim()) return text;
    }

    if (typeof data.content === "string") return data.content;
    if (typeof data.text === "string") return data.text;
    if (typeof data.translation === "string") return data.translation;
    if (typeof data.translated === "string") return data.translated;
    if (data.result !== undefined) return readModelContent(data.result);
    if (data.data !== undefined) return readModelContent(data.data);

    return null;
}

function normalizeTranslationResultText(raw: string): string {
    const cleaned = unwrapCodeBlock(stripReasoningBlocks(jsonOutputTrimmer(raw)));
    try {
        const parsed = JSON.parse(cleaned);
        const modelContent = readModelContent(parsed);
        if (modelContent !== null && modelContent !== cleaned) {
            return normalizeTranslationResultText(modelContent);
        }
    } catch {
        // The normal successful path is plain model text, not a transport JSON object.
    }
    return cleaned;
}

function readTextPayload(parsed: unknown): string | null {
    if (typeof parsed === "string") return parsed;
    if (!parsed || typeof parsed !== "object") return null;

    const data = parsed as Record<string, unknown>;
    for (const key of ["text", "translation", "translated", "content", "result"]) {
        const value = data[key];
        if (typeof value === "string") return value;
        const nested = readTextPayload(value);
        if (nested !== null) return nested;
    }
    return null;
}

function splitLongText(text: string): string[] {
    if (text.length <= longTextChunkSize) return [text];

    const chunks: string[] = [];
    let current = "";
    const parts = text.split(/(\n{2,})/);

    for (const part of parts) {
        if (current.length + part.length <= longTextChunkSize) {
            current += part;
            continue;
        }
        if (current) {
            chunks.push(current);
            current = "";
        }
        if (part.length <= longTextChunkSize) {
            current = part;
            continue;
        }
        for (let i = 0; i < part.length; i += longTextChunkSize) {
            chunks.push(part.slice(i, i + longTextChunkSize));
        }
    }

    if (current) chunks.push(current);
    return chunks;
}

function normalizeStringArray(value: unknown): string[] | null {
    if (!Array.isArray(value)) return null;
    return value.filter((item): item is string => typeof item === "string");
}

function applyTranslatedFields(char: character, translated: unknown): character {
    if (!translated || typeof translated !== "object") {
        throw new Error("Invalid translated character payload");
    }

    const data = translated as TranslatableCharacterFields;
    const next = safeStructuredClone(char);

    for (const key of characterTranslatorFields) {
        if (!(key in data)) continue;

        if (key === "alternateGreetings" || key === "group_only_greetings") {
            const arr = normalizeStringArray(data[key]);
            if (arr) {
                (next as unknown as Record<string, unknown>)[key] = arr;
            }
            continue;
        }

        if (key === "globalLore") {
            if (!Array.isArray(data.globalLore)) continue;
            next.globalLore = (next.globalLore ?? []).map((entry: loreBook, index) => {
                const translatedEntry = data.globalLore?.[index];
                if (!translatedEntry || typeof translatedEntry !== "object") return entry;
                return {
                    ...entry,
                    comment: typeof translatedEntry.comment === "string" ? translatedEntry.comment : entry.comment,
                    content: typeof translatedEntry.content === "string" ? translatedEntry.content : entry.content,
                };
            });
            continue;
        }

        const value = data[key];
        if (typeof value === "string") {
            (next as unknown as Record<string, unknown>)[key] = value;
        }
    }

    return next;
}

function isAuthOrConfigError(result: requestDataResponse): boolean {
    if (result.type !== "fail") return false;
    const message = result.result.toLowerCase();
    return (
        message.includes("missing authentication")
        || message.includes("unauthorized")
        || message.includes("invalid api key")
        || message.includes("api key")
        || message.includes("authentication")
        || message.includes("auth")
        || message.includes("permission_denied")
        || message.includes("unregistered callers")
        // When the translate/auxiliary model is not configured (empty model id),
        // the browser throws a "Failed to fetch" TypeError (no valid URL to
        // call). Treat this as a config gap so we fall back to the main model.
        || message.includes("failed to fetch")
    );
}

function getPresetCredential(preset: NonNullable<ReturnType<typeof getDatabase>["modelPresets"]>[number]): string {
    const db = getDatabase();
    if (preset.apiKeyRef) {
        const key = db.apiKeyPool?.[preset.apiKeyRef]?.key;
        if (key) return key;
    }
    if (typeof preset.inlineCredential === "string" && preset.inlineCredential.trim()) {
        return preset.inlineCredential;
    }
    if (preset.inlineCredential && typeof preset.inlineCredential === "object") {
        const key = (preset.inlineCredential as Record<string, unknown>).apiKey;
        if (typeof key === "string" && key.trim()) return key;
    }
    const value = preset.userValues?.apiKey;
    return typeof value === "string" ? value : "";
}

function getConfiguredDeepSeek() {
    const db = getDatabase();
    const preset = (db.modelPresets ?? []).find((item) => {
        const provider = item.profileSnapshot?.providerBaseId ?? item.sourceProfile?.profileId ?? "";
        return provider.includes("deepseek") && !!getPresetCredential(item);
    });

    if (preset) {
        const model = typeof preset.userValues?.modelId === "string"
            ? preset.userValues.modelId
            : preset.profileSnapshot?.modelId;
        const url = preset.profileSnapshot?.endpoint?.url || "https://api.deepseek.com/chat/completions";
        return {
            key: getPresetCredential(preset),
            model: model || "deepseek-v4-flash",
            url,
        };
    }

    const classicKey = db.OaiCompAPIKeys?.deepseek;
    if (classicKey?.trim()) {
        return {
            key: classicKey,
            model: "deepseek-v4-flash",
            url: "https://api.deepseek.com/chat/completions",
        };
    }

    return null;
}

async function requestConfiguredDeepSeek(formated: OpenAIChat[], abortSignal?: AbortSignal): Promise<requestDataResponse | null> {
    if (abortSignal?.aborted) return null;
    const config = getConfiguredDeepSeek();
    if (!config) return null;

    const res = await globalFetch(config.url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${config.key}`,
            "Content-Type": "application/json",
        },
        body: {
            model: config.model,
            messages: formated.map((item) => ({
                role: item.role,
                content: item.content,
            })),
            max_tokens: 8192,
            stream: false,
        },
        interceptor: "openai",
        abortSignal,
        requestTimeoutMs: characterTranslationRequestTimeoutMs,
    });

    if (!res.ok) {
        return {
            type: "fail",
            result: `Configured DeepSeek request failed: ${typeof res.data === "string" ? res.data : JSON.stringify(res.data)}`,
        };
    }

    const content = res.data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
        return {
            type: "fail",
            result: `Configured DeepSeek returned an invalid response: ${JSON.stringify(res.data)}`,
        };
    }
    if (res.data?.choices?.[0]?.finish_reason === "length") {
        return {
            type: "fail",
            result: "Configured DeepSeek response was truncated by max_tokens.",
        };
    }

    return {
        type: "success",
        result: content,
    };
}

/**
 * Check whether the sub-model path is usable. Returns false when no model is
 * configured (classic mode with empty id, or model-preset-binding mode with
 * no preset bound) — the caller should skip this mode and use the main model.
 */
function hasTranslateModelConfigured(): boolean {
    const db = getDatabase();
    // Classic mode: subModel is a model id string
    if (db.subModel && db.subModel.trim().length > 0) return true;
    // Model-preset-binding: a preset may be bound from the model preset system
    if (db.seperateModelsForAxModels && db.seperateModels?.['translate']) return true;
    return false;
}

async function requestCharacterTranslation(formated: OpenAIChat[], abortSignal?: AbortSignal): Promise<requestDataResponse> {
    const db = getDatabase();
    const requestArg = {
        formated,
        bias: {},
        useStreaming: false,
        noMultiGen: true,
        maxTokens: 8192,
        blockPlugins: true,
        tools: [],
    };

    // Translation is a utility — bypass per-chat model-preset binding.
    // If a main model is configured, use it directly regardless of per-chat
    // binding status. The sub/translate model is a nice-to-have; skip it
    // when the main model alone is sufficient.
    const mainModelId = db.aiModel;
    if (mainModelId && mainModelId.trim().length > 0) {
        const result = await requestChatData(
            { ...requestArg, staticModel: mainModelId },
            "model",
            abortSignal,
        );
        if (result.type !== "fail" || result.noRetry) {
            return result;
        }
        // Fall through to configured DeepSeek
        const deepSeekResult = await requestConfiguredDeepSeek(formated, abortSignal);
        if (deepSeekResult?.type === "success") return deepSeekResult;
        return {
            ...result,
            result: `Main model (${mainModelId}) failed: ${result.result}. DeepSeek fallback also failed.`,
        };
    }

    // No main model — try sub/translate model
    if (hasTranslateModelConfigured()) {
        const translateResult = await requestChatData(requestArg, "translate", abortSignal);
        if (!isAuthOrConfigError(translateResult)) return translateResult;
    }

    // Last resort: DeepSeek
    const deepSeekResult = await requestConfiguredDeepSeek(formated, abortSignal);
    if (deepSeekResult?.type === "success") return deepSeekResult;

    return {
        type: "fail",
        noRetry: true,
        result: "No AI model configured. Please configure a model in Settings.",
    };
}

async function withCharacterTranslationTimeout<T>(run: (abortSignal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), characterTranslationRequestTimeoutMs);
    try {
        return await run(controller.signal);
    } finally {
        clearTimeout(timeout);
    }
}

function buildTranslationMessages(payload: CharacterTranslationPayload): OpenAIChat[] {
    return [
        {
            role: "system",
            content: [
                "You translate imported roleplay character cards into Simplified Chinese.",
                "Preserve meaning, roleplay tone, markdown, line breaks, formatting, placeholders, variables, and tags.",
                "Do not translate template variables such as {{char}}, {{user}}, <START>, XML-like tags, code blocks, regex, URLs, or asset identifiers.",
                "Return ONLY valid JSON with exactly the same keys and compatible value types.",
            ].join("\n"),
        },
        {
            role: "user",
            content: JSON.stringify(payload, null, 2),
        },
    ];
}

async function translatePayload(payload: CharacterTranslationPayload): Promise<unknown> {
    const formated = buildTranslationMessages(payload);
    const result = await withCharacterTranslationTimeout((abortSignal) => requestCharacterTranslation(formated, abortSignal));

    if (result.type === "fail") {
        throw new Error(result.result);
    }
    if (result.type === "streaming") {
        throw new Error("Unexpected translation response type");
    }

    const rawResult = result.type === "multiline"
        ? result.result.map(([, content]) => content).join("\n")
        : result.result;
    const normalizedResult = normalizeTranslationResultText(rawResult);
    try {
        const parsed = JSON.parse(extractJsonObject(normalizedResult));
        if ("text" in payload) {
            const text = readTextPayload(parsed);
            return { text: text ?? normalizedResult.trim() };
        }
        return parsed;
    } catch (error) {
        if ("text" in payload) {
            return { text: normalizedResult.trim() };
        }
        notifyError(`Character card translation result is not valid JSON: ${error}`);
        throw error;
    }
}

async function translateStringValue(text: string, runState: CharacterTranslationRunState): Promise<string> {
    if (!text.trim()) return text;
    if (runState.stopped) return text;
    const chunks = splitLongText(text);
    const translatedChunks: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
        if (runState.stopped) {
            translatedChunks.push(...chunks.slice(i));
            break;
        }

        alertStore.set({
            type: "wait",
            msg: "正在智能翻译角色卡",
            submsg: `角色卡越大需要时间越久哦！请耐心等待。\n正在处理长文本片段 ${i + 1}/${chunks.length}`,
        });
        try {
            const result = await translatePayload({ text: chunks[i] });
            const translated = (result as TextChunkPayload)?.text;
            translatedChunks.push(typeof translated === "string" ? translated : chunks[i]);
            runState.consecutiveFailures = 0;
            runState.successfulRequests += 1;
        } catch (error) {
            console.warn("Character card text chunk translation failed, preserving original chunk", error);
            translatedChunks.push(chunks[i]);
            runState.consecutiveFailures += 1;
            if (runState.consecutiveFailures >= maxConsecutiveCharacterTranslationFailures) {
                runState.stopped = true;
            }
        }
    }

    return translatedChunks.join("");
}

async function translateFieldsInChunks(fields: TranslatableCharacterFields): Promise<TranslatableCharacterFields> {
    const translated: TranslatableCharacterFields = {};
    const runState: CharacterTranslationRunState = {
        consecutiveFailures: 0,
        successfulRequests: 0,
        stopped: false,
    };

    const activeFields = characterTranslatorFields.filter((key) => key in fields);
    for (let fieldIndex = 0; fieldIndex < activeFields.length; fieldIndex++) {
        if (runState.stopped) break;
        const key = activeFields[fieldIndex];
        if (!(key in fields)) continue;

        alertStore.set({
            type: "wait",
            msg: "正在智能翻译角色卡",
            submsg: `角色卡越大需要时间越久哦！请耐心等待。\n正在处理字段 ${fieldIndex + 1}/${activeFields.length}`,
        });

        if (key === "globalLore") {
            if (!Array.isArray(fields.globalLore)) continue;
            translated.globalLore = [];
            for (let loreIndex = 0; loreIndex < fields.globalLore.length; loreIndex++) {
                const entry = fields.globalLore[loreIndex];
                alertStore.set({
                    type: "wait",
                    msg: "正在智能翻译角色卡",
                    submsg: `角色卡越大需要时间越久哦！请耐心等待。\n正在处理世界书 ${loreIndex + 1}/${fields.globalLore.length}`,
                });
                const nextEntry = { ...entry };
                if (typeof entry.comment === "string") {
                    nextEntry.comment = await translateStringValue(entry.comment, runState);
                }
                if (typeof entry.content === "string") {
                    nextEntry.content = await translateStringValue(entry.content, runState);
                }
                translated.globalLore.push(nextEntry);
                if (runState.stopped) break;
            }
            continue;
        }

        const sourceValue = fields[key];
        if (typeof sourceValue === "string") {
            (translated as Record<string, unknown>)[key] = await translateStringValue(sourceValue, runState);
            continue;
        }
        if (Array.isArray(sourceValue)) {
            const nextItems: unknown[] = [];
            for (let itemIndex = 0; itemIndex < sourceValue.length; itemIndex++) {
                if (runState.stopped) {
                    nextItems.push(...sourceValue.slice(itemIndex));
                    break;
                }
                const item = sourceValue[itemIndex];
                if (typeof item !== "string") {
                    nextItems.push(item);
                    continue;
                }

                alertStore.set({
                    type: "wait",
                    msg: "正在智能翻译角色卡",
                    submsg: `角色卡越大需要时间越久哦！请耐心等待。\n正在处理字段 ${fieldIndex + 1}/${activeFields.length}，条目 ${itemIndex + 1}/${sourceValue.length}`,
                });
                nextItems.push(await translateStringValue(item, runState));
            }
            (translated as Record<string, unknown>)[key] = nextItems;
            continue;
        }

        try {
            const result = await translatePayload({ [key]: sourceValue } as TranslatableCharacterFields);
            const value = (result as TranslatableCharacterFields)[key];
            if (value !== undefined) {
                (translated as Record<string, unknown>)[key] = value;
            }
            runState.consecutiveFailures = 0;
            runState.successfulRequests += 1;
        } catch (error) {
            console.warn("Character card field translation failed, preserving original field", key, error);
            runState.consecutiveFailures += 1;
            if (runState.consecutiveFailures >= maxConsecutiveCharacterTranslationFailures) {
                runState.stopped = true;
            }
        }
    }

    if (runState.successfulRequests === 0) {
        throw new Error("翻译接口超时或不可用，未成功翻译任何字段");
    }

    return translated;
}

export async function translateCharacterCardToChinese(char: character): Promise<character> {
    const fields = pickCharacterFields(char);
    if (Object.keys(fields).length === 0) {
        return char;
    }

    alertStore.set({
        type: "wait",
        msg: "正在智能翻译角色卡",
        submsg: "角色卡越大需要时间越久哦！请耐心等待。",
    });

    const translated = await translateFieldsInChunks(fields);

    return applyTranslatedFields(char, translated);
}
