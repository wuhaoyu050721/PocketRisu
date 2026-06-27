import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

describe('/api/asset cache policy', () => {
    test('keeps authenticated assets private and revalidatable', () => {
        const source = readFileSync(resolve(process.cwd(), 'server/node/server.cjs'), 'utf8')

        expect(source).toContain("const ASSET_CACHE_CONTROL = 'private, max-age=86400'")
        expect(source).not.toContain('public, max-age=31536000, immutable')
    })

    test('serves a distinct 160px thumbnail representation', () => {
        const source = readFileSync(resolve(process.cwd(), 'server/node/server.cjs'), 'utf8')

        expect(source).toContain("const wantsThumbnail = req.query.thumb === '1'")
        expect(source).toContain("const AVATAR_THUMB_MAX_SIDE = 160")
        expect(source).toContain('generateThumbnail(binary, AVATAR_THUMB_MAX_SIDE)')
        expect(source).toContain('`"thumb-${updatedAt}"`')
    })
})
