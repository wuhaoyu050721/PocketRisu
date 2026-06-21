<script lang="ts">
    // Blocking loading modal — shadcn-pattern dialog for long-running operations
    // that must prevent user interaction (backup/restore, import, translation,
    // screenshot, etc.). Non-closable by design: no X button, ESC blocked,
    // outside click blocked. Shows a spinner + message, and an optional
    // progress bar when a percentage is provided.
    import type { Snippet } from 'svelte';
    import { Dialog } from 'bits-ui';
    import { LanguagesIcon, LoaderCircleIcon, SparklesIcon } from '@lucide/svelte';
    import { cn } from 'src/lib/utils';
    import type { ShDialogTier } from './ShDialog.svelte';

    interface Props {
        open?: boolean;
        message?: string;
        submessage?: string;
        progress?: number | null;
        tier?: ShDialogTier;
        contentClass?: string;
        extra?: Snippet;
    }

    let {
        open = $bindable(false),
        message = '',
        submessage = '',
        progress = null,
        tier = 'alert',
        contentClass = '',
        extra,
    }: Props = $props();

    const clampedProgress = $derived(
        progress == null ? null : Math.max(0, Math.min(100, progress))
    );
    const isCharacterTranslation = $derived(
        message.includes('角色卡') || submessage.includes('角色卡')
    );

    const tierClasses: Record<ShDialogTier, string> = {
        base: 'z-40',
        alert: 'z-50',
        top: 'z-[60]',
    };

    // w-[calc(100vw-2rem)] guarantees a 1rem gutter on each side at any
    // viewport (max-w-md caps the upper bound on desktop).
    const contentBase =
        'fixed left-1/2 top-1/2 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 ' +
        'bg-darkbg border border-darkborderc rounded-md shadow-lg ' +
        'p-6 flex flex-col gap-4 items-center outline-none ' +
        'data-[state=open]:animate-in data-[state=closed]:animate-out ' +
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ' +
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95';
</script>

<Dialog.Root bind:open>
    <Dialog.Portal>
        <Dialog.Overlay
            class={cn('fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0', tierClasses[tier])}
        />
        <Dialog.Content
            class={cn(contentBase, tierClasses[tier], contentClass)}
            escapeKeydownBehavior="ignore"
            interactOutsideBehavior="ignore"
        >
            <Dialog.Title class="sr-only">Loading</Dialog.Title>
            <Dialog.Description class="sr-only">
                {message || 'Loading in progress. Please wait.'}
            </Dialog.Description>

            {#if isCharacterTranslation}
                <div class="translation-loader-shell">
                    <div class="translation-loader-icon">
                        <LanguagesIcon class="size-7" />
                        <span class="translation-loader-sparkle">
                            <SparklesIcon class="size-4" />
                        </span>
                    </div>
                    <div class="translation-loader-copy">
                        <div class="translation-loader-title">
                            {message || '正在智能翻译角色卡'}
                        </div>
                        <div class="translation-loader-subtitle">
                            {submessage || '角色卡越大需要时间越久哦！请耐心等待。'}
                        </div>
                    </div>
                </div>
                <div class="translation-loader-bar" aria-hidden="true">
                    <span></span>
                </div>
            {:else}
                <LoaderCircleIcon class="size-8 text-borderc animate-spin shrink-0" />

                {#if message}
                    <div class="text-textcolor text-center whitespace-pre-wrap break-words">
                        {message}
                    </div>
                {/if}

                {#if submessage}
                    <div class="text-textcolor2 text-sm text-center whitespace-pre-wrap break-words">
                        {submessage}
                    </div>
                {/if}
            {/if}

            {#if clampedProgress != null}
                <div class="w-full flex flex-col gap-2 mt-2">
                    <div class="w-full h-2 bg-bgcolor border border-darkborderc rounded-md overflow-hidden">
                        <div
                            class="h-full bg-linear-to-r from-blue-500 to-purple-800 saving-animation transition-[width]"
                            style:width={clampedProgress + '%'}
                        ></div>
                    </div>
                    <div class="text-textcolor2 text-sm text-center">
                        {clampedProgress.toFixed(0)}%
                    </div>
                </div>
            {/if}

            {#if extra}
                {@render extra()}
            {/if}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>

<style>
    .translation-loader-shell {
        width: 100%;
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 1rem;
        align-items: center;
        padding: 0.125rem;
    }

    .translation-loader-icon {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 4rem;
        height: 4rem;
        border-radius: 0.75rem;
        color: rgb(216 180 254);
        background:
            linear-gradient(135deg, rgba(124, 58, 237, 0.28), rgba(37, 99, 235, 0.16)),
            rgba(15, 23, 42, 0.72);
        border: 1px solid rgba(167, 139, 250, 0.35);
        box-shadow: 0 18px 48px rgba(91, 33, 182, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    .translation-loader-icon::after {
        content: "";
        position: absolute;
        inset: 0.45rem;
        border-radius: 0.625rem;
        border: 1px solid rgba(216, 180, 254, 0.22);
        animation: translation-pulse 1.6s ease-in-out infinite;
    }

    .translation-loader-sparkle {
        position: absolute;
        top: 0.65rem;
        right: 0.65rem;
        color: rgb(253 224 71);
        animation: translation-sparkle 1.4s ease-in-out infinite;
    }

    .translation-loader-copy {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        text-align: left;
    }

    .translation-loader-title {
        color: var(--risu-theme-textcolor);
        font-size: 1rem;
        font-weight: 700;
        line-height: 1.35;
    }

    .translation-loader-subtitle {
        color: var(--risu-theme-textcolor2);
        font-size: 0.875rem;
        line-height: 1.55;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .translation-loader-bar {
        width: 100%;
        height: 0.5rem;
        overflow: hidden;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.14);
        border: 1px solid rgba(148, 163, 184, 0.18);
    }

    .translation-loader-bar span {
        display: block;
        width: 42%;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, rgb(96 165 250), rgb(168 85 247), rgb(45 212 191));
        animation: translation-bar 1.35s ease-in-out infinite;
    }

    @keyframes translation-bar {
        0% { transform: translateX(-110%); }
        100% { transform: translateX(260%); }
    }

    @keyframes translation-pulse {
        0%, 100% { opacity: 0.35; transform: scale(0.96); }
        50% { opacity: 0.9; transform: scale(1.03); }
    }

    @keyframes translation-sparkle {
        0%, 100% { opacity: 0.45; transform: scale(0.85) rotate(0deg); }
        50% { opacity: 1; transform: scale(1.08) rotate(12deg); }
    }
</style>
