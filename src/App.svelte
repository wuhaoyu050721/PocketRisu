<script lang="ts">
    import { DynamicGUI, settingsOpen, sideBarStore, openPresetList, openModelPresetList, openModelProfileBrowser, openPersonaList, personaSelectCallback, openHypaV3PresetList, openThemePresetList, MobileGUI, loadedStore, alertStore, LoadingStatusState, bookmarkListOpen, popupStore, popUpEditorStore, authStore, desktopTabStore } from './ts/stores.svelte';
    import LoginPage from './lib/Auth/LoginPage.svelte';
    import RegisterPage from './lib/Auth/RegisterPage.svelte';
    import { getAuthConfig, logout, getStoredToken, getUserFromToken, type AuthUser } from './ts/auth';
    import Sidebar from './lib/SideBars/Sidebar.svelte';
    import { DBState } from './ts/stores.svelte';
    import ChatScreen from './lib/ChatScreens/ChatScreen.svelte';
    import AlertComp from './lib/Others/AlertComp.svelte';
    import RealmPopUp from './lib/UI/Realm/RealmPopUp.svelte';
    import GridChars from './lib/Others/GridCatalog.svelte';
    import BookmarkList from './lib/Others/BookmarkList.svelte';
    import Settings from './lib/Setting/Settings.svelte';
    import { showRealmInfoStore, importCharacterProcess } from './ts/characterCards';
    import { importPreset, getDatabase, setDatabase } from './ts/storage/database.svelte';
    import { readModule } from './ts/process/modules';
    import { notifySuccess } from './ts/alert';
    import { language } from './lang';
    import SavePopupIconComp from './lib/Others/SavePopupIcon.svelte';
    import Botpreset from './lib/Setting/botpreset.svelte';
    import Modelpreset from './lib/Setting/modelpreset.svelte';
    import ModelProfileBrowser from './lib/Setting/modelProfileBrowser.svelte';
    import Themepreset from './lib/Setting/themepreset.svelte';
    import ListedPersona from './lib/Setting/listedPersona.svelte';
    import ListedHypaV3Preset from './lib/Setting/listedHypaV3Preset.svelte';
    import MobileHeader from './lib/Mobile/MobileHeader.svelte';
    import MobileBody from './lib/Mobile/MobileBody.svelte';
    import MobileFooter from './lib/Mobile/MobileFooter.svelte';
    import DesktopBottomNav from './lib/Mobile/DesktopBottomNav.svelte';
    import DiscoverPage from './lib/UI/DiscoverPage.svelte';
    import { checkCharOrder } from './ts/globalApi.svelte';
    import { ArrowUpIcon, GlobeIcon, PlusIcon } from '@lucide/svelte';
    import { hypaV3ModalOpen, hypaV3ProgressStore } from "./ts/stores.svelte";
    import HypaV3Modal from './lib/Others/HypaV3Modal.svelte';
    import HypaV3Progress from './lib/Others/HypaV3Progress.svelte';
    import PluginAlertModal from './lib/Others/PluginAlertModal.svelte';
    import PopupEditor from './lib/Others/PopupEditor.svelte';
    import UpdatePopup from './lib/Others/UpdatePopup.svelte';
    import BootBackupPrompt from './lib/Others/BootBackupPrompt.svelte';
    import PopupList from './lib/UI/PopupList.svelte';
    import LoadingOverlay from './lib/Others/LoadingOverlay.svelte';
    import Toaster from './lib/UI/GUI/Toaster.svelte';
    import RequestStatusToaster from './lib/UI/GUI/RequestStatusToaster.svelte';
    import sendSound from './etc/send.mp3'

    let gridOpen = $state(false)
    let aprilFools = $state(new Date().getMonth() === 3 && new Date().getDate() === 1)
    $effect(() => { if ($desktopTabStore === 1) gridOpen = true; else gridOpen = false; });
    let aprilFoolsPage = $state(0)
    let keepingSessionAlive = $state(false)

    // Auth state
    let authPage = $state<'login' | 'register'>('login')
    let showLoginOverlay = $state(false)

    async function initAuth() {
        const config = await getAuthConfig();
        if (config.mode === 'multi') {
            // Check if already logged in (has stored token)
            const token = getStoredToken();
            if (token) {
                import('./ts/globalApi.svelte').then(m => m.forageStorage.injectToken(token));
                // Assume logged in; the actual validation happens on first API call
                $authStore = { mode: 'multi', user: getUserFromToken(token) || { id: 'pending', username: '' }, requireSetup: false };
            } else {
                $authStore = { mode: 'multi', user: null, requireSetup: false };
            }
        } else {
            $authStore = { mode: 'single', user: { id: 'default', username: 'default' }, requireSetup: config.requireSetup };
        }
    }
    initAuth();

    function handleLoginSuccess(user: AuthUser) {
        // Inject token for existing NodeStorage
        const token = getStoredToken();
        if (token) {
            import('./ts/globalApi.svelte').then(m => m.forageStorage.injectToken(token));
        }
        $authStore = { mode: 'multi', user, requireSetup: false };
        showLoginOverlay = false;
    }
    function handleRegisterSuccess(user: AuthUser) {
        const token = getStoredToken();
        if (token) {
            import('./ts/globalApi.svelte').then(m => m.forageStorage.injectToken(token));
        }
        $authStore = { mode: 'multi', user, requireSetup: false };
        showLoginOverlay = false;
    }
    async function handleLogout() {
        await logout();
        $authStore = { mode: 'multi', user: null, requireSetup: false };
        showLoginOverlay = true;
    }
    function openLogin() {
        authPage = 'login';
        showLoginOverlay = true;
    }

    // Listen for login request from sidebar
    $effect(() => {
        function onOpenLogin() { openLogin(); }
        window.addEventListener('risu-open-login', onOpenLogin);
        return () => window.removeEventListener('risu-open-login', onOpenLogin);
    });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main class="bg-bgcolor w-full h-full text-textcolor relative" ondragover={(e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'link'
}} ondrop={async (e) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes('application/x-risu-internal')) {
        return
    }
    const file = e.dataTransfer.files[0]
    if (file) {
        const name = file.name.toLowerCase()

        if (name.endsWith('.risup')) {
            const data = new Uint8Array(await file.arrayBuffer())
            await importPreset({ name: file.name, data })
            notifySuccess(language.successImport)
        } else if (name.endsWith('.risum')) {
            const data = new Uint8Array(await file.arrayBuffer())
            const module = await readModule(Buffer.from(data))
            const db = getDatabase()
            db.modules.push(module)
            notifySuccess(language.successImport)
        } else {
            await importCharacterProcess({
                name: file.name,
                data: file
            })
            checkCharOrder()
        }
    }
}} onclick={() => {
    if(keepingSessionAlive){
        return
    }

    const aliveMode = DBState?.db?.keepSessionAlive
    switch(aliveMode){
        case 'pip':{

            break
        }
        case 'sound':{
            console.log("Starting silent audio to keep session alive")
            const silentAudio = new Audio(sendSound);
            silentAudio.loop = true;
            silentAudio.volume = 0.000001;
            silentAudio.play();
            keepingSessionAlive = true;
            break
        }
    }

}}>
    {#if aprilFools}

        <div class="bg-[#212121] w-full h-screen min-h-screen text-black flex relative">
            <div class="w-full max-w-3xl mx-auto py-8 px-4 flex justify-center items-center">
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <div class="flex flex-col w-full items-center text-[#bbbbbb]">
                    {#if aprilFoolsPage === 0}
                        <h1 class="text-3xl text-white font-bold mb-6">我能帮你什么？</h1>
                        <div class="resize-none relative w-full bg-[#303030] rounded-3xl h-[110px] mb-6 text-[#bbbbbb]" placeholder="问我任何事…" onkeydown={(e) => {
                            if(e.key === 'Enter'){
                                aprilFoolsPage = 1
                            }
                        }}>
                            <textarea class="absolute top-0 left-0 w-full placeholder-[#bbbbbb] rounded-3xl h-full p-4 bg-transparent resize-none" placeholder="问我任何事…"></textarea>
                            <div class="absolute bottom-2 left-4 flex gap-1.5">
                                <button class="p-2 rounded-full border border-[#bbbbbb30]">
                                    <PlusIcon size={18} color="#bbbbbb" />
                                </button>
                                <button class="p-2 rounded-full border border-[#bbbbbb30]">
                                    <GlobeIcon size={18} color="#bbbbbb" />
                                </button>
                                
                            </div>
                            <div class="absolute bottom-2 right-4 flex">
                                <button class="p-2 rounded-full bg-[#bbbbbb]">
                                    <ArrowUpIcon size={18} color="#00000080" />
                                </button>
                            </div>
                        </div>
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <div class="flex gap-1.5" onclick={() => {
                            aprilFoolsPage = 1
                        }}>
                            <button class="rounded-full border border-[#bbbbbb15] px-4 py-2">
                                <span class="text-[#bbbbbb]">🔍</span>
                                Search
                            </button>
                            <button class="rounded-full border border-[#bbbbbb15] px-4 py-2">
                                <span class="text-[#bbbbbb]">🎮</span>
                                Games
                            </button>
                            <button class="rounded-full border border-[#bbbbbb15] px-4 py-2">
                                <span class="text-[#bbbbbb]">🎨</span>
                                Roleplay
                            </button>
                            <button class="rounded-full border border-[#bbbbbb15] px-4 py-2">
                                More
                            </button>
                        </div>
                    {:else}
                    <h1 class="text-3xl text-white font-bold mb-6">
                        We do not have search results.
                    </h1>
                    <p class="text-[#bbbbbb] mb-6">
                        <!-- svelte-ignore a11y_missing_attribute -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        Go to <a class="text-blue-500 cursor-pointer" onclick={() => {
                            aprilFoolsPage = 0
                            aprilFools = false
                        }}>
                            小酒馆  
                        </a>
                    </p>

                    {/if}
                </div>
            </div>
            <span class="absolute top-4 left-4 font-bold text-[#bbbbbb] text-md md:text-lg">RisyGTP-9</span>
        </div>
    {:else if $authStore.mode === 'multi' && !$authStore.user}
        {#if authPage === 'login'}
            <LoginPage onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => authPage = 'register'} />
        {:else}
            <RegisterPage onRegisterSuccess={handleRegisterSuccess} onSwitchToLogin={() => authPage = 'login'} />
        {/if}
    {:else if !$loadedStore}
        <div class="w-full h-full flex justify-center items-center text-textcolor text-xl bg-bgcolor flex-col">
            <div class="flex flex-row items-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-textcolor" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Loading...</span>
            </div>

            <span class="text-sm mt-2 text-textcolor2">{LoadingStatusState.text}</span>
        </div>
    {:else if $settingsOpen}
        <Settings />
    {:else if $MobileGUI}
        <div class="w-full h-full flex flex-col">
            <MobileHeader />
            <MobileBody />
            <MobileFooter />
        </div>
    {:else}
        <div class="desktop-layout">
            <div class="desktop-main">
                {#if gridOpen}
                    <GridChars endGrid={() => {gridOpen = false}} />
                {:else if $desktopTabStore === 2}
                    <DiscoverPage />
                {:else}
                    <ChatScreen />
                {/if}
            </div>
            <DesktopBottomNav
                activeTab={$desktopTabStore}
                onTabChange={(i) => {
                    gridOpen = false;
                    $desktopTabStore = i;
                    if (i === 1) { gridOpen = true; }
                }}
            />
        </div>
    {/if}
    <AlertComp />
    {#if $showRealmInfoStore}
        <RealmPopUp bind:openedData={$showRealmInfoStore} />
    {/if}
    {#if $openPresetList}
        <Botpreset close={() => {$openPresetList = false}} />
    {/if}
    {#if $openModelPresetList}
        <Modelpreset close={() => {$openModelPresetList = false}} />
    {/if}
    {#if $openModelProfileBrowser}
        <ModelProfileBrowser close={() => {$openModelProfileBrowser = false}} />
    {/if}
    {#if $openThemePresetList}
        <Themepreset close={() => {$openThemePresetList = false}} />
    {/if}
    {#if $openPersonaList}
        <ListedPersona close={() => {$openPersonaList = false; $personaSelectCallback = null}} onSelect={$personaSelectCallback} />
    {/if}
    {#if $openHypaV3PresetList}
        <ListedHypaV3Preset close={() => {$openHypaV3PresetList = false}} />
    {/if}
    {#if $bookmarkListOpen}
        <BookmarkList />
    {/if}
    {#if $hypaV3ModalOpen}
        <HypaV3Modal />
    {/if}
    <SavePopupIconComp />
    {#if $hypaV3ProgressStore.open}
        <HypaV3Progress />
    {/if}
    <PluginAlertModal />
    <LoadingOverlay />
    <UpdatePopup />
    <BootBackupPrompt />
    {#if popupStore.children}
        <PopupList />
    {/if}
    {#if popUpEditorStore.open}
        <PopupEditor />
    {/if}
    <Toaster />
    <RequestStatusToaster />

    <!-- Login/Register overlay (triggered from sidebar) -->
    {#if showLoginOverlay}
        {#if authPage === 'login'}
            <LoginPage onLoginSuccess={handleLoginSuccess} onSwitchToRegister={() => authPage = 'register'} />
        {:else}
            <RegisterPage onRegisterSuccess={handleRegisterSuccess} onSwitchToLogin={() => authPage = 'login'} />
        {/if}
    {/if}
</main>

<style>
    .desktop-layout {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }

    .desktop-main {
        flex: 1;
        width: 100%;
        min-height: 0;
        overflow: hidden;
    }
</style>
