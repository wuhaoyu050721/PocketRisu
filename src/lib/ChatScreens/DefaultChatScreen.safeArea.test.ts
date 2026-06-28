import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('chat side-panel safe area', () => {
    test('keeps top controls below the device status bar', () => {
        const source = readFileSync(
            resolve(process.cwd(), 'src/lib/ChatScreens/DefaultChatScreen.svelte'),
            'utf8',
        )
        const sidePanelHeaderRule = source.match(/\.side-panel-header\s*\{[\s\S]*?\}/)?.[0]

        expect(sidePanelHeaderRule).toContain('padding-top: calc(14px + var(--sat))')
    })
})
