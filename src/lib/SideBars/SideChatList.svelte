<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { v4 } from "uuid";
    import Sortable from 'sortablejs/modular/sortable.core.esm.js';
    import { DownloadIcon, PencilIcon, HardDriveUploadIcon, MenuIcon, TrashIcon, SplitIcon, FolderPlusIcon, BookmarkCheckIcon, PackageIcon, CopyIcon } from "@lucide/svelte";

    import type { Chat, ChatFolder, character } from "src/ts/storage/database.svelte";
    import { newChatModelDefaults } from "src/ts/storage/database.svelte";
    import { ensureChatHydrated } from "src/ts/storage/chatStorage";
    import { DBState, ReloadGUIPointer } from 'src/ts/stores.svelte';
    import { selectedCharID, chatDeselected } from "src/ts/stores.svelte";

    import CheckInput from "../UI/GUI/CheckInput.svelte";
    import ShButton from "../UI/GUI/ShButton.svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";

    import { exportChat, importChat, exportAllChats } from "src/ts/characters";
    import { alertConfirm, alertError, alertSelect, alertStore, notifySuccess, notifyError } from "src/ts/alert";
    import { findCharacterbyId, sleep, sortableOptions } from "src/ts/util";

    import { bookmarkListOpen, openModuleListStore } from "src/ts/stores.svelte";
    import { language } from "src/lang";
    import Toggles from "./Toggles.svelte";
    import PersonaBind from "./PersonaBind.svelte";
    import PromptBind from "./PromptBind.svelte";
    import ModelBind from "./ModelBind.svelte";
    import { changeChatTo, createChatCopyName, requestImmediateSave } from "src/ts/globalApi.svelte";

    interface Props {
        chara: character;
    }

    let { chara = $bindable() }: Props = $props();
    let editMode = $state(false)

    // Safety net: chats whose folderId references a deleted folder would
    // otherwise be invisible (excluded from both the no-folder section and
    // any folder section). Render them in the no-folder section instead.
    // The server-side fix prevents new orphans; this guard rescues existing
    // ones until boot-time normalize touches the disk.
    const validFolderIds = $derived(
        new Set((chara.chatFolders ?? []).map(f => f.id).filter(Boolean))
    )
    const isOrphanFolder = (folderId: string | null | undefined): boolean =>
        folderId != null && !validFolderIds.has(folderId)

    let chatsStb: Sortable[] = []
    let folderStb: Sortable = null

    let folderEles: HTMLDivElement = $state()
    let listEle: HTMLDivElement = $state()
    let sorted = $state(0)
    let opened = 0

    const createStb = () => {
        for (let chat of listEle.querySelectorAll('.risu-chat')) {
            chatsStb.push(new Sortable(chat, {
                group: 'chats',
                onEnd: async (event) => {
                    const currentChatPage = chara.chatPage
                    const newChats: Chat[] = []

                    // const chats: HTMLElement = event.to
                    // chats.querySelectorAll()
                    
                    listEle.querySelectorAll('[data-risu-chat-folder-idx]').forEach(folder => {
                        const folderIdx = parseInt(folder.getAttribute('data-risu-chat-folder-idx'))
                        folder.querySelectorAll('[data-risu-chat-idx]').forEach(chatInFolder => {
                            const chatIdx = parseInt(chatInFolder.getAttribute('data-risu-chat-idx'))
                            const newChat = chara.chats[chatIdx]
                            newChat.folderId = chara.chatFolders[folderIdx].id
                            newChats.push(newChat)
                        })
                    })

                    listEle.querySelectorAll('[data-risu-chat-idx]').forEach(chatEle => {
                        const idx = parseInt(chatEle.getAttribute('data-risu-chat-idx'))
                        const newChat = chara.chats[idx]
                        if (newChats.includes(newChat) == false) {
                            if (newChat.folderId != null)
                                newChat.folderId = null
                            newChats.push(newChat)
                        }
                    })

                    changeChatTo(newChats.indexOf(chara.chats[currentChatPage]))
                    chara.chats = newChats

                    try {
                        this.destroy()
                    } catch (e) {}
                    sorted += 1
                    await sleep(1)
                    createStb()
                },
                ...sortableOptions
            }))
        }
        folderStb = Sortable.create(folderEles, {
            group: 'folders',
            onEnd: async (event) => {
                const newFolders: ChatFolder[] = []
                const newChats: Chat[] = []
                const folders: HTMLElement[] = Array.from<HTMLElement>(event.to.children)

                const currentChatPage = chara.chatPage

                folders.forEach(folder => {
                    const folderIdx = parseInt(folder.getAttribute('data-risu-chat-folder-idx'))
                    newFolders.push(chara.chatFolders[folderIdx])

                    folder.querySelectorAll('[data-risu-chat-idx]').forEach(chatEle => {
                        const idx = parseInt(chatEle.getAttribute('data-risu-chat-idx'))
                        newChats.push(chara.chats[idx])
                    })
                })

                listEle.querySelectorAll('[data-risu-chat-idx]').forEach(chatEle => {
                    const idx = parseInt(chatEle.getAttribute('data-risu-chat-idx'))
                    if (newChats.includes(chara.chats[idx]) == false) {
                        newChats.push(chara.chats[idx])
                    }
                })
                
                chara.chatFolders = newFolders
                changeChatTo(newChats.indexOf(chara.chats[currentChatPage]))
                chara.chats = newChats
                try {
                    folderStb.destroy()
                } catch (e) {}
                sorted += 1
                await sleep(1)
                createStb()
            },
            ...sortableOptions
        })
    }

    onMount(createStb)

    onDestroy(() => {
        if (folderStb) {
            try {
                folderStb.destroy()
            } catch (error) {}
        }
        chatsStb.map(stb => {
            try {
                stb.destroy()
            } catch (error) {}
        })
    })
