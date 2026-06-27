import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('avatar thumbnail URL helpers', () => {
    test('uses an explicit thumbnail query without changing original assets', () => {
        const globalApi = readFileSync(resolve(process.cwd(), 'src/ts/globalApi.svelte.ts'), 'utf8')
        const characters = readFileSync(resolve(process.cwd(), 'src/ts/characters.ts'), 'utf8')

        expect(globalApi).toContain('export async function getThumbnailFileSrc')
        expect(globalApi).toContain('`${getNodeAssetUrl(loc)}?thumb=1`')
        expect(characters).toContain('export async function getCharThumbnail')
        expect(characters).toContain('await getThumbnailFileSrc(loc)')
        expect(globalApi).toContain('export async function getFileSrc(loc: string)')
    })

    test('avatar consumers opt in while large-image views keep originals', () => {
        const thumbnailConsumers = [
            'src/lib/UI/HomePage.svelte',
            'src/lib/Mobile/MobileCharacters.svelte',
            'src/lib/SideBars/Sidebar.svelte',
            'src/lib/ChatScreens/Chats.svelte',
            'src/lib/ChatScreens/DefaultChatScreen.svelte',
            'src/lib/Others/BookmarkList.svelte',
            'src/lib/Others/AlertComp.svelte',
            'src/lib/Setting/Pages/PersonaSettings.svelte',
        ]
        for (const file of thumbnailConsumers) {
            const source = readFileSync(resolve(process.cwd(), file), 'utf8')
            expect(source, file).toContain('getCharThumbnail')
        }

        for (const file of [
            'src/lib/Others/GridCatalog.svelte',
            'src/lib/SideBars/CharConfig.svelte',
        ]) {
            const source = readFileSync(resolve(process.cwd(), file), 'utf8')
            expect(source, file).toContain('getCharImage')
        }
    })
})
