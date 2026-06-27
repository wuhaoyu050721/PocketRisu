<script lang="ts">
    import { BookIcon, FlagIcon, ImageIcon, PaperclipIcon, SmileIcon, TrashIcon, XIcon, StarIcon, DownloadIcon, MessageCircleIcon } from "@lucide/svelte";
    import { language } from "src/lang";
    import { alertConfirm, alertInput, alertNormal, notifyInfo } from "src/ts/alert";
    import { hubURL, type hubType, downloadRisuHub, getRealmInfo } from "src/ts/characterCards";

    import { DBState } from 'src/ts/stores.svelte';
    import RealmLicense from "./RealmLicense.svelte";
    import MultiLangDisplay from "../GUI/MultiLangDisplay.svelte";
    import { tooltip } from "src/ts/gui/tooltip";

    interface Props {
        openedData: hubType;
    }

    let { openedData = $bindable() }: Props = $props();

</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="detail-overlay" role="button" tabindex="0" onclick={() => { openedData = null }}>
    <div class="detail-panel" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="presentation">
        <!-- Close bar -->
        <div class="close-bar">
            <button class="close-btn" aria-label="关闭" onclick={() => { openedData = null }}>
                <XIcon />
            </button>
            <span class="meta-text">RisuRealm · 角色详情</span>
        </div>

        <!-- Hero image area -->
        <div class="hero-img">
            {#if DBState.db.hideAllImages}
                <span>?</span>
            {:else}
                <img class="hero-img-real" alt={openedData.name} src={`${hubURL}/resource/` + openedData.img} />
            {/if}
        </div>

        <!-- Content -->
        <div class="content" data-od-id="content">
            <!-- Head -->
            <section class="pad head-section" data-od-id="head">
                {#if openedData.original}
                    <button class="pill" onclick={() => {
                        const original = openedData.original
                        openedData = null
                        getRealmInfo(original)
                    }}>{language.realm.forked}</button>
                {:else if openedData.authorname}
                    <span class="pill">{openedData.authorname}</span>
                {/if}
                <h1>{openedData.name}</h1>
                <p class="meta-text">
                    {#if openedData.authorname}{openedData.authorname} · {/if}
                    v{openedData.version ?? '1.0'}
                </p>
            </section>

            <!-- Stats -->
            <section class="pad stats-section" data-od-id="stats">
                <div class="stat-row">
                    <div class="stat-card">
                        <div class="stat-val">{openedData.download ?? '—'}</div>
                        <div class="stat-lbl">{language.download}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val">
                            <StarIcon />
                            {openedData.rating ?? '—'}
                        </div>
                        <div class="stat-lbl">{language.rating}</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-val">{openedData.reviews ?? '—'}</div>
                        <div class="stat-lbl">{language.reviews}</div>
                    </div>
                </div>
            </section>

            <!-- Description -->
            <section class="pad desc-section" data-od-id="desc">
                <MultiLangDisplay value={openedData.desc} markdown={true} />
            </section>

            <!-- License -->
            {#if openedData.license}
                <section class="pad license-section">
                    <RealmLicense license={openedData.license}/>
                </section>
            {/if}

            <!-- Tags -->
            {#if openedData.tags && openedData.tags.length > 0}
                <section class="pad tags-section" data-od-id="tags">
                    <div class="tags-row">
                        {#each openedData.tags as tag}
                            <span class="tag">{tag}</span>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- Feature indicators -->
            <section class="pad feature-section">
                <div class="feature-row">
                    <span class="meta-text" use:tooltip={language.popularityLevelDesc}>
                        {language.popularityLevel.replace('{}', openedData.download.toString())}
                    </span>
                    <div class="feature-dots">
                        {#if openedData.hasEmotion}
                            <button class="feature-dot" onclick={() => notifyInfo(language.realm.hasEmotion)}><SmileIcon size={16} /></button>
                        {/if}
                        {#if openedData.hasAsset}
                            <button class="feature-dot" onclick={() => notifyInfo(language.realm.hasAsset)}><ImageIcon size={16} /></button>
                        {/if}
                        {#if openedData.hasLore}
                            <button class="feature-dot" onclick={() => notifyInfo(language.realm.hasLore)}><BookIcon size={16} /></button>
                        {/if}
                    </div>
                </div>
            </section>

            <!-- Actions -->
            <section class="pad actions-section" data-od-id="actions">
                <div class="action-stack">
                    <button class="btn-primary" onclick={() => {
                        downloadRisuHub(openedData.id)
                        openedData = null
                    }}>
                        {language.realm.download}
                    </button>
                    <div class="secondary-actions">
                        <button class="btn-icon-action" onclick={async () => {
                            await navigator.clipboard.writeText(`https://realm.risuai.net/character/${openedData.id}`)
                            notifyInfo(language.clipboardSuccess)
                        }}>
                            <PaperclipIcon size={16} />
                        </button>
                        {#if (DBState.db.account?.token?.split('-') ?? [])[1] === openedData.creator}
                            <button class="btn-icon-action danger" onclick={async (e) => {
                                const conf = await alertConfirm(language.realm.removeConfirm)
                                if(conf){
                                    const da = await fetch(hubURL + '/hub/remove', {
                                        method: "POST",
                                        body: JSON.stringify({ id: openedData.id, token: DBState.db.account?.token })
                                    })
                                    alertNormal(await da.text())
                                }
                            }}>
                                <TrashIcon size={16} />
                            </button>
                        {/if}
                        <button class="btn-icon-action" onclick={async (e) => {
                            const conf = await alertConfirm(language.realm.reportConfirm)
                            if(conf){
                                const report = await alertInput(language.realm.reportPrompt)
                                const da = await fetch(hubURL + '/hub/report', {
                                    method: "POST",
                                    body: JSON.stringify({ id: openedData.id, report: report })
                                })
                                alertNormal(await da.text())
                            }
                        }}>
                            <FlagIcon size={16} />
                        </button>
                    </div>
                </div>
                <p class="import-hint">{language.realm.importHint ?? '导入后可在对话列表中找到此角色'}</p>
            </section>
        </div>
    </div>
</div>

<style>
    .detail-overlay {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 50;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 16px;
    }

    .detail-panel {
        background: var(--risu-theme-bgcolor);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 20px;
        max-width: 420px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        box-shadow: 0 28px 60px -12px rgba(0, 0, 0, 0.5);
    }

    .detail-panel::-webkit-scrollbar { display: none; }

    /* Close bar */
    .close-bar {
        padding: 8px 12px;
        display: flex;
        align-items: center;
        gap: 10px;
        flex-shrink: 0;
    }

    .close-btn {
        width: 32px;
        height: 32px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        border: 0;
        color: var(--risu-theme-textcolor);
        display: grid;
        place-items: center;
        cursor: pointer;
    }

    .close-btn :global(svg) {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.8;
    }

    .meta-text {
        font-family: var(--risu-font-mono);
        font-size: 12px;
        color: var(--risu-theme-textcolor2);
    }

    /* Hero image */
    .hero-img {
        width: 100%;
        aspect-ratio: 16/10;
        background: linear-gradient(135deg, color-mix(in oklch, var(--risu-theme-primary) 14%, transparent), color-mix(in oklch, var(--risu-theme-textcolor) 6%, transparent)), var(--risu-theme-darkbg);
        display: grid;
        place-items: center;
        color: var(--risu-theme-textcolor2);
        font-family: var(--risu-font-mono);
        font-size: 11px;
        letter-spacing: 0.04em;
        overflow: hidden;
        flex-shrink: 0;
    }

    .hero-img-real {
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: top;
    }

    /* Content */
    .content {
        flex: 1 1 auto;
        overflow-y: auto;
    }

    .content::-webkit-scrollbar { display: none; }

    .pad { padding-inline: 20px; }

    /* Head */
    .head-section {
        padding-top: 18px;
    }

    .pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 5px 12px;
        background: color-mix(in oklch, var(--risu-theme-primary) 14%, transparent);
        color: var(--risu-theme-primary);
        border-radius: 999px;
        font-family: var(--risu-font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 500;
        border: 0;
        cursor: pointer;
    }

    .head-section h1 {
        font-family: var(--risu-font-family);
        font-size: 24px;
        font-weight: 700;
        letter-spacing: -0.02em;
        margin: 10px 0 4px;
        line-height: 1.15;
        color: var(--risu-theme-textcolor);
    }

    /* Stats */
    .stats-section { margin-top: 16px; }

    .stat-row {
        display: flex;
        gap: 8px;
    }

    .stat-card {
        flex: 1;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 14px;
        padding: 12px 16px;
        text-align: center;
    }

    .stat-val {
        font-family: var(--risu-font-mono);
        font-size: 20px;
        font-weight: 700;
        letter-spacing: -0.02em;
        color: var(--risu-theme-textcolor);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
    }

    .stat-val :global(svg) {
        width: 16px;
        height: 16px;
        fill: var(--risu-theme-textcolor);
        opacity: 0.65;
    }

    .stat-lbl {
        font-size: 11px;
        color: var(--risu-theme-textcolor2);
        margin-top: 2px;
    }

    /* Description */
    .desc-section {
        margin-top: 18px;
        font-size: 14px;
        line-height: 1.55;
        color: var(--risu-theme-textcolor);
    }

    /* License */
    .license-section {
        margin-top: 12px;
    }

    /* Tags */
    .tags-section { margin-top: 16px; }

    .tags-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .tag {
        display: inline-flex;
        padding: 4px 10px;
        background: transparent;
        color: var(--risu-theme-textcolor2);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 999px;
        font-family: var(--risu-font-mono);
        font-size: 10px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 500;
    }

    /* Features */
    .feature-section { margin-top: 14px; }

    .feature-row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .feature-dots {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-left: auto;
    }

    .feature-dot {
        color: var(--risu-theme-textcolor2);
        background: transparent;
        border: 0;
        cursor: pointer;
        padding: 4px;
        transition: color 0.15s;
    }

    .feature-dot:hover {
        color: var(--risu-theme-primary);
    }

    .feature-dot :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    /* Actions */
    .actions-section {
        margin-top: 20px;
        padding-bottom: 20px;
    }

    .action-stack {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .btn-primary {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        min-height: 48px;
        padding: 14px 20px;
        background: var(--risu-theme-primary);
        color: #06111f;
        border: 0;
        border-radius: 14px;
        font: inherit;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.005em;
        cursor: pointer;
        transition: opacity 0.15s;
    }

    .btn-primary:hover {
        opacity: 0.9;
    }

    .secondary-actions {
        display: flex;
        justify-content: center;
        gap: 8px;
    }

    .btn-icon-action {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        color: var(--risu-theme-textcolor2);
        display: grid;
        place-items: center;
        cursor: pointer;
        transition: color 0.15s, border-color 0.15s;
    }

    .btn-icon-action:hover {
        color: var(--risu-theme-primary);
        border-color: var(--risu-theme-primary);
    }

    .btn-icon-action.danger:hover {
        color: var(--risu-theme-draculared);
        border-color: var(--risu-theme-draculared);
    }

    .btn-icon-action :global(svg) {
        stroke: currentColor;
        fill: none;
        stroke-width: 1.7;
    }

    .import-hint {
        font-family: var(--risu-font-mono);
        font-size: 12px;
        color: var(--risu-theme-textcolor2);
        text-align: center;
        margin: 12px 0 0;
    }
</style>
