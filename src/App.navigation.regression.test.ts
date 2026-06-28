import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('desktop bottom navigation visibility', () => {
    test('hides the bottom navigation while a character chat is open', () => {
        const source = readFileSync(resolve(process.cwd(), 'src/App.svelte'), 'utf8')

        expect(source).toMatch(
            /\{#if \$selectedCharID === -1\}\s*<DesktopBottomNav[\s\S]*?\/>\s*\{\/if\}/,
        )
    })
})
