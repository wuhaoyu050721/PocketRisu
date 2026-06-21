<script lang="ts">
    import { Template } from '@huggingface/jinja';
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";
    let input = $state("");
    let json = $state(JSON.stringify({
            "messages": [{
            "role": "user",
            "content": "你好，我是用户。"
        }, {
            "role": "assistant",
            "content": "你好，我是助手。"
        }],
        "eos_token": "",
        "bos_token": ""
    }, null, 4))
    let output = $state("");
    const onInput = () => {
        try {
            const template = new Template(input);
            const values = JSON.parse(json);
            output = template.render(values);
        } catch (e) {
            //log error stack of e
            console.error(e.stack);
            output = `错误：${e}`
        }
    }
</script>

<PlaygroundToolFrame title="Jinja" description="测试模板变量、条件和渲染结果。">
    <div class="pg-grid-2">
        <section class="pg-section">
            <span class="pg-section-title">Jinja 模板</span>
            <TextAreaInput onInput={onInput} bind:value={input} />
        </section>

        <section class="pg-section">
            <span class="pg-section-title">数据（JSON）</span>
            <TextAreaInput onInput={onInput} bind:value={json} />
        </section>
    </div>

    <section class="pg-section">
        <span class="pg-section-title">渲染结果</span>
        <TextAreaInput value={output} />
    </section>
</PlaygroundToolFrame>
