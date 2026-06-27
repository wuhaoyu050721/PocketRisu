<script lang="ts">
    import { ArrowLeft, MenuIcon } from "@lucide/svelte";
    import { language } from "src/lang";

    import { DBState } from 'src/ts/stores.svelte';
    import { MobileGUIStack, MobileSearch, selectedCharID, SettingsMenuIndex, MobileSideBar } from "src/ts/stores.svelte";
    import { SettingsRoute } from "src/ts/routing";

    function getGreeting(): string {
        const now = new Date();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const month = now.getMonth() + 1;
        const day = now.getDate();
        const weekday = weekdays[now.getDay()];
        return `${month} 月 ${day} 日 · ${weekday}`;
    }
</script>
<div class="mobile-header" style="padding-top: var(--sat); min-height: calc(3.5rem + var(--sat));">
    {#if $selectedCharID !== -1 && $MobileSideBar > 0}
        <button class="back-btn" onclick={() => { MobileSideBar.set(0) }}>
            <ArrowLeft />
        </button>
        <span class="header-title">{language.menu}</span>
    {:else if $selectedCharID !== -1}
        <button class="back-btn" onclick={() => { selectedCharID.set(-1) }}>
            <ArrowLeft />
        </button>
        <span class="header-title truncate">{DBState.db.characters[$selectedCharID].name}</span>
        <div class="flex-1 flex justify-end">
            <button class="icon-btn" onclick={() => { MobileSideBar.set(1) }}>
                <MenuIcon />
            </button>
        </div>
    {:else if $MobileGUIStack === 2 && $SettingsMenuIndex > -1}
        <button class="back-btn" onclick={() => { SettingsMenuIndex.set(SettingsRoute.None) }}>
            <ArrowLeft />
        </button>
        <span class="header-title">小酒馆</span>
    {:else if $MobileGUIStack === 1}
        <div class="search-wrap">
            <input placeholder={language.search + '...'} bind:value={$MobileSearch} class="search-input" />
        </div>
    {:else}
        <!-- Home state: title + greeting, nav via bottom tab bar -->
        <div class="header-home">
            <div class="header-info">
                <p class="greeting">{getGreeting()}</p>
                <h1 class="header-h1">{language.chat}</h1>
            </div>
        </div>
    {/if}
</div>

<style>
    .mobile-header {
        display: flex;
        align-items: center;
        padding-inline: 20px;
        border-bottom: 1px solid var(--risu-theme-borderc);
        background: var(--risu-theme-bgcolor);
        color: var(--risu-theme-textcolor);
        gap: 10px;
    }

    .header-home {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 12px;
    }

    .header-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .greeting {
        font-family: var(--risu-font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--risu-theme-textcolor2);
        margin: 0;
    }

    .header-h1 {
        font-family: var(--risu-font-family);
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        margin: 0;
    }

    .header-title {
        font-weight: 700;
        font-size: 18px;
        letter-spacing: -0.02em;
    }

    .icon-btn {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        display: grid;
        place-items: center;
        color: var(--risu-theme-textcolor);
        cursor: pointer;
        transition: border-color 0.15s;
        flex-shrink: 0;
    }

    .icon-btn:hover {
        border-color: var(--risu-theme-primary);
    }

    .icon-btn :global(svg) {
        width: 18px;
        height: 18px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    .back-btn {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: transparent;
        border: 0;
        color: var(--risu-theme-textcolor);
        display: grid;
        place-items: center;
        cursor: pointer;
        flex-shrink: 0;
    }

    .back-btn :global(svg) {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
    }

    .search-wrap {
        flex: 1;
        display: flex;
        align-items: center;
    }

    .search-input {
        width: 100%;
        padding: 10px 14px;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 12px;
        color: var(--risu-theme-textcolor);
        font-family: var(--risu-font-family);
        font-size: 14px;
        outline: none;
    }

    .search-input:focus {
        border-color: var(--risu-theme-primary);
    }

    .search-input::placeholder {
        color: var(--risu-theme-textcolor2);
    }
</style>
