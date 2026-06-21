<script lang="ts">
    import { defaultCBSRegisterArg, registerCBS } from "src/ts/cbs";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import { parseMarkdownSafe } from "src/ts/parser/parser.svelte";
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";


    let doc: {
        name: string;
        description: string;
        alias: string[]
    }[] = $state([])
    let searchTerm = $state("");

    registerCBS({
        ...defaultCBSRegisterArg,
        registerFunction: (arg) => {
            if(arg.internalOnly){
                return
            }
            doc.push({
                name: arg.name,
                description: arg.description,
                alias: arg.alias || []
            });
        }
    })

    let searchedDoc = $derived(doc.filter(item => {
        return item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.alias.some(alias => alias.toLowerCase().includes(searchTerm.toLowerCase()));
    }))
</script>

<PlaygroundToolFrame title="CBS 文档" description="搜索 CBS 指令、别名和说明。">
    <section class="pg-section">
        <span class="pg-section-title">搜索文档</span>
        <TextInput
            placeholder="搜索文档或别名..."
            className="w-full"
            fullwidth
            bind:value={searchTerm}
        />
    </section>
    
    <div class="docs-list">
        {#each searchedDoc as item, index}
            <section class="pg-section">
                <h3>{item.name}</h3>
                
                <div class="doc-desc">{@html parseMarkdownSafe(item.description, {
                    forbidTags: ['mark']
                })}</div>
                
                {#if item.alias.length > 0}
                    <div class="aliases">
                        <span class="pg-muted">别名：</span>
                        {#each item.alias as alias}
                            <span class="pg-badge">{alias}</span>
                        {/each}
                    </div>
                {/if}
            </section>
        {/each}
    </div>
    
    {#if !doc || doc.length === 0 || searchedDoc.length === 0}
        <section class="pg-section empty-docs">
            <h3>暂无文档</h3>
            <p class="pg-muted">可用文档会在这里显示。</p>
        </section>
    {/if}
</PlaygroundToolFrame>

<style>
    .docs-list {
        display: grid;
        gap: 1rem;
    }

    h3 {
        margin: 0;
        color: var(--risu-theme-textcolor);
        font-size: 1.05rem;
        font-weight: 850;
    }

    .doc-desc {
        color: color-mix(in srgb, var(--risu-theme-textcolor, #f8f8f2) 72%, transparent);
        line-height: 1.65;
    }

    .aliases {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
    }

    .empty-docs {
        place-items: center;
        text-align: center;
    }
</style>
