import { ReadableStream, WritableStream, TransformStream } from "web-streams-polyfill/ponyfill/es2018";
import { Buffer as BufferPolyfill } from 'buffer'
import { polyfill as dragPolyfill} from "mobile-drag-drop"
import {scrollBehaviourDragImageTranslateOverride} from 'mobile-drag-drop/scroll-behaviour'
import rfdc from 'rfdc'
import { isIOS } from "./platform";
/**
 * Polyfill for structuredClone.
 * Falls back to rfdc (Really Fast Deep Clone) if structuredClone throws an error.
 */

const rfdcClone = rfdc({
  circles:true,
})
export function safeStructuredClone<T>(data:T):T{
  try {
      return structuredClone(data)
  } catch (error) {
      return rfdcClone(data)
  }
}

try {
    const testDom = document.createElement('div');
    const supports  = ('draggable' in testDom) || ('ondragstart' in testDom && 'ondrop' in testDom);
    testDom.remove()
    
    if((!supports) || isIOS()){
      globalThis.polyfilledDragDrop = true
      dragPolyfill({
        // use this to make use of the scroll behaviour
        dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
        // holdToDrag: 400,
        forceApply: true
      });
    }
} catch (error) {
    
}

globalThis.safeStructuredClone = safeStructuredClone

globalThis.Buffer = BufferPolyfill
//@ts-expect-error ponyfill WritableStream type is incompatible with globalThis.WritableStream
globalThis.WritableStream = globalThis.WritableStream ?? WritableStream
//@ts-expect-error ponyfill ReadableStream type is incompatible with globalThis.ReadableStream
globalThis.ReadableStream = globalThis.ReadableStream ?? ReadableStream
//@ts-expect-error ponyfill TransformStream type is incompatible with globalThis.TransformStream
globalThis.TransformStream = globalThis.TransformStream ?? TransformStream

// Status-bar safe area for Android / HBuilder X.
// iOS supports env(safe-area-inset-top) natively via viewport-fit=cover.
// Android WebViews often report 0px, so inject a runtime value for --sat.
;(function injectStatusBarInset() {
    if (typeof document === 'undefined') return
    // iOS has working env(), so don't override it.
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return

    const win = window as any
    const isAndroid = /Android/i.test(navigator.userAgent)

    function normalizeStatusBarHeight(heightPx: number) {
        if (!Number.isFinite(heightPx) || heightPx <= 0) return 0

        const dpr = window.devicePixelRatio || 1
        let cssPx = heightPx

        // Some native bridges return physical pixels. Status bars above 60 CSS
        // px are unlikely, so convert those values back to CSS pixels.
        if (cssPx > 60 && dpr > 1) {
            cssPx = cssPx / dpr
        }

        return Math.round(Math.min(Math.max(cssPx, 20), 48))
    }

    function apply(heightPx: number) {
        const normalizedHeight = normalizeStatusBarHeight(heightPx)
        if (normalizedHeight <= 0) return

        document.documentElement.style.setProperty('--risu-statusbar-top', normalizedHeight + 'px')
        document.documentElement.style.setProperty('--sat', normalizedHeight + 'px')
        document.documentElement.style.setProperty('--sar', '0px')
        document.documentElement.style.setProperty('--sab', '0px')
        document.documentElement.style.setProperty('--sal', '0px')
    }

    function update() {
        // HBuilder X runtime: direct API. It may become available after plusready.
        try {
            const h = win.plus?.navigator?.getStatusbarHeight?.()
            if (h) {
                apply(h)
                return
            }
        } catch {}

        // Generic Android WebView fallback. This is CSS px, not physical px.
        if (isAndroid) {
            apply(24)
        }
    }

    update()
    document.addEventListener('plusready', update, false)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
})()
