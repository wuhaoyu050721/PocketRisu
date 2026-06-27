<script lang="ts">
    import Hub from "./Realm/RealmMain.svelte";
    import { OpenRealmStore } from "src/ts/stores.svelte";
</script>

<div class="discover-page">
    <Hub />
</div>

<style>
    .discover-page {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        background: var(--risu-theme-bgcolor);
    }

    .discover-page::-webkit-scrollbar {
        display: none;
    }
</style>
