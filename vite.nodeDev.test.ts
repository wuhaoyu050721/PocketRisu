import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('Vite Node development environment', () => {
    test('injects the Node server flags into the development HTML', () => {
        const source = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8')

        expect(source).toContain('transformIndexHtml')
        expect(source).toContain('globalThis.__NODE__ = true')
        expect(source).toContain('globalThis.__PATCH_SYNC__ = true')
    })
})
