# Avatar Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve 160px WebP variants for avatar-sized UI while preserving original assets in character grids, configuration screens, exports, and image previews.

**Architecture:** Extend the authenticated `/api/asset/:hexKey` route with a `thumb=1` representation that shares the original asset's identity but has a variant-specific ETag. Add explicit frontend thumbnail helpers so only avatar consumers opt into the smaller representation.

**Tech Stack:** Express, wasm-vips, Svelte 5, TypeScript, Vitest, Vite

---

## File Map

- `server/node/server.cjs`: Generate and return the 160px WebP representation.
- `server/node/assetCacheHeaders.test.ts`: Guard thumbnail cache and ETag behavior in the server route.
- `src/ts/globalApi.svelte.ts`: Build direct thumbnail asset URLs in Node mode.
- `src/ts/characters.ts`: Format thumbnail URLs for plain and CSS avatar consumers.
- `src/ts/avatarThumbnail.test.ts`: Guard URL construction and original/thumbnail separation.
- Avatar consumers:
  - `src/lib/UI/HomePage.svelte`
  - `src/lib/Mobile/MobileCharacters.svelte`
  - `src/lib/SideBars/Sidebar.svelte`
  - `src/lib/ChatScreens/Chats.svelte`
  - `src/lib/ChatScreens/DefaultChatScreen.svelte`
  - `src/lib/Others/BookmarkList.svelte`
  - `src/lib/Others/AlertComp.svelte`
  - `src/lib/Setting/Pages/PersonaSettings.svelte`
- Original-image consumers intentionally unchanged:
  - `src/lib/Others/GridCatalog.svelte`
  - `src/lib/SideBars/CharConfig.svelte`
  - image export and image-generation utilities

### Task 1: Server thumbnail representation

**Files:**
- Modify: `server/node/server.cjs:3513-3593`
- Modify: `server/node/assetCacheHeaders.test.ts`

- [ ] **Step 1: Write the failing server regression assertions**

Add assertions that the asset route recognizes `thumb=1`, creates a thumbnail
ETag, and requests a 160px conversion:

```ts
expect(source).toContain("const wantsThumbnail = req.query.thumb === '1'")
expect(source).toContain("const responseEtag = wantsThumbnail ? `\"thumb-${updatedAt}\"` : `\"${updatedAt}\"`")
expect(source).toContain('generateThumbnail(binary, AVATAR_THUMB_MAX_SIDE)')
expect(source).toContain('const AVATAR_THUMB_MAX_SIDE = 160')
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run server/node/assetCacheHeaders.test.ts
```

Expected: FAIL because the thumbnail variant does not exist.

- [ ] **Step 3: Parameterize thumbnail generation**

Change the existing converter without changing the 320px inlay behavior:

```js
const THUMB_MAX_SIDE = 320;
const AVATAR_THUMB_MAX_SIDE = 160;

async function generateThumbnail(buffer, maxSide = THUMB_MAX_SIDE) {
    const vips = await getVips()
    const img = vips.Image.thumbnailBuffer(buffer, maxSide, {
        height: maxSide,
        size: 'down',
    })
    try {
        return Buffer.from(img.writeToBuffer('.webp', { Q: THUMB_QUALITY }))
    } finally {
        img.delete()
    }
}
```

- [ ] **Step 4: Add the query representation to the generic asset path**

Before the updated-at check:

```js
const wantsThumbnail = req.query.thumb === '1'
```

Use a variant-specific validator:

```js
const responseEtag = wantsThumbnail ? `"thumb-${updatedAt}"` : `"${updatedAt}"`
if (req.headers['if-none-match'] === responseEtag) {
    return res.status(304).set('Cache-Control', ASSET_CACHE_CONTROL).end()
}
```

After `resolveAssetPayload`, convert only supported image responses and fall
back to the original if conversion fails:

```js
let responseBody = binary
let responseType = contentType
if (wantsThumbnail && contentType.startsWith('image/')) {
    try {
        responseBody = await generateThumbnail(binary, AVATAR_THUMB_MAX_SIDE)
        responseType = 'image/webp'
    } catch (error) {
        logger.warn('[Asset] Thumbnail generation failed, serving original:', error?.message || error)
    }
}
res.set({
    'Content-Type': responseType,
    'Cache-Control': ASSET_CACHE_CONTROL,
    'ETag': responseEtag,
})
res.send(responseBody)
```

- [ ] **Step 5: Verify server behavior**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run server/node/assetCacheHeaders.test.ts
node --check server/node/server.cjs
```

Expected: test PASS and syntax check exit code 0.

- [ ] **Step 6: Commit the server representation**

```powershell
git add server/node/server.cjs server/node/assetCacheHeaders.test.ts
git commit -m "feat: serve cached avatar thumbnails"
```

### Task 2: Explicit frontend thumbnail helpers

**Files:**
- Modify: `src/ts/globalApi.svelte.ts:131-190`
- Modify: `src/ts/characters.ts:27-54`
- Create: `src/ts/avatarThumbnail.test.ts`

- [ ] **Step 1: Write the failing frontend regression test**

The source-level test must prove the thumbnail helper opts in while the original
helper remains unchanged:

```ts
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
})
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/ts/avatarThumbnail.test.ts
```

Expected: FAIL because neither thumbnail helper exists.

- [ ] **Step 3: Centralize Node asset URL construction**

In `globalApi.svelte.ts`:

