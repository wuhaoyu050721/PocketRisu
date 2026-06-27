# Avatar Thumbnail Design

## Goal

Reduce initial image transfer and decoding time by using small WebP thumbnails
for avatar-sized UI while preserving original images for large character
artwork.

## Scope

Thumbnail images are used for avatar-sized rendering across the application,
including the home screen, sidebars, mobile lists, chat headers, message
bubbles, and user avatars.

Original images remain in use for character configuration, character artwork,
large portrait/grid presentation, exports, and other views where image detail
is required.

## Architecture

The existing authenticated endpoint remains the single asset endpoint:

```text
GET /api/asset/:hexKey
GET /api/asset/:hexKey?thumb=1
```

When `thumb=1` is present for a supported image:

- The server loads the original asset.
- It generates a WebP thumbnail with a maximum side length of 160 pixels.
- It returns `Content-Type: image/webp`.
- It uses the existing private one-day cache policy.
- Its ETag is derived from the original asset update time and thumbnail
  variant, so replacing an asset invalidates the cached thumbnail.

Unsupported formats or thumbnail-generation failures fall back to the original
asset response rather than breaking the avatar.

## Frontend API

`getFileSrc()` and `getCharImage()` retain their existing original-image
behavior.

A dedicated `getCharThumbnail()` helper constructs the thumbnail URL in the
Node environment and falls back to existing image resolution outside that
environment. Avatar-sized call sites use this helper explicitly, preventing a
global behavior change in large-image views.

## Error Handling

- Missing assets retain the current 404/default-image behavior.
- Thumbnail generation errors are logged without exposing storage details.
- A valid original image remains usable if thumbnail conversion is unsupported.

## Testing

- Server regression tests verify thumbnail requests return WebP data and use a
  variant-specific ETag/cache policy.
- Frontend tests verify thumbnail URLs include `thumb=1`.
- Existing original-image helpers remain unchanged for large-image consumers.
- Production build and targeted tests must pass.

## Acceptance Criteria

- Avatar-sized UI requests `/api/asset/:hexKey?thumb=1`.
- Large character artwork requests `/api/asset/:hexKey` without the thumbnail
  query.
- A cold avatar load transfers a maximum-160px WebP instead of the original
  image.
- Repeated loads use browser cache.
- Updating an asset produces a different thumbnail ETag.
