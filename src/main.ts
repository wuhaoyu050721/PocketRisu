import "./ts/polyfill";
import "core-js/actual"
import "./ts/log-capture"
import "./ts/storage/database.svelte"
import App from "./App.svelte";
import { loadData } from "./ts/bootstrap";
import { initHotkey } from "./ts/hotkey";
import { preLoadCheck } from "./preload";
import { mount } from "svelte";

window.addEventListener('vite:preloadError', (event) => {
    console.error("Chunk load error detected:", event);
    location.reload();
});

// Dynamic import failure → auto reload (stale cache after deployment)
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Failed to fetch dynamically imported module')) {
        console.error('Dynamic import failed, reloading...', event.reason.message);
        event.preventDefault();
        location.reload();
    }
});

preLoadCheck()
let app = mount(App, {
    target: document.getElementById("app"),
});
loadData()
initHotkey()
document.getElementById('preloading').remove()

export default app;