<script lang="ts">
    import { DBState } from 'src/ts/stores.svelte';
    import Hub from "./Realm/RealmMain.svelte";
    import { OpenRealmStore, RealmInitialOpenChar } from "src/ts/stores.svelte";
    import {
        ArrowLeft,
        ArrowUpRight,
        BarChart3Icon,
        ChevronDown,
        ExternalLinkIcon,
        GithubIcon as GithubLucideIcon,
        MailIcon,
        SendIcon,
        ShieldCheckIcon,
        SparklesIcon,
        TriangleAlertIcon,
        UsersIcon,
        WifiIcon,
    } from "@lucide/svelte";
    import { getVersionString, openURL } from "src/ts/globalApi.svelte";
    import { language } from "src/lang";
    import { getRisuHub, hubAdditionalHTML, importCharacter } from "src/ts/characterCards";
    import RisuHubIcon from "./Realm/RealmHubIcon.svelte";
    import { updateInfoStore, updatePopupStore } from "src/ts/update";
    import { publicStatsStore } from "src/ts/publicStats";
    import { isSecureContext } from "src/ts/secureContext";
    import { openSettings, SettingsRoute } from "src/ts/routing";
    import ShButton from "./GUI/ShButton.svelte";

    let realmOpen = $state(!DBState.db.hideRealm);

    const relatedLinks = [
        {
            title: language.relatedGithub,
            desc: language.relatedGithubDesc,
            icon: GithubLucideIcon,
            tone: 'blue',
            action: () => openURL("https://github.com/PocketRisu/PocketRisu"),
        },
        {
            title: language.relatedFeedbackForm,
            desc: language.relatedFeedbackFormDesc,
            icon: SendIcon,
            tone: 'violet',
            action: () => openURL("https://forms.gle/5ms5XntMrfaxmHTSA"),
        },
        {
            title: language.relatedContactEmail,
            desc: language.relatedContactEmailDesc,
            icon: MailIcon,
            tone: 'cyan',
            action: () => openURL("mailto:contact@pocketrisu.com"),
        },
        {
            title: language.relatedArcaLive,
            desc: language.relatedArcaLiveDesc,
            icon: UsersIcon,
            tone: 'rose',
            action: () => openURL("https://arca.live/b/characterai"),
        },
    ];
</script>

