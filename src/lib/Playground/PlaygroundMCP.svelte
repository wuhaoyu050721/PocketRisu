<script lang="ts">
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { type MCPToolWithURL, callMCPTool, getMCPMeta, getMCPTools, initializeMCPs } from "src/ts/process/mcp/mcp";
    import { alertMd } from "src/ts/alert";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";

    let metadatas = $state('')
    let tools:MCPToolWithURL[] = $state([]);
    let toolInputs:{[key:string]:string}= $state({});

    async function refresh() {
        await initializeMCPs()
        metadatas = JSON.stringify(await getMCPMeta(), null, 4);
        tools = await getMCPTools()
    }

</script>

<PlaygroundToolFrame title="MCP" description="刷新并测试已连接的 MCP 工具。">
    <section class="pg-section">
        <div class="section-row">
            <span class="pg-section-title">元数据</span>
            <Button onclick={refresh}>刷新工具</Button>
        </div>
        <TextAreaInput value={metadatas} />
    </section>

    <section class="pg-section">
        <span class="pg-section-title">工具列表</span>
        {#if tools.length === 0}
            <span class="pg-muted">暂无工具，点击“刷新工具”加载。</span>
        {/if}

        <div class="tool-list">
            {#each tools as tool}
                <section class="mcp-tool">
                    <h3>{tool.name}</h3>
                    <p class="pg-muted">{tool.description}</p>
                    <pre class="pg-code">{JSON.stringify(tool.inputSchema, null, 2)}</pre>
                    <TextAreaInput bind:value={toolInputs[tool.name]} placeholder="输入此工具的 JSON 参数" />
                    <Button onclick={async () => {
                        try {
                            const args = toolInputs[tool.name] ? JSON.parse(toolInputs[tool.name]) : {};
                            const x = await callMCPTool(tool.name, args);
                            alertMd(`工具 ${tool.name} 已执行\n\n响应：\n\`\`\`json\n${JSON.stringify(x, null, 2)}\n\`\`\``);
                        } catch (error) {
                            alertMd(`执行失败：${error}`);
                        }
                    }}>执行 {tool.name}</Button>
                </section>
            {/each}
        </div>
    </section>
</PlaygroundToolFrame>

<style>
    .section-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .tool-list {
        display: grid;
        gap: 1rem;
    }

    .mcp-tool {
        display: grid;
        gap: 0.65rem;
        padding: 1rem;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 14%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--risu-theme-bgcolor, #282a36) 66%, transparent);
    }

    h3 {
        margin: 0;
        color: var(--risu-theme-textcolor);
        font-size: 1rem;
        font-weight: 850;
    }
</style>
