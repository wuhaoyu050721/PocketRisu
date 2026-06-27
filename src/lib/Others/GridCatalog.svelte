<script lang="ts">
    import { changeChar, getCharImage, removeChar } from "../../ts/characters";
    import { type Database } from "../../ts/storage/database.svelte";
    import { DBState } from 'src/ts/stores.svelte';
    import BarIcon from "../SideBars/BarIcon.svelte";
    import { ArrowLeft, User, SquareMousePointer, TrashIcon, Undo2Icon } from "@lucide/svelte";
    import { selectedCharID } from "../../ts/stores.svelte";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { language } from "src/lang";
    import { parseMultilangString } from "src/ts/util";
    import { checkCharOrder } from "src/ts/globalApi.svelte";
  import MobileCharacters from "../Mobile/MobileCharacters.svelte";
    interface Props {
        endGrid?: any;
    }

    let { endGrid = () => {} }: Props = $props();
    let search = $state('')
    let selected = $state(3)
    let cardStyles = $state<string[]>([])

    // Resolve async getCharImage for card grid view
    $effect(() => {
        const chars = formatChars(search, DBState.db);
        Promise.all(chars.map(c =>
            c.image ? getCharImage(c.image, 'css') : Promise.resolve('')
        )).then(styles => {
            cardStyles = styles;
        });
    });

    function selectAndClose(index = -1){
        changeChar(index)
        endGrid()
    }

    function formatChars(search:string, db:Database, trash = false){
        let charas:{
            image:string
            index:number
            type:string,
            name:string
            desc:string
        }[] = []

        for(let i=0;i<db.characters.length;i++){
            const c = db.characters[i]
            if(c.trashTime && !trash){
                continue
            }
            if(!c.trashTime && trash){
                continue
            }
            if(c.name.replace(/ /g,"").toLocaleLowerCase().includes(search.toLocaleLowerCase().replace(/ /g,""))){
                charas.push({
                    image: c.image,
                    index: i,
                    type: c.type,
                    name: c.name,
                    desc: c.creatorNotes ?? 'No description'
                })
            }
        }
        return charas
    }
</script>

