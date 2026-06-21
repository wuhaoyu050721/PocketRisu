<script lang="ts">
    import { AccessibilityIcon, ActivityIcon, PackageIcon, BotIcon, CodeIcon, CogIcon, ContactIcon, FlaskConicalIcon, ImageIcon, LanguagesIcon, MonitorIcon, MonitorSmartphoneIcon, Sailboat, ScrollTextIcon, UserIcon, CircleXIcon, KeyboardIcon, TruckIcon, FileBoxIcon, Volume2Icon } from "@lucide/svelte";
    import { language } from "src/lang";
    import DisplaySettings from "./Pages/DisplaySettings.svelte";
    import NotificationSoundSettings from "./Pages/NotificationSoundSettings.svelte";
    import MigrationSettings from "./Pages/MigrationSettings.svelte";
    import BotSettings from "./Pages/BotSettings.svelte";
    import ModelPresetSettings from "./Pages/Model/ModelPresetSettings.svelte";
    import PromptPresetSettings from "./Pages/PromptPresetSettings.svelte";
    import OtherBotSettings from "./Pages/OtherBotSettings.svelte";
    import PluginSettings from "./Pages/PluginSettings.svelte";
    import FilesSettings from "./Pages/FilesSettings.svelte";
    import AdvancedSettings from "./Pages/AdvancedSettings.svelte";
    import SystemSettings from "./Pages/SystemSettings.svelte";
    import { additionalSettingsMenu, MobileGUI, SettingsMenuIndex, settingsOpen } from "src/ts/stores.svelte";
    import { DBState } from "src/ts/stores.svelte";
    import GlobalLoreBookSettings from "./Pages/GlobalLoreBookSettings.svelte";
    import Lorepreset from "./lorepreset.svelte";
    import GlobalRegex from "./Pages/GlobalRegex.svelte";
    import LanguageSettings from "./Pages/LanguageSettings.svelte";
    import AccessibilitySettings from "./Pages/AccessibilitySettings.svelte";
    import PersonaSettings from "./Pages/PersonaSettings.svelte";
    import PromptSettings from "./Pages/PromptSettings.svelte";
    import ModuleSettings from "./Pages/Module/ModuleSettings.svelte";
  import { isLite } from "src/ts/lite";
    import HotkeySettings from "./Pages/HotkeySettings.svelte";
    import InlayImageGallery from "./Pages/InlayImageGallery.svelte";
    import RemoteAccessSettings from "./Pages/RemoteAccessSettings.svelte";
    import PluginDefinedIcon from "../Others/PluginDefinedIcon.svelte";
    import DevPanel from "src/lib/_dev/DevPanel.svelte";

    // Dev panel is opt-in via localStorage['risu-dev-panel']='1' in devtools.
    // Read once on mount — flag changes require reload. Gates both the menu
    // button below and the route render branch (SettingsMenuIndex === 99).
    const devPanelEnabled = typeof localStorage !== 'undefined'
        && localStorage.getItem('risu-dev-panel') === '1';

    let openLoreList = $state(false)
    if(window.innerWidth >= 900 && $SettingsMenuIndex === -1 && !$MobileGUI){
        $SettingsMenuIndex = 1
    }

