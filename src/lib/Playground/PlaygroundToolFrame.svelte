<script lang="ts">
    import type { Snippet } from "svelte";

    let {
        title,
        description = "",
        children,
    }: {
        title: string;
        description?: string;
        children?: Snippet;
    } = $props();
</script>

<section class="pg-tool-frame">
    <header class="pg-tool-intro">
        <h3>{title}</h3>
        {#if description}
            <p>{description}</p>
        {/if}
    </header>

    <div class="pg-tool-body">
        {@render children?.()}
    </div>
</section>

<style>
    .pg-tool-frame {
        display: grid;
        gap: 1rem;
    }

    .pg-tool-intro {
        padding: 1rem;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 22%, transparent);
        border-radius: 8px;
        background:
            linear-gradient(135deg, color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 14%, transparent), transparent 44%),
            color-mix(in srgb, var(--risu-theme-bgcolor, #282a36) 84%, var(--risu-theme-darkbg, #21222c));
    }

    .pg-tool-intro h3 {
        margin: 0;
        color: var(--risu-theme-textcolor);
        font-size: 1.35rem;
        font-weight: 850;
        line-height: 1.2;
    }

    .pg-tool-intro p {
        margin: 0.45rem 0 0;
        max-width: 52rem;
        color: color-mix(in srgb, var(--risu-theme-textcolor, #f8f8f2) 62%, transparent);
        line-height: 1.6;
    }

    .pg-tool-body {
        display: grid;
        gap: 1rem;
    }

    :global(.pg-section) {
        display: grid;
        gap: 0.65rem;
        padding: 1rem;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 16%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--risu-theme-darkbg, #21222c) 72%, transparent);
    }

    :global(.pg-section-title) {
        color: var(--risu-theme-textcolor);
        font-size: 0.95rem;
        font-weight: 800;
    }

    :global(.pg-section-desc),
    :global(.pg-muted) {
        color: color-mix(in srgb, var(--risu-theme-textcolor, #f8f8f2) 58%, transparent);
        line-height: 1.5;
    }

    :global(.pg-grid-2) {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
    }

    :global(.pg-actions) {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
    }

    :global(.pg-result-row) {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.7rem 0.8rem;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 14%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--risu-theme-bgcolor, #282a36) 66%, transparent);
    }

    :global(.pg-code) {
        overflow: auto;
        max-height: 24rem;
        padding: 0.85rem;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 14%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, black 16%, var(--risu-theme-bgcolor, #282a36));
        color: var(--risu-theme-textcolor);
        white-space: pre-wrap;
    }

    :global(.pg-badge) {
        display: inline-flex;
        width: fit-content;
        align-items: center;
        border-radius: 999px;
        padding: 0.18rem 0.55rem;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 26%, transparent);
        color: var(--risu-theme-primary);
        background: color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 10%, transparent);
        font-size: 0.75rem;
        font-weight: 750;
    }

    @media (max-width: 720px) {
        :global(.pg-grid-2) {
            grid-template-columns: 1fr;
        }
    }
</style>
