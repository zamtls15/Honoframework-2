import { db as firestoreDb } from './firebase-config.js';
import {
    collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, addDoc
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { getToken } from './auth.js';

let users = {};
let searchQuery = '';

async function manageSupabaseUser(action, email, name = '', tier = '') {
    if (!email) return;
    console.log(`[Auth Sync] Requesting ${action} for ${email}`);
    try {
        const token = await getToken();
        const response = await fetch('/api/manage-supabase-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ action, email, name, tier })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Auth sync failed');
        console.log(`[Auth Sync] Completed ${action} for ${email}:`, data.message);
    } catch (err) {
        console.error(`[Auth Sync] Error during ${action}:`, err);
    }
}

function tierBadge(tier) {
    const colors = { 'Explorer': 'var(--pending)', 'Pioneer': '#60a5fa', 'Vanguard': 'var(--gold)' };
    const c = colors[tier] || 'var(--muted)';
    return `<span class="tier-badge" style="color:${c};">${tier}</span>`;
}

function statusBadge(status) {
    if (status === 'ACTIVE') {
        return `<span class="status-badge status-active"><span class="status-dot" style="background:var(--success);"></span>ACTIVE</span>`;
    }
    return `<span class="status-badge status-pending"><span class="status-dot" style="background:var(--pending);"></span>PENDING</span>`;
}

function updateStats() {
    const entries = Object.values(users);
    document.getElementById('stat-total').textContent = entries.length;
    document.getElementById('stat-active').textContent = entries.filter(u => u.status === 'ACTIVE').length;
    document.getElementById('stat-pending').textContent = entries.filter(u => u.status === 'PENDING').length;
    document.getElementById('stat-vanguard').textContent = entries.filter(u => u.tier === 'Vanguard').length;
}

function renderTable() {
    const tbody = document.getElementById('user-tbody');
    let entries = Object.entries(users).map(([id, data]) => ({ ...data, id }));

    // Search Filter
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        entries = entries.filter(u =>
            u.name.toLowerCase().includes(q) ||
            (u.email && u.email.toLowerCase().includes(q)) ||
            (u.role && u.role.toLowerCase().includes(q)) ||
            u.id.toLowerCase().includes(q)
        );
    }

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--muted);font-size:13px;">${searchQuery ? 'No members match your search.' : 'No members found. Add your first member above.'}</td></tr>`;
        document.getElementById('member-count').textContent = '0 members';
        updateStats();
        return;
    }
    tbody.innerHTML = entries.map(u => {
        const emailDisplay = u.email
            ? `<span title="${u.email}" style="display:inline-block;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;vertical-align:bottom;">${u.email}</span>`
            : `<span style="color:var(--muted); opacity: 0.4;">—</span>`;

        // Use short ID for display if it's a long Firestore ID
        const displayId = u.id.length > 8 ? u.id.substring(0, 8) + '…' : u.id;

        return `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted); opacity: 0.8;" title="${u.id}">#${displayId}</td>
            <td style="padding:16px 20px;"><div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:2px;">${u.name}</div><div style="font-size:11px;color:var(--muted);">${u.role}</div></td>
            <td style="padding:16px 20px;">${tierBadge(u.tier)}</td>
            <td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);">${u.clearance}</td>
            <td style="padding:16px 20px;">${statusBadge(u.status)}</td>
            <td style="padding:16px 20px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--muted);max-width:180px;">${emailDisplay}</td>
            <td style="padding:16px 20px;font-size:12px;color:var(--muted);">${u.joined}</td>
            <td style="padding:16px 20px;"><div style="display:flex;gap:8px;">
                <button class="row-btn row-btn-edit" data-action="edit" data-id="${u.id}">EDIT</button>
                <button class="row-btn row-btn-delete" data-action="delete" data-id="${u.id}">DELETE</button>
            </div></td>
        </tr>`;
    }).join('');
    document.getElementById('member-count').textContent = `${entries.length} member${entries.length !== 1 ? 's' : ''}`;
    updateStats();
    if (window.lucide) lucide.createIcons();
}

