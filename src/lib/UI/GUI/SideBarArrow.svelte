<script lang="ts">
    import { ArrowLeft, ArrowRight } from "@lucide/svelte";
    import { DynamicGUI, MobileGUI, sideBarClosing, sideBarStore } from "src/ts/stores.svelte";

</script>

{#if !$MobileGUI}
    {#if $sideBarStore && !$DynamicGUI}
        <button
            onclick={() => {sideBarClosing.set(true)}}
            class="sidebar-shell-button sidebar-shell-button-open absolute left-0 z-20 flex h-12 w-12 items-center justify-center rounded-r-xl text-textcolor"
            aria-label="Close sidebar"
        >
            <ArrowLeft size={22} />
        </button>
    {:else}
        <button
            onclick={() => {
            sideBarClosing.set(false);
            sideBarStore.set(true)}}
            class="sidebar-shell-button absolute left-0 z-20 flex h-12 w-12 items-center justify-center rounded-r-xl text-textcolor"
            aria-label="Open sidebar"
        >
            <ArrowRight size={22} />
        </button>
    {/if}
{/if}

<style>
    .sidebar-shell-button {
        top: 5rem;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-left: 0;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.035)),
            rgba(9, 15, 29, 0.9);
        color: #edf4ff;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 12px 30px rgba(0, 0, 0, 0.28);
        overflow: hidden;
        transition:
            width 0.16s ease,
            border-color 0.16s ease,
            box-shadow 0.16s ease,
            color 0.16s ease,
            transform 0.16s ease;
    }

    .sidebar-shell-button::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
            radial-gradient(circle at 100% 50%, color-mix(in srgb, var(--risu-theme-primary) 28%, transparent), transparent 70%),
            linear-gradient(135deg, rgba(59, 130, 246, 0.18), rgba(34, 197, 94, 0.1));
        opacity: 0;
        transition: opacity 0.16s ease;
    }

    .sidebar-shell-button :global(svg) {
        position: relative;
        z-index: 1;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.32));
        transition: transform 0.16s ease;
    }

    .sidebar-shell-button:hover,
    .sidebar-shell-button:focus-visible {
        width: 3.35rem;
        border-color: color-mix(in srgb, var(--risu-theme-primary) 58%, white 10%);
        color: #fff;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 16px 36px rgba(0, 0, 0, 0.34),
            0 0 0 3px color-mix(in srgb, var(--risu-theme-primary) 18%, transparent);
        transform: translateX(1px);
        outline: none;
    }

    .sidebar-shell-button:hover::before,
    .sidebar-shell-button:focus-visible::before {
        opacity: 1;
    }

    .sidebar-shell-button:hover :global(svg),
    .sidebar-shell-button:focus-visible :global(svg) {
        transform: translateX(2px);
    }

    .sidebar-shell-button-open:hover :global(svg),
    .sidebar-shell-button-open:focus-visible :global(svg) {
        transform: translateX(-2px);
    }
</style>
