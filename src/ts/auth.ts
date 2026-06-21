/**
 * 小酒馆 — Client-side authentication API.
 */

import { language } from 'src/lang';

export interface AuthUser {
    id: string;
    username: string;
}

interface AuthConfig {
    mode: 'multi' | 'single';
    requireSetup: boolean;
}

interface AuthResult {
    success: boolean;
    token?: string;
    user?: AuthUser;
    error?: string;
}

/**
 * Fetch the server auth configuration.
 */
export async function getAuthConfig(): Promise<AuthConfig> {
    try {
        const res = await fetch('/api/auth/config');
        if (!res.ok) return { mode: 'single', requireSetup: false };
        return await res.json();
    } catch {
        return { mode: 'single', requireSetup: false };
    }
}

/**
 * Login with username + password.
 */
export async function login(username: string, password: string): Promise<AuthResult> {
    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || language.auth.invalidCredentials };
        }
        // Store token for subsequent API calls
        if (data.token) {
            try { localStorage.setItem('risu-auth-token', data.token); } catch {}
        }
        return { success: true, token: data.token, user: data.user };
    } catch {
        return { success: false, error: '网络错误，请检查连接' };
    }
}

/**
 * Register a new account.
 */
export async function register(username: string, password: string): Promise<AuthResult> {
    try {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok) {
            return { success: false, error: data.error || language.auth.registrationDisabled };
        }
        if (data.token) {
            try { localStorage.setItem('risu-auth-token', data.token); } catch {}
        }
        return { success: true, token: data.token, user: data.user };
    } catch {
        return { success: false, error: '网络错误，请检查连接' };
    }
}

/**
 * Get the stored JWT token.
 */
export function getStoredToken(): string | null {
    try {
        return localStorage.getItem('risu-auth-token');
    } catch {
        return null;
    }
}

export function getUserFromToken(token: string | null): AuthUser | null {
    if (!token) return null;
    try {
        const payloadPart = token.split('.')[1];
        const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
        if (!payload?.sub) return null;
        return {
            id: String(payload.sub),
            username: String(payload.username || payload.sub),
        };
    } catch {
        return null;
    }
}

/**
 * Clear stored auth data (logout).
 */
export function clearAuth(): void {
    try {
        localStorage.removeItem('risu-auth-token');
    } catch {}
}

/**
 * Logout from server (clears session cookie).
 */
export async function logout(): Promise<void> {
    try {
        const token = getStoredToken();
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: token ? { 'risu-auth': token } : {},
        });
    } catch {
        // Non-critical
    }
    clearAuth();
}