function showLoading() {
    document.getElementById('user-tbody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--muted);font-size:13px;">Loading members from Firestore…</td></tr>`;
    document.getElementById('member-count').textContent = '…';
}

function showFetchError(msg) {
    document.getElementById('user-tbody').innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;"><div style="color:var(--danger);font-size:13px;font-weight:600;margin-bottom:8px;">Firebase Error</div><div style="color:var(--muted);font-size:12px;">${msg}</div></td></tr>`;
    document.getElementById('member-count').textContent = 'error';
}

async function loadUsers() {
    showLoading();
    try {
        const q = collection(firestoreDb, 'members');
        onSnapshot(q, (snapshot) => {
            users = {};
            snapshot.forEach(d => {
                users[d.id] = { ...d.data(), id: d.id };
            });
            renderTable();
        }, (err) => {
            console.error('Firestore Real-time Error:', err);
            showFetchError('Real-time connection interrupted. Please refresh.');
        });
    } catch (err) {
        console.error('Firestore Error (init loadUsers):', err);
        showFetchError('Could not initialize member list. Check your connection.');
    }
}

function openAddModal() {
    document.getElementById('modal-title').textContent = 'Add Member';
    document.getElementById('modal-id').value = '';
    document.getElementById('modal-name').value = '';
    document.getElementById('modal-role').value = '';
    document.getElementById('modal-email').value = '';
    document.getElementById('modal-tier').value = 'Explorer';
    document.getElementById('modal-clearance').value = 'INTERNAL';
    document.getElementById('modal-status').value = 'PENDING';
    document.getElementById('modal-joined').value = '';
    document.getElementById('modal-avatar-url').value = '';
    document.getElementById('modal-bg-url').value = '';
    document.getElementById('modal-error').style.display = 'none';
    document.getElementById('modal-email-required').style.display = '';
    document.getElementById('user-modal').style.display = 'flex';
    document.getElementById('modal-name').focus();
}

function openEditModal(id) {
    const u = users[id];
    if (!u) return;
    document.getElementById('modal-title').textContent = 'Edit Member';
    document.getElementById('modal-id').value = u.id;
    document.getElementById('modal-name').value = u.name;
    document.getElementById('modal-role').value = u.role;
    document.getElementById('modal-email').value = u.email || '';
    document.getElementById('modal-tier').value = u.tier;
    document.getElementById('modal-clearance').value = u.clearance;
    document.getElementById('modal-status').value = u.status;
    document.getElementById('modal-joined').value = u.joined;
    document.getElementById('modal-avatar-url').value = u.avatarUrl || '';
    document.getElementById('modal-bg-url').value = u.backgroundUrl || '';
    document.getElementById('modal-error').style.display = 'none';
    document.getElementById('modal-email-required').style.display = 'none';
    document.getElementById('user-modal').style.display = 'flex';
    document.getElementById('modal-name').focus();
}

function closeModal() {
    document.getElementById('user-modal').style.display = 'none';
}

async function saveUser() {
    const id            = document.getElementById('modal-id').value;
    const name          = document.getElementById('modal-name').value.trim();
    const role          = document.getElementById('modal-role').value.trim();
    const email         = document.getElementById('modal-email').value.trim().toLowerCase();
    const tier          = document.getElementById('modal-tier').value;
    const clearance     = document.getElementById('modal-clearance').value.trim();
    const status        = document.getElementById('modal-status').value;
    const joined        = document.getElementById('modal-joined').value.trim();
    const avatarUrl     = document.getElementById('modal-avatar-url').value.trim();
    const backgroundUrl = document.getElementById('modal-bg-url').value.trim();

    const errEl   = document.getElementById('modal-error');
    const saveBtn = document.getElementById('btn-modal-save');
    const isNew   = !id;

    if (!name || !role || !clearance || !joined) {
        errEl.textContent = 'All fields are required.';
        errEl.style.display = 'block';
        return;
    }
    if (isNew && !email) {
        errEl.textContent = 'Email address is required for new members.';
        errEl.style.display = 'block';
        return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errEl.textContent = 'Please enter a valid email address.';
        errEl.style.display = 'block';
        return;
    }

    saveBtn.disabled    = true;
    saveBtn.textContent = 'Saving…';
    errEl.style.display = 'none';

    try {
        if (isNew) {
            await addDoc(collection(firestoreDb, 'members'), {
                name, role, email, tier, clearance, status, joined, avatarUrl, backgroundUrl,
                createdAt: new Date().toISOString()
            });
        } else {
            const docRef = doc(firestoreDb, 'members', id);
            await setDoc(docRef, {
                id, name, role, email, tier, clearance, status, joined, avatarUrl, backgroundUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        if (email) {
            manageSupabaseUser(isNew ? 'add' : 'update', email, name, tier);
        }

        closeModal();
    } catch (err) {
        console.error('Firestore Error (saveUser):', err);
        errEl.textContent   = 'Failed to save. Check your Firestore rules or connection.';
        errEl.style.display = 'block';
    } finally {
        saveBtn.disabled    = false;
        saveBtn.textContent = 'Save Member';
    }
}

function confirmDelete(id) {
    const u = users[id];
    if (!u) return;
    document.getElementById('confirm-name').textContent = u.name;
    document.getElementById('confirm-id').value = id;
    document.getElementById('confirm-modal').style.display = 'flex';
}

function closeConfirm() {
    document.getElementById('confirm-modal').style.display = 'none';
}

async function deleteUser() {
    const id     = document.getElementById('confirm-id').value;
    const delBtn = document.getElementById('btn-confirm-delete');
    delBtn.disabled    = true;
    delBtn.textContent = 'Removing…';
    const emailToDelete = users[id]?.email;
    try {
        await deleteDoc(doc(firestoreDb, 'members', id));
        if (emailToDelete) {
            manageSupabaseUser('delete', emailToDelete);
        }
        closeConfirm();
    } catch (err) {
        console.error('Firestore Error (deleteUser):', err);
        delBtn.disabled    = false;
        delBtn.textContent = 'Remove';
        alert('Failed to delete member. Check your Firestore rules or connection.');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadUsers();

    const searchInput = document.getElementById('member-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTable();
        });
    }

    document.getElementById('btn-add-member').addEventListener('click', openAddModal);
    document.getElementById('btn-modal-cancel').addEventListener('click', closeModal);
    document.getElementById('btn-modal-save').addEventListener('click', saveUser);
    document.getElementById('btn-confirm-cancel').addEventListener('click', closeConfirm);
    document.getElementById('btn-confirm-delete').addEventListener('click', deleteUser);
    document.getElementById('user-tbody').addEventListener('click', function (e) {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const id     = btn.dataset.id;
        if (action === 'edit')   openEditModal(id);
        if (action === 'delete') confirmDelete(id);
    });
    document.getElementById('user-modal').addEventListener('click', function (e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('confirm-modal').addEventListener('click', function (e) {
        if (e.target === this) closeConfirm();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { closeModal(); closeConfirm(); }
    });
});
