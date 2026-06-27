<script lang="ts">
    import { DBState } from 'src/ts/stores.svelte';
    import Hub from "./Realm/RealmMain.svelte";
    import { OpenRealmStore, RealmInitialOpenChar } from "src/ts/stores.svelte";
    import {
        ArrowLeft,
        ExternalLinkIcon,
        RefreshCwIcon,
        SearchIcon,
    } from "@lucide/svelte";
    import { language } from "src/lang";
    import { getRisuHub, hubAdditionalHTML } from "src/ts/characterCards";
    import RisuHubIcon from "./Realm/RealmHubIcon.svelte";

    let realmOpen = $state(true);
</script>

<div class="chars-shell">
    {#if !$OpenRealmStore}
        <div class="chars-content" data-od-id="content">
            <!-- Header -->
            <div class="header" data-od-id="header">
                <h1>角色广场</h1>
                <button class="icon-btn" aria-label="刷新" onclick={() => {
                    realmOpen = false;
                    setTimeout(() => realmOpen = true, 100);
                }}>
                    <RefreshCwIcon />
                </button>
            </div>

            <!-- Search bar -->
            <section class="pad" data-od-id="search" style="margin-bottom:14px;">
                <button class="search-bar" onclick={() => ($OpenRealmStore = true)}>
                    <SearchIcon />
                    <span>搜索角色卡…</span>
                </button>
            </section>

            <!-- Realm Hub section -->
            <section class="realm-section">
                <div class="section-header">
                    <span class="section-label">Realm Hub 最近上传</span>
                    <button class="ghost-action" onclick={() => ($OpenRealmStore = true)}>
                        获取更多角色 <ExternalLinkIcon size={16} />
                    </button>
                </div>
                {#if realmOpen}
                    {#await getRisuHub({
                        search: '',
                        page: 0,
                        nsfw: false,
                        sort: 'recommended'
                    }) then charas}
                        {#if charas.length > 0}
                            {@html hubAdditionalHTML}
                            <div class="realm-grid">
                                {#each charas.slice(0, 6) as chara}
                                    <RisuHubIcon onClick={() => {
                                        $OpenRealmStore = true
                                        if(DBState.db.realmDirectOpen){
                                            $RealmInitialOpenChar = chara
                                        }
                                    }} chara={chara} />
                                {/each}
                            </div>
                        {:else}
                            <p class="empty-state">暂时无法加载角色数据…</p>
                        {/if}
                    {/await}
                {/if}
            </section>
        </div>
    {:else}
        <div class="realm-full">
            <div class="realm-toolbar">
                <button class="back-button" onclick={() => ($OpenRealmStore = false)}>
                    <ArrowLeft size={20} />
                    <span>返回角色广场</span>
                </button>
            </div>
            <Hub />
        </div>
    {/if}
</div>

<style>
    .chars-shell {
        height: 100%;
        width: 100%;
        overflow-y: auto;
        background: var(--risu-theme-bgcolor);
        color: var(--risu-theme-textcolor);
        font-family: var(--risu-font-family);
    }

    .chars-content {
        width: min(100%, 104rem);
        margin: 0 auto;
        padding: 8px 0 28px;
    }

    /* Header */
    .header {
        padding: 8px 20px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .header h1 {
        font-family: var(--risu-font-family);
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        margin: 0;
        color: var(--risu-theme-textcolor);
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

    .pad { padding-inline: 20px; }

    /* Search bar */
    .search-bar {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 12px;
        padding: 10px 14px;
        color: var(--risu-theme-textcolor2);
        font-size: 14px;
        font-family: var(--risu-font-family);
        cursor: pointer;
        text-align: left;
    }

    .search-bar :global(svg) {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
        flex-shrink: 0;
    }

    /* Realm section */
    .realm-section {
        padding: 0 20px;
        margin-top: 4px;
    }

    .section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .section-label {
        font-family: var(--risu-font-mono);
        font-size: 11px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--risu-theme-textcolor2);
    }

    .ghost-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        background: transparent;
        color: var(--risu-theme-textcolor2);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 999px;
        font-family: var(--risu-font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 500;
        cursor: pointer;
        transition: border-color 0.15s, color 0.15s;
    }

    .ghost-action:hover {
        border-color: var(--risu-theme-primary);
        color: var(--risu-theme-primary);
    }

    .ghost-action :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    /* Realm card grid */
    .realm-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
        gap: 10px;
    }

    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: var(--risu-theme-textcolor2);
        font-size: 14px;
    }

    /* Realm full view */
    .realm-full {
        width: min(100%, 104rem);
        margin: 0 auto;
        padding: 12px 20px;
    }

    .realm-toolbar {
        display: flex;
        min-height: 48px;
        align-items: center;
        margin-bottom: 8px;
    }

    .back-button {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 0 16px;
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 999px;
        background: var(--risu-theme-darkbg);
        color: var(--risu-theme-textcolor);
        font-weight: 600;
        font-size: 14px;
        cursor: pointer;
        transition: border-color 0.15s;
    }

    .back-button:hover {
        border-color: var(--risu-theme-primary);
    }

    .back-button :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    /* Realm card grid item styling */
    :global(.realm-grid > button) {
        width: 100%;
        min-height: 130px;
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 14px;
        background: var(--risu-theme-darkbg);
        transition: border-color 0.15s;
    }

    :global(.realm-grid > button:hover) {
        border-color: var(--risu-theme-primary);
    }

    @media (max-width: 48rem) {
        .chars-content {
            width: 100%;
        }

        .header {
            padding: 8px 16px 12px;
        }

        .header h1 {
            font-size: 24px;
        }

        .pad {
            padding-inline: 16px;
        }

        .realm-section {
            padding: 0 16px;
        }

        .realm-grid {
            grid-template-columns: 1fr;
            gap: 8px;
        }

        .section-header {
            gap: 8px;
        }

        .realm-full {
            padding: 8px 12px;
        }
    }
</style>