</script>
<div class="settings-shell h-full w-full flex justify-center rs-setting-cont" class:bg-bgcolor={$MobileGUI} class:setting-bg={!$MobileGUI}>
    <div class="settings-frame h-full max-w-4xl w-full flex relative rs-setting-cont-2">
        {#if (window.innerWidth >= 700 && !$MobileGUI) || $SettingsMenuIndex === -1}
            <div class="settings-menu flex h-full flex-col p-4 pt-8 gap-2 overflow-y-auto relative rs-setting-cont-3 shrink-0"
                class:w-full={window.innerWidth < 700 || $MobileGUI}
                class:bg-darkbg={!$MobileGUI} class:bg-bgcolor={$MobileGUI}
            >
                <div class="settings-menu-hero">
                    <div class="settings-mark">
                        <CogIcon size={22} />
                    </div>
                    <div>
                        <span>小酒馆</span>
                        <strong>{language.settings}</strong>
                    </div>
                </div>
                
                {#if !$isLite}
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 1 || $SettingsMenuIndex === 13}
                        class:text-textcolor2={$SettingsMenuIndex !== 1 && $SettingsMenuIndex !== 13}
                        onclick={() => {
                            $SettingsMenuIndex = 1

                    }}>
                        <BotIcon />
                        <span>{language.chatBot}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 16}
                        class:text-textcolor2={$SettingsMenuIndex !== 16}
                        onclick={() => {
                            $SettingsMenuIndex = 16
                    }}>
                        <FileBoxIcon />
                        <span>{language.modelPresetMenu}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 17}
                        class:text-textcolor2={$SettingsMenuIndex !== 17}
                        onclick={() => {
                            $SettingsMenuIndex = 17
                    }}>
                        <ScrollTextIcon />
                        <span>{language.promptPresetMenu}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 12}
                        class:text-textcolor2={$SettingsMenuIndex !== 12}
                        onclick={() => {
                            $SettingsMenuIndex = 12
                    }}>
                        <ContactIcon />
                        <span>{language.persona}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 2}
                        class:text-textcolor2={$SettingsMenuIndex !== 2}
                        onclick={() => {
                            $SettingsMenuIndex = 2
                    }}>
                        <Sailboat />
                        <span>{language.otherBots}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 3}
                        class:text-textcolor2={$SettingsMenuIndex !== 3}
                        onclick={() => {
                            $SettingsMenuIndex = 3
                    }}>
                        <MonitorIcon />
                        <span>{language.display}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 7}
                        class:text-textcolor2={$SettingsMenuIndex !== 7}
                        onclick={() => {
                            $SettingsMenuIndex = 7
                    }}>
                        <Volume2Icon />
                        <span>{language.soundAndNotification}</span>
                    </button>
                {/if}
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={$SettingsMenuIndex === 10}
                    class:text-textcolor2={$SettingsMenuIndex !== 10}
                    onclick={() => {
                        $SettingsMenuIndex = 10
                }}>
                    <LanguagesIcon />
                    <span>{language.language}</span>
                </button>
                {#if !$isLite}
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 11}
                        class:text-textcolor2={$SettingsMenuIndex !== 11}
                        onclick={() => {
                            $SettingsMenuIndex = 11
                    }}>
                        <AccessibilityIcon />
                        <span>{language.accessibility}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 14}
                        class:text-textcolor2={$SettingsMenuIndex !== 14}
                        onclick={() => {
                            $SettingsMenuIndex = 14
                    }}>
                        <PackageIcon />
                        <span>{language.modules}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 4}
                        class:text-textcolor2={$SettingsMenuIndex !== 4}
                        onclick={() => {
                        $SettingsMenuIndex = 4
                    }}>
                        <CodeIcon />
                        <span>{language.plugin}</span>
                    </button>
                {/if}
                <button class="flex gap-2 items-center hover:text-textcolor"
                    class:text-textcolor={$SettingsMenuIndex === 0}
                    class:text-textcolor2={$SettingsMenuIndex !== 0}
                    onclick={() => {
                        $SettingsMenuIndex = 0
                }}>
                    <TruckIcon />
                    <span>{language.migration}</span>
                </button>
                <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 15}
                        class:text-textcolor2={$SettingsMenuIndex !== 15}
                        onclick={() => {
                        $SettingsMenuIndex = 15
                    }}>
                        <KeyboardIcon />
                        <span>{language.hotkey}</span>
                    </button>
                {#if !$isLite}
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 23}
                        class:text-textcolor2={$SettingsMenuIndex !== 23}
                        onclick={() => {
                        $SettingsMenuIndex = 23
                    }}>
                        <ImageIcon />
                        <span>{language.playground.inlayImageGallery}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 21}
                        class:text-textcolor2={$SettingsMenuIndex !== 21}
                        onclick={() => {
                        $SettingsMenuIndex = 21
                    }}>
                        <MonitorSmartphoneIcon />
                        <span>{language.remoteAccess}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 6}
                        class:text-textcolor2={$SettingsMenuIndex !== 6}
                        onclick={() => {
                        $SettingsMenuIndex = 6
                    }}>
                        <ActivityIcon />
                        <span>{language.advancedSettings}</span>
                    </button>
                    <button class="flex gap-2 items-center hover:text-textcolor"
                        class:text-textcolor={$SettingsMenuIndex === 22}
                        class:text-textcolor2={$SettingsMenuIndex !== 22}
                        onclick={() => {
                        $SettingsMenuIndex = 22
                    }}>
                        <CogIcon />
                        <span>{language.system}</span>
                    </button>
                    {#if devPanelEnabled}
                        <button class="flex gap-2 items-center hover:text-textcolor"
                            class:text-textcolor={$SettingsMenuIndex === 99}
                            class:text-textcolor2={$SettingsMenuIndex !== 99}
                            onclick={() => {
                            $SettingsMenuIndex = 99
                        }}>
                            <FlaskConicalIcon />
                            <span>Dev Panel</span>
                        </button>
                    {/if}
                    {#if additionalSettingsMenu.length > 0}
                        <div class="border-t border-selected mt-2 pt-2">
                            <span class="text-textcolor2 text-xs ml-1">{language.plugin}</span>
                        </div>
                    {/if}
                    {#each additionalSettingsMenu as menu}
                        <button class="flex gap-2 items-center hover:text-textcolor text-textcolor2"
                            onclick={() => {
                                menu.callback()
                        }}>
                            <PluginDefinedIcon ico={menu} />
                            <span>{menu.name}</span>
                        </button>
                    {/each}

                {/if}
                {#if window.innerWidth < 700 && !$MobileGUI}
                    <button class="absolute top-2 right-2 hover:text-primary text-textcolor" onclick={() => {
                        settingsOpen.set(false)
                    }}> <CircleXIcon size={DBState.db.settingsCloseButtonSize} /> </button>
                {/if}
            </div>
        {/if}
        {#if (window.innerWidth >= 700 && !$MobileGUI) || $SettingsMenuIndex !== -1}
            {#key $SettingsMenuIndex}
                <div class="settings-panel grow py-6 px-4 bg-bgcolor flex flex-col text-textcolor overflow-y-auto relative rs-setting-cont-4 min-w-0">
                    <div class="settings-content-card w-full max-w-2xl mx-auto flex flex-col">
                        {#if $SettingsMenuIndex === 0}
                            <MigrationSettings />
                        {:else if $SettingsMenuIndex === 1}
                            <BotSettings />
                        {:else if $SettingsMenuIndex === 2}
                            <OtherBotSettings />
                        {:else if $SettingsMenuIndex === 3}
                            <DisplaySettings />
                        {:else if $SettingsMenuIndex === 7}
                            <NotificationSoundSettings />
                        {:else if $SettingsMenuIndex === 4}
                            <PluginSettings />
                        {:else if $SettingsMenuIndex === 5}
                            <FilesSettings />
                        {:else if $SettingsMenuIndex === 6}
                            <AdvancedSettings />
                        {:else if $SettingsMenuIndex === 8}
                            <GlobalLoreBookSettings bind:openLoreList />
                        {:else if $SettingsMenuIndex === 9}
                            <GlobalRegex/>
                        {:else if $SettingsMenuIndex === 10}
                            <LanguageSettings/>
                        {:else if $SettingsMenuIndex === 11}
                            <AccessibilitySettings/>
                        {:else if $SettingsMenuIndex === 12}
                            <PersonaSettings/>
                        {:else if $SettingsMenuIndex === 14}
                            <ModuleSettings/>
                        {:else if $SettingsMenuIndex === 13}
                            <PromptSettings onGoBack={() => {
                                $SettingsMenuIndex = 1
                            }}/>
                        {:else if $SettingsMenuIndex === 15 && window.innerWidth >= 768}
                            <HotkeySettings/>
                        {:else if $SettingsMenuIndex === 16}
                            <ModelPresetSettings/>
                        {:else if $SettingsMenuIndex === 17}
                            <PromptPresetSettings/>
                        {:else if $SettingsMenuIndex === 23}
                            <InlayImageGallery/>
                        {:else if $SettingsMenuIndex === 21}
                            <RemoteAccessSettings/>
                        {:else if $SettingsMenuIndex === 22}
                            <SystemSettings/>
                        {:else if $SettingsMenuIndex === 99 && devPanelEnabled}
                            <DevPanel/>
                        {/if}
                    </div>
            </div>
            {/key}
            {#if !$MobileGUI}
                <button class="settings-close-button absolute top-2 right-2 hover:text-primary text-textcolor" onclick={() => {
                    if(window.innerWidth >= 700){
                        settingsOpen.set(false)
                    }
                    else{
                        $SettingsMenuIndex = -1
                    }
                }}>
                    <CircleXIcon size={DBState.db.settingsCloseButtonSize} />
                </button>
            {/if}
        {/if}
    </div>
</div>
{#if openLoreList}
    <Lorepreset close={() => {openLoreList = false}} />
{/if}
<style>
    .setting-bg{
        background:
            radial-gradient(circle at 72% 0%, rgba(139, 92, 246, 0.2), transparent 28rem),
            radial-gradient(circle at 10% 24%, rgba(59, 130, 246, 0.14), transparent 24rem),
            linear-gradient(135deg, #030712 0%, #07111f 48%, #050816 100%);
    }

    .settings-shell {
        color: #e5e7eb;
    }

    .settings-frame {
        overflow: hidden;
        border-inline: 1px solid rgba(148, 163, 184, 0.12);
        background: rgba(2, 6, 23, 0.34);
        box-shadow: 0 2rem 4rem rgba(2, 6, 23, 0.24);
    }

    .settings-menu {
        width: min(18rem, 38vw);
        border-right: 1px solid rgba(148, 163, 184, 0.14);
        background:
            radial-gradient(circle at 80% 0%, rgba(168, 85, 247, 0.18), transparent 13rem),
            linear-gradient(180deg, rgba(3, 8, 20, 0.96), rgba(8, 13, 28, 0.98)) !important;
        scrollbar-width: thin;
    }

    .settings-menu-hero {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.65rem;
        padding: 0.9rem;
        border: 1px solid rgba(167, 139, 250, 0.22);
        border-radius: 0.85rem;
        background:
            radial-gradient(circle at 90% 10%, rgba(236, 72, 153, 0.16), transparent 7rem),
            linear-gradient(135deg, rgba(30, 41, 59, 0.72), rgba(15, 23, 42, 0.68));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .settings-mark {
        display: grid;
        width: 2.75rem;
        height: 2.75rem;
        flex: 0 0 auto;
        place-items: center;
        border: 1px solid rgba(196, 181, 253, 0.32);
        border-radius: 0.75rem;
        color: #c4b5fd;
        background: rgba(88, 28, 135, 0.28);
        box-shadow: 0 0 1.3rem rgba(139, 92, 246, 0.22);
    }

    .settings-menu-hero div:last-child {
        display: flex;
        min-width: 0;
        flex-direction: column;
    }

    .settings-menu-hero span {
        color: #aeb9d2;
        font-size: 0.74rem;
        font-weight: 900;
        letter-spacing: 0;
    }

    .settings-menu-hero strong {
        overflow: hidden;
        color: #f8fafc;
        font-size: 1.15rem;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .settings-menu :global(button) {
        min-height: 2.75rem;
        padding: 0 0.75rem;
        border: 1px solid transparent;
        border-radius: 0.72rem;
        text-align: left;
        transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, transform 0.15s ease;
    }

    .settings-menu :global(button svg) {
        width: 1.18rem;
        height: 1.18rem;
        flex: 0 0 auto;
    }

    .settings-menu :global(button span) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.92rem;
        font-weight: 750;
    }

    .settings-menu :global(button:hover) {
        border-color: rgba(167, 139, 250, 0.26);
        background: rgba(30, 41, 59, 0.54);
        color: #f8fafc;
    }

    .settings-menu :global(button.text-textcolor) {
        border-color: rgba(167, 139, 250, 0.42);
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.3), rgba(37, 99, 235, 0.16));
        color: #f5f3ff;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 0.8rem 1.6rem rgba(30, 64, 175, 0.12);
    }

    .settings-panel {
        background:
            radial-gradient(circle at 88% 4%, rgba(59, 130, 246, 0.1), transparent 18rem),
            linear-gradient(180deg, rgba(8, 13, 28, 0.96), rgba(5, 10, 22, 0.98)) !important;
        scrollbar-width: thin;
    }

    .settings-content-card {
        min-height: min-content;
        gap: 0.65rem;
        padding: 1.15rem;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 1rem;
        background:
            radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.1), transparent 12rem),
            rgba(15, 23, 42, 0.56);
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .settings-content-card :global(h1),
    .settings-content-card :global(h2),
    .settings-content-card :global(h3) {
        letter-spacing: 0;
        color: #f8fafc;
    }

    .settings-content-card :global(.text-textcolor2) {
        color: #9aa8bf;
    }

    .settings-content-card :global(input),
    .settings-content-card :global(textarea),
    .settings-content-card :global(select) {
        border-color: rgba(148, 163, 184, 0.18) !important;
        background-color: rgba(2, 6, 23, 0.35) !important;
    }

    .settings-content-card :global(.border-darkborderc),
    .settings-content-card :global(.border-selected),
    .settings-content-card :global(.border-borderc) {
        border-color: rgba(148, 163, 184, 0.18) !important;
    }

    .settings-content-card :global(.bg-darkbg),
    .settings-content-card :global(.bg-bgcolor) {
        background-color: rgba(2, 6, 23, 0.28) !important;
    }

    .settings-close-button {
        display: grid;
        width: 2.5rem;
        height: 2.5rem;
        place-items: center;
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.78);
        color: #cbd5e1;
        box-shadow: 0 0.75rem 1.6rem rgba(2, 6, 23, 0.2);
    }

    @media (max-width: 48rem) {
        .settings-shell {
            background:
                radial-gradient(circle at 84% 0%, rgba(168, 85, 247, 0.18), transparent 15rem),
                linear-gradient(180deg, #020713 0%, #050b17 100%) !important;
        }

        .settings-frame {
            border-inline: 0;
            box-shadow: none;
        }

        .settings-menu {
            width: 100%;
            padding: 0.75rem 0.9rem 1rem !important;
            background: transparent !important;
            border-right: 0;
        }

        .settings-menu-hero {
            min-height: 4.4rem;
            border-radius: 0.8rem;
        }

        .settings-menu :global(button) {
            min-height: 3rem;
            border-color: rgba(148, 163, 184, 0.12);
            background: rgba(15, 23, 42, 0.48);
        }

        .settings-panel {
            padding: 0.75rem 0.9rem 1rem !important;
            background: transparent !important;
        }

        .settings-content-card {
            padding: 0.85rem;
            border-radius: 0.85rem;
        }
    }
</style>
