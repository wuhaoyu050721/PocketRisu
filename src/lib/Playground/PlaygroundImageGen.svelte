<script lang="ts">
    import { language } from "src/lang";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { generateAIImage } from "src/ts/process/stableDiff";
    import { createBlankChar } from "src/ts/characters";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";
    import { cubicOut } from "svelte/easing";
    import { fly } from "svelte/transition";
    let prompt = $state("");
    let negPrompt = $state("");
    let img = $state("");
    let generating = $state(false)
    const run = async () => {
        if(generating){
            return
        }
        generating = true
        const gen = await generateAIImage(prompt, createBlankChar(), negPrompt, 'inlay')
        generating = false
        if(gen){
            img = gen
        }
    }
</script>

<PlaygroundToolFrame title={language.imageGeneration} description="输入提示词后直接调用当前图像生成配置。">
    <div class="pg-grid-2 image-gen-content" in:fly={{ y: 14, duration: 260, delay: 120, easing: cubicOut }}>
        <section class="pg-section image-gen-panel" in:fly={{ y: 10, duration: 220, delay: 170, easing: cubicOut }}>
            <span class="pg-section-title">正向提示词</span>
            <TextAreaInput bind:value={prompt} />

            <span class="pg-section-title">负向提示词</span>
            <TextAreaInput bind:value={negPrompt} />

            <div class="pg-actions">
                <Button onclick={run}>
                    {#if generating}
                        <div class="loadmove"></div>
                    {:else}
                        生成图像
                    {/if}
                </Button>
            </div>
        </section>

        <section class="pg-section image-gen-panel" in:fly={{ y: 10, duration: 220, delay: 210, easing: cubicOut }}>
            <span class="pg-section-title">生成结果</span>
            {#if img}
                <img src={img} class="generated-image" alt="生成结果"/>
            {:else}
                <span class="pg-muted">暂无图像</span>
            {/if}
        </section>
    </div>
</PlaygroundToolFrame>

<style>
    .image-gen-content,
    .image-gen-panel {
        will-change: transform, opacity;
    }

    .generated-image {
        max-width: 100%;
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 18%, transparent);
    }
</style>