</script>
<div class="chat-settings-shell flex flex-col w-full">
    <div class="chat-settings-hero">
        <div>
            <span>{language.Chat}</span>
            <strong>{chara.name || language.character}</strong>
        </div>
        <small>{chara.chats.length} chats</small>
    </div>

    <ShButton className="chat-new-button relative bottom-2 w-full" onclick={() => {
        const len = chara.chats.length
        let chats = chara.chats
        const newChat = {
            message:[] as any[], note:'', name:`New Chat ${len + 1}`, localLore:[] as any[], fmIndex: -1, id: v4(),
            ...newChatModelDefaults()
        }
        chats.unshift(newChat)
        chara.chats = chats
        changeChatTo(0)
        void requestImmediateSave()
        $ReloadGUIPointer += 1
    }}>{language.newChat}</ShButton>

    {#key sorted}
    <div class="chat-list-panel flex flex-col mt-2 overflow-y-auto max-h-80" bind:this={listEle}>
        <!-- folder div -->
        <div class="flex flex-col" bind:this={folderEles}>
            <!-- chat folder -->
            {#each chara.chatFolders as folder, i}
            <div data-risu-chat-folder-idx={i}
                class="chat-folder flex flex-col mb-2 border-solid border-1 border-darkborderc cursor-pointer rounded-md">
                <!-- folder header -->
                <button 
                    onclick={() => {
                        if(!editMode) {
                            chara.chatFolders[i].folded = !folder.folded
                            $ReloadGUIPointer += 1
                        }
                    }}
                    class="chat-folder-header flex items-center text-textcolor border-solid border-0 border-darkborderc p-2 cursor-pointer rounded-md"
                    class:bg-red-900={folder.color === 'red'}
                    class:bg-yellow-900={folder.color === 'yellow'}
                    class:bg-green-900={folder.color === 'green'}
                    class:bg-blue-900={folder.color === 'blue'}
                    class:bg-indigo-900={folder.color === 'indigo'}
                    class:bg-purple-900={folder.color === 'purple'}
                    class:bg-pink-900={folder.color === 'pink'}
                >
                    {#if editMode}
                        <TextInput bind:value={chara.chatFolders[i].name} className="grow min-w-0" padding={false}/>
                    {:else}
                        <span>{folder.name}</span>
                    {/if}
                    <div class="grow flex justify-end">
                        <div role="button" tabindex="0" onkeydown={(e) => {
                            if(e.key === 'Enter'){
                                e.currentTarget.click()
                            }
                        }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={async (e) => {
                            e.stopPropagation()
                            const sel = parseInt(await alertSelect([language.changeFolderColor, language.cancel]))
                            switch (sel) {
                                case 0:
                                    const colors = ["red","green","blue","yellow","indigo","purple","pink","default"]
                                    const sel = parseInt(await alertSelect(colors))
                                    folder.color = colors[sel]
                                    break
                            }
                        }}>
                            <MenuIcon size={18}/>
                        </div>
                        <div role="button" tabindex="0" onkeydown={(e) => {
                            if(e.key === 'Enter'){
                                e.currentTarget.click()
                            }
                        }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={() => {
                            editMode = !editMode
                        }}>
                            <PencilIcon size={18}/>
                        </div>
                        <div role="button" tabindex="0" onkeydown={(e) => {
                            if(e.key === 'Enter'){
                                e.currentTarget.click()
                            }
                        }} class="text-textcolor2 hover:text-red-400 cursor-pointer" onclick={async (e) => {
                            e.stopPropagation()
                            const d = await alertConfirm(`${language.removeConfirm}${folder.name}`)
                            if (d) {
                                $ReloadGUIPointer += 1
                                const folders = chara.chatFolders
                                folders.splice(i, 1)
                                chara.chats.forEach(chat => {
                                    if (chat.folderId == folder.id) {
                                        chat.folderId = null
                                    }
                                })
                                chara.chatFolders = folders
                            }
                        }}>
                            <TrashIcon size={18}/>
                        </div>
                    </div>
                </button>
                <!-- chats in folder -->
                <div class="risu-chat chat-folder-body flex flex-col w-full text-textcolor border-solid border-0 border-darkborderc p-2 cursor-pointer rounded-md {folder.folded ? 'hidden' : ''}">
                    {#if chara.chats.filter(chat => chat.folderId == chara.chatFolders[i].id).length == 0}
                    <span class="no-sort flex justify-center text-textcolor2">Empty</span>
                    <div></div>
                    {:else}
                    {#each chara.chats.filter(chat => chat.folderId == chara.chatFolders[i].id) as chat}
                    {@const chatIdx = chara.chats.indexOf(chat)}
                    <button data-risu-chat-idx={chatIdx} onclick={() => {
                        if(!editMode){
                            changeChatTo(chatIdx)
                        }
                    }} class="risu-chats chat-row flex items-center text-textcolor border-solid border-0 border-darkborderc p-2 cursor-pointer rounded-md"class:bg-selected={chatIdx === chara.chatPage && !$chatDeselected}>
                        {#if editMode}
                            <TextInput bind:value={chat.name} className="grow min-w-0" padding={false}/>
                        {:else}
                            <span>{chat.name}</span>
                        {/if}
                        <div class="grow flex justify-end">
                            <div role="button" tabindex="0" onkeydown={(e) => {
                                if(e.key === 'Enter'){
                                    e.currentTarget.click()
                                }
                            }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={async (e) => {
                                e.stopPropagation()
                                const confirmed = await alertConfirm(`${language.copyChatConfirm}${chat.name}`)
                                if(!confirmed) return
                                const chatIdx = chara.chats.indexOf(chat)
                                if(chara.chats[chatIdx]?._placeholder){
                                    await ensureChatHydrated(chara.chats, chatIdx, (chara as character).chaId)
                                }
                                if(chara.chats[chatIdx]?._placeholder){
                                    alertError('Failed to load chat data.')
                                    return
                                }
                                const newChat = $state.snapshot(chara.chats[chatIdx])
                                newChat.name = createChatCopyName(newChat.name, 'Copy')
                                newChat.id = v4()
                                chara.chats.unshift(newChat)
                                changeChatTo(0)
                                chara.chats = chara.chats
                                void requestImmediateSave()
                                notifySuccess(language.copyChatSuccess)
                            }}>
                                <CopyIcon size={18}/>
                            </div>
                            <div role="button" tabindex="0" onkeydown={(e) => {
                                if(e.key === 'Enter'){
                                    e.currentTarget.click()
                                }
                            }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={() => {
                                editMode = !editMode
                            }}>
                                <PencilIcon size={18}/>
                            </div>
                            <div role="button" tabindex="0" onkeydown={(e) => {
                                if(e.key === 'Enter'){
                                    e.currentTarget.click()
                                }
                            }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={async (e) => {
                                e.stopPropagation()
                                exportChat(chara.chats.indexOf(chat))
                            }}>
                                <DownloadIcon size={18}/>
                            </div>
                            <div role="button" tabindex="0" onkeydown={(e) => {
                                if(e.key === 'Enter'){
                                    e.currentTarget.click()
                                }
                            }} class="text-textcolor2 hover:text-red-400 cursor-pointer" onclick={async (e) => {
                                e.stopPropagation()
                                if(chara.chats.length === 1){
                                    notifyError(language.errors.onlyOneChat)
                                    return
                                }
                                const d = await alertConfirm(`${language.removeConfirm}${chat.name}`)
                                if(d){
                                    changeChatTo(0)
                                    $ReloadGUIPointer += 1
                                    let chats = chara.chats
                                    chats.splice(chara.chats.indexOf(chat), 1)
                                    chara.chats = chats
                                    void requestImmediateSave()
                                }
                            }}>
                                <TrashIcon size={18}/>
                            </div>
                        </div>
                    </button>
                    {/each}
                    {/if}
                </div>
            </div>
            {/each}
        </div>
        <!-- chat without folder div -->
        <div class="risu-chat chat-root-list flex flex-col">
            {#each chara.chats as chat, i}
            {#if chat.folderId == null || isOrphanFolder(chat.folderId)}
            <button data-risu-chat-idx={i} onclick={() => {
                if(!editMode){
                    changeChatTo(i)
                }
            }}
            class="chat-row flex items-center text-textcolor border-solid border-0 border-darkborderc p-2 cursor-pointer rounded-md"
            class:bg-selected={i === chara.chatPage && !$chatDeselected}>
                {#if editMode}
                    <TextInput bind:value={chara.chats[i].name} className="grow min-w-0" padding={false}/>
                {:else}
                    <span>{chat.name}</span>
                {/if}
                <div class="grow flex justify-end">
                    <div role="button" tabindex="0" onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={async (e) => {
                        e.stopPropagation()
                        const confirmed = await alertConfirm(`${language.copyChatConfirm}${chat.name}`)
                        if(!confirmed) return
                        if(chara.chats[i]?._placeholder){
                            await ensureChatHydrated(chara.chats, i, (chara as character).chaId)
                        }
                        if(chara.chats[i]?._placeholder){
                            alertError('Failed to load chat data.')
                            return
                        }
                        const newChat = $state.snapshot(chara.chats[i])
                        newChat.name = createChatCopyName(newChat.name, 'Copy')
                        newChat.id = v4()
                        chara.chats.unshift(newChat)
                        changeChatTo(0)
                        chara.chats = chara.chats
                        void requestImmediateSave()
                        notifySuccess(language.copyChatSuccess)
                    }}>
                        <CopyIcon size={18}/>
                    </div>
                    <div role="button" tabindex="0" onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={() => {
                        editMode = !editMode
                    }}>
                        <PencilIcon size={18}/>
                    </div>
                    <div role="button" tabindex="0" onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }} class="text-textcolor2 hover:text-primary mr-1 cursor-pointer" onclick={async (e) => {
                        e.stopPropagation()
                        exportChat(i)
                    }}>
                        <DownloadIcon size={18}/>
                    </div>
                    <div role="button" tabindex="0" onkeydown={(e) => {
                        if(e.key === 'Enter'){
                            e.currentTarget.click()
                        }
                    }} class="text-textcolor2 hover:text-red-400 cursor-pointer" onclick={async (e) => {
                        e.stopPropagation()
                        if(chara.chats.length === 1){
                            notifyError(language.errors.onlyOneChat)
                            return
                        }
                        const d = await alertConfirm(`${language.removeConfirm}${chat.name}`)
                        if(d){
                            changeChatTo(0)
                            $ReloadGUIPointer += 1
                            let chats = chara.chats
                            chats.splice(i, 1)
                            chara.chats = chats
                            void requestImmediateSave()
                        }
                    }}>
                        <TrashIcon size={18}/>
                    </div>
                </div>
            </button>
            {/if}
            {/each}
        </div>
    </div>
    {/key}

    <div class="chat-tools-panel border-t border-selected mt-2">
        <div class="chat-tools flex mt-2 ml-2 items-center">
            <button class="text-textcolor2 hover:text-primary mr-2 cursor-pointer" onclick={() => {
                exportAllChats()
            }}>
                <DownloadIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-primary mr-2 cursor-pointer" onclick={() => {
                importChat()
            }}>
                <HardDriveUploadIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-primary mr-2 cursor-pointer" onclick={() => {
                editMode = !editMode
            }}>
                <PencilIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-primary mr-2 cursor-pointer" onclick={() => {
                alertStore.set({
                  type: "branches",
                  msg: ""
                })
            }}>
                <SplitIcon size={18}/>
            </button>
            <button class="text-textcolor2 hover:text-primary mr-2 cursor-pointer" onclick={() => {
                $bookmarkListOpen = true;
            }}>
                <BookmarkCheckIcon size={18}/>
            </button>
            <button class="ml-auto text-textcolor2 hover:text-primary mr-2 cursor-pointer" onclick={() => {
                if (!chara.chatFolders) {
                    chara.chatFolders = []
                }
                const folders = chara.chatFolders
                const length = chara.chatFolders.length
                folders.unshift({
                    id: v4(),
                    name: `New Folder ${length + 1}`,
                    folded: false,
                })
                chara.chatFolders = folders
                $ReloadGUIPointer += 1
            }}>
                <FolderPlusIcon size={18}/>
            </button>
        </div>

        {#if DBState.db.characters[$selectedCharID]?.chaId !== '§playground' && !$chatDeselected}
            <div class="chat-bindings">
            {#if DBState.db.showModelInSidebar}
                <ModelBind />
            {/if}
            {#if DBState.db.showPresetInSidebar}
                <PromptBind />
            {/if}
            {#if DBState.db.showPersonaInSidebar}
                <PersonaBind />
            {/if}
            <Toggles bind:chara={chara} noContainer />
            <ShButton className="w-full mt-2" onclick={() => {
                const char = DBState.db.characters[$selectedCharID]
                if (!char) return
                char.chats[char.chatPage].modules ??= []
                openModuleListStore.set(true)
            }}>
                <PackageIcon size={16} class="shrink-0" />
                <span class="truncate">{language.modules}</span>
            </ShButton>
            </div>
        {/if}
    </div>
</div>

<style>
    .chat-settings-shell {
        gap: 0.75rem;
        min-width: 0;
        color: #e5e7eb;
    }

    .chat-settings-hero {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        min-height: 4rem;
        padding: 0.8rem;
        border: 1px solid rgba(96, 165, 250, 0.2);
        border-radius: 0.85rem;
        background:
            radial-gradient(circle at 92% 0%, rgba(59, 130, 246, 0.2), transparent 7rem),
            linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(17, 24, 39, 0.78));
        box-shadow: 0 1rem 2rem rgba(2, 6, 23, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05);
    }

    .chat-settings-hero div {
        display: flex;
        min-width: 0;
        flex-direction: column;
    }

    .chat-settings-hero span {
        color: #93c5fd;
        font-size: 0.78rem;
        font-weight: 900;
        text-transform: uppercase;
    }

    .chat-settings-hero strong {
        overflow: hidden;
        color: #f8fafc;
        font-size: 1.1rem;
        font-weight: 900;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .chat-settings-hero small {
        flex: 0 0 auto;
        padding: 0.35rem 0.58rem;
        border: 1px solid rgba(147, 197, 253, 0.24);
        border-radius: 999px;
        color: #bfdbfe;
        background: rgba(30, 64, 175, 0.22);
        font-size: 0.74rem;
        font-weight: 800;
    }

    .chat-settings-shell :global(.chat-new-button) {
        bottom: 0 !important;
        min-height: 2.65rem;
        border-radius: 0.75rem;
        box-shadow: 0 0.7rem 1.6rem rgba(37, 99, 235, 0.16);
    }

    .chat-list-panel {
        max-height: min(28rem, 46vh);
        gap: 0.5rem;
        padding: 0.55rem;
        border: 1px solid rgba(148, 163, 184, 0.16);
        border-radius: 0.85rem;
        background: rgba(15, 23, 42, 0.5);
        scrollbar-width: thin;
    }

    .chat-folder {
        overflow: hidden;
        border-color: rgba(148, 163, 184, 0.18) !important;
        background: rgba(2, 6, 23, 0.22);
    }

    .chat-folder-header {
        min-height: 2.65rem;
        background: rgba(30, 41, 59, 0.46);
    }

    .chat-folder-body {
        gap: 0.35rem;
        padding: 0.45rem;
    }

    .chat-root-list {
        gap: 0.35rem;
    }

    .chat-row {
        min-height: 2.65rem;
        gap: 0.5rem;
        border: 1px solid transparent !important;
        background: rgba(15, 23, 42, 0.34);
        transition: border-color 0.15s ease, background 0.15s ease, transform 0.15s ease;
    }

    .chat-row:hover {
        border-color: rgba(147, 197, 253, 0.28) !important;
        background: rgba(30, 41, 59, 0.58);
    }

    .chat-row :global(span),
    .chat-folder-header :global(span) {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 800;
    }

    .chat-settings-shell :global(.bg-selected) {
        border-color: rgba(167, 139, 250, 0.45) !important;
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.32), rgba(37, 99, 235, 0.18)) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
    }

    .chat-tools-panel {
        padding: 0.65rem;
        border-color: rgba(148, 163, 184, 0.16) !important;
        border-radius: 0.85rem;
        background: rgba(15, 23, 42, 0.52);
    }

    .chat-tools {
        gap: 0.25rem;
        margin: 0 !important;
    }

    .chat-tools button,
    .chat-row div[role="button"],
    .chat-folder-header div[role="button"] {
        display: inline-flex;
        width: 2rem;
        height: 2rem;
        align-items: center;
        justify-content: center;
        margin-right: 0 !important;
        border-radius: 0.55rem;
        transition: background 0.15s ease, color 0.15s ease;
    }

    .chat-tools button:hover,
    .chat-row div[role="button"]:hover,
    .chat-folder-header div[role="button"]:hover {
        background: rgba(99, 102, 241, 0.16);
    }

    .chat-bindings {
        display: flex;
        flex-direction: column;
        gap: 0.65rem;
        margin-top: 0.7rem;
    }

    .chat-bindings :global(input),
    .chat-bindings :global(select),
    .chat-bindings :global(textarea) {
        border-color: rgba(148, 163, 184, 0.18) !important;
        background-color: rgba(2, 6, 23, 0.35) !important;
    }

    @media (max-width: 48rem) {
        .chat-list-panel {
            max-height: none;
        }

        .chat-settings-hero,
        .chat-list-panel,
        .chat-tools-panel {
            border-radius: 0.75rem;
        }
    }
</style>
