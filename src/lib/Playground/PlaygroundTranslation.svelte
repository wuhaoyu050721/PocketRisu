
<script lang="ts">
    import { language } from "src/lang";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { clearLLMCache, runTranslator } from "src/ts/translator/translator";
    import Button from "../UI/GUI/Button.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import { getLanguageCodes } from "src/ts/globalApi.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import { tokenize } from "src/ts/tokenizer";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";


    const userPreferedLang = navigator.language.split('-')[0]

    let r = $state('')
    let sourceLang = $state('en')
    let output = $state('')
    let outputLang = $state(userPreferedLang)
    let loading = $state(false)
    let bulk = $state(false)
    let keepContext = $state(false)
    let bulkProgressText = $state('')
</script>
<PlaygroundToolFrame title={language.translator} description="测试单段或批量文本翻译，支持保留前文上下文。">
    <div class="pg-grid-2">
        <section class="pg-section">
            <span class="pg-section-title">{language.sourceLanguage}</span>
            <SelectInput bind:value={sourceLang}>
                {#each getLanguageCodes() as lang}
                    <OptionInput value={lang.code}>{lang.name}</OptionInput>
                {/each}
            </SelectInput>
            <TextAreaInput bind:value={r} />
        </section>

        <section class="pg-section">
            <span class="pg-section-title">{language.translatorLanguage}</span>
            <SelectInput bind:value={outputLang}>
                {#each getLanguageCodes() as lang}
                    <OptionInput value={lang.code}>{lang.name}</OptionInput>
                {/each}
            </SelectInput>
            <TextAreaInput value={output} />
        </section>
    </div>

    <section class="pg-section">
        <span class="pg-section-title">翻译选项</span>
        <div class="pg-actions">
            <CheckInput bind:check={bulk}>
                批量翻译
            </CheckInput>
            {#if bulk}
                <CheckInput bind:check={keepContext}>
                    保留上下文
                </CheckInput>
            {/if}
        </div>

        <div class="pg-actions">
            <Button onclick={async () => {
                bulkProgressText = ''
                if(bulk){

                    const format = () => {
                        if(jsonMode){
                            const d = JSON.parse(r)
                            for(let i = 0; i < d.length; i++){
                                if(translatedChunks[i]){
                                    d[i].text = translatedChunks[i]
                                }
                            }
                            output = JSON.stringify(d, null, 2)
                            return
                        }

                        output = translatedChunks.join('\n\n')
                    }
                    let preChunks = []
                    let prContexts:string[] = []
                    let translatedChunks: string[] = []
                    let jsonMode = false
                    if(loading){
                        return
                    }
                    loading = true
                    try {
                        const d = JSON.parse(r.trim())
                        if(Array.isArray(d)){
                            preChunks = d.map((x: { text: string }) => (x?.text ?? ""))
                        }
                        jsonMode = true
                    } catch (error) {
                        preChunks = r.split('\n\n')
                        jsonMode = false
                    }

                    let pvc = 'Previous Content is the content that was translated before the current content. This is used to keep the context of the translation. do not retranslate or return it.'

                    for(let i = 0; i < preChunks.length; i++){
                        try {
                            if(preChunks[i].trim().length === 0){
                                translatedChunks.push(preChunks[i])
                                continue
                            }

                            bulkProgressText = `(${i + 1} / ${preChunks.length})`

                            if(prContexts.length > 10){
                                prContexts.shift()
                            }


                            const prContext = prContexts.length > 0 ? prContexts.join('\n\n') : ''

                            if(prContext){
                                bulkProgressText += `（前文 ${await tokenize(prContext)} tokens）`
                            }

                            const translatedChunk = await runTranslator(preChunks[i], false, sourceLang, outputLang, {
                                translatorNote: prContext ? `<Previous Content>${prContext.trim()}</Previous Content>\n${pvc}` : ""
                            })
                            if(keepContext){
                                prContexts.push(`<Original>${preChunks[i]}</Original><Translated>${translatedChunk}</Translated>`)
                            }
                            translatedChunks.push(translatedChunk)
                        } catch (error) {
                            console.error(error)
                            translatedChunks.push(preChunks[i])
                        }

                        try {
                            format()
                        } catch (error) {
                            
                        }
                    }

                    format()
                    loading = false
                    return
                }
                try {
                    if(loading){
                        return
                    }
                    loading = true
                    output = await runTranslator(r, false, sourceLang, outputLang)   
                    loading = false
                } catch (error) {
                    console.error(error)
                    loading = false
                }
            }}>
                {#if loading}
                    翻译中... {bulkProgressText}
                {:else}
                    开始翻译
                {/if}
            </Button>
            <Button onclick={() => {
                clearLLMCache()
            }}>
                清空缓存
            </Button>
        </div>
    </section>
</PlaygroundToolFrame>
