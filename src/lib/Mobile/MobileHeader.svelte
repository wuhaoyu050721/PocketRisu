<script lang="ts">
    import { ArrowLeft, MenuIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    
    import { DBState } from 'src/ts/stores.svelte';
    import { MobileGUIStack, MobileSearch, selectedCharID, SettingsMenuIndex, MobileSideBar } from "src/ts/stores.svelte";
    import { SettingsRoute } from "src/ts/routing";

</script>
<div class="mobile-header w-full px-4 h-16 border-b border-b-darkborderc bg-darkbg flex justify-start items-center gap-2">
    {#if $selectedCharID !== -1 && $MobileSideBar > 0}
        <button onclick={() => {
            MobileSideBar.set(0)
        }}>
            <ArrowLeft />
        </button>
        <span class="font-bold text-lg w-2/3 truncate">{language.menu}</span>
    {:else if $selectedCharID !== -1}
        <button onclick={() => {
            selectedCharID.set(-1)
        }}>
            <ArrowLeft />
        </button>
        <span class="font-bold text-lg w-2/3 truncate">{DBState.db.characters[$selectedCharID].name}</span>
        <div class="flex-1 flex justify-end">
            <button onclick={() => {
                MobileSideBar.set(1)
            }}>
                <MenuIcon />
            </button>
        </div>
    {:else if $MobileGUIStack === 2 && $SettingsMenuIndex > -1}
        <button onclick={() => {
            SettingsMenuIndex.set(SettingsRoute.None)
        }}>
            <ArrowLeft />
        </button>
        <span class="font-bold text-lg">小酒馆</span>
    {:else if $MobileGUIStack === 1}
        <div class="flex items-stretch w-2xl max-w-full">
            <input placeholder={language.search + '...'} bind:value={$MobileSearch} class="peer focus:border-textcolor transition-colors outline-hidden text-textcolor p-2 min-w-0 border bg-transparent rounded-md input-text text-xl grow mx-4 border-darkborderc resize-none overflow-y-hidden overflow-x-hidden max-w-full">
        </div>
    {:else}
        <button
            class="mobile-menu-button"
            aria-label={language.menu}
            onclick={() => MobileGUIStack.set(1)}
        >
            <MenuIcon size={30} />
        </button>
        <div class="mobile-brand">
            <img src="/logo_original.png" alt="小酒馆" />
            <span>Pocket<span>Risu</span></span>
        </div>
        <button
            class="mobile-avatar-button"
            aria-label={language.character}
            onclick={() => MobileGUIStack.set(1)}
        >
            <img src="/none.webp" alt="" />
            <span></span>
        </button>

    {/if}
</div>

<style>
    .mobile-header {
        background:
            radial-gradient(circle at 82% 10%, rgba(168, 85, 247, 0.18), transparent 9rem),
            linear-gradient(180deg, rgba(3, 8, 20, 0.98), rgba(4, 10, 22, 0.96));
        border-color: rgba(139, 146, 246, 0.18);
        color: #f8fafc;
    }

    .mobile-menu-button {
        position: relative;
        display: flex;
        width: 3rem;
        height: 3rem;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(148, 163, 184, 0.24);
        border-radius: 0.9rem;
        background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.035)),
            rgba(15, 23, 42, 0.74);
        color: #edf4ff;
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            0 10px 24px rgba(0, 0, 0, 0.22);
        overflow: hidden;
        transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease,
            transform 0.18s ease;
    }

    .mobile-menu-button::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(34, 197, 94, 0.12));
        opacity: 0;
        transition: opacity 0.18s ease;
    }

    .mobile-menu-button :global(svg) {
        position: relative;
        z-index: 1;
        width: 1.55rem;
        height: 1.55rem;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.28));
    }

    .mobile-menu-button:hover,
    .mobile-menu-button:focus-visible {
        border-color: rgba(125, 169, 255, 0.68);
        box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.16),
            0 14px 30px rgba(0, 0, 0, 0.3),
            0 0 0 3px rgba(59, 130, 246, 0.18);
        transform: translateY(-1px);
    }

    .mobile-menu-button:hover::before,
    .mobile-menu-button:focus-visible::before {
        opacity: 1;
    }

    .mobile-brand {
        display: flex;
        min-width: 0;
        flex: 1;
        align-items: center;
        gap: 0.55rem;
        font-size: 1.55rem;
        font-weight: 900;
        letter-spacing: 0;
    }

    .mobile-brand img {
        width: 2.25rem;
        height: 2.25rem;
        object-fit: contain;
        filter: drop-shadow(0 0 14px rgba(168, 85, 247, 0.72));
    }

    .mobile-brand span span {
        color: #a78bfa;
    }

    .mobile-avatar-button {
        position: relative;
        display: flex;
        width: 3rem;
        height: 3rem;
        align-items: center;
        justify-content: center;
    }

    .mobile-avatar-button img {
        width: 2.55rem;
        height: 2.55rem;
        border: 1px solid rgba(196, 181, 253, 0.5);
        border-radius: 999px;
        object-fit: cover;
        box-shadow: 0 0 18px rgba(139, 92, 246, 0.48);
    }

    .mobile-avatar-button span {
        position: absolute;
        right: 0.25rem;
        bottom: 0.25rem;
        width: 0.75rem;
        height: 0.75rem;
        border: 2px solid #07111f;
        border-radius: 999px;
        background: #22c55e;
    }
</style>
