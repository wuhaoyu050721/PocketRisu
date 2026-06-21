<script lang="ts">
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import { risuChatParser } from 'src/ts/parser/parser.svelte';
    import { language } from 'src/lang';
    import { sleep } from 'src/ts/util';
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";
    let input = $state("");
    let output = $state("");
    const onInput = async () => {
        try {
            await sleep(1)
            output = risuChatParser(input, {
                consistantChar: true,
            })
        } catch (e) {
            output = `错误：${e}`
        }
    }
</script>

<PlaygroundToolFrame title={language.syntax} description="预览聊天语法解析和高亮后的结果。">
    <div class="pg-grid-2">
        <section class="pg-section">
            <span class="pg-section-title">输入</span>
            <TextAreaInput highlight onInput={onInput} bind:value={input} optimaizedInput={false} />
        </section>

        <section class="pg-section">
            <span class="pg-section-title">结果</span>
            <TextAreaInput value={output} />
        </section>
    </div>
</PlaygroundToolFrame>
