<script lang="ts">
    import { encodeWithTokenizer, tokenizerList } from "src/ts/tokenizer";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import { language } from 'src/lang';
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";

    let input = $state("");
    let output = $state("");
    let outputLength = $state(0);
    let time = $state(0);
    let selectedTokenizer = $state("tik");

    const onInput = async () => {
        try {
            const start = performance.now();
            const tokenized = await encodeWithTokenizer(input, selectedTokenizer);
            time = performance.now() - start;
            const tokenizedNumArray = Array.from(tokenized)
            outputLength = tokenizedNumArray.length;
            output = JSON.stringify(tokenizedNumArray);
        } catch (e) {
            output = `错误：${e}`
        }
    }

    const onTokenizerChange = () => {
        if (input) {
            onInput();
        }
    }
</script>

<PlaygroundToolFrame title={language.tokenizer} description="快速估算文本 Token 数，并查看分词后的序列。">
    <section class="pg-section">
        <span class="pg-section-title">分词器</span>
        <SelectInput bind:value={selectedTokenizer} onchange={onTokenizerChange}>
            {#each tokenizerList as [value, label]}
                <option {value} class="bg-bgcolor">{label}</option>
            {/each}
        </SelectInput>
    </section>

    <div class="pg-grid-2">
        <section class="pg-section">
            <span class="pg-section-title">输入文本</span>
            <TextAreaInput onInput={onInput} bind:value={input} optimaizedInput={false} />
        </section>

        <section class="pg-section">
            <span class="pg-section-title">Token 序列</span>
            <TextAreaInput value={output} />
            <div class="pg-actions">
                <span class="pg-badge">{outputLength} {language.tokens}</span>
                <span class="pg-badge">{time.toFixed(2)} ms</span>
            </div>
        </section>
    </div>
</PlaygroundToolFrame>
