<script lang="ts">
    import { ArrowLeft, CogIcon, BotIcon, MonitorIcon, ScrollTextIcon, PackageIcon, ActivityIcon, LanguagesIcon, Volume2Icon, TruckIcon, KeyboardIcon, UserIcon, FileBoxIcon, ContactIcon, CodeIcon, Sailboat, AccessibilityIcon, ImageIcon, MonitorSmartphoneIcon, BookIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import DisplaySettings from "./Pages/DisplaySettings.svelte";
    import NotificationSoundSettings from "./Pages/NotificationSoundSettings.svelte";
    import MigrationSettings from "./Pages/MigrationSettings.svelte";
    import BotSettings from "./Pages/BotSettings.svelte";
    import ModelPresetSettings from "./Pages/Model/ModelPresetSettings.svelte";
    import PromptPresetSettings from "./Pages/PromptPresetSettings.svelte";
    import OtherBotSettings from "./Pages/OtherBotSettings.svelte";
    import PluginSettings from "./Pages/PluginSettings.svelte";
    import AdvancedSettings from "./Pages/AdvancedSettings.svelte";
    import SystemSettings from "./Pages/SystemSettings.svelte";
    import GlobalLoreBookSettings from "./Pages/GlobalLoreBookSettings.svelte";
    import GlobalRegex from "./Pages/GlobalRegex.svelte";
    import LanguageSettings from "./Pages/LanguageSettings.svelte";
    import AccessibilitySettings from "./Pages/AccessibilitySettings.svelte";
    import PersonaSettings from "./Pages/PersonaSettings.svelte";
    import PromptSettings from "./Pages/PromptSettings.svelte";
    import ModuleSettings from "./Pages/Module/ModuleSettings.svelte";
    import HotkeySettings from "./Pages/HotkeySettings.svelte";
    import InlayImageGallery from "./Pages/InlayImageGallery.svelte";
    import RemoteAccessSettings from "./Pages/RemoteAccessSettings.svelte";
    import { isLite } from "src/ts/lite";
    import { additionalSettingsMenu, MobileGUI, SettingsMenuIndex, settingsOpen, desktopTabStore } from "src/ts/stores.svelte";
    import { DBState } from "src/ts/stores.svelte";
    import PluginDefinedIcon from "../Others/PluginDefinedIcon.svelte";
    import { CircleXIcon } from "@lucide/svelte";
    import DesktopBottomNav from "../Mobile/DesktopBottomNav.svelte";

    if(window.innerWidth >= 900 && $SettingsMenuIndex === -1 && !$MobileGUI){
        $SettingsMenuIndex = 1
    }

    function back() {
        $SettingsMenuIndex = -1;
    }
</script>

<div class="settings-root" class:mobile={$MobileGUI || window.innerWidth < 700}>
    {#if $SettingsMenuIndex === -1}
        <!-- ═══ Menu list (matching settings.html design) ═══ -->
        <div class="settings-page">
            <div class="settings-hd">
                <h1>{language.settings}</h1>
                {#if !$MobileGUI && window.innerWidth >= 700}
                    <button class="close-btn" onclick={() => settingsOpen.set(false)}><CircleXIcon size={24} /></button>
                {/if}
            </div>

            <!-- User card -->
            <div class="user-card">
                <div class="user-avatar"></div>
                <div class="user-info">
                    <div class="user-name">{DBState.db?.account?.username ?? 'admin'}</div>
                    <div class="user-role">管理员 · 多用户模式</div>
                </div>
            </div>

            <!-- Section: 模型与接口 -->
            <div class="sec-label">模型与接口</div>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 1}>
                <div class="set-left"><div class="set-icon"><BotIcon /></div><span>聊天机器人</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 16}>
                <div class="set-left"><div class="set-icon"><FileBoxIcon /></div><span>{language.modelPresetMenu}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 17}>
                <div class="set-left"><div class="set-icon"><ScrollTextIcon /></div><span>{language.promptPresetMenu}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 12}>
                <div class="set-left"><div class="set-icon"><ContactIcon /></div><span>{language.persona}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 2}>
                <div class="set-left"><div class="set-icon"><Sailboat /></div><span>{language.otherBots}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <!-- Section: 显示与外观 -->
            <div class="sec-label">显示与外观</div>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 3}>
                <div class="set-left"><span style="margin-left:44px;">{language.display}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 10}>
                <div class="set-left"><span style="margin-left:44px;">{language.language}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 11}>
                <div class="set-left"><span style="margin-left:44px;">{language.accessibility}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 7}>
                <div class="set-left"><span style="margin-left:44px;">{language.soundAndNotification}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <!-- Section: 提示词与角色 -->
            <div class="sec-label">提示词与角色</div>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 13}>
                <div class="set-left"><div class="set-icon"><ScrollTextIcon /></div><span>{language.prompt}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 8}>
                <div class="set-left"><div class="set-icon"><BookIcon /></div><span>{language.loreBook}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 9}>
                <div class="set-left"><div class="set-icon"><CodeIcon /></div><span>全局 Regex</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <!-- Section: 插件与扩展 -->
            <div class="sec-label">插件与扩展</div>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 4}>
                <div class="set-left"><div class="set-icon"><CodeIcon /></div><span>{language.plugin}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 14}>
                <div class="set-left"><div class="set-icon"><PackageIcon /></div><span>{language.modules}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>

            <!-- Section: 系统 -->
            <div class="sec-label">系统</div>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 0}>
                <div class="set-left"><span style="margin-left:44px;">{language.migration}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 15}>
                <div class="set-left"><span style="margin-left:44px;">{language.hotkey}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button class="set-row" onclick={() => $SettingsMenuIndex = 22}>
                <div class="set-left"><span style="margin-left:44px;">{language.system}</span></div>
                <svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="m9 18 6-6-6-6"/></svg>
            </button>
        </div>
    {:else}
        <!-- ═══ Sub-page view ═══ -->
        <div class="settings-page">
            <div class="settings-hd">
                <button class="back-btn" onclick={back}><ArrowLeft size={20} /></button>
                <h1>{language.settings}</h1>
                {#if !$MobileGUI && window.innerWidth >= 700}
                    <button class="close-btn" onclick={() => settingsOpen.set(false)}><CircleXIcon size={24} /></button>
                {/if}
            </div>
            {#key $SettingsMenuIndex}
                {#if $SettingsMenuIndex === 0}<MigrationSettings />
                {:else if $SettingsMenuIndex === 1}<BotSettings />
                {:else if $SettingsMenuIndex === 2}<OtherBotSettings />
                {:else if $SettingsMenuIndex === 3}<DisplaySettings />
                {:else if $SettingsMenuIndex === 7}<NotificationSoundSettings />
                {:else if $SettingsMenuIndex === 4}<PluginSettings />
                {:else if $SettingsMenuIndex === 6}<AdvancedSettings />
                {:else if $SettingsMenuIndex === 8}<GlobalLoreBookSettings />
                {:else if $SettingsMenuIndex === 9}<GlobalRegex />
                {:else if $SettingsMenuIndex === 10}<LanguageSettings />
                {:else if $SettingsMenuIndex === 11}<AccessibilitySettings />
                {:else if $SettingsMenuIndex === 12}<PersonaSettings />
                {:else if $SettingsMenuIndex === 14}<ModuleSettings />
                {:else if $SettingsMenuIndex === 13}<PromptSettings />
                {:else if $SettingsMenuIndex === 15}<HotkeySettings />
                {:else if $SettingsMenuIndex === 16}<ModelPresetSettings />
                {:else if $SettingsMenuIndex === 17}<PromptPresetSettings />
                {:else if $SettingsMenuIndex === 23}<InlayImageGallery />
                {:else if $SettingsMenuIndex === 21}<RemoteAccessSettings />
                {:else if $SettingsMenuIndex === 22}<SystemSettings />
                {/if}
            {/key}
        </div>
    {/if}
    <DesktopBottomNav activeTab={3} onTabChange={(i) => {
        if (i !== 3) {
            $desktopTabStore = i;
            settingsOpen.set(false);
        }
    }} />
</div>

<style>
    .settings-root {
        position: fixed;
        inset: 0;
        z-index: 50;
        background: var(--risu-theme-bgcolor);
        display: flex;
        flex-direction: column;
        padding-bottom: 0;
        color: var(--risu-theme-textcolor);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        overflow-y: auto;
        display: flex;
        justify-content: center;
    }

    .settings-root.mobile {
        position: relative;
        inset: auto;
        z-index: auto;
        height: 100%;
    }

    .settings-page {
        width: 100%;
        max-width: 520px;
        padding: 16px 0 40px;
    }

    .settings-hd {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 20px 12px;
    }

    .settings-hd h1 {
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 0;
        flex: 1;
    }

    .back-btn, .close-btn {
        width: 36px; height: 36px;
        border-radius: 999px;
        background: transparent;
        border: 0;
        color: var(--risu-theme-textcolor);
        display: grid; place-items: center;
        cursor: pointer;
        flex-shrink: 0;
    }

    .back-btn:hover, .close-btn:hover { color: var(--risu-theme-primary); }

    /* User card */
    .user-card {
        margin: 0 20px 8px;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 14px;
        padding: 16px;
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .user-avatar {
        width: 44px; height: 44px;
        border-radius: 50%;
        background: linear-gradient(135deg, color-mix(in oklch, var(--risu-theme-primary) 14%, transparent), color-mix(in oklch, var(--risu-theme-textcolor) 6%, transparent)), var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
    }

    .user-name { font-size: 16px; font-weight: 600; }
    .user-role { font-size: 12px; color: var(--risu-theme-textcolor2); }

    /* Section labels */
    .sec-label {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--risu-theme-textcolor2);
        padding: 16px 20px 6px;
    }

    /* Setting rows */
    .set-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 20px;
        border-top: 1px solid var(--risu-theme-borderc);
        width: 100%;
        background: transparent;
        border-left: 0; border-right: 0; border-bottom: 0;
        color: var(--risu-theme-textcolor);
        font-family: inherit;
        font-size: 15px;
        cursor: pointer;
        text-align: left;
        transition: background 0.15s;
        min-height: 56px;
    }

    .set-row:first-child { border-top: 0; }

    .set-row:hover {
        background: color-mix(in oklch, var(--risu-theme-primary) 8%, transparent);
    }

    .set-left {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .set-icon {
        width: 32px; height: 32px;
        border-radius: 8px;
        background: color-mix(in oklch, var(--risu-theme-primary) 14%, transparent);
        display: grid; place-items: center;
        flex-shrink: 0;
    }

    .set-icon :global(svg) {
        width: 16px; height: 16px;
        stroke: var(--risu-theme-textcolor);
        fill: none;
        stroke-width: 1.8;
    }
</style>
