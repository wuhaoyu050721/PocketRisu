<script>
    import { CharEmotion, ViewBoxsize } from '../../ts/stores.svelte';
    import TransitionImage from './TransitionImage.svelte';
    import { getEmotion } from '../../ts/util';
    
    import { DBState } from 'src/ts/stores.svelte';

    let box = $state();
    let isResizing = $state(false);
    let activePointerId = null;
    let initialWidth = 0;
    let initialHeight = 0;
    let initialX = 0;
    let initialY = 0;

    function handleStart(event) {
        event.preventDefault();
        event.stopPropagation();

        if (!box) return;
        isResizing = true;
        activePointerId = event.pointerId;
        initialWidth = box.clientWidth;
        initialHeight = box.clientHeight;
        initialX = event.clientX;
        initialY = event.clientY;
        event.currentTarget.setPointerCapture?.(event.pointerId);
    }

    function handleEnd(event) {
        if (activePointerId !== null && event.pointerId !== activePointerId) return;
        event?.currentTarget?.releasePointerCapture?.(event.pointerId);
        isResizing = false;
        activePointerId = null;
    }

    function handleMove(event) {
        if (activePointerId !== null && event.pointerId !== activePointerId) return;
        if (!isResizing) return;
        event.preventDefault();
        event.stopPropagation();

        const clientX = event.clientX;
        const clientY = event.clientY;
        const deltaX = initialX - clientX;
        const deltaY = clientY - initialY;

        const newWidth = Math.min(Math.max(initialWidth + deltaX, 120), window.innerWidth * 0.8);
        const newHeight = Math.min(Math.max(initialHeight + deltaY, 120), window.innerHeight * 0.8);

        ViewBoxsize.set({
            width: newWidth,
            height: newHeight
        })
    }
</script>

<style>
    .box {
        position: absolute;
        right: 0px;
        top: 0px;
        border-bottom: 1px solid var(--risu-theme-borderc);
        border-left: 1px solid var(--risu-theme-borderc);
        width: 12rem;
        height: 12rem;
        z-index: 5;
        box-shadow: none;
        filter: none;
        transition: none;
        will-change: width, height;
    }

    .box :global(*) {
        box-shadow: none !important;
        filter: none !important;
        transition-property: opacity !important;
    }

    .box.resizing {
        user-select: none;
        pointer-events: auto;
    }

    .resize-handle {
        position: absolute;
        width: 22px;
        height: 22px;
        border-top: 1px solid var(--risu-theme-borderc);
        border-right: 1px solid var(--risu-theme-borderc);
        cursor: sw-resize;
        bottom: 0;
        left: 0;
        z-index: 10;
        touch-action: none;
        user-select: none;
    }

    .resize-handle::after {
        content: "";
        position: absolute;
        inset: -8px;
    }
</style>

<div class="box bg-darkbg/70" class:resizing={isResizing} bind:this="{box}" style="width: {$ViewBoxsize.width}px; height: {$ViewBoxsize.height}px;">
    <!-- Your content here -->
    <TransitionImage classType='risu' src={getEmotion(DBState.db, $CharEmotion, 'plain')}/>
    <div role="button" tabindex="0"
      class="resize-handle"
      onpointerdown={handleStart}
      onpointermove={handleMove}
      onpointerup={handleEnd}
      onpointercancel={handleEnd}
    ></div>
</div>
