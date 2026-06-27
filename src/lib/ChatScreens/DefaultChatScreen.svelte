<script lang="ts">

    import Suggestion from './Suggestion.svelte';
    import { CameraIcon, ChevronUpIcon, ChevronDownIcon, ChevronsUpIcon, ChevronsDownIcon, DatabaseIcon, GlobeIcon, ImageIcon, ImagePlusIcon, LanguagesIcon, Laugh, MenuIcon, MicOffIcon, PackageIcon, Plus, RefreshCcwIcon, ReplyIcon, Send, StepForwardIcon, XIcon, BrainIcon, ArrowDown, ZapIcon, Maximize2, Minimize2 } from "@lucide/svelte";
    import ShDropdownMenu from 'src/lib/UI/GUI/ShDropdownMenu.svelte';
    import ShDropdownMenuTrigger from 'src/lib/UI/GUI/ShDropdownMenuTrigger.svelte';
    import ShDropdownMenuContent from 'src/lib/UI/GUI/ShDropdownMenuContent.svelte';
    import ShDropdownMenuItem from 'src/lib/UI/GUI/ShDropdownMenuItem.svelte';
    import { selectedCharID, PlaygroundStore, createSimpleCharacter, hypaV3ModalOpen, ScrollToMessageStore, additionalChatMenu, additionalFloatingActionButtons, chatDeselected, chatPanelStore } from "../../ts/stores.svelte";
    import { tick, untrack } from 'svelte';
    import Chat from "./Chat.svelte";
    import { getAdditionalChatLoadPages, getInitialChatLoadPages } from 'src/ts/chatLoadPages';
    import { type Chat as ChatData, type Message } from "../../ts/storage/database.svelte";
    import { DBState, settingsOpen, SettingsMenuIndex } from 'src/ts/stores.svelte';
    import { getCharThumbnail } from "../../ts/characters";
    import { chatProcessStage, doingChat, sendChat } from "../../ts/process/index.svelte";
    import { ensureCurrentChatReady } from "../../ts/storage/chatStorage";
    import { sleep } from "../../ts/util";
    import { language } from "../../lang";
    import { isExpTranslator, translate } from "../../ts/translator/translator";
    import { alertError, alertWait, notifySuccess, notifyError } from "../../ts/alert";
    import { playNotificationSound } from '../../ts/notificationSound'
