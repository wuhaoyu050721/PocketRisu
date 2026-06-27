<script lang="ts">
    import { PlusIcon, SearchIcon } from "@lucide/svelte";
    import { DBState, selectedCharID } from 'src/ts/stores.svelte';
    import { addCharacter, changeChar, getCharImage } from "src/ts/characters";
    import { makeAgoText } from "src/ts/util";
    import { language } from "src/lang";
    import { alertConfirm } from "src/ts/alert";
    import { requestImmediateSave } from "src/ts/globalApi.svelte";

    function getGreeting(): string {
        const now = new Date();
        const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const m = now.getMonth() + 1, d = now.getDate(), w = weekdays[now.getDay()];
        return `${m} 月 ${d} 日 · ${w}`;
    }

    function selectChar(index: number) { changeChar(index); }

    // Pinned indices
    let pinnedIndices = $state(new Set<number>());

    // All characters sorted by last interaction
    let allChars = $derived(
        DBState.db.characters
            .map((c, i) => ({
                index: i,
                name: c.name || 'Unnamed',
                image: c.image,
                lastInteraction: c.lastInteraction || 0,
                agoText: makeAgoText(c.lastInteraction || 0),
                lastMsg: (() => {
                    const chat = c.chats?.[c.chatPage ?? 0];
                    if (!chat?.message?.length) return '';
                    return chat.message[chat.message.length - 1]?.data?.replace(/\n/g, ' ')?.substring(0, 40) || '';
                })(),
            }))
            .filter(c => c.lastInteraction > 0)
            .sort((a, b) => b.lastInteraction - a.lastInteraction)
    );

    let pinnedChars = $derived(allChars.filter(c => pinnedIndices.has(c.index)));
    let recentChars = $derived(allChars.filter(c => !pinnedIndices.has(c.index)));

    // Resolved avatar CSS
    let avatarStyles = $state<Record<number, string>>({});
    $effect(() => {
        Promise.all(allChars.map(async c => {
            const css = c.image ? await getCharImage(c.image, 'css') : '';
            return { index: c.index, css };
        })).then(r => {
            const m: Record<number, string> = {};
            r.forEach(x => m[x.index] = x.css);
            avatarStyles = m;
        });
    });

    // Bi-directional swipe: right=pin, left=delete
    let swipedIdx = $state<number | null>(null);
    let swipeOff = $state(0), swipeSX = $state(0);
    const TH = 60;
    function ts(e: TouchEvent, i: number) { swipeSX = e.touches[0].clientX; swipedIdx = i; swipeOff = 0; }
    function tm(e: TouchEvent) {
        if (swipedIdx == null) return;
        swipeOff = e.touches[0].clientX - swipeSX;
    }
    function te() {
        if (swipedIdx == null) return;
        const off = swipeOff;
        console.log('[HomePage] swipe end', { idx: swipedIdx, off, TH });
        if (off > TH) { console.log('[HomePage] pin'); togglePin(swipedIdx); }
        else if (off < -TH) { console.log('[HomePage] delete'); handleDelete(swipedIdx); }
        swipedIdx = null; swipeOff = 0;
    }

    function togglePin(i: number) {
        const n = new Set(pinnedIndices);
        n.has(i) ? n.delete(i) : n.add(i);
        pinnedIndices = n;
    }

    async function handleDelete(index: number) {
        console.log('[HomePage] handleDelete start', index);
        const char = DBState.db.characters[index];
        if (!char || !char.chats) { console.log('[HomePage] no char or chats'); return; }
        const chatPage = char.chatPage ?? 0;
        console.log('[HomePage] chatPage', chatPage, 'chats.length', char.chats.length);
        if (char.chats.length <= 1) {
            const confirmed = await alertConfirm('该角色只有一个对话，确定清空所有消息？');
            console.log('[HomePage] clear confirmed:', confirmed);
            if (!confirmed) return;
            // Force reactivity by replacing the entire character
            const c = DBState.db.characters[index];
            c.chats[chatPage].message = [];
            c.lastInteraction = 0;
            DBState.db.characters[index] = c;
            void requestImmediateSave();
            console.log('[HomePage] cleared');
            return;
        }
        const chatName = char.chats[chatPage]?.name || 'Chat 1';
        console.log('[HomePage] confirming delete:', chatName);
        const confirmed = await alertConfirm(`删除对话「${chatName}」？`);
        console.log('[HomePage] confirmed:', confirmed);
        if (!confirmed) return;
        let chats = DBState.db.characters[index].chats;
        chats.splice(chatPage, 1);
        DBState.db.characters[index].chats = chats;
        if (DBState.db.characters[index].chatPage >= chats.length) {
            DBState.db.characters[index].chatPage = chats.length - 1;
        }
        void requestImmediateSave();
        console.log('[HomePage] deleted, remaining chats:', chats.length);
        if ($selectedCharID === index) selectedCharID.set(index);
    }
