<script lang="ts">
    import { onMount } from "svelte";
    import { XIcon, TrashIcon, PencilIcon, BookOpenCheckIcon, BookLockIcon, ArrowRightIcon, BookmarkIcon } from "@lucide/svelte";
    import Chat from "../ChatScreens/Chat.svelte";
    import { getCharImage } from "src/ts/characters";
    import { findCharacterbyId, getUserName, getUserIcon } from "src/ts/util";
    import { createSimpleCharacter, bookmarkListOpen, DBState, selectedCharID, ScrollToMessageStore } from "src/ts/stores.svelte";
    import { language } from "src/lang";
    import { alertInput } from "src/ts/alert";

    const close = () => $bookmarkListOpen = false;
    let chara = $derived(DBState.db.characters[$selectedCharID]);
    const simpleChar = $derived(createSimpleCharacter(chara));

    const messageMap = $derived.by(() => {
        if (!chara) return new Map();

        const chat = chara.chats[chara.chatPage];
        const allMessages = chat.message;
        const map = new Map();

        allMessages.forEach((m, index) => {
            map.set(m.chatId, { ...m, originalIndex: index, saying: m.saying ?? '' });
        });

        return map;
    });

    const bookmarkedMessages = $derived.by(() => {
        if (!chara) return [];

        const chat = chara.chats[chara.chatPage];
        const bookmarkIds = chat.bookmarks ?? [];
        const map = messageMap;

        const messages = bookmarkIds
            .map(id => {
                const message = map.get(id);
                if (!message) return null;

                let speaker = null;
                if (message.saying) {
                    speaker = findCharacterbyId(message.saying);
                }

                return { ...message, speaker };
            })
            .filter(Boolean);

        return messages;
    });

    let expandedBookmarks = $state(new Set<string>());
    let expandAll = $state(false);

    onMount(() => {
        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };
        window.addEventListener('keydown', handleKeydown);
        return () => {
            window.removeEventListener('keydown', handleKeydown);
        };
    });

    function toggleExpand(chatId: string) {
        if (expandAll) {
            expandAll = false;
            const allIds = bookmarkedMessages.map(m => m.chatId);
            const newSet = new Set(allIds);
            newSet.delete(chatId);
            expandedBookmarks = newSet;
        } else {
            const newSet = new Set(expandedBookmarks);
            if (newSet.has(chatId)) {
                newSet.delete(chatId);
            } else {
                newSet.add(chatId);
            }
            expandedBookmarks = newSet;
        }
    }

    function toggleExpandAll() {
        expandAll = !expandAll;
        if (expandAll) {
            expandedBookmarks.clear();
        }
    }

    async function editName(chatId: string) {
        const chat = chara.chats[chara.chatPage];
        const newName = await alertInput(language.bookmarkAskNameOrCancel, [], chat.bookmarkNames?.[chatId] || '');
        if (newName && newName.trim() !== '') {
            chat.bookmarkNames[chatId] = newName;
        }
    }

    function removeBookmark(chatId: string) {
        const chat = chara.chats[chara.chatPage];
        const index = chat.bookmarks.indexOf(chatId);
        if (index > -1) {
            chat.bookmarks.splice(index, 1);
            delete chat.bookmarkNames[chatId];
        }
    }

    function goToChat(index: number) {
        ScrollToMessageStore.value = index;
        close();
    }

    function getMsgPreview(data: string): string {
        return data.replace(/\n/g, ' ').substring(0, 60) + (data.length > 60 ? '…' : '');
    }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="bookmark-overlay"
    onclick={(event) => {
        if (event.target === event.currentTarget) {
            close();
        }
    }}
    onkeydown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
            close();
        }
    }}
