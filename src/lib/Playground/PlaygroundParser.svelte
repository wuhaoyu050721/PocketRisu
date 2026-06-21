<script lang="ts">
    import { ParseMarkdown } from "src/ts/parser/parser.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";
    let input = $state("");
    let output = $state("");
    const onInput = async () => {
        try {
            output = await ParseMarkdown(input)
        } catch (e) {
            output = `错误：${e}`
        }
    }
</script>

<PlaygroundToolFrame title="完整解析器" description="调试 Markdown、指令和格式化后的 HTML 输出。">
    <div class="pg-grid-2">
        <section class="pg-section">
            <span class="pg-section-title">输入</span>
            <TextAreaInput onInput={onInput} bind:value={input} optimaizedInput={false} />
        </section>

        <section class="pg-section">
            <span class="pg-section-title">HTML 输出</span>
            <TextAreaInput value={output} />
        </section>
    </div>
</PlaygroundToolFrame>