</script>

<div class="chat-list-page">
    <!-- Header -->
    <div class="header" data-od-id="header">
        <div>
            <p class="greeting">{getGreeting()}</p>
            <h1>对话</h1>
        </div>
        <button class="icon-btn" aria-label="新对话" onclick={() => { console.log('[HomePage] + clicked'); try { addCharacter().then(() => console.log('[HomePage] addCharacter done')).catch(e => console.error('[HomePage] addCharacter error', e)); } catch(e) { console.error('[HomePage] sync error', e); } }}>
            <PlusIcon />
        </button>
    </div>

    <!-- Search bar -->
    <section class="pad" data-od-id="search" style="margin-bottom:4px;">
        <div class="search-bar">
            <SearchIcon />
            <span>搜索对话或角色…</span>
        </div>
    </section>

    {#if allChars.length > 0}
        <!-- Pinned section -->
        {#if pinnedChars.length > 0}
            <div class="section-label">置顶</div>
            <section class="pad" data-od-id="pinned">
                {#each pinnedChars as ch (ch.index)}
                    <div class="swipe-wrap"
                        ontouchstart={(e) => ts(e, ch.index)}
                        ontouchmove={tm} ontouchend={te}>
                        {#if swipedIdx === ch.index && swipeOff > 20}
                            <button class="swipe-pin unpin" style="width:{Math.abs(swipeOff)}px;"
                                onclick={() => togglePin(ch.index)}>取消置顶</button>
                        {:else if swipedIdx === ch.index && swipeOff < -20}
                            <button class="swipe-del" style="width:{Math.abs(swipeOff)}px;right:0;left:auto;"
                                onclick={() => handleDelete(ch.index)}>删除</button>
                        {/if}
                        <button class="list-row"
                            style="transform:translateX({swipedIdx===ch.index?swipeOff:0}px);"
                            onclick={() => selectChar(ch.index)}>
                            <div class="avatar" style="position:relative;{avatarStyles[ch.index]||''}">
                                <span class="online-dot"></span>
                            </div>
                            <div class="body">
                                <div class="title">{ch.name}</div>
                                <div class="sub">{ch.lastMsg || '点击开始对话'}</div>
                            </div>
                            <span class="meta">{ch.agoText}</span>
                        </button>
                    </div>
                {/each}
            </section>
        {/if}

        <!-- Recent section -->
        {#if recentChars.length > 0}
            <div class="section-label">最近</div>
            <section class="pad" data-od-id="recent">
                {#each recentChars as ch (ch.index)}
                    <div class="swipe-wrap"
                        ontouchstart={(e) => ts(e, ch.index)}
                        ontouchmove={tm} ontouchend={te}>
                        {#if swipedIdx === ch.index && swipeOff > 20}
                            <button class="swipe-pin" style="width:{Math.abs(swipeOff)}px;"
                                onclick={() => togglePin(ch.index)}>置顶</button>
                        {:else if swipedIdx === ch.index && swipeOff < -20}
                            <button class="swipe-del" style="width:{Math.abs(swipeOff)}px;right:0;left:auto;"
                                onclick={() => handleDelete(ch.index)}>删除</button>
                        {/if}
                        <button class="list-row"
                            style="transform:translateX({swipedIdx===ch.index?swipeOff:0}px);"
                            onclick={() => selectChar(ch.index)}>
                            <div class="avatar" style={avatarStyles[ch.index]||''}></div>
                            <div class="body">
                                <div class="title">{ch.name}</div>
                                <div class="sub">{ch.lastMsg || '点击开始对话'}</div>
                            </div>
                            <span class="meta">{ch.agoText}</span>
                        </button>
                    </div>
                {/each}
            </section>
        {/if}
    {:else}
        <div class="empty-state">
            <div class="empty-icon-circle"><PlusIcon /></div>
            <h3>还没有对话</h3>
            <p>点击右上角 + 或底部「角色」标签选择角色开始聊天</p>
        </div>
    {/if}
</div>

<style>
    /* ═══ 1:1 matching chat-list.html ═══ */
    .chat-list-page {
        width: 100%; height: 100%; overflow-y: auto; overflow-x: hidden;
        background: var(--risu-theme-bgcolor); color: var(--risu-theme-textcolor);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 15px; line-height: 1.4; -webkit-font-smoothing: antialiased;
        padding: 8px 0 28px;
    }
    .chat-list-page::-webkit-scrollbar { display: none; }
    .pad { padding-inline: 20px; }

    /* ── Header ── */
    .header {
        padding: 8px 20px 12px;
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .greeting {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--risu-theme-textcolor2); margin: 0 0 4px;
    }
    .header h1 {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; margin: 0;
    }
    .icon-btn {
        width: 44px; height: 44px; border-radius: 999px;
        background: var(--risu-theme-darkbg); border: 1px solid var(--risu-theme-borderc);
        display: grid; place-items: center; color: var(--risu-theme-textcolor);
        cursor: pointer; transition: border-color 0.15s; flex-shrink: 0;
    }
    .icon-btn:hover { border-color: var(--risu-theme-primary); }
    .icon-btn :global(svg) { width: 18px; height: 18px; stroke: currentColor; fill: none; stroke-width: 1.7; }

    /* ── Search ── */
    .search-bar {
        display: flex; align-items: center; gap: 8px;
        background: var(--risu-theme-darkbg); border: 1px solid var(--risu-theme-borderc);
        border-radius: 12px; padding: 12px 14px;
        color: var(--risu-theme-textcolor2); font-size: 14px;
    }
    .search-bar :global(svg) { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 1.8; flex-shrink: 0; }

    /* ── Section label ── */
    .section-label {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
        color: var(--risu-theme-textcolor2); padding: 16px 20px 6px;
    }

    /* ── Swipe ── */
    .swipe-wrap { position: relative; overflow: hidden; }
    .swipe-pin {
        position: absolute; left: 0; top: 0; height: 100%;
        display: flex; align-items: center; justify-content: center;
        background: var(--risu-theme-primary); color: #06111f;
        border: 0; font-size: 13px; font-weight: 600; cursor: pointer;
        white-space: nowrap; overflow: hidden; min-width: 70px;
        border-radius: 8px 0 0 8px; z-index: 1;
    }
    .swipe-pin.unpin { background: var(--risu-theme-draculared); color: #fff; }
    .swipe-del {
        position: absolute; right: 0; top: 0; height: 100%;
        display: flex; align-items: center; justify-content: center;
        background: var(--risu-theme-draculared); color: #fff;
        border: 0; font-size: 13px; font-weight: 600; cursor: pointer;
        white-space: nowrap; overflow: hidden; min-width: 70px;
        border-radius: 0 8px 8px 0; z-index: 1;
    }

    /* ── List row (matching design exactly) ── */
    .list-row {
        display: grid; grid-template-columns: 44px 1fr auto; align-items: center;
        gap: 12px; padding: 12px 0; border-top: 1px solid var(--risu-theme-borderc);
        width: 100%; background: transparent; border-left: 0; border-right: 0; border-bottom: 0;
        cursor: pointer; color: var(--risu-theme-textcolor); font: inherit; text-align: left;
        transition: transform 0.15s ease-out; position: relative; z-index: 2;
    }
    .list-row:first-child { border-top: 0; }

    /* Avatar — exact 44px circle, surface bg, border */
    .avatar {
        width: 44px; height: 44px; border-radius: 50%;
        background: var(--risu-theme-darkbg); border: 1px solid var(--risu-theme-borderc);
        overflow: hidden; background-size: cover; background-position: center;
    }
    .online-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: var(--risu-theme-success); border: 2px solid var(--risu-theme-bgcolor);
        position: absolute; bottom: 0; right: 0;
    }

    /* Body — matching design: title 15px/600, sub 13px/muted */
    .body { min-width: 0; }
    .body .title { font-size: 15px; font-weight: 600; line-height: 1.25; }
    .body .sub { color: var(--risu-theme-textcolor2); font-size: 13px; line-height: 1.3; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Meta — matching design: mono 12px muted */
    .meta { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 12px; color: var(--risu-theme-textcolor2); font-variant-numeric: tabular-nums; }

    /* Empty */
    .empty-state { text-align: center; padding: 80px 20px; }
    .empty-icon-circle { width: 64px; height: 64px; border-radius: 50%; background: color-mix(in oklch, var(--risu-theme-primary) 12%, transparent); display: grid; place-items: center; margin: 0 auto 16px; }
    .empty-icon-circle :global(svg) { width: 28px; height: 28px; stroke: var(--risu-theme-primary); fill: none; stroke-width: 1.6; }
    .empty-state h3 { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
    .empty-state p { color: var(--risu-theme-textcolor2); font-size: 14px; margin: 0; }
</style>
