<script lang="ts">
    import { MessageCircleIcon, UsersIcon, CompassIcon, UserCircleIcon, Volume2Icon, Braces, ActivityIcon, BookIcon, SmileIcon, UserIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { CharConfigSubMenu, MobileGUIStack, MobileSideBar, selectedCharID } from "src/ts/stores.svelte";
</script>

<!-- Main tab bar: 聊天 / 角色 / 发现 / 我的 -->
{#if $selectedCharID === -1}
    <nav class="tabbar" style="--tabs:4;" data-od-id="tabbar">
        <button class="tab" class:active={$MobileGUIStack === 0} onclick={() => { MobileGUIStack.set(0) }}>
            <MessageCircleIcon />
            <span>{language.chat}</span>
        </button>
        <button class="tab" class:active={$MobileGUIStack === 1} onclick={() => { MobileGUIStack.set(1) }}>
            <UsersIcon />
            <span>{language.character}</span>
        </button>
        <button class="tab" class:active={$MobileGUIStack === 3} onclick={() => { MobileGUIStack.set(3) }}>
            <CompassIcon />
            <span>{language.discover}</span>
        </button>
        <button class="tab" class:active={$MobileGUIStack === 2} onclick={() => { MobileGUIStack.set(2) }}>
            <UserCircleIcon />
            <span>{language.my}</span>
        </button>
    </nav>
{/if}

<!-- Character config sub-tabs (when editing a character) -->
{#if $selectedCharID !== -1 && $MobileSideBar === 2}
    <nav class="tabbar" style="--tabs:6;" data-od-id="tabbar">
        <button class="tab" class:active={$CharConfigSubMenu === 0} onclick={() => { CharConfigSubMenu.set(0) }}>
            <UserIcon />
            <span class="truncate max-w-16">{language.basicInfo}</span>
        </button>
        <button class="tab" class:active={$CharConfigSubMenu === 1} onclick={() => { CharConfigSubMenu.set(1) }}>
            <SmileIcon />
            <span class="truncate max-w-16">{language.characterDisplay}</span>
        </button>
        <button class="tab" class:active={$CharConfigSubMenu === 3} onclick={() => { CharConfigSubMenu.set(3) }}>
            <BookIcon />
            <span class="truncate max-w-16">{language.loreBook}</span>
        </button>
        <button class="tab" class:active={$CharConfigSubMenu === 5} onclick={() => { CharConfigSubMenu.set(5) }}>
            <Volume2Icon />
            <span class="truncate max-w-16">TTS</span>
        </button>
        <button class="tab" class:active={$CharConfigSubMenu === 4} onclick={() => { CharConfigSubMenu.set(4) }}>
            <Braces />
            <span class="truncate max-w-16">{language.scripts}</span>
        </button>
        <button class="tab" class:active={$CharConfigSubMenu === 2} onclick={() => { CharConfigSubMenu.set(2) }}>
            <ActivityIcon />
            <span class="truncate max-w-16">{language.advanced}</span>
        </button>
    </nav>
{/if}

<style>
    .tabbar {
        flex: 0 0 auto;
        display: grid;
        grid-template-columns: repeat(var(--tabs, 4), 1fr);
        padding: 6px 8px 0;
        border-top: 1px solid var(--risu-theme-borderc);
        background: color-mix(in oklch, var(--risu-theme-darkbg) 94%, transparent);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        padding-bottom: var(--sab);
    }

    .tab {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        padding: 8px 0;
        color: var(--risu-theme-textcolor2);
        font-size: 10px;
        letter-spacing: 0.02em;
        background: transparent;
        border: 0;
        cursor: pointer;
        transition: color 0.15s;
        min-height: 48px;
    }

    .tab.active {
        color: var(--risu-theme-primary);
    }

    .tab :global(svg) {
        width: 22px;
        height: 22px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    .tab.active :global(svg) {
        stroke-width: 2.1;
    }
</style>