<div class="h-full w-full flex justify-center">
    <div class="h-full p-6 bg-bgcolor max-w-full w-2xl flex flex-col overflow-y-auto">
        <div class="mb-6 flex flex-col">
            <div class="flex items-center gap-3 mb-3">
                <button
                    class="flex items-center justify-center size-10 rounded-xl hover:bg-selected transition-colors shrink-0"
                    onclick={() => endGrid()}
                    title="返回"
                >
                    <ArrowLeft size={20} />
                </button>
                <div class="flex-1">
                    <TextInput placeholder={language.search} bind:value={search} autocomplete="off" fullwidth={true}/>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-2 mt-1">
                <Button styled={selected === 3 ? 'primary' : 'outlined'} size="sm" onclick={() => {selected = 3}}>
                    {language.simple}
                </Button>
                <Button styled={selected === 0 ? 'primary' : 'outlined'} size="sm" onclick={() => {selected = 0}}>
                    {language.grid}
                </Button>
                <Button styled={selected === 1  ? 'primary' : 'outlined'} size="sm" onclick={() => {selected = 1}}>
                    {language.list}
                </Button>
                <Button styled={selected === 2  ? 'primary' : 'outlined'} size="sm" onclick={() => {selected = 2}}>
                    {language.trash}
                </Button>
                <div class="grow"></div>
                <span class="text-textcolor2 text-xs font-mono tracking-wider uppercase">
                    {formatChars(search, DBState.db).length} {language.character}
                </span>
            </div>
        </div>
        {#if selected === 0}
            <div class="w-full flex justify-center">
                <div class="flex flex-wrap gap-3 w-full justify-center">
                    {#each formatChars(search, DBState.db) as char}
                        <div class="flex items-center text-textcolor">
                            {#if char.image}
                                <BarIcon onClick={() => {selectAndClose(char.index)}} additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                            {:else}
                                <BarIcon onClick={() => {selectAndClose(char.index)}} additionalStyle={char.index === $selectedCharID ? 'background:var(--risu-theme-selected)' : ''}>
                                            <User/>
                                </BarIcon>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {:else if selected === 1}
            {#each formatChars(search, DBState.db) as char}
                <div class="flex p-3 bg-darkbg border border-darkborderc rounded-xl mb-3 hover:border-borderc/40 transition-colors">
                    <BarIcon onClick={() => {selectAndClose(char.index)}} additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                    <div class="flex-1 flex flex-col ml-3">
                        <h4 class="text-textcolor font-semibold text-base leading-snug mb-1">{char.name || "Unnamed"}</h4>
                        <span class="text-textcolor2 text-sm">{parseMultilangString(char.desc)['en'] || parseMultilangString(char.desc)['xx'] || 'No description'}</span>
                        <div class="flex gap-2 justify-end mt-1">
                            <button class="hover:text-textcolor text-textcolor2 transition-colors" onclick={() => {
                                selectAndClose(char.index)
                            }}>
                                <SquareMousePointer />
                            </button>
                            <button class="hover:text-textcolor text-textcolor2 transition-colors" onclick={() => {
                                removeChar(char.index, char.name)
                            }}>
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        {:else if selected === 2}
            <span class="text-textcolor2 text-sm mb-2">{language.trashDesc}</span>
            {#each formatChars(search, DBState.db, true) as char}
                <div class="flex p-3 bg-darkbg/50 border border-darkborderc rounded-xl mb-3 hover:border-borderc/40 transition-colors">
                    <BarIcon onClick={() => {selectAndClose(char.index)}} additionalStyle={getCharImage(char.image, 'css')}></BarIcon>
                    <div class="flex-1 flex flex-col ml-3">
                        <h4 class="text-textcolor font-semibold text-base leading-snug mb-1">{char.name || "Unnamed"}</h4>
                        <span class="text-textcolor2 text-sm">{parseMultilangString(char.desc)['en'] || parseMultilangString(char.desc)['xx'] || 'No description'}</span>
                        <div class="flex gap-2 justify-end mt-1">
                            <button class="hover:text-success text-textcolor2 transition-colors" onclick={() => {
                                DBState.db.characters[char.index].trashTime = undefined
                                checkCharOrder()
                            }}>
                                <Undo2Icon />
                            </button>
                            <button class="hover:text-draculared text-textcolor2 transition-colors" onclick={() => {
                                removeChar(char.index, char.name, 'permanent')
                            }}>
                                <TrashIcon />
                            </button>
                        </div>
                    </div>
                </div>
            {/each}
        {:else if selected === 3}
            <!-- 2-column card grid matching characters.html design -->
            <div class="grid-2-col w-full">
                {#each formatChars(search, DBState.db) as char, i}
                    <button
                        class="char-card"
                        onclick={() => { selectAndClose(char.index) }}
                    >
                        <div class="char-cover" style={cardStyles[i] || ''}>
                            {#if !char.image}
                                <span class="char-cover-placeholder">{char.name.substring(0, 2)}</span>
                            {/if}
                        </div>
                        <div class="char-info">
                            <div class="char-name">{char.name || "Unnamed"}</div>
                            <div class="char-desc">{char.type || 'Character'}</div>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .grid-2-col {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding-bottom: 8px;
    }

    .char-card {
        display: block;
        background: var(--risu-theme-darkbg);
        border: 1px solid var(--risu-theme-borderc);
        border-radius: 14px;
        overflow: hidden;
        cursor: pointer;
        text-decoration: none;
        color: inherit;
        padding: 0;
        text-align: left;
    }

    .char-cover {
        aspect-ratio: 3/4;
        background: linear-gradient(135deg, color-mix(in oklch, var(--risu-theme-primary) 14%, transparent), color-mix(in oklch, var(--risu-theme-textcolor) 6%, transparent)), var(--risu-theme-darkbg);
        display: grid;
        place-items: center;
        overflow: hidden;
    }

    .char-cover-placeholder {
        color: var(--risu-theme-textcolor2);
        font-family: var(--risu-font-mono);
        font-size: 11px;
        letter-spacing: 0.04em;
    }

    .char-info {
        padding: 10px 12px 12px;
    }

    .char-name {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.2;
        margin-bottom: 2px;
        color: var(--risu-theme-textcolor);
    }

    .char-desc {
        font-size: 11px;
        color: var(--risu-theme-textcolor2);
    }
</style>
