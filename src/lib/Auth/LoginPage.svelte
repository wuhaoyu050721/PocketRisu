<script lang="ts">
    import { language } from 'src/lang';
    import { login } from 'src/ts/auth';
    import type { AuthUser } from 'src/ts/auth';
    import ShButton from '../UI/GUI/ShButton.svelte';
    import ShInput from '../UI/GUI/ShInput.svelte';
    import { LockKeyhole, Sparkles, UserRound } from '@lucide/svelte';

    interface Props {
        onLoginSuccess: (user: AuthUser) => void;
        onSwitchToRegister: () => void;
    }

    let { onLoginSuccess, onSwitchToRegister }: Props = $props();

    let username = $state('');
    let password = $state('');
    let error = $state('');
    let loading = $state(false);

    async function handleLogin() {
        error = '';
        if (!username.trim()) {
            error = language.auth.usernameTooShort;
            return;
        }
        if (!password || password.length < 6) {
            error = language.auth.passwordTooShort;
            return;
        }
        loading = true;
        try {
            const result = await login(username.trim(), password);
            if (result.success && result.user) {
                onLoginSuccess(result.user);
            } else {
                error = result.error || language.auth.invalidCredentials;
            }
        } catch {
            error = language.auth.invalidCredentials;
        } finally {
            loading = false;
        }
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        handleLogin();
    }
</script>

<div class="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-bgcolor px-4 py-8 sm:px-6">
    <!-- Background ambient glow -->
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_50%_20%,color-mix(in_oklch,var(--risu-theme-primary)_8%,var(--risu-theme-bgcolor))_0%,var(--risu-theme-bgcolor)_55%)]"></div>

    <div class="relative flex w-full max-w-sm flex-col items-center gap-6">
        <!-- Logo + Hero -->
        <div class="text-center">
            <div class="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary">
                <Sparkles size={28} class="text-textcolor" />
            </div>
            <h1 class="text-[26px] font-bold leading-tight text-textcolor tracking-[-0.02em]">欢迎回来</h1>
            <p class="mt-2 text-sm text-textcolor2">登录以继续与你的 AI 角色对话</p>
        </div>

        <!-- Error message -->
        {#if error}
            <div class="w-full rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-300">
                {error}
            </div>
        {/if}

        <!-- Login form -->
        <form class="flex w-full flex-col gap-4" onsubmit={handleSubmit}>
            <div>
                <label class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-textcolor2" for="login-username">
                    {language.auth.username}
                </label>
                <ShInput
                    bind:value={username}
                    placeholder={language.auth.username}
                    className="min-h-11 rounded-xl bg-darkbg px-3.5 text-textcolor placeholder:text-textcolor2"
                    autocomplete="username"
                />
            </div>

            <div>
                <label class="mb-1.5 block font-mono text-xs uppercase tracking-wider text-textcolor2" for="login-password">
                    {language.auth.password}
                </label>
                <ShInput
                    type="password"
                    bind:value={password}
                    placeholder={language.auth.password}
                    className="min-h-11 rounded-xl bg-darkbg px-3.5 text-textcolor placeholder:text-textcolor2"
                    autocomplete="current-password"
                />
            </div>

            <ShButton type="submit" variant="primary" size="lg" className="mt-2 w-full rounded-[14px]" disabled={loading}>
                {loading ? language.auth.loggingIn : language.auth.loginButton}
            </ShButton>
        </form>

        <!-- Divider -->
        <div class="flex w-full items-center gap-3">
            <div class="flex-1 border-t border-borderc"></div>
            <span class="text-xs text-textcolor2">或者</span>
            <div class="flex-1 border-t border-borderc"></div>
        </div>

        <!-- Register link -->
        <button
            class="w-full rounded-[14px] py-3.5 text-sm font-medium text-primary transition-colors hover:bg-primary/8"
            onclick={onSwitchToRegister}
        >
            {language.auth.noAccount}
        </button>

        <!-- Footer meta -->
        <p class="pb-2 text-center font-mono text-xs text-textcolor2">多用户模式 · 数据完全隔离</p>
    </div>
</div>

<style>
</style>
