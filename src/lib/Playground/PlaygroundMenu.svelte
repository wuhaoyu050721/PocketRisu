<script lang="ts">
    import {
        ArrowLeft,
        BookOpenText,
        Braces,
        Code2,
        FileCode2,
        FileText,
        Image,
        Languages,
        Network,
        ScanText,
        SearchCode,
        Sparkles,
        Subtitles,
        WandSparkles,
    } from "@lucide/svelte";
    import { language } from "src/lang";
    import { PlaygroundStore, SizeStore } from "src/ts/stores.svelte";
    import PlaygroundEmbedding from "./PlaygroundEmbedding.svelte";
    import PlaygroundTokenizer from "./PlaygroundTokenizer.svelte";
    import PlaygroundJinja from "./PlaygroundJinja.svelte";
    import PlaygroundSyntax from "./PlaygroundSyntax.svelte";
    import PlaygroundImageGen from "./PlaygroundImageGen.svelte";
    import PlaygroundParser from "./PlaygroundParser.svelte";
    import ToolConversion from "./ToolConversion.svelte";
    import PlaygroundSubtitle from "./PlaygroundSubtitle.svelte";
    import PlaygroundImageTrans from "./PlaygroundImageTrans.svelte";
    import PlaygroundTranslation from "./PlaygroundTranslation.svelte";
    import PlaygroundMcp from "./PlaygroundMCP.svelte";
    import PlaygroundDocs from "./PlaygroundDocs.svelte";
    import PlaygroundInlayExplorer from "./PlaygroundInlayExplorer.svelte";
    import type { Component } from "svelte";
    import { cubicOut } from "svelte/easing";
    import { fade, fly } from "svelte/transition";

    type PlaygroundTool = {
        id: number;
        title: string;
        description: string;
        group: "创作" | "文本" | "开发" | "资源";
        badge: string;
        icon: Component;
        featured?: boolean;
    };

    let easterEggTouch = $state(0);

    const tools: PlaygroundTool[] = [
        {
            id: 13,
            title: "CBS 文档",
            description: "查看脚本和模板语法文档，快速对照可用指令。",
            group: "开发",
            badge: "文档",
            icon: BookOpenText,
        },
        {
            id: 3,
            title: language.embedding,
            description: "检查文本向量和嵌入结果，辅助调试检索相关能力。",
            group: "文本",
            badge: "向量",
            icon: Network,
        },
        {
            id: 4,
            title: language.tokenizer,
            description: "估算文本 token，拆解上下文预算和提示词长度。",
            group: "文本",
            badge: "Token",
            icon: ScanText,
        },
        {
            id: 5,
            title: language.syntax,
            description: "验证语法高亮和代码片段展示效果。",
            group: "开发",
            badge: "代码",
            icon: Code2,
        },
        {
            id: 6,
            title: "Jinja",
            description: "测试模板变量、条件和渲染输出。",
            group: "开发",
            badge: "模板",
            icon: Braces,
        },
        {
            id: 7,
            title: language.imageGeneration,
            description: "生成图像提示词并快速查看出图结果。",
            group: "创作",
            badge: "图像",
            icon: Sparkles,
            featured: true,
        },
        {
            id: 8,
            title: "解析器",
            description: "解析文本、标记和格式化流程，定位输出问题。",
            group: "开发",
            badge: "解析",
            icon: SearchCode,
        },
        {
            id: 9,
            title: language.subtitles,
            description: "处理字幕识别、翻译和时间轴相关任务。",
            group: "创作",
            badge: "媒体",
            icon: Subtitles,
        },
        {
            id: 10,
            title: language.imageTranslation,
            description: "从图片中识别文本并生成翻译覆盖方案。",
            group: "创作",
            badge: "OCR",
            icon: Image,
        },
        {
            id: 11,
            title: language.translator,
            description: "批量分段翻译文本，检查上下文衔接效果。",
            group: "文本",
            badge: "LLM",
            icon: Languages,
        },
        {
            id: 12,
            title: "MCP",
            description: "测试 MCP 工具链和外部能力连接。",
            group: "开发",
            badge: "工具",
            icon: WandSparkles,
        },
        {
            id: 14,
            title: language.playground.inlayExplorer,
            description: "浏览内嵌资源，检查素材索引、引用和预览。",
            group: "资源",
            badge: "资源",
            icon: FileText,
        },
        {
            id: 101,
            title: language.promptConvertion,
            description: "转换工具调用和提示词格式，方便迁移预设。",
            group: "开发",
            badge: "转换",
            icon: FileCode2,
        },
    ];

    const groups = ["创作", "文本", "开发", "资源"] as const;
    const currentTool = $derived(tools.find((tool) => tool.id === $PlaygroundStore));

    function openTool(tool: PlaygroundTool) {
        PlaygroundStore.set(tool.id);
    }

    function backToMenu() {
        PlaygroundStore.set(1);
    }

    const homeExit = { duration: 180, easing: cubicOut };
    const toolEnter = { y: 18, duration: 260, delay: 80, easing: cubicOut };
    const toolExit = { y: -10, duration: 160, easing: cubicOut };
