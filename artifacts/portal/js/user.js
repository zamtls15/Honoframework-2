import { db as firestoreDb } from './firebase-config.js';
import { doc, getDoc, collection, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getSession, isLoggedIn, clearSession } from './auth.js';

const params = new URLSearchParams(window.location.search);
const userId = params.get('id');

const DEFAULT_BACKGROUND = 'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=800&q=80';

const tierLabels = {
    'Explorer': 'Level 1 Applicant',
    'Pioneer':  'Level 2 Operator',
    'Vanguard': 'Level 3 Vanguard'
};

const tierColors = {
    'Explorer': 'var(--pending)',
    'Pioneer':  '#60a5fa',
    'Vanguard': 'var(--gold)'
};

const tierPlanIds = {
    'Explorer': 'tier-ex',
    'Pioneer':  'tier-pi',
    'Vanguard': 'tier-va'
};

function showLoading() {
    const el = document.createElement('div');
    el.id = 'fetch-loading';
    el.innerHTML = '<div class="loading-spinner" style="width:32px;height:32px;margin:0 auto 20px;"></div><div style="font-family:\'JetBrains Mono\',monospace;font-size:11px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;">Loading profile…</div>';
    el.style.cssText = `position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);z-index:999;transition: opacity 0.3s;`;
    document.body.appendChild(el);
}

function hideLoading() {
    const el = document.getElementById('fetch-loading');
    if (el) el.remove();
}

function showProfileNotSetup(email) {
    hideLoading();
    document.querySelector('.portal-container').innerHTML = `
        <div style="text-align:center;padding:80px 20px;animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1);">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg"
                 class="brand-logo" style="width:140px;opacity:0.15;margin-bottom:40px;height:auto;" alt="SpaceX">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">PROFILE PENDING</div>
            <h2 style="font-size:20px;font-weight:600;margin-bottom:12px;color:var(--text);letter-spacing:-0.02em;">Profile Not Set Up Yet</h2>
            <p style="color:var(--muted);font-size:13px;line-height:1.6;margin-bottom:32px;">
                Your account has been verified but your membership profile<br>
                hasn't been configured yet. Please contact your administrator.<br><br>
                <code style="color:var(--muted);background:rgba(var(--text-rgb),0.05);padding:2px 10px;border-radius:4px;display:inline-block;">${email}</code>
            </p>
            <button data-action="not-member" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:rgba(var(--text-rgb),0.06);border:1px solid var(--border-bright);border-radius:12px;color:var(--muted);font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;">
                Sign out
            </button>
        </div>`;
}

function showNotFound() {
    hideLoading();
    document.querySelector('.portal-container').innerHTML = `
        <div style="text-align:center;padding:80px 20px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg"
                 class="brand-logo" style="width:140px;opacity:0.15;margin-bottom:40px;height:auto;" alt="SpaceX">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">ACCESS DENIED</div>
            <h2 style="font-size:20px;font-weight:600;margin-bottom:12px;color:var(--text);">Member Not Found</h2>
            <p style="color:var(--muted);font-size:13px;">No record found for ID: <code style="color:var(--muted);background:rgba(var(--text-rgb),0.05);padding:2px 8px;border-radius:4px;">${userId || 'none'}</code></p>
        </div>`;
}

function showFetchError() {
    hideLoading();
    document.querySelector('.portal-container').innerHTML = `
        <div style="text-align:center;padding:80px 20px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg"
                 class="brand-logo" style="width:140px;opacity:0.15;margin-bottom:40px;height:auto;" alt="SpaceX">
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:16px;">CONNECTION ERROR</div>
            <h2 style="font-size:20px;font-weight:600;margin-bottom:12px;color:var(--text);">Service Unavailable</h2>
            <p style="color:var(--muted);font-size:13px;">Could not reach the member database.<br>Check your connection and try again.</p>
        </div>`;
}

function populatePage(user) {
    document.getElementById('user-name').textContent = user.name;
    const tierColor = tierColors[user.tier] || 'var(--muted)';
    const tierLabel = tierLabels[user.tier] || user.tier;
    document.getElementById('user-subtitle').innerHTML = `${user.role} &bull; <span style="color:${tierColor}">${tierLabel}</span>`;
    document.getElementById('user-joined').textContent = `Since ${user.joined}`;
    document.getElementById('user-clearance').textContent = user.clearance;

    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl && user.avatarUrl && user.avatarUrl.trim()) {
        const img = document.createElement('img');
        img.src = user.avatarUrl.trim();
        img.alt = user.name;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
        avatarEl.appendChild(img);
    }

    const coverEl = document.getElementById('profile-cover');
    if (coverEl) {
        const bgUrl = (user.backgroundUrl && user.backgroundUrl.trim()) ? user.backgroundUrl.trim() : DEFAULT_BACKGROUND;
        coverEl.style.backgroundImage = `linear-gradient(to bottom, rgba(var(--bg-rgb),0) 0%, var(--bg) 100%), url('${bgUrl}')`;
        coverEl.style.backgroundSize = 'cover';
        coverEl.style.backgroundPosition = 'center';
    }

    const statusEl = document.getElementById('user-status');
    const dotEl = document.getElementById('status-dot');
    if (user.status === 'ACTIVE') {
        statusEl.style.color = 'var(--success)';
        statusEl.innerHTML = 'ACTIVE <i data-lucide="check-circle" style="width:12px;height:12px;"></i>';
        dotEl.style.background = 'var(--success)';
    } else {
        statusEl.style.color = 'var(--pending)';
        statusEl.innerHTML = 'PENDING <i data-lucide="refresh-cw" class="animate-spin-slow" style="width:12px;height:12px;"></i>';
        dotEl.style.background = 'var(--pending)';
    }

    document.title = `SpaceX HQ | ${user.name}`;
    const planId = tierPlanIds[user.tier];
    if (planId) {
        const planEl = document.getElementById(planId);
        if (planEl) planEl.classList.add('selected', 'expanded');
    }
    lucide.createIcons();
}

async function handleSignOut() {
    try {
        await clearSession();
        window.location.replace('/pages/login.html');
    } catch (err) {
        console.error('Logout failed:', err);
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    showLoading();

    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
        window.location.replace('/pages/login.html');
        return;
    }

    const email = getSession();

    if (userId) {
        try {
            const snap = await getDoc(doc(firestoreDb, 'members', userId));
            if (!snap.exists()) { showNotFound(); return; }
            const userData = snap.data();

            if (userData.email !== email) {
                console.warn('Access denied: Email mismatch');
            }

            hideLoading();
            populatePage(userData);
        } catch (err) {
            console.error('Firestore Error (getDoc):', err);
            showFetchError();
        }
        return;
    }

    try {
        const q = query(collection(firestoreDb, 'members'), where('email', '==', email));
        const snap = await getDocs(q);
        if (snap.empty) { showProfileNotSetup(email); return; }
        hideLoading();
        populatePage(snap.docs[0].data());
    } catch (err) {
        console.error('Firestore Error (getDocs):', err);
        showFetchError();
    }
});

document.addEventListener('click', async function (e) {
    if (e.target.closest('[data-action="not-member"]')) {
        await clearSession();
        window.location.replace('/pages/login.html');
    }
});
