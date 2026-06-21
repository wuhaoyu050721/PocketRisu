<script lang="ts">
    import { language } from "src/lang";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { HypaProcesser } from "src/ts/process/memory/hypamemory";
    import { DBState } from "src/ts/stores.svelte";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";

    let query = $state("");
    let model = $state("MiniLM");
    let customEmbeddingUrl = $state("");
    let data:string[] = $state([]);
    let dataresult:[string, number][] = $state([]);
    let running = $state(false);

    const run = async () => {
        if(running) return;
        running = true;
        const processer = new HypaProcesser(model as any, customEmbeddingUrl);
        await processer.addText(data);
        console.log(processer.vectors)
        dataresult = await processer.similaritySearchScored(query);
        running = false;
    }
</script>

<PlaygroundToolFrame title={language.embedding} description="测试不同嵌入模型的相似度检索结果。">
    <section class="pg-section">
        <span class="pg-section-title">模型设置</span>
        <SelectInput bind:value={model}>
            {#if 'gpu' in navigator}
                <OptionInput value="MiniLMGPU">MiniLM L6 v2 (GPU)</OptionInput>
                <OptionInput value="nomicGPU">Nomic Embed Text v1.5 (GPU)</OptionInput>
                <OptionInput value="bgeSmallEnGPU">BGE Small English (GPU)</OptionInput>
                <OptionInput value="bgem3GPU">BGE Medium 3 (GPU)</OptionInput>
                <OptionInput value="multiMiniLMGPU">Multilingual MiniLM L12 v2 (GPU)</OptionInput>
                <OptionInput value="bgeM3KoGPU">BGE Medium 3 Korean (GPU)</OptionInput>
            {/if}
            <OptionInput value="MiniLM">MiniLM L6 v2 (CPU)</OptionInput>
            <OptionInput value="nomic">Nomic Embed Text v1.5 (CPU)</OptionInput>
            <OptionInput value="bgeSmallEn">BGE Small English (CPU)</OptionInput>
            <OptionInput value="bgem3">BGE Medium 3 (CPU)</OptionInput>
            <OptionInput value="multiMiniLM">Multilingual MiniLM L12 v2 (CPU)</OptionInput>
            <OptionInput value="bgeM3Ko">BGE Medium 3 Korean (CPU)</OptionInput>
            <OptionInput value="openai3small">OpenAI text-embedding-3-small</OptionInput>
            <OptionInput value="openai3large">OpenAI text-embedding-3-large</OptionInput>
            <OptionInput value="ada">OpenAI Ada</OptionInput>
            <OptionInput value="custom">自定义（OpenAI 兼容）</OptionInput>
        </SelectInput>

        {#if model === 'openai3small' || model === 'openai3large' || model === 'ada'}
            <span class="pg-section-title">OpenAI API Key</span>
            <TextInput marginBottom bind:value={DBState.db.supaMemoryKey}/>
        {/if}

        {#if model === "custom"}
            <span class="pg-section-title">自定义服务 URL</span>
            <TextInput marginBottom bind:value={DBState.db.hypaCustomSettings.url}/>
            <span class="pg-section-title">密钥 / 密码</span>
            <TextInput marginBottom bind:value={DBState.db.hypaCustomSettings.key}/>
            <span class="pg-section-title">请求模型</span>
            <TextInput marginBottom bind:value={DBState.db.hypaCustomSettings.model}/>
        {/if}
    </section>

    <div class="pg-grid-2">
        <section class="pg-section">
            <span class="pg-section-title">查询文本</span>
            <TextInput bind:value={query} fullwidth />

            <span class="pg-section-title">数据集</span>
            {#each data as item, i}
                <TextInput bind:value={data[i]} fullwidth marginBottom />
            {/each}
            <div class="pg-actions">
                <Button styled="outlined" onclick={() => {
                    data.push("");
                    data = data
                }}>添加数据</Button>
            </div>
        </section>

        <section class="pg-section">
            <span class="pg-section-title">结果</span>
            {#if dataresult.length === 0}
                <span class="pg-muted">暂无结果</span>
            {/if}
            {#each dataresult as [item, score]}
                <div class="pg-result-row">
                    <span>{item}</span>
                    <span>{score.toFixed(2)}</span>
                </div>
            {/each}
        </section>
    </div>

    <div class="pg-actions">
        <Button className="flex justify-center" size="lg" onclick={() => {
            run()
        }}>
            {#if running}
                <div class="loadmove"></div>
            {:else}
                运行
            {/if}
        </Button>
    </div>
</PlaygroundToolFrame>
