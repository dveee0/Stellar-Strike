/**
 * Stellar Strike: Cyber Typing Interceptor
 * Leaderboard Manager with Supabase Cloud & Local Fallback
 */

class LeaderboardManager {
  constructor() {
    this.supabaseUrl = '';
    this.supabaseAnonKey = '';
    this.isOnline = false;
    this.cachedScores = [];
    this.activeFilter = 'global'; // 'global' or 'local'
    this.lastSubmittedScore = null;

    // Load saved pilot name from localStorage
    this.pilotName = localStorage.getItem('stellar_strike_pilot_name') || 'PILOT_CYBER';

    // Initialize config
    this.init();
  }

  async init() {
    // 1. Try reading from server /api/config
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const config = await res.json();
        if (config.supabaseUrl && config.supabaseAnonKey) {
          this.supabaseUrl = config.supabaseUrl;
          this.supabaseAnonKey = config.supabaseAnonKey;
          this.isOnline = true;
        }
      }
    } catch (e) {
      // In standalone index.html without Node server
    }

    // 2. Check window.SUPABASE_CONFIG if set manually
    if (!this.isOnline && window.SUPABASE_CONFIG) {
      if (window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey && !window.SUPABASE_CONFIG.url.includes('your-project-id')) {
        this.supabaseUrl = window.SUPABASE_CONFIG.url;
        this.supabaseAnonKey = window.SUPABASE_CONFIG.anonKey;
        this.isOnline = true;
      }
    }

    this.updateStatusBadge();
    // Fetch top scores immediately to populate HUD and Start Menu banners
    await this.fetchScores();
  }

  updateTopScoreWidgets(scores = this.cachedScores) {
    if (!scores || scores.length === 0) return;
    const top = scores[0];
    const topScoreText = `${top.player_name}: ${Number(top.score).toLocaleString()} PTS`;

    const hudEl = document.getElementById('hudTopScore');
    if (hudEl) hudEl.textContent = topScoreText;

    const bannerEl = document.getElementById('topScoreDisplay');
    if (bannerEl) bannerEl.textContent = `${Number(top.score).toLocaleString()} PTS (${top.player_name} - Wave ${top.wave})`;
  }

  updateStatusBadge() {
    const badge = document.getElementById('leaderboardStatusBadge');
    if (!badge) return;

    if (this.isOnline) {
      badge.textContent = '🌐 SUPABASE CLOUD: ONLINE';
      badge.className = 'status-badge online';
      badge.title = 'Terhubung ke database Supabase';
    } else {
      badge.textContent = '💾 MODE LOKAL (Isi .env untuk Supabase)';
      badge.className = 'status-badge local';
      badge.title = 'Data disimpan di penyimpanan lokal browser. Isi .env untuk terhubung ke Supabase.';
    }
  }

  /**
   * Fetch top scores
   */
  async fetchScores() {
    // 1. Try server endpoint /api/leaderboard first
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          this.cachedScores = data;
          this.updateTopScoreWidgets(data);
          return data;
        } else if (data && data.data && Array.isArray(data.data)) {
          this.cachedScores = data.data;
          this.updateTopScoreWidgets(data.data);
          return data.data;
        }
      }
    } catch (e) {}

    // 2. Direct fetch to Supabase REST API if client has credentials
    if (this.isOnline && this.supabaseUrl && this.supabaseAnonKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/leaderboard?select=*&order=score.desc&limit=20`, {
          headers: {
            'apikey': this.supabaseAnonKey,
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
            'Accept': 'application/json'
          }
        });
        if (res.ok) {
          const data = await res.json();
          this.cachedScores = data;
          this.updateTopScoreWidgets(data);
          return data;
        }
      } catch (e) {
        console.warn("[Leaderboard] Supabase direct fetch error:", e);
      }
    }

    // 3. Fallback to localStorage
    const local = this.getLocalScores();
    this.cachedScores = local;
    this.updateTopScoreWidgets(local);
    return local;
  }

  getLocalScores() {
    try {
      const raw = localStorage.getItem('stellar_strike_highscores');
      if (raw) {
        const list = JSON.parse(raw);
        return list.map(item => ({
          player_name: item.player_name || 'PILOT_LOKAL',
          score: item.score || 0,
          wave: item.wave || 1,
          wpm: item.wpm || 0,
          accuracy: item.acc || item.accuracy || 100,
          rank_title: item.rank_title || 'Kadet Antariksa',
          created_at: item.date || new Date().toISOString()
        }));
      }
    } catch (e) {}

    // Default mock demo data
    return [
      { player_name: "CYBER_ACE", score: 25400, wave: 12, wpm: 98, accuracy: 97, rank_title: "LEGENDA GALAKSI (Cyber Ace)", created_at: new Date().toISOString() },
      { player_name: "STAR_PILOT", score: 14200, wave: 7, wpm: 72, accuracy: 94, rank_title: "Komandan Armada (Commander)", created_at: new Date().toISOString() },
      { player_name: "NEO_VIPER", score: 8500, wave: 4, wpm: 55, accuracy: 91, rank_title: "Letnan Tempur (Interceptor)", created_at: new Date().toISOString() }
    ];
  }

  /**
   * Submit new score to Leaderboard
   */
  async submitScore(entry) {
    const payload = {
      player_name: (entry.player_name || this.pilotName || 'PILOT').toUpperCase().trim().substring(0, 32),
      score: Math.round(entry.score || 0),
      wave: Math.max(1, Math.round(entry.wave || 1)),
      wpm: Math.max(0, Math.round(entry.wpm || 0)),
      accuracy: Math.min(100, Math.max(0, Math.round(entry.accuracy || entry.acc || 100))),
      rank_title: entry.rank_title || 'Kadet Antariksa',
      created_at: new Date().toISOString()
    };

    // Save pilot name for next time
    localStorage.setItem('stellar_strike_pilot_name', payload.player_name);
    this.pilotName = payload.player_name;

    let savedRemote = false;

    // 1. Try via Node.js server API
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const result = await res.json();
        if (result.success) savedRemote = true;
      }
    } catch (e) {}

    // 2. If not saved via server, try direct Supabase REST API
    if (!savedRemote && this.isOnline && this.supabaseUrl && this.supabaseAnonKey) {
      try {
        const res = await fetch(`${this.supabaseUrl}/rest/v1/leaderboard`, {
          method: 'POST',
          headers: {
            'apikey': this.supabaseAnonKey,
            'Authorization': `Bearer ${this.supabaseAnonKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify([payload])
        });
        if (res.ok) savedRemote = true;
      } catch (e) {}
    }

    // 3. Always save to local storage as well
    this.saveLocalScore(payload);

    return {
      success: true,
      isOnline: savedRemote,
      payload
    };
  }

  saveLocalScore(entry) {
    try {
      const raw = localStorage.getItem('stellar_strike_highscores');
      const list = raw ? JSON.parse(raw) : [];
      list.push(entry);
      list.sort((a, b) => b.score - a.score);
      const top20 = list.slice(0, 20);
      localStorage.setItem('stellar_strike_highscores', JSON.stringify(top20));
    } catch (e) {}
  }

  /**
   * Render Leaderboard UI
   */
  async renderLeaderboard(filter = this.activeFilter) {
    this.activeFilter = filter;
    const tbody = document.getElementById('leaderboardTableBody');
    const loadingEl = document.getElementById('leaderboardLoading');
    if (!tbody) return;

    if (loadingEl) loadingEl.style.display = 'block';
    tbody.innerHTML = '';

    let scores = [];
    if (filter === 'local') {
      scores = this.getLocalScores();
    } else {
      scores = await this.fetchScores();
    }

    if (loadingEl) loadingEl.style.display = 'none';

    if (!scores || scores.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #94a3b8; font-family: 'Share Tech Mono', monospace;">
            BELUM ADA REKOR DI CATAT. JADILAH PILOT PERTAMA!
          </td>
        </tr>
      `;
      return;
    }

    // Sort descending by score
    scores.sort((a, b) => b.score - a.score);

    scores.forEach((item, index) => {
      const tr = document.createElement('tr');
      const rank = index + 1;

      let rankBadge = `<span class="rank-number">${rank}</span>`;
      let rowClass = '';
      if (rank === 1) {
        rankBadge = `<span class="rank-badge gold">🥇 1</span>`;
        rowClass = 'podium-first';
      } else if (rank === 2) {
        rankBadge = `<span class="rank-badge silver">🥈 2</span>`;
        rowClass = 'podium-second';
      } else if (rank === 3) {
        rankBadge = `<span class="rank-badge bronze">🥉 3</span>`;
        rowClass = 'podium-third';
      }

      if (rowClass) tr.className = rowClass;

      const dateStr = item.created_at
        ? new Date(item.created_at).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
        : '-';

      tr.innerHTML = `
        <td style="text-align: center;">${rankBadge}</td>
        <td class="pilot-cell">
          <span class="pilot-name">${this.escapeHtml(item.player_name || 'PILOT')}</span>
          <span class="pilot-rank-sub">${this.escapeHtml(item.rank_title || '')}</span>
        </td>
        <td class="score-cell">${(item.score || 0).toLocaleString()}</td>
        <td style="text-align: center; color: var(--neon-magenta); font-weight: bold;">${item.wave || 1}</td>
        <td style="text-align: center; color: var(--neon-cyan);">${item.wpm || 0}</td>
        <td style="text-align: center; color: var(--neon-green);">${item.accuracy || 100}%</td>
        <td style="text-align: center; color: #64748b; font-size: 11px;">${dateStr}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[m]);
  }

  openModal() {
    const modal = document.getElementById('leaderboardModal');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.updateStatusBadge();
    this.renderLeaderboard(this.activeFilter);
  }

  closeModal() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) modal.classList.add('hidden');
    // If paused by leaderboard, resume game
    if (window.game && window.game.state === window.game.STATE_PAUSED && window.game._pausedByLeaderboard) {
      window.game._pausedByLeaderboard = false;
      window.game.resumeGame();
    }
  }

  toggleModal() {
    const modal = document.getElementById('leaderboardModal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
      if (window.game && window.game.state === window.game.STATE_PLAYING) {
        window.game.pauseGame();
        window.game._pausedByLeaderboard = true;
      }
      this.openModal();
    } else {
      this.closeModal();
    }
  }
}

// Global Singleton
window.leaderboardManager = new LeaderboardManager();