<div class="home-shell h-full w-full overflow-y-auto text-textcolor">
    {#if !$OpenRealmStore}
        <div class="home-content">
            <section class="hero-panel">
                <div class="hero-copy">
                    <div class="brand-row">
                        <img src="/logo_original.png" alt="小酒馆" class="brand-mark" />
                        <span class="brand-kicker">AI character workspace</span>
                    </div>
                    <h1>Pocket<span>Risu</span></h1>
                    <div class="version-row">
                        <span>v{getVersionString()}</span>
                        {#if $updateInfoStore?.hasUpdate}
                            <button
                                class="update-chip {$updateInfoStore.severity === 'optional' ? 'optional' : 'required'}"
                                onclick={() => updatePopupStore.set($updateInfoStore)}
                            >
                                <ArrowUpRight size={14} />
                                {#if $updateInfoStore.severity === 'outdated'}
                                    {language.updateOutdated.replace('{{version}}', $updateInfoStore.latestVersion)}
                                {:else if $updateInfoStore.severity === 'required'}
                                    {language.updateRequired.replace('{{version}}', $updateInfoStore.latestVersion)}
                                {:else}
                                    {language.updateAvailable.replace('{{version}}', $updateInfoStore.latestVersion)}
                                {/if}
                            </button>
                        {/if}
                    </div>
                    <p>AI 角色聊天与角色卡管理工作台</p>
                    <div class="status-row">
                        <span class="status-pill success"><ShieldCheckIcon size={16} />本地运行中</span>
                        <span class="status-pill info"><SparklesIcon size={16} />数据已保存</span>
                        <span class="status-pill realm"><WifiIcon size={16} />Realm 已连接</span>
                    </div>
                </div>

                <div class="hero-art" aria-hidden="true">
                    <div class="orbit orbit-a"></div>
                    <div class="orbit orbit-b"></div>
                    <div class="hero-card side-card left-card">
                        <div class="avatar-silhouette"></div>
                        <div class="line short"></div>
                        <div class="line"></div>
                    </div>
                    <div class="hero-card main-card">
                        <img src="/logo_typo_small.avif" alt="" />
                        <div class="stars">* * * *</div>
                        <div class="line"></div>
                        <div class="line wide"></div>
                    </div>
                    <div class="hero-card side-card right-card">
                        <div class="avatar-silhouette"></div>
                        <div class="line short"></div>
                        <div class="line"></div>
                    </div>
                </div>
            </section>

            {#if $updateInfoStore?.hasUpdate}
                <section class="notice-panel update-notice">
                    <div class="notice-icon"><ArrowUpRight size={22} /></div>
                    <div class="notice-copy">
                        <strong>发现新版本</strong>
                        <span>小酒馆 有新的版本可用，建议更新以获得最新功能和修复。</span>
                    </div>
                    <button class="primary-action" onclick={() => updatePopupStore.set($updateInfoStore)}>立即更新</button>
                </section>
            {/if}

            {#if $publicStatsStore}
                <section class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon violet"><UsersIcon size={24} /></div>
                        <div>
                            <span>今日 DAU</span>
                            <strong>{$publicStatsStore.dau.toLocaleString()}</strong>
                        </div>
                        <small>{language.statsYesterday.replace('{{count}}', $publicStatsStore.yesterdayDau.toLocaleString())}</small>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon blue"><BarChart3Icon size={24} /></div>
                        <div>
                            <span>今日访问量</span>
                            <strong>{$publicStatsStore.visits.toLocaleString()}</strong>
                        </div>
                        <small>{$publicStatsStore.timezone}</small>
                    </div>
                </section>
            {/if}

            {#if !isSecureContext}
                <section class="notice-panel warning-notice">
                    <div class="notice-icon"><TriangleAlertIcon size={22} /></div>
                    <div class="notice-copy">
                        <strong>{language.httpInsecureWarningTitle}</strong>
                        <span>{language.httpInsecureWarningBody}</span>
                    </div>
                    <ShButton variant="outline" size="sm" onclick={() => openSettings(SettingsRoute.RemoteAccess)}>
                        {language.httpInsecureOpenRemoteAccess}
                    </ShButton>
                </section>
            {/if}

            <section class="realm-panel">
                <div class="section-header">
                    <button
                        type="button"
                        class="section-title"
                        aria-expanded={realmOpen}
                        aria-controls="main-realm-section"
                        onclick={() => (realmOpen = !realmOpen)}
                    >
                        <span>Realm Hub 最近上传</span>
                        <ChevronDown
                            size={20}
                            class="transition-transform duration-150 {realmOpen ? 'rotate-180' : ''}"
                        />
                    </button>
                    <button class="ghost-action translate-action" onclick={() => importCharacter({ translateToChinese: true })}>
                        <SparklesIcon size={16} />
                        翻译角色卡
                    </button>
                    <button class="ghost-action" onclick={() => ($OpenRealmStore = true)}>
                        获取更多角色 <ExternalLinkIcon size={16} />
                    </button>
                </div>
                <div
                    id="main-realm-section"
                    role="region"
                    aria-hidden={!realmOpen}
                    inert={!realmOpen}
                >
                    {#if realmOpen}
                        {#await getRisuHub({
                            search: '',
                            page: 0,
                            nsfw: false,
                            sort: 'recommended'
                        }) then charas}
                            {#if charas.length > 0}
                                {@html hubAdditionalHTML}
                                <div class="realm-card-grid">
                                    {#each charas.slice(0, 6) as chara}
                                        <RisuHubIcon onClick={() => {
                                            $OpenRealmStore = true
                                            if(DBState.db.realmDirectOpen){
                                                $RealmInitialOpenChar = chara
                                            }
                                        }} chara={chara} />
                                    {/each}
                                </div>
                            {:else}
                                <div class="empty-state">Failed to load {language.hub}...</div>
                            {/if}
                        {/await}
                    {/if}
                </div>
            </section>

            <section class="links-panel">
                <h2>相关链接</h2>
                <div class="links-grid">
                    {#each relatedLinks as link}
                        {@const LinkIcon = link.icon}
                        <button class="link-card {link.tone}" onclick={link.action}>
                            <div class="link-icon">
                                <LinkIcon size={24} />
                            </div>
                            <div>
                                <strong>{link.title}</strong>
                                <span>{link.desc}</span>
                            </div>
                            <ExternalLinkIcon class="link-arrow" size={18} />
                        </button>
                    {/each}
                </div>
            </section>
        </div>
    {:else}
        <div class="realm-full">
            <div class="realm-toolbar">
                <button class="back-button" onclick={() => ($OpenRealmStore = false)}>
                    <ArrowLeft size={20} />
                    <span>返回首页</span>
                </button>
            </div>
            <Hub />
        </div>
    {/if}
</div>

<style>
    .home-shell {
        background:
            radial-gradient(circle at 78% 0%, rgba(139, 92, 246, 0.22), transparent 34rem),
            radial-gradient(circle at 20% 18%, rgba(59, 130, 246, 0.12), transparent 28rem),
            linear-gradient(135deg, #050914 0%, #07111f 45%, #080b18 100%);
    }

    .home-content {
        width: min(100%, 104rem);
        margin: 0 auto;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .hero-panel,
    .realm-panel,
    .links-panel,
    .notice-panel,
    .stat-card {
        border: 1px solid rgba(139, 146, 246, 0.24);
        background: linear-gradient(180deg, rgba(18, 24, 45, 0.92), rgba(8, 14, 28, 0.9));
        box-shadow: 0 18px 55px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.04);
        backdrop-filter: blur(16px);
    }

    .hero-panel {
        position: relative;
        min-height: 15.5rem;
        overflow: hidden;
        border-radius: 1rem;
        padding: clamp(1.5rem, 3vw, 3rem);
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(22rem, 40rem);
        gap: 1rem;
    }

    .hero-panel::before {
        content: "";
        position: absolute;
        inset: 0;
        background:
            radial-gradient(circle at 76% 25%, rgba(168, 85, 247, 0.28), transparent 16rem),
            linear-gradient(100deg, transparent 0%, rgba(99, 102, 241, 0.1) 65%, rgba(236, 72, 153, 0.12) 100%);
        pointer-events: none;
    }

    .hero-copy {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
    }

    .brand-row,
    .version-row,
    .status-row,
    .section-header,
    .notice-panel,
    .stat-card {
        display: flex;
        align-items: center;
    }

    .brand-row {
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .brand-mark {
        width: 2.25rem;
        height: 2.25rem;
        object-fit: contain;
        filter: drop-shadow(0 0 18px rgba(168, 85, 247, 0.65));
    }

    .brand-kicker {
        color: #b8c1d8;
        font-size: 0.92rem;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
    }

    .hero-copy h1 {
        font-size: clamp(3rem, 6vw, 4.75rem);
        line-height: 0.95;
        font-weight: 900;
        letter-spacing: 0;
        color: #f8fbff;
        text-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);
    }

    .hero-copy h1 span {
        color: #a78bfa;
    }

    .version-row {
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 0.85rem;
        color: #c7d2fe;
        font-weight: 800;
    }

    .hero-copy p {
        color: #b7c0d7;
        font-size: 1.2rem;
        margin-top: 0.65rem;
    }

    .update-chip,
    .status-pill,
    .ghost-action,
    .primary-action {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        border-radius: 999px;
        font-weight: 800;
    }

    .update-chip {
        padding: 0.38rem 0.75rem;
        font-size: 0.82rem;
        border: 1px solid;
    }

    .update-chip.optional {
        color: #86efac;
        background: rgba(22, 163, 74, 0.16);
        border-color: rgba(74, 222, 128, 0.35);
    }

    .update-chip.required {
        color: #fca5a5;
        background: rgba(220, 38, 38, 0.16);
        border-color: rgba(248, 113, 113, 0.35);
    }

    .status-row {
        gap: 0.75rem;
        flex-wrap: wrap;
        margin-top: 1.35rem;
    }

    .status-pill {
        padding: 0.55rem 0.85rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: rgba(2, 6, 23, 0.45);
        color: #cbd5e1;
        font-size: 0.9rem;
    }

    .status-pill.success {
        color: #86efac;
        border-color: rgba(74, 222, 128, 0.24);
    }

    .status-pill.info {
        color: #93c5fd;
        border-color: rgba(96, 165, 250, 0.25);
    }

    .status-pill.realm {
        color: #d8b4fe;
        border-color: rgba(168, 85, 247, 0.28);
    }

    .hero-art {
        position: relative;
        z-index: 1;
        min-height: 13rem;
    }

    .orbit {
        position: absolute;
        border: 1px solid rgba(167, 139, 250, 0.34);
        border-radius: 50%;
        transform: rotate(-10deg);
    }

    .orbit-a {
        width: 28rem;
        height: 9rem;
        right: 0;
        top: 3.2rem;
    }

    .orbit-b {
        width: 18rem;
        height: 6rem;
        right: 5rem;
        top: 5rem;
        border-color: rgba(96, 165, 250, 0.22);
    }

    .hero-card {
        position: absolute;
        width: 8.8rem;
        height: 12.8rem;
        border-radius: 0.8rem;
        border: 1px solid rgba(167, 139, 250, 0.5);
        background: linear-gradient(160deg, rgba(45, 33, 104, 0.76), rgba(13, 19, 39, 0.88));
        box-shadow: 0 0 38px rgba(124, 58, 237, 0.28);
        padding: 1rem;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
    }

    .main-card {
        right: 12.2rem;
        top: 0.2rem;
        height: 13.9rem;
        border-color: rgba(196, 181, 253, 0.9);
        box-shadow: 0 0 45px rgba(139, 92, 246, 0.56);
        transform: translateY(0.2rem);
    }

    .main-card img {
        position: absolute;
        top: 1.15rem;
        left: 50%;
        width: 5.4rem;
        transform: translateX(-50%);
        opacity: 0.78;
        filter: drop-shadow(0 0 18px rgba(196, 181, 253, 0.7));
    }

    .side-card {
        top: 3rem;
        opacity: 0.58;
    }

    .left-card {
        right: 21rem;
        transform: rotate(-8deg);
    }

    .right-card {
        right: 3.7rem;
        transform: rotate(8deg);
    }

    .avatar-silhouette {
        position: absolute;
        top: 1rem;
        left: 50%;
        width: 4.4rem;
        height: 4.4rem;
        border-radius: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(196, 181, 253, 0.38), rgba(99, 102, 241, 0.08));
    }

    .stars {
        color: #f0abfc;
        font-size: 1rem;
        font-weight: 900;
        letter-spacing: 0;
    }

    .line {
        height: 0.42rem;
        width: 70%;
        margin-top: 0.55rem;
        border-radius: 999px;
        background: rgba(167, 139, 250, 0.5);
    }

    .line.short {
        width: 44%;
    }

    .line.wide {
        width: 92%;
    }

    .notice-panel {
        gap: 1rem;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
    }

    .notice-icon {
        display: flex;
        width: 2.6rem;
        height: 2.6rem;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
    }

    .update-notice {
        border-color: rgba(74, 222, 128, 0.34);
        background: linear-gradient(90deg, rgba(6, 95, 70, 0.48), rgba(7, 20, 35, 0.9));
    }

    .update-notice .notice-icon {
        background: #4ade80;
        color: #052e16;
    }

    .warning-notice {
        border-color: rgba(245, 158, 11, 0.36);
        background: linear-gradient(90deg, rgba(120, 53, 15, 0.5), rgba(7, 20, 35, 0.9));
    }

    .warning-notice .notice-icon {
        background: #fbbf24;
        color: #451a03;
    }

    .notice-copy {
        min-width: 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.18rem;
    }

    .notice-copy strong {
        color: #fff7ed;
        font-size: 1.03rem;
    }

    .notice-copy span {
        color: #d6dee9;
        font-size: 0.92rem;
    }

    .primary-action,
    .ghost-action {
        border: 1px solid rgba(148, 163, 184, 0.22);
        transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }

    .primary-action {
        padding: 0.72rem 1.35rem;
        color: #052e16;
        background: linear-gradient(180deg, #86efac, #22c55e);
        border-color: rgba(134, 239, 172, 0.7);
    }

    .ghost-action {
        padding: 0.62rem 0.9rem;
        color: #c4b5fd;
        background: rgba(99, 102, 241, 0.12);
    }

    .translate-action {
        color: #bbf7d0;
        border-color: rgba(74, 222, 128, 0.3);
        background: rgba(22, 163, 74, 0.14);
    }

    .primary-action:hover,
    .ghost-action:hover,
    .link-card:hover {
        transform: translateY(-1px);
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
    }

    .stat-card {
        gap: 1rem;
        min-height: 5.7rem;
        border-radius: 0.75rem;
        padding: 1rem 1.25rem;
    }

    .stat-icon {
        display: flex;
        width: 3.2rem;
        height: 3.2rem;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 0.8rem;
    }

    .stat-icon.violet {
        color: #c4b5fd;
        background: rgba(109, 40, 217, 0.35);
    }

    .stat-icon.blue {
        color: #93c5fd;
        background: rgba(37, 99, 235, 0.34);
    }

    .stat-card div:nth-child(2) {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .stat-card span {
        color: #aeb9d2;
        font-size: 0.9rem;
        font-weight: 700;
    }

    .stat-card strong {
        color: #f8fafc;
        font-size: 1.9rem;
        line-height: 1.1;
    }

    .stat-card small {
        color: #86efac;
        font-size: 0.85rem;
    }

    .realm-panel,
    .links-panel {
        border-radius: 0.75rem;
        padding: 1rem;
    }

    .section-header {
        gap: 1rem;
        flex-wrap: wrap;
        justify-content: space-between;
        margin-bottom: 0.85rem;
    }

    .section-title {
        display: flex;
        min-width: 0;
        align-items: center;
        gap: 0.65rem;
        color: #e8ecff;
        font-size: 1.2rem;
        font-weight: 900;
        text-align: left;
    }

    .realm-card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
        gap: 0.7rem;
    }

    .empty-state {
        padding: 1rem;
        color: #94a3b8;
    }

    .links-panel h2 {
        margin-bottom: 0.75rem;
        color: #e8ecff;
        font-size: 1.1rem;
        font-weight: 900;
    }

    .links-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
    }

    .link-card {
        position: relative;
        display: flex;
        min-height: 5.6rem;
        align-items: center;
        gap: 0.9rem;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.18);
        border-radius: 0.75rem;
        background: rgba(15, 23, 42, 0.72);
        padding: 1rem;
        text-align: left;
        transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
    }

    .link-card:hover {
        border-color: rgba(167, 139, 250, 0.45);
        background: rgba(30, 41, 59, 0.86);
    }

    .link-icon {
        display: flex;
        width: 2.9rem;
        height: 2.9rem;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 0.65rem;
    }

    .link-card.blue .link-icon {
        color: #bfdbfe;
        background: rgba(37, 99, 235, 0.34);
    }

    .link-card.violet .link-icon {
        color: #e9d5ff;
        background: rgba(126, 34, 206, 0.34);
    }

    .link-card.cyan .link-icon {
        color: #a5f3fc;
        background: rgba(8, 145, 178, 0.3);
    }

    .link-card.rose .link-icon {
        color: #fecdd3;
        background: rgba(190, 18, 60, 0.32);
    }

    .link-card div:nth-child(2) {
        min-width: 0;
        display: flex;
        flex-direction: column;
    }

    .link-card strong {
        color: #f1f5f9;
        font-size: 1rem;
    }

    .link-card span {
        color: #aeb9d2;
        font-size: 0.86rem;
        line-height: 1.35;
    }

    .link-arrow {
        margin-left: auto;
        color: #94a3b8;
        flex: 0 0 auto;
    }

    .realm-full {
        width: min(100%, 104rem);
        margin: 0 auto;
        padding: 1rem;
    }

    .realm-toolbar {
        display: flex;
        min-height: 3.25rem;
        align-items: center;
        margin-bottom: 0.5rem;
        padding-left: 3.75rem;
    }

    .back-button {
        display: inline-flex;
        min-height: 2.75rem;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0 1rem;
        border: 1px solid rgba(167, 139, 250, 0.28);
        border-radius: 999px;
        background: rgba(15, 23, 42, 0.72);
        color: #c4b5fd;
        font-weight: 800;
        box-shadow: 0 0.75rem 1.8rem rgba(2, 6, 23, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;
    }

    .back-button:hover {
        border-color: rgba(196, 181, 253, 0.58);
        background: rgba(49, 46, 129, 0.52);
        color: #f5f3ff;
    }

    :global(.realm-card-grid > button) {
        width: 100%;
        min-height: 8.7rem;
        border: 1px solid rgba(148, 163, 184, 0.18);
        background: linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.86));
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    :global(.realm-card-grid > button:hover) {
        border-color: rgba(167, 139, 250, 0.45);
        background: linear-gradient(180deg, rgba(51, 65, 85, 0.82), rgba(15, 23, 42, 0.92));
    }

    @media (max-width: 72rem) {
        .hero-panel {
            grid-template-columns: 1fr;
        }

        .hero-art {
            display: none;
        }

        .links-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 48rem) {
        .home-shell {
            background:
                radial-gradient(circle at 85% 0%, rgba(168, 85, 247, 0.2), transparent 14rem),
                radial-gradient(circle at 12% 16%, rgba(59, 130, 246, 0.12), transparent 12rem),
                linear-gradient(180deg, #020713 0%, #050b17 52%, #060b16 100%);
        }

        .home-content {
            width: 100%;
            padding: 0.75rem 0.9rem 1rem;
            gap: 0.7rem;
        }

        .realm-full {
            padding: 0.75rem 0.9rem 1rem;
        }

        .realm-toolbar {
            min-height: 2.75rem;
            justify-content: flex-end;
            margin-bottom: 0.35rem;
            padding-left: 0;
        }

        .back-button {
            min-height: 2.35rem;
            padding: 0 0.8rem;
            font-size: 0.9rem;
        }

        .hero-panel {
            min-height: 15.2rem;
            padding: 1.45rem 1.2rem;
            border-radius: 0.9rem;
            grid-template-columns: 1fr;
            isolation: isolate;
        }

        .hero-panel::before {
            background:
                radial-gradient(circle at 75% 32%, rgba(124, 58, 237, 0.34), transparent 9rem),
                linear-gradient(95deg, rgba(3, 8, 20, 0.12), rgba(99, 102, 241, 0.1) 70%, rgba(236, 72, 153, 0.12));
        }

        .brand-row {
            display: none;
        }

        .hero-copy {
            max-width: 74%;
            justify-content: flex-start;
        }

        .hero-copy h1 {
            font-size: clamp(2.6rem, 13vw, 4rem);
            margin-top: 1.15rem;
        }

        .version-row {
            margin-top: 0.55rem;
            font-size: 1rem;
        }

        .hero-copy p {
            margin-top: 0.65rem;
            color: #cbd5e1;
            font-size: clamp(1rem, 4.5vw, 1.3rem);
            line-height: 1.45;
        }

        .status-row {
            gap: 0.45rem;
            margin-top: 1.05rem;
        }

        .status-pill {
            padding: 0.45rem 0.6rem;
            font-size: 0.82rem;
        }

        .hero-art {
            display: block;
            position: absolute;
            inset: 0;
            z-index: 1;
            min-height: 0;
            pointer-events: none;
        }

        .orbit-a {
            width: 15rem;
            height: 5.2rem;
            right: -1.8rem;
            top: 4.5rem;
        }

        .orbit-b {
            width: 10rem;
            height: 3.6rem;
            right: 2.1rem;
            top: 5.9rem;
        }

        .hero-card {
            width: 5.15rem;
            height: 7.7rem;
            border-radius: 0.6rem;
            padding: 0.62rem;
        }

        .main-card {
            right: 3.8rem;
            top: 2.25rem;
            height: 8.4rem;
        }

        .main-card img {
            top: 0.72rem;
            width: 3.15rem;
        }

        .side-card {
            top: 4.3rem;
        }

        .left-card {
            right: 7.9rem;
        }

        .right-card {
            right: 0.55rem;
        }

        .avatar-silhouette {
            top: 0.7rem;
            width: 2.65rem;
            height: 2.65rem;
        }

        .stars {
            font-size: 0.7rem;
        }

        .line {
            height: 0.28rem;
            margin-top: 0.38rem;
        }

        .notice-panel {
            display: grid;
            grid-template-columns: auto minmax(0, 1fr);
            align-items: center;
            gap: 0.85rem;
            padding: 1rem;
            border-radius: 0.9rem;
        }

        .notice-copy strong {
            font-size: 1.12rem;
        }

        .notice-copy span {
            font-size: 0.9rem;
            line-height: 1.45;
        }

        .notice-panel :global(button),
        .primary-action {
            grid-column: 1 / -1;
            min-height: 3rem;
            width: 100%;
            justify-content: center;
        }

        .stats-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.65rem;
        }

        .stat-card {
            min-height: 7.2rem;
            align-items: flex-start;
            flex-direction: column;
            gap: 0.65rem;
            padding: 1rem;
        }

        .stat-icon {
            width: 2.7rem;
            height: 2.7rem;
            border-radius: 0.72rem;
        }

        .stat-card strong {
            font-size: 1.65rem;
        }

        .stat-card small {
            font-size: 0.86rem;
        }

        .realm-panel,
        .links-panel {
            border-radius: 0.9rem;
            padding: 0.8rem;
        }

        .section-header {
            align-items: center;
            flex-direction: row;
            gap: 0.6rem;
            margin-bottom: 0.7rem;
        }

        .section-title {
            flex: 1;
            font-size: 1.12rem;
        }

        .ghost-action {
            flex: 0 0 auto;
            padding: 0.62rem 0.78rem;
            font-size: 0.9rem;
            white-space: nowrap;
        }

        .realm-card-grid {
            grid-template-columns: 1fr;
            gap: 0.55rem;
        }

        :global(.realm-card-grid > button) {
            min-height: 6.3rem;
            border-radius: 0.75rem;
            padding: 0.6rem;
        }

        :global(.realm-card-grid > button img) {
            width: 5rem;
            min-width: 5rem;
            height: 5rem;
            border-radius: 0.55rem;
        }

        :global(.realm-card-grid > button span) {
            min-width: 0;
        }

        .links-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.65rem;
        }

        .links-panel h2 {
            margin: 0.15rem 0 0.8rem;
            font-size: 1.15rem;
        }

        .link-card {
            min-height: 5.6rem;
            gap: 0.75rem;
            padding: 0.8rem;
            border-radius: 0.75rem;
        }

        .link-icon {
            width: 2.7rem;
            height: 2.7rem;
            border-radius: 0.65rem;
        }

        .link-card strong {
            font-size: 1rem;
            line-height: 1.2;
        }

        .link-card span {
            display: -webkit-box;
            overflow: hidden;
            font-size: 0.84rem;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
        }

        .link-arrow {
            position: absolute;
            right: 0.65rem;
            top: 0.65rem;
            width: 0.95rem;
            height: 0.95rem;
        }
    }

    @media (max-width: 25rem) {
        .hero-copy {
            max-width: 80%;
        }

        .hero-copy h1 {
            font-size: 2.45rem;
        }

        .status-pill {
            font-size: 0.76rem;
        }

        .links-grid,
        .stats-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
