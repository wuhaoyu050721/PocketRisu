<script lang="ts">
    import { language } from "src/lang";
    import Button from "../UI/GUI/Button.svelte";
    import { selectMultipleFile } from "src/ts/util";
    import { detectPromptJSONType, promptConvertion } from "src/ts/process/prompt";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";

    let files: { name: string, content: string, type:string }[] = $state([])

    const addFile = async () => {
        const selFiles = await selectMultipleFile(['json'])

        for(let i = 0; i < selFiles.length; i++) {
            const file = selFiles[i]
            const text = new TextDecoder().decode(file.data)
            files.push({
                name: file.name,
                content: text,
                type: detectPromptJSONType(text),
            })
        }

        console.log(files)
        files = files

    }
</script>
<PlaygroundToolFrame title={language.promptConvertion} description="导入 JSON 预设文件，并转换为当前可用的提示词格式。">
    <section class="pg-section">
        <span class="pg-section-title">文件列表</span>
        <span class="pg-section-desc">{language.convertionStep1}</span>

        {#if files.length === 0}
            <span class="pg-muted">还没有添加文件</span>
        {/if}

        {#each files as file, i}
            <div class="pg-result-row">
                <div class="file-info">
                    {#if file.type !== 'NOTSUPPORTED'}
                        <span class="pg-badge">{file.type}</span>
                    {:else}
                        <span class="pg-badge unsupported">不支持</span>
                    {/if}
                    <span>{file.name}</span>
                </div>
                <Button onclick={() => {
                    files.splice(i, 1)
                    files = files
                }}>删除</Button>
            </div>
        {/each}

        <div class="pg-actions">
            <Button onclick={addFile}>添加文件</Button>
            <Button onclick={() => {
                promptConvertion(files)
            }}>开始转换</Button>
        </div>
    </section>
</PlaygroundToolFrame>

<style>
    .file-info {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.65rem;
    }

    .file-info span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    :global(.pg-badge.unsupported) {
        border-color: color-mix(in srgb, #ef4444 40%, transparent);
        color: #ef4444;
        background: color-mix(in srgb, #ef4444 12%, transparent);
    }
</style>
