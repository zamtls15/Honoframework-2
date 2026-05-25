import { useState, useEffect } from 'react';

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500&display=swap');
  :root {
    --bg: #000000;
    --card: #111111;
    --border: rgba(255,255,255,0.08);
    --text: #ffffff;
    --muted: #888888;
    --gold: #c9a84c;
    --danger: #ef4444;
    --radius: 10px;
    --font: 'Geist Mono', 'Courier New', monospace;
  }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); color: var(--text); font-family: var(--font); min-height: 100dvh; -webkit-font-smoothing: antialiased; }
  .app { max-width: 640px; margin: 0 auto; display: flex; flex-direction: column; min-height: 100dvh; }

  .header { position: sticky; top: 0; z-index: 20; background: var(--bg); border-bottom: 1px solid var(--border); padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
  .header-brand { display: flex; flex-direction: column; gap: 1px; }
  .header-eyebrow { font-size: 9px; letter-spacing: 0.3em; color: var(--muted); text-transform: uppercase; }
  .header-title { font-size: 18px; font-weight: 500; letter-spacing: 0.15em; color: var(--gold); text-transform: uppercase; }

  .search-bar { padding: 12px 16px; border-bottom: 1px solid var(--border); background: var(--bg); position: sticky; top: 57px; z-index: 19; }
  .search-input { width: 100%; background: #111; border: 1px solid var(--border); border-radius: var(--radius); color: var(--text); font-family: var(--font); font-size: 13px; padding: 12px 16px; outline: none; transition: border-color 0.15s; }
  .search-input:focus { border-color: #fff; }
  .search-input::placeholder { color: var(--muted); }

  .content { flex: 1; padding: 16px; display: flex; flex-direction: column; gap: 8px; }

  .user-card { background: var(--card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; display: flex; align-items: center; gap: 12px; }
  .avatar { width: 44px; height: 44px; border-radius: 50%; background: #fff; color: #000; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; flex-shrink: 0; text-transform: uppercase; }
  .user-info { flex: 1; min-width: 0; }
  .user-name { font-size: 14px; font-weight: 500; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
  .user-email { font-size: 11px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
  .tier-badge { display: inline-block; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; padding: 2px 8px; border: 1px solid var(--border); border-radius: 2px; color: var(--gold); }

  .btn-mail { font-family: var(--font); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; background: #fff; color: #000; border: none; border-radius: var(--radius); padding: 10px 14px; cursor: pointer; white-space: nowrap; font-weight: 600; flex-shrink: 0; transition: opacity 0.15s; }
  .btn-mail:active { opacity: 0.8; transform: scale(0.97); }

  .btn-refresh { width: 100%; font-family: var(--font); font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; background: transparent; color: var(--muted); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px; cursor: pointer; transition: color 0.15s; margin-top: 8px; }
  .btn-refresh:hover { color: var(--text); }

  .state-box { padding: 60px 16px; text-align: center; color: var(--muted); font-size: 12px; letter-spacing: 0.1em; line-height: 2.2; }
  .state-box.error { color: var(--danger); cursor: pointer; }
  .state-gold { color: var(--gold); }
  .loading-pulse { animation: pulse 1.2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .count { font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); padding: 8px 0 4px; }
`;

function getStoredToken() {
  const key = Object.keys(localStorage).find(
    k => k.startsWith('sb-') && k.endsWith('-auth-token')
  );
  if (!key) return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    return parsed?.access_token ?? null;
  } catch { return null; }
}

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const mailUser = (email) => {
    window.location.href = `/pages/compose?to=${encodeURIComponent(email)}`;
  };

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <header className="header">
          <div className="header-brand">
            <span className="header-eyebrow">MailOps</span>
            <span className="header-title">Users</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '0.15em' }}>
            {users.length > 0 ? `${users.length} members` : ''}
          </span>
        </header>

        <div className="search-bar">
          <input
            className="search-input"
            type="search"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="content">
          {loading && (
            <div className="state-box">
              <div className="loading-pulse state-gold">Loading users...</div>
            </div>
          )}

          {error && !loading && (
            <div className="state-box error" onClick={fetchUsers}>
              {error}<br />
              <span style={{ fontSize: 10 }}>Tap to retry</span>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="state-box">
              {search ? `No results for "${search}"` : 'No users found'}
            </div>
          )}

          {!loading && !error && filtered.length > 0 && (
            <>
              <div className="count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</div>
              {filtered.map(user => (
                <div key={user.id} className="user-card">
                  <div className="avatar">{(user.name || user.email)[0]}</div>
                  <div className="user-info">
                    <div className="user-name">{user.name}</div>
                    <div className="user-email">{user.email}</div>
                    {user.tier && <span className="tier-badge">{user.tier}</span>}
                  </div>
                  <button className="btn-mail" onClick={() => mailUser(user.email)}>
                    ✉ Mail
                  </button>
                </div>
              ))}
            </>
          )}

          <button className="btn-refresh" onClick={fetchUsers}>↺ Refresh</button>
        </div>
      </div>
    </>
  );
}