import { isMobile } from 'src/ts/platform'
    import { processScript } from "src/ts/process/scripts";
    import CreatorQuote from "./CreatorQuote.svelte";
    import { stopTTS } from "src/ts/process/tts";
    import HomePage from '../UI/HomePage.svelte';
    import CharConfig from '../SideBars/CharConfig.svelte';
    import SideChatList from '../SideBars/SideChatList.svelte';
    import AssetInput from './AssetInput.svelte';
    import { scrollWithinContainer } from './scrollWithin';
    import { aiLawApplies, chatFoldedState, chatFoldedStateMessageIndex, downloadFile } from 'src/ts/globalApi.svelte';
    import { runTrigger } from 'src/ts/process/triggers';
    import { v4 } from 'uuid';
    import { processMultiCommand } from 'src/ts/process/command';
    import { postChatFile } from 'src/ts/process/files/multisend';
    import { getInlayAsset } from 'src/ts/process/files/inlays';
    import { quickMenu } from 'src/ts/hotkey';
    import { loadChatDraft, scheduleSaveChatDraft, flushChatDraft, removeChatDraft } from 'src/ts/storage/chatDraft';

    import Chats from './Chats.svelte';
    import Button from '../UI/GUI/Button.svelte';
    import PluginDefinedIcon from '../Others/PluginDefinedIcon.svelte';

    const loadPlaygroundMenu = () => import('../Playground/PlaygroundMenu.svelte').then(m => m.default);

    // Whether an Enter keydown should send (vs insert a newline), based on the
    // per-platform send-key mode. Mobile uses sendKeyMobile, desktop sendKeyPC.
    function shouldSendOnEnter(e: KeyboardEvent): boolean {
        const mode = isMobile ? DBState.db.sendKeyMobile : DBState.db.sendKeyPC;
        // Match the configured combo EXACTLY — every other modifier must be absent,
        // so e.g. Alt+Enter or Ctrl+Shift+Enter inserts a newline instead of sending.
        switch (mode) {
            case 'enter': return !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;
            case 'ctrl-enter': return (e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey;
            case 'shift-enter': return e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey;
            default: return false; // 'button'
        }
    }

    interface Props {
        openModuleList?: boolean;
        openChatList?: boolean;
        customStyle?: string;
    }

    let messageInput:string = $state('')
    let messageInputTranslate:string = $state('')
    let openMenu = $state(false)
    let loadPages = $state(getInitialChatLoadPages(DBState.db))
    let doingChatInputTranslate = false
    let toggleStickers:boolean = $state(false)
    let fileInput:string[] = $state([])
    let showNewMessageButton = $state(false)
    let showScrollNav = $state(false)
    let scrollNavTimer: ReturnType<typeof setTimeout> | null = null
    let chatsInstance: any = $state()
    let isScrollingToMessage = $state(false)
    let { openModuleList = $bindable(false), openChatList = $bindable(false), customStyle = '' }: Props = $props();
    let headerMenuOpen = $state(false);
    let showSideCharConfig = $state(false);
    let showSideChatList = $state(false);
    let headerAvatarCss = $state('');
    let currentCharacter = $derived(DBState.db.characters[$selectedCharID])
    let currentChatSlot = $derived(currentCharacter?.chats[currentCharacter.chatPage])
    let currentChatReady = $derived(!!currentChatSlot && !currentChatSlot._placeholder)
    let currentChat = $derived(currentChatReady ? currentChatSlot.message : [])
    let currentChatFmIndex = $derived(currentChatReady ? (currentChatSlot.fmIndex ?? -1) : -1)

    // Load header avatar CSS asynchronously
    $effect(() => {
        if (currentCharacter?.image && !DBState.db.hideAllImages) {
            getCharThumbnail(currentCharacter.image, 'css').then(css => headerAvatarCss = css);
        } else {
            headerAvatarCss = '';
        }
    });

    // ─── Per-chat composer draft ────────────────────────────────────────────
    // The message input is kept per chat, stored outside the chat body, so it
    // survives unmounting the chat view (e.g. accidentally opening Settings while
    // composing a long message). Keyed by character + chat id.
    let draftChaId = $derived(currentCharacter?.chaId ?? '')
    let draftChatId = $derived(currentChatSlot?.id ?? '')
    let draftLoading = $state(false)

    function persistDraftNow() {
        flushChatDraft(draftChaId, draftChatId, { m: messageInput, t: messageInputTranslate })
    }

    // Load on chat enter (keyed by id, so no wait for hydration); flush the
    // latest text for the chat being left on switch / unmount.
    $effect(() => {
        const chaId = draftChaId
        const chatId = draftChatId
        if (!chaId || !chatId) return
        untrack(() => { messageInput = ''; messageInputTranslate = ''; draftLoading = true })
        let active = true
        ;(async () => {
            const draft = await loadChatDraft(chaId, chatId)
            if (!active) return
            untrack(() => {
                // Don't clobber text the user began typing during the load.
                if (draft && messageInput === '' && messageInputTranslate === '') {
                    messageInput = draft.m
                    messageInputTranslate = draft.t
                }
                draftLoading = false
            })
            // Resize the textarea to fit the cleared/loaded text (height is
            // updated imperatively, not reactively to messageInput).
            await tick()
            if (active) updateInputSizeAll()
        })()
        return () => {
            active = false
            flushChatDraft(chaId, chatId, {
                m: untrack(() => messageInput),
                t: untrack(() => messageInputTranslate),
            })
        }
    })

    // Debounced save while typing (each write is a network round-trip, so it is
    // coalesced). Suppressed during the initial load to avoid racing it.
    $effect(() => {
        const chaId = draftChaId
        const chatId = draftChatId
        const m = messageInput
        const t = messageInputTranslate
        if (!chaId || !chatId || draftLoading) return
        scheduleSaveChatDraft(chaId, chatId, { m, t })
    })

    // Best-effort persist on tab hide / unload (refresh, app switch): the
    // unmount cleanup above does not fire on a hard page teardown.
    $effect(() => {
        const onHide = () => { if (document.visibilityState === 'hidden') persistDraftNow() }
        const onPageHide = () => persistDraftNow()
        document.addEventListener('visibilitychange', onHide)
        window.addEventListener('pagehide', onPageHide)
        return () => {
            document.removeEventListener('visibilitychange', onHide)
            window.removeEventListener('pagehide', onPageHide)
        }
    })

    /** Await hydration of active chat. Returns full Chat or null on failure. */
    async function ensureActiveChatReady(selectedChar = $selectedCharID): Promise<ChatData | null> {
        const char = DBState.db.characters[selectedChar]
        if (!char) return null
        const chat = char.chats[char.chatPage]
        if (!chat) return null
        if (!chat._placeholder) return chat
        return await ensureCurrentChatReady(char.chats, char.chatPage, char.chaId)
    }

    function scrollToBottom() {
        chatsInstance?.scrollToLatestMessage();
    }

    function bumpScrollNav() {
        showScrollNav = true
        if (scrollNavTimer) clearTimeout(scrollNavTimer)
        scrollNavTimer = setTimeout(() => { showScrollNav = false }, 1500)
    }

    function getLoadedMessages(container: HTMLElement) {
        return Array.from(container.querySelectorAll('[data-chat-index]'))
            .map(el => ({ el: el as HTMLElement, idx: parseInt(el.getAttribute('data-chat-index')!) }))
            .sort((a, b) => a.idx - b.idx)
    }

    // Top of currently loaded messages (no force-load of older pages).
    function scrollToLoadedTop() {
        const container = document.querySelector('.default-chat-screen') as HTMLElement | null
        if (!container) return
        const messages = getLoadedMessages(container)
        if (messages.length === 0) return
        scrollWithinContainer(messages[0].el, container, { block: 'start', behavior: 'smooth' })
    }

    // Literal bottom of the scroll (end of the latest message).
    function scrollToLoadedBottom() {
        const container = document.querySelector('.default-chat-screen') as HTMLElement | null
        if (!container) return
        const messages = getLoadedMessages(container)
        if (messages.length === 0) return
        scrollWithinContainer(messages[messages.length - 1].el, container, { block: 'end', behavior: 'smooth' })
    }

    function navigateMessage(direction: 'prev' | 'next') {
        const container = document.querySelector('.default-chat-screen') as HTMLElement | null
        if (!container) return
        const messages = Array.from(container.querySelectorAll('[data-chat-index]'))
            .map(el => ({ el: el as HTMLElement, idx: parseInt(el.getAttribute('data-chat-index')!) }))
            .sort((a, b) => a.idx - b.idx)
        if (messages.length === 0) return

        const containerRect = container.getBoundingClientRect()
        const threshold = 30

        // Find the message currently at the top of the viewport
        let current = messages[0]
        for (const msg of messages) {
            const rect = msg.el.getBoundingClientRect()
            if (rect.bottom > containerRect.top + threshold) {
                current = msg
                break
            }
        }

        const currentRect = current.el.getBoundingClientRect()

        if (direction === 'prev') {
            const topVisible = currentRect.top >= containerRect.top - threshold
            if (!topVisible) {
                // Current message top is hidden → scroll to its start
                scrollWithinContainer(current.el, container, { block: 'start', behavior: 'smooth' })
            } else {
                // Already at top → go to previous message start
                const prev = messages.find(m => m.idx === current.idx - 1)
                if (prev) {
                    scrollWithinContainer(prev.el, container, { block: 'start', behavior: 'smooth' })
                }
            }
        } else {
            const bottomVisible = currentRect.bottom <= containerRect.bottom + threshold
            if (!bottomVisible) {
                // Current message bottom is hidden → scroll to its end
                scrollWithinContainer(current.el, container, { block: 'end', behavior: 'smooth' })
            } else {
                // Already see the end → go to next message start
                const next = messages.find(m => m.idx === current.idx + 1)
                if (next) {
                    scrollWithinContainer(next.el, container, { block: 'start', behavior: 'smooth' })
                }
            }
        }
    }
    $effect(() => {
        if(ScrollToMessageStore.value !== -1){
            const index = ScrollToMessageStore.value
            ScrollToMessageStore.value = -1
            scrollToMessage(index)
        }
    })

    async function scrollToMessage(index: number){
        // Forces the loading of past messages not rendered on the screen
        isScrollingToMessage = true
        try {
            const totalMessages = currentChat.length
            const neededLoadPages = totalMessages - index + 5

            if(loadPages < neededLoadPages){
                loadPages = neededLoadPages
                await tick()
            }

            let element: Element | null = null;
            // Poll for element existence (max 5 seconds)
            for(let i = 0; i < 50; i++){
                element = document.querySelector(`[data-chat-index="${index}"]`)
                if(element) break;
                await sleep(100)
            }

            const chatContainer = document.querySelector('.default-chat-screen') as HTMLElement | null;
            const preIndex = Math.max(0, index - 3)
            const preElement = document.querySelector(`[data-chat-index="${preIndex}"]`)
            // Scroll within the chat container only — raw scrollIntoView climbs to
            // documentElement and, if the root is inflated, shoves the whole page up.
            if(chatContainer && preElement){
                scrollWithinContainer(preElement as HTMLElement, chatContainer, { block: 'start', behavior: 'instant' })
            } else if(chatContainer && element){
                scrollWithinContainer(element as HTMLElement, chatContainer, { block: 'start', behavior: 'instant' })
            }
            await sleep(50)

            if(element){
                // Wait for images to load to prevent layout shift
                if(chatContainer) {
                    const images = Array.from(chatContainer.querySelectorAll('img'));
                    const promises = images.map(img => {
                        if (img.complete) return Promise.resolve();
                        return new Promise(resolve => {
                            img.onload = () => resolve(null);
                            img.onerror = () => resolve(null);
                        });
                    });
                    // Wait for all images or timeout after 4 seconds
                    await Promise.race([
                        Promise.all(promises),
                        sleep(4000)
                    ]);
                }

                if(chatContainer){
                    scrollWithinContainer(element as HTMLElement, chatContainer, { block: 'start', behavior: 'instant' })
                    // Small delay and scroll again to ensure position is correct after any final layout adjustments
                    await sleep(50)
                    scrollWithinContainer(element as HTMLElement, chatContainer, { block: 'start', behavior: 'instant' })
                }

                element.classList.add('ring-2', 'ring-blue-500')
                setTimeout(() => {
                    element.classList.remove('ring-2', 'ring-blue-500')
                }, 2000)
            }
        } finally {
            isScrollingToMessage = false
        }
    }

    async function send(){
        return sendMain(false)
    }
    async function sendContinue(){
        return sendMain(true)
    }

    async function sendMain(continueResponse:boolean) {
        let selectedChar = $selectedCharID
        if($doingChat){
            return
        }

        const activeChat = await ensureActiveChatReady(selectedChar)
        if(!activeChat) return

        let cha = activeChat.message

        if(messageInput.startsWith('/')){
            const commandProcessed = await processMultiCommand(messageInput)
            if(commandProcessed !== false){
                messageInput = ''
                messageInputTranslate = ''
                removeChatDraft(draftChaId, draftChatId)
                return
            }
        }

        if(fileInput.length > 0){
            for(const file of fileInput){
                messageInput += `{{inlayed::${file}}}`
            }
            fileInput = []
        }

        if(messageInput === ''){
            if(cha.length === 0 || cha[cha.length - 1].role !== 'user'){
                if(DBState.db.useSayNothing){
                    cha.push({
                        role: 'user',
                        data: '*says nothing*',
                        name: null
                    })
                }
            }
        }
        else{
            const char = DBState.db.characters[selectedChar]
            if(char.type === 'character'){
                let triggerResult = await runTrigger(char,'input', {chat: activeChat})
                if(triggerResult){
                    cha = triggerResult.chat.message
                }

                cha.push({
                    role: 'user',
                    data: await processScript(char,messageInput,'editinput'),
                    time: Date.now(),
                    name: null
                })
            }
            else{
                cha.push({
                    role: 'user',
                    data: messageInput,
                    time: Date.now(),
                    name: null
                })
            }
        }
        messageInput = ''
        messageInputTranslate = ''
        removeChatDraft(draftChaId, draftChatId)
        DBState.db.characters[selectedChar].chats[DBState.db.characters[selectedChar].chatPage].message = cha

        await sleep(10)
        updateInputSizeAll()
        await sendChatMain(continueResponse)

    }

    // Fullscreen compose mode: the same messageInput, just shown in a full-screen
    // editor. Enter inserts a newline (no send); sending is via the Send button.
    let composerFullscreen = $state(false)
    let fullscreenEle:HTMLTextAreaElement = $state()
    $effect(() => {
        if (composerFullscreen && fullscreenEle) {
            const el = fullscreenEle
            requestAnimationFrame(() => {
                el.focus()
                el.selectionStart = el.selectionEnd = el.value.length
            })
        }
    })
    async function exitFullscreen(){
        composerFullscreen = false
        persistDraftNow()   // checkpoint the draft on return from the expanded composer
        await tick()   // let the inline composer re-measure with the latest text
        updateInputSizeAll()
        updateInputTransateMessage(false)
    }
    function sendFullscreen(){
        composerFullscreen = false
        send()
    }

    // With an empty input (and no attachments) and the last message being the
    // user's, pressing send doesn't add a new message — it regenerates a reply
    // to that last message. Surface that as a reroll affordance.
    const willResend = $derived.by(() => {
        if (messageInput !== '' || fileInput.length > 0) return false
        const cha = DBState.db.characters[$selectedCharID]
        if (!cha) return false
        const msgs = cha.chats?.[cha.chatPage]?.message
        if (!msgs || msgs.length === 0) return false
        return msgs[msgs.length - 1].role === 'user'
    })

    function getLastCharMsg() {
        const msgs = DBState.db.characters[$selectedCharID]?.chats[DBState.db.characters[$selectedCharID].chatPage]?.message
        if (!msgs || msgs.length === 0) return null
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'char' && !msgs[i].isComment && !msgs[i].disabled) return msgs[i]
        }
        return null
    }

    async function reroll() {
        if($doingChat) return
        const lastMsg = getLastCharMsg()
        if (!lastMsg) return

        // Save existing swipes before clone replaces the array
        const savedSwipes = lastMsg.swipes ? [...lastMsg.swipes] : [lastMsg.data]

        // Generate new response
        // Preserve trailing comment/disabled messages (e.g. branch comments)
        let cha = safeStructuredClone(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message)
        const originalMessages = safeStructuredClone(cha)
        if(cha.length === 0) return
        openMenu = false

        const trailingComments = []
        while(cha.length > 0 && (cha[cha.length - 1].isComment || cha[cha.length - 1].disabled)) {
            trailingComments.unshift(cha.pop())
        }

        if(cha.length === 0) return
        const saying = cha[cha.length - 1].saying
        let sayingQu = 2
        while(cha[cha.length - 1].role !== 'user'){
            if(cha[cha.length - 1].saying === saying){
                sayingQu -= 1
                if(sayingQu === 0) break
            }
            let msg = cha.pop()
            if(!msg) return
        }
        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message = cha
        const generated = await sendChatMain()

        const currentMsgs = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message

        // If generation failed, restore original messages
        if (!generated) {
            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message = originalMessages
            return
        }

        // Restore trailing comments after the new message
        if (trailingComments.length > 0) {
            currentMsgs.push(...trailingComments)
            DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message = currentMsgs
        }

        // Save new response to swipes
        const newLastMsg = getLastCharMsg()
        if (newLastMsg && !newLastMsg.swipes) {
            newLastMsg.swipes = [...savedSwipes, newLastMsg.data]
            newLastMsg.swipeId = newLastMsg.swipes.length - 1
        }
    }

    async function unReroll() {
        if($doingChat) return
        const lastMsg = getLastCharMsg()
        if (!lastMsg || !lastMsg.swipes || lastMsg.swipeId === undefined) return

        lastMsg.swipeId = lastMsg.swipeId <= 0 ? lastMsg.swipes.length - 1 : lastMsg.swipeId - 1
        lastMsg.data = lastMsg.swipes[lastMsg.swipeId]
        DBState.db.characters[$selectedCharID].reloadKeys += 1
    }

    function nextSwipe() {
        const lastMsg = getLastCharMsg()
        if (!lastMsg || !lastMsg.swipes || lastMsg.swipeId === undefined) return

        lastMsg.swipeId = lastMsg.swipeId >= lastMsg.swipes.length - 1 ? 0 : lastMsg.swipeId + 1
        lastMsg.data = lastMsg.swipes[lastMsg.swipeId]
        DBState.db.characters[$selectedCharID].reloadKeys += 1
    }

    function deleteSwipe() {
        const lastMsg = getLastCharMsg()
        if (!lastMsg || !lastMsg.swipes || lastMsg.swipes.length <= 1) return

        const idx = lastMsg.swipeId ?? 0
        lastMsg.swipes.splice(idx, 1)

        if (idx >= lastMsg.swipes.length) {
            lastMsg.swipeId = lastMsg.swipes.length - 1
        }
        lastMsg.data = lastMsg.swipes[lastMsg.swipeId]

        if (lastMsg.swipes.length === 1) {
            delete lastMsg.swipes
            delete lastMsg.swipeId
        }
        DBState.db.characters[$selectedCharID].reloadKeys += 1
    }

    let abortController:null|AbortController = null

    async function sendChatMain(continued:boolean = false) {

        messageInput = ''
        abortController = new AbortController()
        let generated = false
        try {
            generated = await sendChat(-1, {
                signal:abortController.signal,
                continue:continued
            })
        } catch (error) {
            console.error(error)
            alertError(error)
        }
        $doingChat = false
        if(DBState.db.playMessage){
            playNotificationSound(DBState.db.messageSound, DBState.db.messageSoundVolume)
        }
        return generated
    }

    function abortChat(){
        if(abortController){
            abortController.abort()
        }
    }

    let { userIconPortrait, currentUsername, userIcon } = $derived.by(() => {
        const bindedPersona = DBState?.db?.characters?.[$selectedCharID]?.chats?.[DBState?.db?.characters?.[$selectedCharID]?.chatPage]?.bindedPersona

        if(bindedPersona){
            const persona = DBState.db.personas.find((p) => p.id === bindedPersona)
            if(persona){
                return {
                    currentUsername: persona.name,
                    userIconPortrait: persona.largePortrait,
                    userIcon: persona.icon
                }
            }
        }

        const selectedPersonaIndex = DBState.db.selectedPersona
        return {
            currentUsername: DBState.db.username,
            userIconPortrait: DBState.db.personas[selectedPersonaIndex].largePortrait,
            userIcon: DBState.db.personas[selectedPersonaIndex].icon
        }
    })

    let inputHeight = $state("44px")
    let multiline = $state(false)
    let inputOverflow = $state(false)
    let inputEle:HTMLTextAreaElement = $state()
    let inputTranslateHeight = $state("44px")
    let inputTranslateEle:HTMLTextAreaElement = $state()

    // Standard theme: composer width follows the configured chat width (matches message cards).
    // Other themes: no width limit (original full-width behavior).
    let isStandardTheme = $derived(DBState.db.theme === '')
    let composerWidthClass = $derived(
        !isStandardTheme ? '' :
        DBState.db.nodeOnlyStandardChatWidth === 'full' ? 'max-w-full' :
        DBState.db.nodeOnlyStandardChatWidth === 'wide' ? 'max-w-6xl' :
        'max-w-3xl'
    )
    // Effective persona name for the input placeholder (chat-bound persona overrides the selected one).
    let activePersonaName = $derived.by(() => {
        const chat = DBState.db.characters[$selectedCharID]?.chats?.[DBState.db.characters[$selectedCharID]?.chatPage]
        const bound = chat?.bindedPersona ? DBState.db.personas.find(p => p.id === chat.bindedPersona) : null
        return (bound ?? DBState.db.personas[DBState.db.selectedPersona])?.name || 'User'
    })
    let canContinueResponse = $derived.by(() => {
        const chat = DBState.db.characters[$selectedCharID]?.chats?.[DBState.db.characters[$selectedCharID]?.chatPage]
        const messages = chat?.message ?? []
        return messages.length >= 2 && messages[messages.length - 1]?.role === 'char'
    })

    function updateInputSizeAll() {
        updateInputSize()
        updateInputTranslateSize()
    }

    function updateInputTranslateSize() {
        if(inputTranslateEle) {
            inputTranslateEle.style.height = "0";
            inputTranslateHeight = (inputTranslateEle.scrollHeight) + "px";
            inputTranslateEle.style.height = inputTranslateHeight
        }
    }
    // Measure the textarea's content height at a given css width (empty = current
    // flex width), restoring the override afterwards.
    function measureHeightAt(cssWidth:string):number {
        const prev = inputEle.style.width
        inputEle.style.height = "0"
        if(cssWidth) inputEle.style.width = cssWidth
        const h = inputEle.scrollHeight
        inputEle.style.width = prev
        return h
    }

    // Width the textarea would have on a single inline row (pill content minus the
    // icon buttons and gaps). Computed from layout-independent sizes — the pill is
    // always full width and the icons are fixed-size — so it does NOT depend on the
    // current `multiline` state. That's what stops the 1↔2 line flip-flop.
    function inlineColWidth():number {
        const pill = inputEle.parentElement
        if(!pill) return 0
        const cs = getComputedStyle(pill)
        const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
        const gap = parseFloat(cs.columnGap || cs.gap || '0') || 0
        let used = 0, others = 0
        for(const c of Array.from(pill.children) as HTMLElement[]){
            if(c === inputEle) continue
            used += c.offsetWidth
            others++
        }
        return pill.clientWidth - padX - used - gap * others
    }

    function updateInputSize() {
        if(inputEle){
            const col = inlineColWidth()
            const ref = col > 0 ? col + "px" : ""
            // Gemini-style hysteresis: once the text grows past one line it stays
            // multiline until the input is fully cleared. Reflow is therefore a
            // one-way latch (cleared only on empty), so the layout toggle can never
            // feed back into the width measurement and flip-flop 1↔2 lines.
            if(messageInput === ''){
                multiline = false
            } else if(!multiline && measureHeightAt(ref) > 50){
                multiline = true
            }
            // Height for the width that will actually be shown.
            const sh = measureHeightAt(multiline ? "100%" : ref)
            // Cap the composer at ~60% of the viewport; beyond that it scrolls.
            const maxH = Math.round(window.innerHeight * 0.6)
            inputHeight = Math.min(sh, maxH) + "px"
            inputEle.style.height = inputHeight
            inputOverflow = sh > maxH
        }
    }

    $effect.pre(() => {
        updateInputSizeAll()
    });

    async function updateInputTransateMessage(reverse: boolean) {
        if(!DBState.db.useAutoTranslateInput){
            return
        }
        if(isExpTranslator()){
            if(!reverse){
                messageInputTranslate = ''
                return
            }
            if(messageInputTranslate === '') {
                messageInput = ''
                return
            }
            const lastMessageInputTranslate = messageInputTranslate
            await sleep(1500)
            if(lastMessageInputTranslate === messageInputTranslate){
                translate(reverse ? messageInputTranslate : messageInput, reverse).then((translatedMessage) => {
                    if(translatedMessage){
                        if(reverse)
                            messageInput = translatedMessage
                        else
                            messageInputTranslate = translatedMessage
                    }
                })
            }
            return

        }
        if(reverse && messageInputTranslate === '') {
            messageInput = ''
            return
        }
        if(!reverse && messageInput === '') {
            messageInputTranslate = ''
            return
        }
        translate(reverse ? messageInputTranslate : messageInput, reverse).then((translatedMessage) => {
            if(translatedMessage){
                if(reverse)
                    messageInput = translatedMessage
                else
                    messageInputTranslate = translatedMessage
            }
        })
    }

    async function screenShot(){
        try {
            loadPages = Infinity
            const html2canvas = await import('html-to-image');
            const chats = document.querySelectorAll('.default-chat-screen .risu-chat')
            alertWait("Taking screenShot...")
            let canvases:HTMLCanvasElement[] = []

            for(const chat of chats){
                const cnv = await html2canvas.toCanvas(chat as HTMLElement)
                alertWait("Taking screenShot... "+canvases.length+"/"+chats.length)
                canvases.push(cnv)
            }

            canvases.reverse()

            alertWait("Merging images...")

            let mergedCanvas = document.createElement('canvas');
            mergedCanvas.width = 0;
            mergedCanvas.height = 0;
            let mergedCtx = mergedCanvas.getContext('2d');

            let totalHeight = 0;
            let maxWidth = 0;
            for(let i = 0; i < canvases.length; i++) {
                let canvas = canvases[i];
                totalHeight += canvas.height;
                maxWidth = Math.max(maxWidth, canvas.width);

                mergedCanvas.width = maxWidth;
                mergedCanvas.height = totalHeight;
            }

            mergedCtx.fillStyle = 'var(--risu-theme-bgcolor)'
            mergedCtx.fillRect(0, 0, maxWidth, totalHeight);
            let indh = 0
            for(let i = 0; i < canvases.length; i++) {
                let canvas = canvases[i];
                indh += canvas.height
                mergedCtx.drawImage(canvas, 0, indh - canvas.height);
                canvases[i].remove();
            }

            if(mergedCanvas){
                await downloadFile(`chat-${v4()}.png`, Buffer.from(mergedCanvas.toDataURL('png').split(',').at(-1), 'base64'))
                mergedCanvas.remove();
            }
            notifySuccess(language.screenshotSaved)
            loadPages = getInitialChatLoadPages(DBState.db)
        } catch (error) {
            console.error(error)
            notifyError("Error while taking screenshot")
        }
    }

    