</script>

<div class="playground-shell">
    {#if $PlaygroundStore === 1}
        <section
            class="playground-home"
            in:fly={{ y: -12, duration: 220, delay: 70, easing: cubicOut }}
            out:fade={homeExit}
        >
            <div class="playground-hero">
                <div class="hero-copy">
                    <div class="eyebrow">
                        <Sparkles size={16} />
                        <span>实验场</span>
                    </div>
                    <h2>{language.playground.playground}</h2>
                    <p>把常用调试、转换、翻译和生成工具集中在一个工作台里，打开即用。</p>
                </div>

                <div class="hero-panel">
                    <span class="panel-label">常用入口</span>
                    <p class="hero-panel-copy">选择下方工具处理调试、转换、翻译、图像和资源检查任务。</p>
                </div>
            </div>

            <div class="featured-grid">
                {#each tools.filter((tool) => tool.featured) as tool}
                    {@const Icon = tool.icon}
                    <button class="featured-card" onclick={() => openTool(tool)}>
                        <span class="card-icon"><Icon size={22} /></span>
                        <span class="card-content">
                            <span class="card-title">{tool.title}</span>
                            <span class="card-desc">{tool.description}</span>
                        </span>
                    </button>
                {/each}
            </div>

            <div class="tool-groups">
                {#each groups as group}
                    <section class="tool-section">
                        <div class="section-heading">
                            <h3>{group}</h3>
                            <span>{tools.filter((tool) => tool.group === group).length} 个工具</span>
                        </div>
                        <div class="tool-grid">
                            {#each tools.filter((tool) => tool.group === group) as tool}
                                {@const Icon = tool.icon}
                                <button class="tool-card" onclick={() => openTool(tool)}>
                                    <span class="tool-card-top">
                                        <span class="tool-icon"><Icon size={20} /></span>
                                        <span class="tool-badge">{tool.badge}</span>
                                    </span>
                                    <span class="tool-title">{tool.title}</span>
                                    <span class="tool-desc">{tool.description}</span>
                                </button>
                            {/each}
                        </div>
                    </section>
                {/each}
            </div>

            <button class="soon-card" onclick={() => (easterEggTouch += 1)}>
                <span class="soon-mark">+</span>
                <span>
                    {#if easterEggTouch <= 10}
                        即将加入
                    {:else if easterEggTouch <= 30}
                        还在准备中
                    {:else}
                        真的快了
                    {/if}
                </span>
            </button>
        </section>
    {:else}
        {#if $SizeStore.w < 1024}
            <div class="mobile-spacer"></div>
        {/if}
        <section
            class="playground-tool"
            in:fly={toolEnter}
            out:fly={toolExit}
        >
            <header class="tool-header">
                <button class="back-button" onclick={backToMenu} aria-label="返回实验场">
                    <ArrowLeft size={19} />
                </button>
                <div>
                    <span>实验场</span>
                    <h2>{currentTool?.title ?? language.playground.playground}</h2>
                </div>
            </header>

            <div class="tool-content">
                {#if $PlaygroundStore === 3}
                    <PlaygroundEmbedding />
                {/if}
                {#if $PlaygroundStore === 4}
                    <PlaygroundTokenizer />
                {/if}
                {#if $PlaygroundStore === 5}
                    <PlaygroundSyntax />
                {/if}
                {#if $PlaygroundStore === 6}
                    <PlaygroundJinja />
                {/if}
                {#if $PlaygroundStore === 7}
                    <PlaygroundImageGen />
                {/if}
                {#if $PlaygroundStore === 8}
                    <PlaygroundParser />
                {/if}
                {#if $PlaygroundStore === 9}
                    <PlaygroundSubtitle />
                {/if}
                {#if $PlaygroundStore === 10}
                    <PlaygroundImageTrans />
                {/if}
                {#if $PlaygroundStore === 11}
                    <PlaygroundTranslation />
                {/if}
                {#if $PlaygroundStore === 12}
                    <PlaygroundMcp />
                {/if}
                {#if $PlaygroundStore === 13}
                    <PlaygroundDocs />
                {/if}
                {#if $PlaygroundStore === 14}
                    <PlaygroundInlayExplorer />
                {/if}
                {#if $PlaygroundStore === 101}
                    <ToolConversion />
                {/if}
            </div>
        </section>
    {/if}
</div>

<style>
    .playground-shell {
        --pg-bg: var(--risu-theme-bgcolor, #191a21);
        --pg-panel: color-mix(in srgb, var(--risu-theme-bgcolor, #191a21) 82%, var(--risu-theme-darkbg, #21222c));
        --pg-panel-soft: color-mix(in srgb, var(--risu-theme-bgcolor, #191a21) 68%, transparent);
        --pg-control: color-mix(in srgb, var(--risu-theme-darkbg, #21222c) 74%, transparent);
        --pg-control-hover: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 14%, var(--risu-theme-darkbg, #21222c));
        --pg-border: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 32%, transparent);
        --pg-border-soft: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 20%, transparent);
        --pg-border-strong: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 54%, var(--risu-theme-borderc, #6272a4));
        --pg-muted: color-mix(in srgb, var(--risu-theme-textcolor, #f8f8f2) 58%, transparent);
        --pg-accent-soft: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 18%, transparent);
        width: 100%;
        height: 100%;
        overflow-y: auto;
        color: var(--risu-theme-textcolor);
        background:
            radial-gradient(circle at 16% 0%, var(--pg-accent-soft) 0, transparent 28rem),
            linear-gradient(180deg, color-mix(in srgb, var(--pg-bg) 96%, var(--risu-theme-primary, #3b82f6) 4%) 0%, var(--pg-bg) 100%);
    }

    .playground-home,
    .playground-tool {
        width: min(1120px, calc(100% - 2rem));
        margin: 0 auto;
        padding: 1.25rem 0 2rem;
    }

    .playground-hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 21rem;
        gap: 1rem;
        align-items: stretch;
        margin-top: 1rem;
        padding: 1rem;
        border: 1px solid var(--pg-border);
        border-radius: 8px;
        background:
            linear-gradient(135deg, var(--pg-accent-soft), transparent 42%),
            var(--pg-panel);
        box-shadow: 0 18px 50px rgb(0 0 0 / 14%);
    }

    .hero-copy {
        min-height: 13rem;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 1rem;
    }

    .eyebrow {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        gap: 0.45rem;
        margin-bottom: 0.75rem;
        color: var(--risu-theme-primary);
        font-size: 0.82rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0;
    }

    .hero-copy h2 {
        margin: 0;
        font-size: clamp(2rem, 4vw, 3.5rem);
        line-height: 1;
        font-weight: 900;
    }

    .hero-copy p {
        max-width: 36rem;
        margin-top: 1rem;
        color: var(--pg-muted);
        font-size: 1rem;
        line-height: 1.65;
    }

    .hero-panel {
        display: flex;
        min-height: 13rem;
        flex-direction: column;
        justify-content: space-between;
        gap: 1rem;
        border: 1px solid var(--pg-border-soft);
        border-radius: 8px;
        background: var(--pg-control);
        padding: 1rem;
    }

    .panel-label,
    .section-heading span,
    .tool-badge {
        color: var(--pg-muted);
        font-size: 0.78rem;
        font-weight: 700;
    }

    .featured-card,
    .tool-card,
    .soon-card,
    .back-button {
        border: 1px solid var(--pg-border-soft);
        border-radius: 8px;
        color: var(--risu-theme-textcolor);
        background: var(--pg-control);
        transition:
            border-color 140ms ease,
            background-color 140ms ease,
            transform 140ms ease;
    }

    .featured-card:hover,
    .tool-card:hover,
    .soon-card:hover,
    .back-button:hover {
        border-color: var(--pg-border-strong);
        background: var(--pg-control-hover);
        transform: translateY(-1px);
    }

    .card-title,
    .tool-title {
        display: block;
        font-weight: 800;
    }

    .card-desc,
    .tool-desc {
        display: block;
        margin-top: 0.25rem;
        color: var(--pg-muted);
        line-height: 1.45;
    }

    .card-icon,
    .tool-icon,
    .soon-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        flex: 0 0 auto;
        border-radius: 8px;
        color: var(--risu-theme-textcolor);
        background: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 24%, transparent);
    }

    .featured-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.8rem;
        margin-top: 1rem;
    }

    .featured-card {
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 1rem;
        text-align: left;
    }

    .tool-groups {
        display: grid;
        gap: 1rem;
        margin-top: 1rem;
    }

    .tool-section {
        padding: 1rem;
        border: 1px solid var(--pg-border-soft);
        border-radius: 8px;
        background: var(--pg-panel-soft);
    }

    .section-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 0.75rem;
    }

    .section-heading h3 {
        margin: 0;
        font-size: 1rem;
        font-weight: 850;
    }

    .tool-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 0.75rem;
    }

    .tool-card {
        min-height: 10rem;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        padding: 0.9rem;
        text-align: left;
    }

    .tool-card-top {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.9rem;
    }

    .tool-badge {
        max-width: 7rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        border: 1px solid var(--pg-border);
        border-radius: 999px;
        padding: 0.18rem 0.5rem;
        color: var(--risu-theme-primary);
        background: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 12%, transparent);
    }

    .tool-desc {
        font-size: 0.88rem;
    }

    .soon-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        margin-top: 1rem;
        padding: 0.8rem;
        text-align: left;
        color: var(--pg-muted);
    }

    .soon-mark {
        width: 2rem;
        height: 2rem;
        font-weight: 900;
    }

    .mobile-spacer {
        height: 3.5rem;
    }

    .tool-header {
        position: sticky;
        top: 0;
        z-index: 5;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin: 0.75rem 0 1rem;
        padding: 0.75rem;
        border: 1px solid var(--pg-border);
        border-radius: 8px;
        background: color-mix(in srgb, var(--pg-panel) 94%, transparent);
        box-shadow: 0 10px 35px rgb(0 0 0 / 12%);
    }

    .back-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2.5rem;
        height: 2.5rem;
        flex: 0 0 auto;
    }

    .tool-header span {
        display: block;
        color: var(--pg-muted);
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0;
    }

    .tool-header h2 {
        margin: 0.12rem 0 0;
        font-size: 1.35rem;
        font-weight: 850;
        line-height: 1.15;
    }

    .tool-content {
        border: 1px solid var(--pg-border-soft);
        border-radius: 8px;
        background: var(--pg-panel-soft);
        padding: 1rem;
    }

    @media (max-width: 900px) {
        .playground-hero {
            grid-template-columns: 1fr;
        }

        .tool-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 640px) {
        .playground-home,
        .playground-tool {
            width: min(100% - 1rem, 1120px);
            padding-bottom: 1rem;
        }

        .playground-hero,
        .tool-section,
        .tool-content {
            padding: 0.75rem;
        }

        .hero-copy {
            min-height: auto;
            padding: 0.5rem;
        }

        .hero-panel {
            min-height: auto;
        }

        .featured-grid,
        .tool-grid {
            grid-template-columns: 1fr;
        }

        .tool-card {
            min-height: 8.5rem;
        }
    }
</style>
