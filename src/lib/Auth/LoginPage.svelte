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

<div class="auth-screen fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-6 sm:px-6">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.22),transparent_32%),radial-gradient(circle_at_82%_78%,rgba(22,163,74,0.16),transparent_28%)]"></div>

    <div class="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/12 bg-darkbg/85 shadow-2xl backdrop-blur-xl md:grid-cols-[1.05fr_0.95fr]">
        <section class="auth-visual relative hidden min-h-[34rem] flex-col justify-between p-9 text-white md:flex">
            <div class="absolute inset-0 bg-gradient-to-br from-black/20 via-black/50 to-black/80"></div>
            <div class="relative">
                <div class="mb-5 flex size-12 items-center justify-center rounded-xl border border-white/20 bg-white/12 shadow-lg backdrop-blur">
                    <Sparkles size={24} />
                </div>
                <p class="text-sm font-medium uppercase tracking-[0.18em] text-white/65">小酒馆</p>
                <h1 class="mt-3 max-w-md text-4xl font-bold leading-tight text-white">回到你的角色世界</h1>
                <p class="mt-4 max-w-sm text-base leading-7 text-white/72">
                    继续创作、整理预设，并把每一次对话稳定保存下来。
                </p>
            </div>
            <div class="relative grid grid-cols-3 gap-3 text-sm text-white/78">
                <div class="rounded-lg border border-white/14 bg-white/10 p-3 backdrop-blur">
                    <div class="text-lg font-semibold text-white">快速</div>
                    <div class="mt-1">进入会话</div>
                </div>
                <div class="rounded-lg border border-white/14 bg-white/10 p-3 backdrop-blur">
                    <div class="text-lg font-semibold text-white">安全</div>
                    <div class="mt-1">本地保存</div>
                </div>
                <div class="rounded-lg border border-white/14 bg-white/10 p-3 backdrop-blur">
                    <div class="text-lg font-semibold text-white">专注</div>
                    <div class="mt-1">沉浸体验</div>
                </div>
            </div>
        </section>

        <section class="relative flex min-h-[34rem] items-center bg-darkbg/92 px-5 py-8 sm:px-8">
            <div class="mx-auto w-full max-w-md">
                <div class="mb-8 text-center md:text-left">
                    <div class="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary md:mx-0">
                        <UserRound size={23} />
                    </div>
                    <p class="text-sm font-medium text-primary">{language.auth.login}</p>
                    <h2 class="mt-2 text-3xl font-bold text-textcolor">欢迎回来</h2>
                    <p class="mt-2 text-sm leading-6 text-textcolor2">使用账号密码进入你的 小酒馆 空间。</p>
                </div>

                {#if error}
                    <div class="mb-5 rounded-lg border border-red-500/40 bg-red-500/12 px-4 py-3 text-sm leading-6 text-red-300">
                        {error}
                    </div>
                {/if}

                <form class="flex flex-col gap-4" onsubmit={handleSubmit}>
                    <label class="block">
                        <span class="mb-2 flex items-center gap-2 text-sm font-medium text-textcolor2">
                            <UserRound size={16} />
                            {language.auth.username}
                        </span>
                        <ShInput bind:value={username} placeholder={language.auth.username} className="h-12 min-h-12 bg-black/18 px-3" autocomplete="username" />
                    </label>

                    <label class="block">
                        <span class="mb-2 flex items-center gap-2 text-sm font-medium text-textcolor2">
                            <LockKeyhole size={16} />
                            {language.auth.password}
                        </span>
                        <ShInput
                            type="password"
                            bind:value={password}
                            placeholder={language.auth.password}
                            className="h-12 min-h-12 bg-black/18 px-3"
                            autocomplete="current-password"
                        />
                    </label>

                    <ShButton type="submit" variant="primary" size="lg" className="mt-2 w-full" disabled={loading}>
                        {loading ? language.auth.loggingIn : language.auth.loginButton}
                    </ShButton>
                </form>

                <div class="mt-6 rounded-lg border border-darkborderc/70 bg-black/12 px-4 py-3 text-center text-sm text-textcolor2">
                    <button class="font-medium text-primary hover:underline" onclick={onSwitchToRegister}>
                        {language.auth.noAccount}
                    </button>
                </div>
            </div>
        </section>
    </div>
</div>

<style>
    .auth-screen::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image: linear-gradient(rgba(8, 10, 16, 0.42), rgba(8, 10, 16, 0.78)), url('/bg.webp');
        background-position: center;
        background-size: cover;
        filter: saturate(1.08);
    }

    .auth-visual {
        background-image: url('/welcome/welcomebg.png');
        background-position: center;
        background-size: cover;
    }
</style>
