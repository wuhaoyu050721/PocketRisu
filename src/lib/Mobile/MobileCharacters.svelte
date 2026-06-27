<script lang="ts">
    import { type character } from "src/ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import BarIcon from "../SideBars/BarIcon.svelte";
    import { addCharacter, changeChar, getCharThumbnail } from "src/ts/characters";
    import { makeAgoText } from "src/ts/util";
    import { MessageSquareIcon, PlusIcon } from "@lucide/svelte";

    interface Props {
        search: string;
        gridMode?: boolean;
        endGrid?: () => void;
    }

    let {search, gridMode = false, endGrid = () => {}}: Props = $props();

    function sortChar(char: (character)[]) {
        return char.map((c, i) => ({
                name: c.name || "Unnamed",
                image: c.image,
                chats: c.chats.length,
                i: i,
                type: c.type,
                interaction: c.lastInteraction || 0,
                agoText: makeAgoText(c.lastInteraction || 0),
            })).sort((a, b) => {
            if (a.interaction === b.interaction) {
                return a.name.localeCompare(b.name);
            }
            return b.interaction - a.interaction;
        });
    }
</script>
<div class="char-list">
    {#each sortChar(DBState.db.characters) as char, i}
        {#if char.name.replace(/ /g,"").toLocaleLowerCase().includes(search.replace(/ /g,"").toLocaleLowerCase())}
            <button class="list-row" class:first={i === 0} onclick={() => {
                changeChar(char.i)
                endGrid()
            }}>
                <BarIcon additionalStyle={getCharThumbnail(char.image, 'css')}></BarIcon>
                <div class="body">
                    <div class="title">{char.name}</div>
                    <div class="sub">
                        <span>{char.chats}</span>
                        <MessageSquareIcon size={12} />
                        <span class="sep">·</span>
                        <span>{char.agoText}</span>
                    </div>
                </div>
                <span class="meta">{char.agoText}</span>
            </button>
        {/if}
    {/each}
</div>

{#if gridMode}
    <button class="fab" onclick={() => { addCharacter() }}>
        <PlusIcon size={24} />
    </button>
{/if}

<style>
    .char-list {
        display: flex;
        flex-direction: column;
        width: 100%;
    }

    .list-row {
        display: grid;
        grid-template-columns: 44px 1fr auto;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-top: 1px solid var(--risu-theme-borderc);
        background: transparent;
        border-left: 0;
        border-right: 0;
        border-bottom: 0;
        cursor: pointer;
        color: var(--risu-theme-textcolor);
        font-family: var(--risu-font-family);
        font-size: var(--risu-font-size, 15px);
        width: 100%;
        text-align: left;
    }

    .list-row.first {
        border-top: 0;
    }

    .list-row :global(.shadow-lg) {
        border-radius: 50%;
        border: 1px solid var(--risu-theme-borderc);
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
    }

    .body {
        min-width: 0;
    }

    .body .title {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.25;
    }

    .body .sub {
        color: var(--risu-theme-textcolor2);
        font-size: 13px;
        line-height: 1.3;
        margin-top: 2px;
        display: flex;
        align-items: center;
        gap: 3px;
    }

    .body .sub :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    .sep {
        color: var(--risu-theme-textcolor2);
    }

    .meta {
        font-family: var(--risu-font-mono);
        font-size: 12px;
        color: var(--risu-theme-textcolor2);
        font-variant-numeric: tabular-nums;
    }

    .fab {
        position: absolute;
        bottom: 16px;
        right: 16px;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: var(--risu-theme-primary);
        color: #06111f;
        border: 0;
        display: grid;
        place-items: center;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .fab :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 2;
    }
</style>