```ts
function getNodeAssetUrl(loc: string): string {
    return `/api/asset/${Buffer.from(loc, 'utf-8').toString('hex')}`
}

export async function getThumbnailFileSrc(loc: string): Promise<string> {
    if ((globalThis as any).__NODE__) {
        return `${getNodeAssetUrl(loc)}?thumb=1`
    }
    return getFileSrc(loc)
}
```

Change only the Node return inside `getFileSrc` to:

```ts
return getNodeAssetUrl(loc)
```

- [ ] **Step 4: Add the character thumbnail formatter**

In `characters.ts`, import `getThumbnailFileSrc` and add:

```ts
export async function getCharThumbnail(
    loc: string,
    type: 'plain' | 'css' | 'contain' | 'lgcss',
) {
    const db = getDatabase()
    if (db.hideAllImages) return type === 'plain' ? '/none.webp' : ''
    if (!loc) return type === 'plain' ? null : ''

    const fileSrc = await getThumbnailFileSrc(loc)
    if (type === 'plain') return fileSrc
    if (type === 'css') return `background: url("${fileSrc}");background-size: cover;`
    if (type === 'lgcss') return `background: url("${fileSrc}");background-size: cover;height: 10.66rem;`
    return `background: url("${fileSrc}");background-size: contain;background-repeat: no-repeat;background-position: center;`
}
```

- [ ] **Step 5: Verify helper tests**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/ts/avatarThumbnail.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the frontend API**

```powershell
git add src/ts/globalApi.svelte.ts src/ts/characters.ts src/ts/avatarThumbnail.test.ts
git commit -m "feat: add explicit avatar thumbnail helpers"
```

### Task 3: Migrate avatar-sized consumers

**Files:**
- Modify: `src/lib/UI/HomePage.svelte`
- Modify: `src/lib/Mobile/MobileCharacters.svelte`
- Modify: `src/lib/SideBars/Sidebar.svelte`
- Modify: `src/lib/ChatScreens/Chats.svelte`
- Modify: `src/lib/ChatScreens/DefaultChatScreen.svelte`
- Modify: `src/lib/Others/BookmarkList.svelte`
- Modify: `src/lib/Others/AlertComp.svelte`
- Modify: `src/lib/Setting/Pages/PersonaSettings.svelte`
- Modify: `src/ts/avatarThumbnail.test.ts`

- [ ] **Step 1: Extend the regression test with required consumers**

```ts
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

const originalConsumers = [
    'src/lib/Others/GridCatalog.svelte',
    'src/lib/SideBars/CharConfig.svelte',
]
for (const file of originalConsumers) {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8')
    expect(source, file).toContain('getCharImage')
}
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/ts/avatarThumbnail.test.ts
```

Expected: FAIL on the first avatar consumer that has not imported the helper.

- [ ] **Step 3: Replace avatar-sized calls**

For each listed avatar consumer:

```ts
import { getCharThumbnail } from 'src/ts/characters'
```

Replace avatar-only calls such as:

```ts
getCharImage(character.image, 'css')
```

with:

```ts
getCharThumbnail(character.image, 'css')
```

Specific boundaries:

- All `HomePage` and `MobileCharacters` avatar calls use thumbnails.
- All `Sidebar` avatar/list calls use thumbnails.
- `Chats`, `DefaultChatScreen`, and `BookmarkList` message/header avatars use
  thumbnails.
- `AlertComp` character selection avatar uses a thumbnail.
- `PersonaSettings` line 83 list avatar uses a thumbnail; the selected persona
  editor preview around line 130 remains `getCharImage`.
- `GridCatalog` and every `CharConfig` call remain `getCharImage`.

- [ ] **Step 4: Verify migration tests**

Run:

```powershell
.\node_modules\.bin\vitest.cmd run src/ts/avatarThumbnail.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit consumer migration**

```powershell
git add src/lib/UI/HomePage.svelte src/lib/Mobile/MobileCharacters.svelte src/lib/SideBars/Sidebar.svelte src/lib/ChatScreens/Chats.svelte src/lib/ChatScreens/DefaultChatScreen.svelte src/lib/Others/BookmarkList.svelte src/lib/Others/AlertComp.svelte src/lib/Setting/Pages/PersonaSettings.svelte src/ts/avatarThumbnail.test.ts
git commit -m "perf: use thumbnails for avatar-sized images"
```

### Task 4: End-to-end verification

**Files:**
- Verify all files modified in Tasks 1-3.

- [ ] **Step 1: Run targeted regression tests**

```powershell
.\node_modules\.bin\vitest.cmd run server/node/assetCacheHeaders.test.ts src/ts/avatarThumbnail.test.ts vite.nodeDev.test.ts src/lib/SideBars/CharConfig.regression.test.ts
```

Expected: four test files pass.

- [ ] **Step 2: Run syntax and production build checks**

```powershell
node --check server/node/server.cjs
.\node_modules\.bin\vite.cmd build
```

Expected: syntax check exits 0 and Vite reports `built` successfully. Existing
CSS/accessibility warnings may remain, but no new build errors are accepted.

- [ ] **Step 3: Verify request separation manually**

Restart Vite and the Node server, open the application, and inspect Network:

```text
Avatar:       /api/asset/<hex>?thumb=1   Content-Type: image/webp
Large image:  /api/asset/<hex>           Original Content-Type
```

On a second normal reload, avatar transfers must show memory cache, disk cache,
or a 304 response rather than a full image body.

- [ ] **Step 4: Review the final diff**

```powershell
git diff HEAD~3 -- server/node/server.cjs src/ts/globalApi.svelte.ts src/ts/characters.ts src/lib
git status --short
```

Expected: only thumbnail-delivery changes and previously existing user changes
are present; no generated `dist` files are staged.
