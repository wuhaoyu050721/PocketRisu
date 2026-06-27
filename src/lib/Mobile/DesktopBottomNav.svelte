<script lang="ts">
    import { MessageCircleIcon, UsersIcon, CompassIcon, UserCircleIcon } from "@lucide/svelte";
    import { settingsOpen } from "src/ts/stores.svelte";

    interface Props {
        activeTab: number;
        onTabChange: (index: number) => void;
    }

    let { activeTab, onTabChange }: Props = $props();

    function handleSettings() {
        settingsOpen.set(true);
    }
</script>

<nav class="bottom-nav" style="--tabs:4;" data-od-id="tabbar">
        <button class="nav-tab" class:active={activeTab === 0} onclick={() => onTabChange(0)}>
            <MessageCircleIcon />
            <span>聊天</span>
        </button>
        <button class="nav-tab" class:active={activeTab === 1} onclick={() => onTabChange(1)}>
            <UsersIcon />
            <span>角色</span>
        </button>
        <button class="nav-tab" class:active={activeTab === 2} onclick={() => onTabChange(2)}>
            <CompassIcon />
            <span>发现</span>
        </button>
        <button class="nav-tab" class:active={activeTab === 3} onclick={handleSettings}>
            <UserCircleIcon />
            <span>我的</span>
        </button>
    </nav>

<style>
    .bottom-nav {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: 40;
        display: grid;
        grid-template-columns: repeat(var(--tabs, 4), 1fr);
        max-width: 480px;
        width: 100%;
        margin: 0 auto;
        left: 50%;
        transform: translateX(-50%);
        border-top: 1px solid #293653;
        background: #0d1424;
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding-bottom: env(safe-area-inset-bottom, 0px);
    }

    .nav-tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 8px 0 6px;
        color: #8ea0b8;
        font-size: 10px;
        letter-spacing: 0.02em;
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: color 0.15s;
        min-height: 48px;
        -webkit-tap-highlight-color: transparent;
    }

    .nav-tab.active {
        color: #60a5fa;
    }

    .nav-tab:hover {
        color: #f8fafc;
    }

    .nav-tab.active:hover {
        color: #60a5fa;
    }

    .nav-tab :global(svg) {
        width: 22px;
        height: 22px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    .nav-tab.active :global(svg) {
        stroke-width: 2.1;
    }
</style>
