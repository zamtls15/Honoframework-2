import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase configuration is missing. Please check your environment variables.');
}

const supabase = createClient(
    supabaseUrl,
    supabaseAnonKey,
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }
);

// Listen for auth changes
supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') {
        localStorage.removeItem('session_email');
        window.location.replace('/pages/login.html');
    }
});

export async function clearSession() {
    console.log('Clearing session...');
    localStorage.removeItem('session_email');
    // Clear Supabase specific keys as well just in case signOut fails
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
            localStorage.removeItem(key);
            i--; // Adjust index after removal
        }
    }

    try {
        await supabase.auth.signOut();
        console.log('Supabase signed out');
    } catch (err) {
        console.error('Supabase sign out error:', err);
    }
}

export function saveSession(email) {
    localStorage.setItem('session_email', email);
}

export function getSession() {
    return localStorage.getItem('session_email');
}

export async function isLoggedIn() {
    // Try getSession first
    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData?.session) {
        saveSession(sessionData.session.user.email);
        return true;
    }

    // Fallback try getUser (more reliable for mobile/iOS Safari session restoration)
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
        saveSession(userData.user.email);
        return true;
    }

    return false;
}

export async function sendOTP(email) {
    console.log('Sending OTP to:', email);
    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: false }
        });
        if (error) {
            console.error('Supabase signInWithOtp error:', error);
            if (error.message.toLowerCase().includes('not allowed') ||
                error.message.toLowerCase().includes('user not found') ||
                error.message.toLowerCase().includes('signup')) {
                throw new Error("You don't have membership access. Please contact your administrator.");
            }
            throw new Error(error.message);
        }
    } catch (err) {
        console.error('sendOTP catch error:', err);
        throw err;
    }
}

export async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
}

export async function verifyOTP(email, code) {
    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email'
    });
    if (error) return { success: false, error: error.message };
    saveSession(data.user.email);
    return { success: true };
}