</script>



<div class="chat-shell w-full h-full relative flex flex-col min-h-0" style={customStyle}>
    
    {#if DBState.db.nodeOnlyScrollButtonType !== 'off' && currentChat.length > 0}
        <div
            class="chat-scroll-nav absolute right-3 bottom-24 z-40 flex flex-col overflow-hidden transition-opacity duration-300"
            class:opacity-0={!showScrollNav}
            class:pointer-events-none={!showScrollNav}
        >
            {#if DBState.db.nodeOnlyScrollButtonType === 'four'}
                <button
                    class="w-10 h-10 text-textcolor2 hover:text-textcolor flex items-center justify-center transition-colors"
                    onclick={() => { bumpScrollNav(); scrollToLoadedTop() }}
                >
                    <ChevronsUpIcon size={18} />
                </button>
                <div class="border-t border-darkborderc border-opacity-30"></div>
            {/if}
            <button
                class="w-10 h-10 text-textcolor2 hover:text-textcolor flex items-center justify-center transition-colors"
                onclick={() => { bumpScrollNav(); navigateMessage('prev') }}
            >
                <ChevronUpIcon size={18} />
            </button>
            <div class="border-t border-darkborderc border-opacity-30"></div>
            <button
                class="w-10 h-10 text-textcolor2 hover:text-textcolor flex items-center justify-center transition-colors"
                onclick={() => { bumpScrollNav(); navigateMessage('next') }}
            >
                <ChevronDownIcon size={18} />
            </button>
            {#if DBState.db.nodeOnlyScrollButtonType === 'four'}
                <div class="border-t border-darkborderc border-opacity-30"></div>
                <button
                    class="w-10 h-10 text-textcolor2 hover:text-textcolor flex items-center justify-center transition-colors"
                    onclick={() => { bumpScrollNav(); scrollToLoadedBottom() }}
                >
                    <ChevronsDownIcon size={18} />
                </button>
            {/if}
        </div>
    {/if}

    {#if showNewMessageButton}
        {#if (DBState.db.newMessageButtonStyle === 'bottom-center' || !DBState.db.newMessageButtonStyle)}
            <button class="chat-new-message-btn absolute bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2" onclick={scrollToBottom}>
                <ArrowDown size={16} />
                <span>{language.newMessage}</span>
            </button>
        {/if}

        {#if DBState.db.newMessageButtonStyle === 'bottom-right'}
            <button class="chat-new-message-btn absolute bottom-24 right-4 z-50 flex items-center gap-2" onclick={scrollToBottom}>
                <ArrowDown size={16} />
                <span>{language.newMessage}</span>
            </button>
        {/if}

        {#if DBState.db.newMessageButtonStyle === 'bottom-left'}
            <button class="chat-new-message-btn absolute bottom-24 left-4 z-50 flex items-center gap-2" onclick={scrollToBottom}>
                <ArrowDown size={16} />
                <span>{language.newMessage}</span>
            </button>
        {/if}

        {#if DBState.db.newMessageButtonStyle === 'floating-circle'}
            <button class="absolute bottom-36 right-4 bg-primary text-white w-12 h-12 rounded-full shadow-lg z-50 flex items-center justify-center hover:bg-primary/90 transition-colors" onclick={scrollToBottom} title="4. 원형 (우하단)">
                <ArrowDown size={20} />
            </button>
        {/if}

        {#if DBState.db.newMessageButtonStyle === 'right-center'}
            <button class="chat-new-message-btn absolute top-1/2 right-2 -translate-y-1/2 z-50 flex flex-col items-center gap-1" onclick={scrollToBottom}>
                <ArrowDown size={14} />
                <span class="text-xs writing-mode-vertical">{language.newMessage}</span>
            </button>
        {/if}

        {#if DBState.db.newMessageButtonStyle === 'top-bar'}
            <button class="chat-new-message-btn absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 text-sm" onclick={scrollToBottom}>
                <ArrowDown size={14} />
                <span>{language.newMessage}</span>
            </button>
        {/if}
    {/if}
    {#if isScrollingToMessage}
        <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 text-white text-xl font-bold backdrop-blur-sm">
            Loading...
        </div>
    {/if}
    {#if $selectedCharID < 0}
        {#if $PlaygroundStore === 0}
            <HomePage />
        {:else}
            {#await loadPlaygroundMenu() then PlaygroundMenu}
                <PlaygroundMenu />
            {/await}
        {/if}
    {:else if $chatDeselected}
        <div class="chat-empty-state h-full w-full flex items-center justify-center text-textcolor2">
            <span>{language.selectChatToView}</span>
        </div>
    {:else}
        <div class="chat-topbar">
            <button class="chat-back-btn" onclick={() => selectedCharID.set(-1)} aria-label="返回">
                <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            </button>
            <div class="chat-avatar-sm">
                {#if headerAvatarCss}
                    <div class="chat-avatar-img" style={headerAvatarCss}></div>
                {/if}
            </div>
            <div class="chat-header-info">
                <div class="chat-header-name">{currentCharacter?.name ?? ''}</div>
                <div class="chat-header-status"><span class="status-dot"></span>在线</div>
            </div>
            <div style="position:relative;">
                <button class="chat-more-btn" aria-label="更多" onclick={() => headerMenuOpen = !headerMenuOpen}>
                    <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:currentColor;fill:currentColor;stroke-width:0;"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
                {#if headerMenuOpen}
                    <!-- svelte-ignore a11y_click_events_have_key_events -->
                    <div class="header-menu-backdrop" onclick={() => headerMenuOpen = false} role="presentation"></div>
                    <div class="header-menu">
                        <button class="header-menu-item" onclick={() => { headerMenuOpen = false; showSideChatList = true; }}>
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                            <span>聊天设置</span>
                        </button>
                        <button class="header-menu-item" onclick={() => { headerMenuOpen = false; showSideCharConfig = true; }}>
                            <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.8;"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
                            <span>角色设置</span>
                        </button>
                        <button class="header-menu-item" onclick={() => { headerMenuOpen = false; $SettingsMenuIndex = 3; settingsOpen.set(true); }}>
                            <ImageIcon size={18} />
                            <span>自定义背景</span>
                        </button>
                    </div>
                {/if}
            </div>
        </div>
        {#snippet composerCluster()}
            <div
                    class="{DBState.db.fixedChatTextarea ? 'chat-composer-sticky sticky pt-3 pb-4 right-0 bottom-0' : 'chat-composer-flow mt-3 mb-4'} w-full"
                    style="{DBState.db.fixedChatTextarea ? 'z-index:29;' : ''}"
            >
              <div class="mx-auto w-full {composerWidthClass} px-2">
                <!-- "plugin-compat-items-stretch" is a compat hook (not a Tailwind class):
                     plugins that locate the composer via div[class*="items-stretch"] (e.g. gemini-cache-keeper)
                     relied on the pre-redesign container class. Keep it so they can still find/anchor their UI,
                     and it scopes the timer re-flow rules in <style> below. -->
                <div class="chat-composer plugin-compat-items-stretch">
                <!-- Aux buttons row (hidden behind menu for clean design look) -->
                <div class="composer-aux-row">
                {#if DBState.db.characters[$selectedCharID]?.chaId !== '§playground'}
                    <ShDropdownMenu bind:open={openMenu}>
                        <ShDropdownMenuTrigger>
                            {#snippet child({ props })}
                                <button {...props}
                                        aria-label="menu"
                                        class="chat-tool-btn shrink-0 flex justify-center items-center w-8 h-8 rounded-full text-textcolor2 transition-colors">
                                    <MenuIcon size={18} />
                                </button>
                            {/snippet}
                        </ShDropdownMenuTrigger>
                        <ShDropdownMenuContent side="top" align="start" class="min-w-48 max-h-[70vh] overflow-y-auto">
                            {#if DBState.db.characters[$selectedCharID].ttsMode === 'webspeech' || DBState.db.characters[$selectedCharID].ttsMode === 'elevenlab'}
                                <ShDropdownMenuItem onSelect={() => stopTTS()}>
                                    <MicOffIcon /><span>{language.ttsStop}</span>
                                </ShDropdownMenuItem>
                            {/if}
                            <ShDropdownMenuItem
                                disabled={!canContinueResponse}
                                onSelect={() => sendContinue()}>
                                <StepForwardIcon /><span>{language.continueResponse}</span>
                            </ShDropdownMenuItem>
                            {#if DBState.db.showMenuChatList}
                                <ShDropdownMenuItem onSelect={() => { openChatList = true }}>
                                    <DatabaseIcon /><span>{language.chatList}</span>
                                </ShDropdownMenuItem>
                            {/if}
                            {#each additionalChatMenu as menu}
                                <ShDropdownMenuItem onSelect={() => { menu.callback() }}>
                                    <PluginDefinedIcon ico={menu} /><span>{menu.name}</span>
                                </ShDropdownMenuItem>
                            {/each}
                            {#if DBState.db.showMenuHypaMemoryModal && DBState.db.hypaV3}
                                <ShDropdownMenuItem onSelect={() => { $hypaV3ModalOpen = true }}>
                                    <BrainIcon /><span>{language.hypaMemoryV3Modal}</span>
                                </ShDropdownMenuItem>
                            {/if}
                            {#if DBState.db.translator !== ''}
                                <ShDropdownMenuItem class={DBState.db.useAutoTranslateInput ? 'text-green-500' : ''} onSelect={() => { DBState.db.useAutoTranslateInput = !DBState.db.useAutoTranslateInput }}>
                                    <GlobeIcon /><span>{language.autoTranslateInput}</span>
                                </ShDropdownMenuItem>
                            {/if}
                            <ShDropdownMenuItem onSelect={() => { screenShot() }}>
                                <CameraIcon /><span>{language.screenshot}</span>
                            </ShDropdownMenuItem>
                            <ShDropdownMenuItem onSelect={async () => {
                                const results = await postChatFile(messageInput)
                                if(!results) return
                                for(const res of results){
                                    if(res?.type === 'asset'){
                                        fileInput.push(res.data)
                                    }
                                    if(res?.type === 'text'){
                                        messageInput += `{{file::${res.name}::${res.data}}}`
                                    }
                                }
                                updateInputSizeAll()
                            }}>
                                <ImagePlusIcon /><span>{language.postFile}</span>
                            </ShDropdownMenuItem>
                            <ShDropdownMenuItem class={DBState.db.useAutoSuggestions ? 'text-green-500' : ''} onSelect={() => { DBState.db.useAutoSuggestions = !DBState.db.useAutoSuggestions }}>
                                <ReplyIcon /><span>{language.autoSuggest}</span>
                            </ShDropdownMenuItem>
                            <ShDropdownMenuItem onSelect={() => {
                                DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].modules ??= []
                                openModuleList = true
                            }}>
                                <PackageIcon /><span>{language.modules}</span>
                            </ShDropdownMenuItem>
                            {#if DBState.db.sideMenuRerollButton}
                                <ShDropdownMenuItem onSelect={() => { reroll() }}>
                                    <RefreshCcwIcon /><span>{language.reroll}</span>
                                </ShDropdownMenuItem>
                            {/if}
                            <ShDropdownMenuItem onSelect={() => { quickMenu() }}>
                                <ZapIcon /><span>{language.hotkeyDesc.quickMenu}</span>
                            </ShDropdownMenuItem>
                        </ShDropdownMenuContent>
                    </ShDropdownMenu>
                {:else}
                    <button type="button" onclick={(e) => {
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.push({
                            role: 'char',
                            data: ''
                        })
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage] = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage]
                    }}
                         class="chat-tool-btn shrink-0 flex justify-center items-center w-8 h-8 rounded-full text-textcolor2 transition-colors cursor-pointer"
                    >
                        <Plus size={18} />
                    </button>
                {/if}

                {#if DBState.db.useChatSticker}
                    <button type="button" onclick={()=>{toggleStickers = !toggleStickers}}
                         class={"chat-tool-btn shrink-0 flex justify-center items-center w-8 h-8 rounded-full transition-colors cursor-pointer "+(toggleStickers ? 'text-green-500':'text-textcolor2')}>
                        <Laugh size={18}/>
                    </button>
                {/if}

                <button
                        onclick={() => composerFullscreen = true}
                        aria-label={language.chatInputExpandTitle}
                        class="chat-tool-btn shrink-0 flex justify-center items-center w-8 h-8 rounded-full text-textcolor2 transition-colors"
                >
                    <Maximize2 size={16} />
                </button>

                {#if DBState.db.characters[$selectedCharID]?.chaId !== '§playground'}
                    <button
                            type="button"
                            onclick={sendContinue}
                            disabled={!canContinueResponse || $doingChat || doingChatInputTranslate}
                            aria-label={language.continueResponse}
                            title={language.continueResponse}
                            class="chat-tool-btn shrink-0 flex justify-center items-center w-8 h-8 rounded-full text-textcolor2 transition-colors"
                    >
                        <StepForwardIcon size={16} />
                    </button>
                {/if}
                </div>
                <!-- Main input row (textarea + send) matching design -->
                <div class="composer-main-row">
                <textarea class="chat-input-area text-input-area outline-hidden min-w-0 input-text resize-none overflow-x-hidden max-w-full"
                          class:flex-1={!multiline}
                          class:basis-full={multiline}
                          class:order-first={multiline}
                          class:overflow-y-auto={inputOverflow}
                          class:overflow-y-hidden={!inputOverflow}
                          placeholder={willResend ? language.resendLastMessage : language.enterMessageToPersona(activePersonaName)}
                          bind:value={messageInput}
                          bind:this={inputEle}
                          onkeydown={(e) => {
                        if(e.key.toLocaleLowerCase() === "enter" && !e.isComposing){
                            if(shouldSendOnEnter(e)){
                                send()
                                e.preventDefault()
                            }
                        }
                        if(e.key.toLocaleLowerCase() === "m" && (e.ctrlKey)){
                            reroll()
                            e.preventDefault()
                        }
                    }}
                          onpaste={(e) => {
                        const items = e.clipboardData?.items
                        if(!items){
                            return
                        }
                        let canceled = false

                        for(const item of items){
                            if(item.kind === 'file' && item.type.startsWith('image')){
                                if(!canceled){
                                    e.preventDefault()
                                    canceled = true
                                }
                                const file = item.getAsFile()
                                if(file){
                                    const reader = new FileReader()
                                    reader.onload = async (e) => {
                                        const buf = e.target?.result as ArrayBuffer
                                        const uint8 = new Uint8Array(buf)
                                        const results = await postChatFile({
                                            name: file.name,
                                            data: uint8
                                        })
                                        if(!results) return
                                        for(const res of results){
                                            if(res?.type === 'asset'){
                                                fileInput.push(res.data)
                                            }
                                            if(res?.type === 'text'){
                                                messageInput += `{{file::${res.name}::${res.data}}}`
                                            }
                                        }
                                        updateInputSizeAll()
                                    }
                                    reader.readAsArrayBuffer(file)
                                }
                            }
                        }
                    }}
                          oninput={()=>{updateInputSizeAll();updateInputTransateMessage(false)}}
                          onblur={persistDraftNow}
                          style:height={inputHeight}
                ></textarea>

                {#if $doingChat || doingChatInputTranslate}
                    <button
                            aria-labelledby="cancel"
                            class="chat-send-btn shrink-0 flex justify-center items-center rounded-full transition-colors" onclick={abortChat}
                    >
                        <div class="loadmove chat-process-stage-{$chatProcessStage}"></div>
                    </button>
                {:else}
                    <button
                            onclick={send}
                            aria-label={willResend ? language.reroll : language.send}
                            class="chat-send-btn shrink-0 flex justify-center items-center rounded-full transition-colors button-icon-send"
                    >
                        {#if willResend}
                            <RefreshCcwIcon size={18} />
                        {:else}
                            <Send size={18} />
                        {/if}
                    </button>
                {/if}
                </div>
                </div>
              </div>
            </div>
            {#if DBState.db.useAutoTranslateInput && DBState.db.characters[$selectedCharID]?.chaId !== '§playground'}
                <div class="chat-translate-box flex items-center mt-2 mb-2 mx-auto w-full {composerWidthClass}">
                    <label for='messageInputTranslate' class="text-textcolor ml-3">
                        <LanguagesIcon />
                    </label>
                    <textarea id = 'messageInputTranslate' class="text-textcolor p-2 min-w-0 bg-transparent input-text text-base grow ml-3 mr-2 resize-none overflow-y-hidden overflow-x-hidden max-w-full outline-hidden"
                              bind:value={messageInputTranslate}
                              bind:this={inputTranslateEle}
                              onkeydown={(e) => {
                            if(e.key.toLocaleLowerCase() === "enter" && !e.isComposing){
                                if(shouldSendOnEnter(e)){
                                    send()
                                    e.preventDefault()
                                }
                            }
                            if(e.key.toLocaleLowerCase() === "m" && (e.ctrlKey)){
                                reroll()
                                e.preventDefault()
                            }
                        }}
                              oninput={()=>{updateInputSizeAll();updateInputTransateMessage(true)}}
                              placeholder={language.enterMessageForTranslateToEnglish}
                              style:height={inputTranslateHeight}
                    ></textarea>
                </div>
            {/if}

            {#if fileInput.length > 0}
                <div class="chat-attachment-tray flex items-center flex-wrap p-2 mx-auto my-2 w-full {composerWidthClass}">
                    {#each fileInput as file, i}
                        {#await getInlayAsset(file) then inlayAsset}
                            <div class="relative">
                                {#if inlayAsset.type === 'image'}
                                    <img src={inlayAsset.data} alt="Inlay" class="max-w-48 max-h-48 border border-darkborderc">
                                {:else if inlayAsset.type === 'video'}
                                    <video controls class="max-w-48 max-h-48 border border-darkborderc">
                                        <source src={inlayAsset.data} type="video/mp4" />
                                        <track kind="captions" />
                                        Your browser does not support the video tag.
                                    </video>
                                {:else if inlayAsset.type === 'audio'}
                                    <audio controls class="max-w-48 max-h-24 border border-darkborderc">
                                        <source src={inlayAsset.data} type="audio/mpeg" />
                                        Your browser does not support the audio tag.
                                    </audio>
                                {:else}
                                    <div class="max-w-24 max-h-24">{file}</div>
                                {/if}
                                <button class="absolute -right-1 -top-1 p-1 bg-darkbg text-textcolor rounded-md transition-colors hover:text-draculared focus:text-draculared" onclick={() => {
                                    fileInput.splice(i, 1)
                                    updateInputSizeAll()
                                }}>
                                    <XIcon size={18} />
                                </button>
                            </div>
                        {/await}
                    {/each}
                </div>

            {/if}

            {#if toggleStickers}
                <div class="chat-sticker-tray mx-auto flex flex-wrap w-full {composerWidthClass}">
                    <AssetInput currentCharacter={currentCharacter} onSelect={(additionalAsset)=>{
                        let fileType = 'img'
                        if(additionalAsset.length > 2 && additionalAsset[2]) {
                            const fileExtension = additionalAsset[2]
                            if(fileExtension === 'mp4' || fileExtension === 'webm')
                                fileType = 'video'
                            else if(fileExtension === 'mp3' || fileExtension === 'wav')
                                fileType = 'audio'
                        }
                        messageInput += `<span class='notranslate' translate='no'>{{${fileType}::${additionalAsset[0]}}}</span> *${additionalAsset[0]} added*`
                        updateInputSizeAll()
                    }}/>
                </div>
            {/if}

            {#if DBState.db.useAutoSuggestions}
                <Suggestion messageInput={(msg)=>messageInput=(
                    (DBState.db.subModel === "textgen_webui" || DBState.db.subModel === "mancer" || DBState.db.subModel.startsWith('local_')) && DBState.db.autoSuggestClean
                    ? msg.replace(/ +\(.+?\) *$| - [^"'*]*?$/, '')
                    : msg
                )} {send}/>
            {/if}
        {/snippet}

        <div class="min-h-0 flex-1 w-full flex flex-col-reverse overflow-y-auto relative default-chat-screen"
            class:nodeonly-standard={DBState.db.theme === ''}
            class:no-chat-width-wide={DBState.db.theme === '' && DBState.db.nodeOnlyStandardChatWidth === 'wide'}
            class:no-chat-width-full={DBState.db.theme === '' && DBState.db.nodeOnlyStandardChatWidth === 'full'}
            onscroll={(e) => {
            if (DBState.db.nodeOnlyScrollButtonType !== 'off') {
                bumpScrollNav()
            }
            //@ts-expect-error scrollHeight/clientHeight/scrollTop don't exist on EventTarget, but target is HTMLElement here
            const scrolled = (e.target.scrollHeight - e.target.clientHeight + e.target.scrollTop)
            if(scrolled < 100 && currentChat.length > loadPages){
                loadPages += getAdditionalChatLoadPages(DBState.db)
            }
            const chatTarget = e.target as HTMLElement;
            const chatsContainer = (DBState.db.fixedChatTextarea && chatTarget.children[1]) ? chatTarget.children[1] : chatTarget.children[0];
            const lastEl = chatsContainer?.firstElementChild;
            const isAtBottom = lastEl ? lastEl.getBoundingClientRect().top <= chatTarget.getBoundingClientRect().bottom + 100 : true;
            if(isAtBottom){
                showNewMessageButton = false;
            }
        }}>
            {@render composerCluster()}

            {#if chatPanelStore.length > 0}
                <div class="mx-4 my-2 flex flex-col gap-2">
                    {#each chatPanelStore as panel (panel.id)}
                        <section class={`rounded-md border border-darkborderc bg-darkbg/80 p-3 text-textcolor ${panel.className ?? ''}`} data-plugin-chat-panel={panel.id}>
                            {@html panel.html}
                        </section>
                    {/each}
                </div>
            {/if}

            {#if !currentChatReady}
                <div class="w-full flex justify-center text-textcolor2 italic mb-12">
                    {language.loadingChatData}
                </div>
            {:else}

            {#if chatFoldedStateMessageIndex.index !== -1}
                <button class="w-full flex justify-center max-w-full p-4">
                    <Button className="max-w-xl w-full" onclick={() => {
                        loadPages += chatFoldedStateMessageIndex.index + 1
                        chatFoldedState.data = null
                    }}>
                        {language.loadMore}
                    </Button>
                </button>
            {/if}
            
            <Chats
                bind:this={chatsInstance}
                messages={currentChat}
                loadPages={loadPages}
                onReroll={reroll}
                onNextSwipe={nextSwipe}
                onDeleteSwipe={deleteSwipe}
                unReroll={unReroll}
                currentCharacter={currentCharacter}
                currentUsername={currentUsername}
                userIcon={userIcon}
                userIconPortrait={userIconPortrait}
                bind:hasNewUnreadMessage={showNewMessageButton}
            />

            {#if currentChat.length <= loadPages}
                <Chat
                    character={createSimpleCharacter(DBState.db.characters[$selectedCharID])}
                    name={DBState.db.characters[$selectedCharID].name}
                    message={currentChatFmIndex === -1 ? DBState.db.characters[$selectedCharID].firstMessage :
                        DBState.db.characters[$selectedCharID].alternateGreetings[currentChatFmIndex]}
                    role='char'
                    img={getCharThumbnail(DBState.db.characters[$selectedCharID].image, 'css')}
                    idx={-1}
                    altGreeting={DBState.db.characters[$selectedCharID].alternateGreetings.length > 0}
                    disabled={DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].firstMessageDisabled === true}
                    largePortrait={DBState.db.characters[$selectedCharID].largePortrait}
                    firstMessage={true}
                    onReroll={() => {
                        const cha = DBState.db.characters[$selectedCharID]
                        const chat = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage]
                        if (chat._placeholder) return
                        const cur = Number.isFinite(chat.fmIndex as number) ? (chat.fmIndex as number) : -1
                        chat.fmIndex = (cur >= cha.alternateGreetings.length - 1) ? -1 : cur + 1
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage] = chat
                    }}
                    unReroll={() => {
                        const cha = DBState.db.characters[$selectedCharID]
                        const chat = DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage]
                        if (chat._placeholder) return
                        const cur = Number.isFinite(chat.fmIndex as number) ? (chat.fmIndex as number) : -1
                        chat.fmIndex = (cur === -1) ? cha.alternateGreetings.length - 1 : cur - 1
                        DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage] = chat
                    }}
                    isLastMemory={false}
                    currentPage={(Number.isFinite(DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex as number) ? (DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].fmIndex as number) : -1) + 2}
                    totalPages={DBState.db.characters[$selectedCharID].alternateGreetings.length + 1}

                />
                {#if (aiLawApplies() && DBState.db.characters[$selectedCharID].chats[DBState.db.characters[$selectedCharID].chatPage].message.length === 0)}
                    <div class="ml-auto mr-auto mt-4 text-textcolor2 italic max-w-2/3 wrap-break-word text-center">
                        {language.aiGenerationWarning}
                    </div>
                {/if}
                {#if !DBState.db.characters[$selectedCharID].removedQuotes && DBState.db.characters[$selectedCharID].creatorNotes.length >= 2}
                    <CreatorQuote quote={DBState.db.characters[$selectedCharID].creatorNotes} onRemove={() => {
                        const cha = DBState.db.characters[$selectedCharID]
                        cha.removedQuotes = true
                        DBState.db.characters[$selectedCharID] = cha
                    }} />
                {/if}
            {/if}

            {/if}

        </div>

    {/if}
</div>

{#if additionalFloatingActionButtons.length > 0}
    <div class="fixed top-4 right-4 flex flex-col gap-3 z-50">
        {#each additionalFloatingActionButtons as button}
            <button class="bg-primary text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-primary/90 transition-colors" onclick={() => {
                button.callback()
            }}>
                <PluginDefinedIcon ico={button} />
            </button>
        {/each}
    </div>
{/if}

{#if composerFullscreen}
    <div class="fixed inset-0 z-50 bg-bgcolor flex flex-col p-4">
        <div class="mx-auto w-full max-w-3xl flex flex-col flex-1 min-h-0">
            <div class="flex items-center justify-between mb-2">
                <span class="text-textcolor text-sm">{language.chatInputExpandTitle}</span>
                <button onclick={exitFullscreen} aria-label="minimize"
                        class="shrink-0 flex justify-center items-center w-9 h-9 rounded-full text-textcolor hover:bg-primary/20 transition-colors">
                    <Minimize2 size={18} />
                </button>
            </div>
            <textarea
                    bind:value={messageInput}
                    bind:this={fullscreenEle}
                    onblur={persistDraftNow}
                    placeholder={language.enterMessageToPersona(activePersonaName)}
                    class="flex-1 min-h-0 w-full resize-none rounded-md border border-darkborderc bg-transparent p-3 text-textcolor text-base outline-hidden overflow-y-auto focus:border-textcolor transition-colors"
            ></textarea>
            <div class="flex justify-end mt-3">
                <button onclick={sendFullscreen} aria-label="send"
                        class="flex items-center gap-1 px-4 h-10 rounded-full bg-primary text-white hover:bg-primary/80 transition-colors">
                    <Send size={18} />
                    <span>{language.send}</span>
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- ⋮ menu overlays -->
{#if showSideChatList}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="side-overlay" role="presentation" onclick={() => showSideChatList = false}>
        <div class="side-panel" onclick={(e) => e.stopPropagation()} role="presentation">
            <div class="side-panel-header">
                <span>聊天设置</span>
                <button class="side-panel-close" onclick={() => showSideChatList = false} aria-label="关闭">
                    <XIcon size={20} />
                </button>
            </div>
            <div class="side-panel-body">
                <SideChatList bind:chara={DBState.db.characters[$selectedCharID]} />
            </div>
        </div>
    </div>
{/if}

{#if showSideCharConfig}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="side-overlay" role="presentation" onclick={() => showSideCharConfig = false}>
        <div class="side-panel" onclick={(e) => e.stopPropagation()} role="presentation">
            <div class="side-panel-header">
                <span>角色设置</span>
                <button class="side-panel-close" onclick={() => showSideCharConfig = false} aria-label="关闭">
                    <XIcon size={20} />
                </button>
            </div>
            <div class="side-panel-body">
                <CharConfig />
            </div>
        </div>
    </div>
{/if}
<style>
    /* ── Side panel overlays ── */
    .side-overlay {
        position: fixed;
        inset: 0;
        z-index: 55;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        justify-content: flex-end;
    }

    .side-panel {
        width: min(380px, 85vw);
        height: 100%;
        background: var(--risu-theme-darkbg);
        border-left: 1px solid var(--risu-theme-borderc);
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .side-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--risu-theme-borderc);
        font-size: 16px;
        font-weight: 600;
        color: var(--risu-theme-textcolor);
        flex-shrink: 0;
    }

    .side-panel-close {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: transparent;
        border: 0;
        color: var(--risu-theme-textcolor2);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: color 0.15s;
    }

    .side-panel-close:hover {
        color: var(--risu-theme-textcolor);
    }

    .side-panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
    }

    .side-panel-body::-webkit-scrollbar { display: none; }

    .chat-shell {
        background: var(--risu-theme-bgcolor);
        color: var(--risu-theme-textcolor);
    }

    .chat-topbar {
        position: relative;
        z-index: 10;
        flex: 0 0 auto;
        width: 100%;
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid var(--risu-theme-borderc);
        background: color-mix(in oklch, var(--risu-theme-darkbg) 90%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }

    .chat-back-btn {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: transparent;
        border: 0;
        color: var(--risu-theme-textcolor);
        display: grid;
        place-items: center;
        cursor: pointer;
        flex-shrink: 0;
    }

    .chat-back-btn:hover {
        color: var(--risu-theme-primary);
    }

    .chat-avatar-sm {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, color-mix(in oklch, var(--risu-theme-primary) 14%, transparent), color-mix(in oklch, var(--risu-theme-textcolor) 6%, transparent)), var(--risu-theme-darkbg);
    border: 1px solid var(--risu-theme-borderc);
    flex-shrink: 0;
        position: relative;
	        overflow: hidden;
    }

    .chat-avatar-img {
        position: absolute;
	        inset: 0;
        background-size: cover;
    background-position: center;
    }

    .status-dot {
        display: inline-block;
	        width: 7px;
        height: 7px;
    border-radius: 50%;
    background: var(--risu-theme-success);
        margin-right: 4px;
	        vertical-align: middle;
	        flex-shrink: 0;
	    }

	    .chat-header-info {
	        flex: 1;
	        min-width: 0;
	    }

	    .chat-header-name {
	        font-size: 14px;
	        font-weight: 600;
	        line-height: 1.2;
	        color: var(--risu-theme-textcolor);
	    }

	    .chat-header-status {
	        font-size: 11px;
	        color: var(--risu-theme-success);
	        display: flex;
	        align-items: center;
	    }

    .chat-more-btn {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: transparent;
        border: 0;
        color: var(--risu-theme-textcolor);
        display: grid;
        place-items: center;
        cursor: pointer;
        flex-shrink: 0;
        transition: color 0.15s;
    }

    .chat-more-btn:hover {
        color: var(--risu-theme-primary);
    }

    .header-menu-backdrop {
        position: fixed;
        inset: 0;
        z-index: 50;
    }

    .header-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        z-index: 51;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 12px;
        padding: 4px;
        min-width: 140px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }

    .header-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px 14px;
        background: transparent;
        border: 0;
        border-radius: 8px;
        color: var(--risu-theme-textcolor);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s;
        text-align: left;
    }

    .header-menu-item:hover {
        background: color-mix(in oklch, var(--risu-theme-primary) 14%, transparent);
        color: var(--risu-theme-primary);
    }

    .header-menu-item :global(svg) {
        flex-shrink: 0;
    }

    :global(.default-chat-screen) {
        z-index: 1;
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        scrollbar-gutter: stable;
    }

    .chat-composer-sticky {
        background: color-mix(in oklch, var(--risu-theme-darkbg) 90%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-top: 1px solid var(--risu-theme-borderc);
    }

    .chat-composer {
        border-radius: 12px;
        border: 1px solid var(--risu-theme-borderc);
        background: color-mix(in oklch, var(--risu-theme-darkbg) 90%, transparent);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 6px 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .chat-composer:focus-within {
        border-color: var(--risu-theme-primary);
        box-shadow: 0 0 0 3px color-mix(in oklch, var(--risu-theme-primary) 20%, transparent);
    }

    .composer-aux-row {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 0 4px;
    }

    .composer-main-row {
        display: flex;
        align-items: flex-end;
        gap: 8px;
    }

    .chat-tool-btn:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--risu-theme-primary);
    }

    .chat-send-btn {
        width: 38px !important;
        height: 38px !important;
        min-width: 38px;
        border-radius: 50%;
        background: var(--risu-theme-primary) !important;
        color: #06111f !important;
        box-shadow: none;
        transition: opacity 0.15s;
        border: 0;
        cursor: pointer;
    }

    .chat-send-btn:hover {
        opacity: 0.85;
        background: var(--risu-theme-primary) !important;
    }

    .chat-continue-btn {
        color: var(--risu-theme-textcolor);
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary) 26%, var(--risu-theme-darkborderc));
        background: color-mix(in srgb, var(--risu-theme-primary) 14%, transparent);
        white-space: nowrap;
    }

    .chat-continue-btn:hover:not(:disabled),
    .chat-continue-btn:focus-visible:not(:disabled) {
        color: #fff;
        border-color: color-mix(in srgb, var(--risu-theme-primary) 62%, white 10%);
        background: color-mix(in srgb, var(--risu-theme-primary) 70%, var(--risu-theme-bgcolor) 30%);
        box-shadow: 0 10px 24px color-mix(in srgb, var(--risu-theme-primary) 24%, transparent);
        transform: translateY(-1px);
        outline: none;
    }

    .chat-continue-btn:disabled {
        cursor: not-allowed;
        opacity: 0.42;
        background: color-mix(in srgb, var(--risu-theme-textcolor2) 8%, transparent);
    }

    .chat-input-area {
        flex: 1;
        min-height: 40px;
        max-height: 100px;
        line-height: 1.4;
        padding: 10px 14px;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 20px;
        color: var(--risu-theme-textcolor);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 14px;
        outline: none;
        resize: none;
    }

    .chat-input-area:focus {
        border-color: var(--risu-theme-primary);
    }

    .chat-input-area::placeholder {
        color: var(--risu-theme-textcolor2);
    }

    .chat-translate-box,
    .chat-attachment-tray,
    .chat-sticker-tray {
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary) 20%, var(--risu-theme-darkborderc));
        border-radius: 8px;
        background: color-mix(in srgb, var(--risu-theme-bgcolor) 86%, var(--risu-theme-darkbg) 14%);
        backdrop-filter: blur(12px);
    }

    .chat-scroll-nav {
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary) 24%, var(--risu-theme-darkborderc));
        background: color-mix(in srgb, var(--risu-theme-bgcolor) 78%, var(--risu-theme-darkbg) 22%);
        box-shadow: 0 14px 32px rgba(0, 0, 0, 0.22);
        backdrop-filter: blur(12px);
    }

    .chat-scroll-nav button:hover {
        background: color-mix(in srgb, var(--risu-theme-primary) 18%, transparent);
    }

    .chat-new-message-btn {
        min-height: 38px;
        padding: 0 14px;
        border-radius: 999px;
        color: white;
        background: var(--risu-theme-primary);
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary) 70%, white 18%);
        box-shadow: 0 14px 32px color-mix(in srgb, var(--risu-theme-primary) 34%, transparent);
        transition: transform 0.16s ease, background-color 0.16s ease;
    }

    .chat-new-message-btn:hover {
        transform: translateY(-1px);
        background: color-mix(in srgb, var(--risu-theme-primary) 84%, white 8%);
    }

    .chat-new-message-circle {
        width: 48px;
        height: 48px;
        padding: 0;
    }

    .chat-empty-state span {
        padding: 14px 18px;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary) 24%, var(--risu-theme-darkborderc));
        border-radius: 8px;
        background: color-mix(in srgb, var(--risu-theme-bgcolor) 82%, var(--risu-theme-darkbg) 18%);
    }

    @media (max-width: 640px) {
        .chat-topbar {
        width: 100%;
        padding: 8px 14px;
        }

        .chat-composer-sticky {
            padding-bottom: max(12px, env(safe-area-inset-bottom));
        }

        .chat-continue-btn {
            width: 36px;
            padding: 0;
        }

        .chat-continue-btn span {
            display: none;
        }
    }

    .chat-process-stage-1{
        border-top: 0.4rem solid #60a5fa;
        border-left: 0.4rem solid #60a5fa;
    }

    .chat-process-stage-2{
        border-top: 0.4rem solid #db2777;
        border-left: 0.4rem solid #db2777;
    }

    .chat-process-stage-3{
        border-top: 0.4rem solid #34d399;
        border-left: 0.4rem solid #34d399;
    }

    .chat-process-stage-4{
        border-top: 0.4rem solid #8b5cf6;
        border-left: 0.4rem solid #8b5cf6;
    }


    @keyframes spin {

        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    /* gemini-cache-keeper compat: the plugin injects #gck-cache-timer into the composer
       (found via the .plugin-compat-items-stretch hook) and absolutely positions it over
       the send button — which now overlaps the expand button and floats at the composer's
       vertical center. Re-flow it as an in-line flex item: order:0 (default, appended last)
       places it just left of the expand button (order-1) and send button (order-2). */
    :global(.plugin-compat-items-stretch #gck-cache-timer) {
        position: relative !important;  /* stay a positioned ancestor so the popup still anchors to it */
        inset: auto !important;         /* clear the plugin's top/right offsets */
        transform: none !important;     /* clear translateY(-50%) */
        margin-left: auto;              /* right-align the trailing cluster when the composer wraps (multiline) */
    }
    /* when the timer is present it owns the auto margin, so drop the expand button's own
       ml-auto to avoid a double gap splitting the timer away from the buttons */
    :global(.plugin-compat-items-stretch:has(#gck-cache-timer) .composer-expand-btn) {
        margin-left: 0;
    }
</style>