>
    <div class="bookmark-panel">
        <!-- Header -->
        <div class="bookmark-header" data-od-id="header">
            <h1>{language.bookmarks}</h1>
            <div class="header-actions">
                <button
                    class="icon-btn-sm"
                    onclick={toggleExpandAll}
                    title={expandAll ? language.collapseAll : language.expandAll}
                >
                    {#if expandAll}
                        <BookLockIcon size={18} />
                    {:else}
                        <BookOpenCheckIcon size={18} />
                    {/if}
                </button>
                <button class="icon-btn-sm" onclick={close}>
                    <XIcon size={20}/>
                </button>
            </div>
        </div>

        {#if bookmarkedMessages.length === 0}
            <!-- Empty state -->
            <div class="empty-state">
                <div class="empty-icon-circle">
                    <BookmarkIcon />
                </div>
                <h3>暂无书签</h3>
                <p>{language.noBookmarks}</p>
            </div>
        {:else}
            <!-- Bookmark list -->
            <div class="bookmark-list">
                {#each bookmarkedMessages as msg (msg.chatId)}
                    <div class="list-row-wrap">
                        <div
                            class="list-row"
                            class:first={msg.chatId === bookmarkedMessages[0].chatId}
                            role="button"
                            tabindex="0"
                            onclick={() => toggleExpand(msg.chatId)}
                            onkeydown={(e) => e.key === 'Enter' && toggleExpand(msg.chatId)}
                        >
                            <div class="bookmark-icon-col">
                                <BookmarkIcon />
                            </div>
                            <div class="body">
                                <div class="title">{chara.chats[chara.chatPage].bookmarkNames?.[msg.chatId] || msg.data.substring(0, 40) + '...'}</div>
                                <div class="sub">{msg.role === 'user' ? getUserName() : (msg.speaker?.name ?? chara.name)} · {getMsgPreview(msg.data)}</div>
                            </div>
                            <div class="row-actions">
                                <button class="action-btn" title={language.goToChat} onclick={(e) => { e.stopPropagation(); goToChat(msg.originalIndex); }}>
                                    <ArrowRightIcon size={18} />
                                </button>
                                <button class="action-btn" onclick={(e) => { e.stopPropagation(); editName(msg.chatId); }}>
                                    <PencilIcon size={15} />
                                </button>
                                <button class="action-btn danger" onclick={(e) => { e.stopPropagation(); removeBookmark(msg.chatId); }}>
                                    <TrashIcon size={15} />
                                </button>
                            </div>
                        </div>

                        {#if expandAll || expandedBookmarks.has(msg.chatId)}
                            <div class="expanded-msg">
                                <Chat
                                    idx={msg.originalIndex}
                                    message={msg.data}
                                    name={msg.role === 'user' ? getUserName() : (msg.speaker?.name ?? chara.name)}
                                    img={msg.role === 'user' ? getCharImage(getUserIcon(), 'css') : getCharImage(msg.speaker?.image ?? chara.image, 'css')}
                                    role={msg.role}
                                    messageGenerationInfo={msg.generationInfo}
                                    rerollIcon={false}
                                    largePortrait={msg.speaker?.largePortrait ?? (chara as import('src/ts/storage/database.svelte').character).largePortrait}
                                    character={msg.speaker ? msg.saying : simpleChar}
                                    isLastMemory={false}
                                />
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .bookmark-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 30;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
    }

    .bookmark-panel {
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 16px;
        max-width: 560px;
        width: 100%;
        max-height: 85vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .bookmark-header {
        padding: 16px 20px 12px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
    }

    .bookmark-header h1 {
        font-family: var(--risu-font-family);
        font-size: 26px;
        font-weight: 700;
        letter-spacing: -0.02em;
        line-height: 1.1;
        margin: 0;
        color: var(--risu-theme-textcolor);
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .icon-btn-sm {
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        display: grid;
        place-items: center;
        color: var(--risu-theme-textcolor2);
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
    }

    .icon-btn-sm:hover {
        color: var(--risu-theme-primary);
        border-color: var(--risu-theme-primary);
    }

    .icon-btn-sm :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    /* Empty state */
    .empty-state {
        text-align: center;
        padding: 60px 20px;
    }

    .empty-icon-circle {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: color-mix(in oklch, var(--risu-theme-primary) 12%, transparent);
        display: grid;
        place-items: center;
        margin: 0 auto 16px;
    }

    .empty-icon-circle :global(svg) {
        width: 28px;
        height: 28px;
        stroke: var(--risu-theme-primary);
        fill: none;
        stroke-width: 1.6;
    }

    .empty-state h3 {
        font-family: var(--risu-font-family);
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 6px;
        color: var(--risu-theme-textcolor);
    }

    .empty-state p {
        color: var(--risu-theme-textcolor2);
        font-size: 14px;
        margin: 0;
    }

    /* List rows */
    .bookmark-list {
        overflow-y: auto;
        padding: 0 20px 20px;
    }

    .list-row-wrap {
        border-top: 1px solid var(--risu-theme-borderc);
    }

    .list-row-wrap:first-child {
        border-top: 0;
    }

    .list-row {
        display: grid;
        grid-template-columns: 36px 1fr auto;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        cursor: pointer;
        transition: background 0.15s;
    }

    .list-row:hover {
        background: color-mix(in oklch, var(--risu-theme-primary) 6%, transparent);
        margin-inline: -8px;
        padding-inline: 8px;
        border-radius: 8px;
    }

    .bookmark-icon-col {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--risu-theme-primary);
    }

    .bookmark-icon-col :global(svg) {
        width: 18px;
        height: 18px;
        fill: var(--risu-theme-primary);
        stroke: none;
    }

    .body {
        min-width: 0;
    }

    .body .title {
        font-size: 15px;
        font-weight: 600;
        line-height: 1.25;
        color: var(--risu-theme-textcolor);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .body .sub {
        color: var(--risu-theme-textcolor2);
        font-size: 13px;
        line-height: 1.3;
        margin-top: 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .row-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
    }

    .action-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: transparent;
        border: 0;
        color: var(--risu-theme-textcolor2);
        cursor: pointer;
        display: grid;
        place-items: center;
        transition: color 0.15s;
    }

    .action-btn:hover {
        color: var(--risu-theme-primary);
    }

    .action-btn.danger:hover {
        color: var(--risu-theme-draculared);
    }

    .action-btn :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    .expanded-msg {
        padding: 8px 0 12px;
        border-top: 1px solid var(--risu-theme-borderc);
    }
</style>
