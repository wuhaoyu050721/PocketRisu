<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { SettingItem } from 'src/ts/setting/types';
    import { getLabel } from 'src/ts/setting/utils';
    import { language } from 'src/lang';

    interface Props {
        item: SettingItem;
        /** Optional icon name to render before the label */
        icon?: Snippet;
        control?: Snippet;
    }

    let { item, icon, control }: Props = $props();

    const helpText = $derived(
        item.helpKey ? (language.help as any)[item.helpKey] : undefined
    );
</script>

<div class="setting-row">
    <div class="left">
        {#if icon}
            <div class="icon">{@render icon()}</div>
        {/if}
        <div class="label-col">
            <span class="label">{getLabel(item)}</span>
            {#if helpText}<p class="help">{helpText}</p>{/if}
        </div>
    </div>
    {#if control}
        <div class="right">{@render control()}</div>
    {/if}
</div>

<style>
    .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 20px;
        border-top: 1px solid var(--risu-theme-borderc);
        min-height: 56px;
    }

    .setting-row:first-child {
        border-top: 0;
    }

    .left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
    }

    .icon {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: color-mix(in oklch, var(--risu-theme-primary) 14%, transparent);
        display: grid;
        place-items: center;
        flex-shrink: 0;
    }

    .icon :global(svg) {
        width: 16px;
        height: 16px;
        stroke: var(--risu-theme-textcolor);
        fill: none;
        stroke-width: 1.8;
    }

    .label-col {
        min-width: 0;
    }

    .label {
        font-size: 15px;
        font-weight: 500;
        color: var(--risu-theme-textcolor);
    }

    .help {
        font-size: 11px;
        color: var(--risu-theme-textcolor2);
        margin-top: 2px;
    }

    .right {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--risu-theme-textcolor2);
        font-size: 14px;
        flex-shrink: 0;
    }

    .right :global(svg) {
        width: 16px;
        height: 16px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
    }
</style>
