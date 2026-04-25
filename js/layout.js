'use strict';

const Layout = {

  buildSidebar(activePage) {
    const navItems = [
      { id: 'home',    label: 'الرئيسية', icon: 'home' },
      { id: 'search',  label: 'البحث',    icon: 'search' },
      { id: 'library', label: 'مكتبتي',   icon: 'library_music' },
    ];
    const playlists = window.BatootApp?.getState().playlists || [];
    const pageBase = activePage === 'home' ? 'pages/' : '';

    return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL' 1">queue_music</span>
        </div>
        <h1>بطوط</h1>
      </div>

      <div class="sidebar-section" style="margin-top:12px">
        ${navItems.map(item => {
          const isActive = activePage === item.id;
          const href = item.id === 'home' ? '../index.html' : (pageBase + item.id + '.html');
          return `
          <a href="${href}" class="sidebar-nav-item ${isActive ? 'active' : ''}">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${isActive ? 1 : 0}">${item.icon}</span>
            <span>${item.label}</span>
          </a>`;
        }).join('')}
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.5);margin:16px 12px"></div>

      <div class="sidebar-section">
        <div class="sidebar-section-label">قوائمك</div>
        <button class="sidebar-nav-item" onclick="Layout.openCreatePlaylist()" style="width:100%;text-align:right">
          <span class="material-symbols-outlined" style="color:var(--primary-container);font-variation-settings:'FILL' 1">add_circle</span>
          <span>قائمة جديدة</span>
        </button>
        <div id="sidebar-playlists">
          ${this._renderSidebarPlaylists(playlists)}
        </div>
      </div>

      <div style="flex:1"></div>
    </aside>`;
  },

  _renderSidebarPlaylists(playlists) {
    if (!playlists.length) return `<div style="font-size:12px;color:var(--outline);padding:8px 14px">لا توجد قوائم بعد</div>`;
    return playlists.slice(0, 8).map(pl => `
      <a href="playlist.html?id=${pl.id}" class="sidebar-playlist-item">
        <div class="sidebar-playlist-thumb">
          ${pl.tracks[0]?.image
            ? `<img src="${pl.tracks[0].image}" alt="" style="width:100%;height:100%;object-fit:cover">`
            : `<span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1">queue_music</span>`}
        </div>
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(pl.name)}</div>
          <div style="font-size:11px;color:var(--outline)">${pl.tracks.length} أغنية</div>
        </div>
      </a>
    `).join('');
  },

  buildPlayerBar() {
    return `
    <div class="player-bar" id="player-bar">

      <!-- Track Info -->
      <div class="player-track-info" onclick="Layout.openNowPlaying()" style="cursor:pointer" title="عرض تفاصيل الأغنية">
        <div class="player-thumb" id="player-thumb">
          <div class="player-thumb-placeholder" id="player-thumb-placeholder">
            <span class="material-symbols-outlined" style="font-size:26px;color:var(--primary-container);font-variation-settings:'FILL' 1">music_note</span>
          </div>
          <img src="" alt="" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px" id="player-thumb-img">
        </div>
        <div style="min-width:0">
          <div class="player-track-name" id="player-track-name">اختر أغنية</div>
          <div class="player-artist-name" id="player-artist-name">بطوط ميوزك</div>
        </div>
        <button class="player-like-btn btn-icon" id="player-like-btn"
                onclick="event.stopPropagation();Layout.onLike()" title="إعجاب">
          <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 0">favorite_border</span>
        </button>
      </div>

      <!-- Controls -->
      <div class="player-controls">
        <div class="player-controls-btns">
          <button class="player-btn player-btn--sm" id="shuffle-btn" onclick="BatootApp.toggleShuffle()" title="عشوائي">
            <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">shuffle</span>
          </button>
          <button class="player-btn player-btn--sm" onclick="BatootApp.prev()" title="السابقة">
            <span class="material-symbols-outlined" style="font-size:26px;font-variation-settings:'FILL' 1">skip_previous</span>
          </button>
          <button class="player-btn player-btn--lg" id="play-pause-btn" onclick="BatootApp.togglePlay()" title="تشغيل/إيقاف">
            <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL' 1">play_arrow</span>
          </button>
          <button class="player-btn player-btn--sm" onclick="BatootApp.next()" title="التالية">
            <span class="material-symbols-outlined" style="font-size:26px;font-variation-settings:'FILL' 1">skip_next</span>
          </button>
          <button class="player-btn player-btn--sm" id="repeat-btn" onclick="BatootApp.toggleRepeat()" title="تكرار">
            <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">repeat</span>
          </button>
        </div>
        <div class="player-progress">
          <span class="player-time" id="current-time">0:00</span>
          <div class="progress-bar" id="progress-bar" onclick="Layout.onSeek(event)">
            <div class="progress-bar__fill" id="progress-fill" style="width:0%"></div>
          </div>
          <span class="player-time right" id="total-time">0:00</span>
        </div>
      </div>

      <!-- Volume -->
      <div class="player-volume">
        <button class="player-btn player-btn--sm" onclick="Layout.toggleMute()">
          <span class="material-symbols-outlined" id="volume-icon" style="font-size:20px;font-variation-settings:'FILL' 1">volume_up</span>
        </button>
        <div class="volume-bar" id="volume-bar" onclick="Layout.onVolumeClick(event)" style="cursor:pointer">
          <div class="volume-bar__fill" id="volume-fill" style="width:80%;height:100%;border-radius:9999px;background:linear-gradient(90deg,var(--outline),var(--primary-container))"></div>
        </div>
        <button class="player-btn player-btn--sm" onclick="Layout.openQueue()" title="قائمة التشغيل">
          <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">queue_music</span>
        </button>
        <button class="player-btn player-btn--sm" onclick="Layout.openNowPlaying()" title="Now Playing">
          <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">expand_less</span>
        </button>
      </div>
    </div>`;
  },

  buildMobileNav(activePage) {
    const items = [
      { id: 'home',    icon: 'home',          label: 'الرئيسية' },
      { id: 'search',  icon: 'search',        label: 'بحث' },
      { id: 'library', icon: 'library_music', label: 'مكتبة' },
    ];
    return `
    <nav class="mobile-nav" id="mobile-nav">
      <div class="mobile-nav-items">
        ${items.map(item => `
          <a href="${item.id === 'home' ? '../index.html' : item.id + '.html'}"
             class="mobile-nav-item ${activePage === item.id ? 'active' : ''}">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${activePage === item.id ? 1 : 0}">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
        <button class="mobile-nav-item" onclick="Layout.openNowPlaying()">
          <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">music_note</span>
          <span>يشغل</span>
        </button>
      </div>
    </nav>`;
  },

  buildNowPlayingScreen() {
    return `
    <div class="now-playing-screen" id="now-playing-screen">
      <div class="np-backdrop" id="np-backdrop"></div>
      <div class="np-content">
        <!-- Header -->
        <div class="np-header">
          <button class="btn-icon" onclick="Layout.closeNowPlaying()" title="تصغير">
            <span class="material-symbols-outlined" style="font-size:26px;font-variation-settings:'FILL' 1;color:white">expand_more</span>
          </button>
          <span style="color:rgba(255,255,255,0.7);font-size:13px;font-weight:600">يشغّل الآن</span>
          <button class="btn-icon" onclick="Layout.openQueue()" title="قائمة التشغيل">
            <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL' 1;color:white">queue_music</span>
          </button>
        </div>

        <!-- Artwork -->
        <div class="np-artwork-wrap">
          <div class="np-artwork-container">
            <img id="np-artwork" src="" alt="" style="display:none">
            <div id="np-artwork-placeholder">
              <span class="material-symbols-outlined" style="font-size:80px;color:rgba(255,255,255,0.5);font-variation-settings:'FILL' 1">music_note</span>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="np-info">
          <div class="np-title-row">
            <div class="np-titles">
              <div class="np-title" id="np-title">اختر أغنية</div>
              <div class="np-artist" id="np-artist">بطوط ميوزك</div>
              <div class="np-album" id="np-album"></div>
            </div>
            <button class="btn-icon np-like-btn" id="np-like-btn" onclick="Layout.onNpLike()" title="إعجاب">
              <span class="material-symbols-outlined" style="font-size:28px;font-variation-settings:'FILL' 0;color:white">favorite_border</span>
            </button>
          </div>

          <!-- Progress -->
          <div class="np-progress">
            <div class="np-progress-bar" id="np-progress-bar" onclick="Layout.onNpSeek(event)">
              <div class="np-progress-fill" id="np-progress-fill" style="width:0%"></div>
            </div>
            <div class="np-times">
              <span id="np-current-time">0:00</span>
              <span id="np-total-time">0:00</span>
            </div>
          </div>

          <!-- Controls -->
          <div class="np-controls">
            <button class="np-ctrl-btn" id="np-shuffle-btn" onclick="BatootApp.toggleShuffle();this.classList.toggle('active')" title="عشوائي">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">shuffle</span>
            </button>
            <button class="np-ctrl-btn" onclick="BatootApp.prev()" title="السابقة">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:36px">skip_previous</span>
            </button>
            <button class="np-ctrl-btn np-play-main" id="np-play-btn" onclick="BatootApp.togglePlay()" title="تشغيل">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">play_arrow</span>
            </button>
            <button class="np-ctrl-btn" onclick="BatootApp.next()" title="التالية">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;font-size:36px">skip_next</span>
            </button>
            <button class="np-ctrl-btn" id="np-repeat-btn" onclick="Layout.onNpRepeat()" title="تكرار">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">repeat</span>
            </button>
          </div>

          <!-- Extra actions -->
          <div class="np-extra-actions">
            <button class="np-extra-btn" onclick="Layout.onNpAddPlaylist()" title="إضافة لقائمة">
              <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">playlist_add</span>
            </button>
            <div class="np-volume-row">
              <span class="material-symbols-outlined" style="color:rgba(255,255,255,0.5);font-size:18px;font-variation-settings:'FILL' 1">volume_down</span>
              <div class="np-volume-bar" onclick="Layout.onNpVolume(event)">
                <div class="np-volume-fill" id="np-volume-fill" style="width:80%"></div>
              </div>
              <span class="material-symbols-outlined" style="color:rgba(255,255,255,0.5);font-size:18px;font-variation-settings:'FILL' 1">volume_up</span>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  buildQueueDrawer() {
    return `
    <div class="modal-overlay" id="queue-modal" onclick="if(event.target===this)this.classList.remove('open')">
      <div class="modal-box" style="max-width:420px;max-height:80vh;overflow-y:auto;padding:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 class="text-headline-md">قائمة التشغيل</h2>
          <button class="btn-icon" onclick="document.getElementById('queue-modal').classList.remove('open')">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">close</span>
          </button>
        </div>
        <div id="queue-list">
          <div style="text-align:center;color:var(--outline);padding:40px">لا توجد أغاني في القائمة</div>
        </div>
      </div>
    </div>`;
  },

  buildCreatePlaylistModal() {
    return `
    <div class="modal-overlay" id="create-playlist-modal" onclick="if(event.target===this)this.classList.remove('open')">
      <div class="modal-box" style="padding:32px">
        <h2 class="text-headline-md" style="margin-bottom:20px">قائمة تشغيل جديدة</h2>
        <input type="text" id="new-playlist-name" class="input-glass" placeholder="اسم القائمة..."
               style="padding-right:16px;margin-bottom:16px" maxlength="60">
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-secondary" onclick="document.getElementById('create-playlist-modal').classList.remove('open')">إلغاء</button>
          <button class="btn-primary" onclick="Layout.confirmCreatePlaylist()">إنشاء</button>
        </div>
      </div>
    </div>`;
  },

  buildAddToPlaylistModal() {
    return `
    <div class="modal-overlay" id="add-to-playlist-modal" onclick="if(event.target===this)this.classList.remove('open')">
      <div class="modal-box" style="padding:24px;max-height:70vh;overflow-y:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
          <h2 class="text-headline-md">إضافة إلى قائمة</h2>
          <button class="btn-icon" onclick="document.getElementById('add-to-playlist-modal').classList.remove('open')">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1">close</span>
          </button>
        </div>
        <div id="atp-list"></div>
      </div>
    </div>`;
  },

  // ─── Inject ───────────────────────────────────────────────
  inject(activePage) {
    const sidebarSlot = document.getElementById('sidebar-slot');
    if (sidebarSlot) sidebarSlot.outerHTML = this.buildSidebar(activePage);

    const playerSlot = document.getElementById('player-slot');
    if (playerSlot) playerSlot.outerHTML = this.buildPlayerBar();

    const mobileSlot = document.getElementById('mobile-nav-slot');
    if (mobileSlot) mobileSlot.outerHTML = this.buildMobileNav(activePage);

    // Inject YT player container
    if (!document.getElementById('yt-player-container')) {
      const ytDiv = document.createElement('div');
      ytDiv.id = 'yt-player-container';
      ytDiv.style.cssText = 'position:fixed;bottom:-9999px;left:-9999px;width:1px;height:1px;z-index:-1;pointer-events:none;';
      ytDiv.innerHTML = '<div id="yt-player-frame"></div>';
      document.body.appendChild(ytDiv);
    }

    // Modals
    document.body.insertAdjacentHTML('beforeend',
      this.buildNowPlayingScreen() +
      this.buildQueueDrawer() +
      this.buildCreatePlaylistModal() +
      this.buildAddToPlaylistModal()
    );

    // Player thumb image handlers
    const img = document.getElementById('player-thumb-img');
    if (img) {
      img.onload  = () => { img.style.display='block'; const ph=document.getElementById('player-thumb-placeholder'); if(ph)ph.style.display='none'; };
      img.onerror = () => { img.style.display='none';  const ph=document.getElementById('player-thumb-placeholder'); if(ph)ph.style.display='flex'; };
    }

    // Sidebar overlay
    if (!document.getElementById('sidebar-overlay')) {
      const overlay = document.createElement('div');
      overlay.id = 'sidebar-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);z-index:200;display:none';
      overlay.onclick = () => this.closeSidebar();
      document.body.appendChild(overlay);
    }

    // NP artwork fallback
    const npImg = document.getElementById('np-artwork');
    if (npImg) {
      npImg.onload  = () => { npImg.style.display='block'; const ph=document.getElementById('np-artwork-placeholder'); if(ph)ph.style.display='none'; this._updateNpBackdrop(npImg.src); };
      npImg.onerror = () => { npImg.style.display='none';  const ph=document.getElementById('np-artwork-placeholder'); if(ph)ph.style.display='flex'; };
    }
  },

  _updateNpBackdrop(src) {
    const bd = document.getElementById('np-backdrop');
    if (bd) bd.style.backgroundImage = `url('${src}')`;
  },

  // ─── Now Playing ─────────────────────────────────────────
  openNowPlaying() {
    const screen = document.getElementById('now-playing-screen');
    if (screen) screen.classList.add('open');
    document.body.style.overflow = 'hidden';
  },
  closeNowPlaying() {
    const screen = document.getElementById('now-playing-screen');
    if (screen) screen.classList.remove('open');
    document.body.style.overflow = '';
  },

  onNpLike() {
    const state = window.BatootApp?.getState();
    if (!state?.currentTrack) return;
    window.BatootApp.toggleLike(state.currentTrack.id);
  },

  onNpSeek(e) {
    const bar = document.getElementById('np-progress-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    window.BatootApp?.seek(Math.max(0, Math.min(1, pct)));
  },

  onNpVolume(e) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const v = Math.max(0, Math.min(1, pct));
    window.BatootApp?.setVolume(v);
    setEl('#np-volume-fill', el => el.style.width = (v*100)+'%');
  },

  onNpRepeat() {
    BatootApp.toggleRepeat();
    const btn = document.getElementById('np-repeat-btn');
    if (btn) {
      const state = BatootApp.getState();
      btn.classList.toggle('active', state.repeat !== 'off');
      const icon = btn.querySelector('.material-symbols-outlined');
      if (icon) icon.textContent = state.repeat === 'one' ? 'repeat_one' : 'repeat';
    }
  },

  onNpAddPlaylist() {
    const state = window.BatootApp?.getState();
    if (!state?.currentTrack) return;
    window.BatootApp.openAddToPlaylist(state.currentTrack.id);
  },

  // ─── Player Bar Events ───────────────────────────────────
  onLike() {
    const state = window.BatootApp?.getState();
    if (!state?.currentTrack) return;
    window.BatootApp.toggleLike(state.currentTrack.id);
  },

  onSeek(e) {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    window.BatootApp?.seek(Math.max(0, Math.min(1, pct)));
  },

  onVolumeClick(e) {
    const bar = document.getElementById('volume-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    window.BatootApp?.setVolume(Math.max(0, Math.min(1, pct)));
  },

  toggleMute() {
    // YT player mute toggle
    const ytP = window.ytPlayer;
    if (ytP && ytP.isMuted) {
      if (ytP.isMuted()) ytP.unMute(); else ytP.mute();
    }
    const icon = document.getElementById('volume-icon');
    if (icon) icon.textContent = (ytP && ytP.isMuted && ytP.isMuted()) ? 'volume_off' : 'volume_up';
  },

  openQueue() {
    const modal = document.getElementById('queue-modal');
    if (!modal) return;
    const state = window.BatootApp?.getState();
    const list = document.getElementById('queue-list');
    if (list && state?.queue?.length) {
      list.innerHTML = state.queue.map((t, i) => `
        <div class="track-row ${i === state.currentIndex ? 'playing' : ''}"
             onclick="BatootApp.playWithQueue('${t.id}',BatootApp.getState().queue);document.getElementById('queue-modal').classList.remove('open')">
          <div class="track-row__num">${i+1}</div>
          <div class="track-row__thumb" style="background:var(--surface-container)">
            ${t.image ? `<img src="${t.image}" style="width:100%;height:100%;object-fit:cover">` : ''}
          </div>
          <div class="track-row__info">
            <div class="track-row__title">${escHtml(t.title)}</div>
            <div class="track-row__artist">${escHtml(t.artist)}</div>
          </div>
          <div class="track-row__duration">${window.BatootApp.formatTime(t.duration)}</div>
        </div>
      `).join('');
    }
    modal.classList.add('open');
  },

  openCreatePlaylist() {
    document.getElementById('create-playlist-modal')?.classList.add('open');
    setTimeout(() => document.getElementById('new-playlist-name')?.focus(), 100);
  },

  confirmCreatePlaylist() {
    const input = document.getElementById('new-playlist-name');
    const name = input?.value.trim();
    if (!name) return;
    window.BatootApp?.createPlaylist(name);
    document.getElementById('create-playlist-modal')?.classList.remove('open');
    if (input) input.value = '';
    this._refreshSidebarPlaylists();
  },

  _refreshSidebarPlaylists() {
    const container = document.getElementById('sidebar-playlists');
    const playlists = window.BatootApp?.getState().playlists || [];
    if (container) container.innerHTML = this._renderSidebarPlaylists(playlists);
  },

  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (!sb) return;
    sb.classList.toggle('open');
    if (ov) ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    const ov = document.getElementById('sidebar-overlay');
    if (ov) ov.style.display = 'none';
  },
};

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function setEl(selector, fn) { const el = document.querySelector(selector); if (el) fn(el); }

window.Layout = Layout;
