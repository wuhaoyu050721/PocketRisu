import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('CharConfig teardown safety', () => {
    test('pre-effects do not directly dereference a deselected character', () => {
        const source = readFileSync(
            resolve(process.cwd(), 'src/lib/SideBars/CharConfig.svelte'),
            'utf8',
        )
        const preEffects = source.match(/\$effect\.pre\(\(\) => \{[\s\S]*?\n    \}\);/g) ?? []

        expect(preEffects.length).toBeGreaterThan(0)
        for (const effect of preEffects) {
            expect(effect).not.toMatch(
                /DBState\.db\.characters\[\$selectedCharID\]\.(?:type|ttsMode)/,
            )
        }
    })
})
