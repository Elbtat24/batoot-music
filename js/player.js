/* ============================================================
   Batoot Music — Core Player Engine + YouTube Data API v3
   ============================================================ */
'use strict';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const CONFIG = {
  YT_KEY: 'AIzaSyBZvR8iHtQp0k8FTPDEDXLkQmCZpTZ3_So',
  YT_BASE: 'https://www.googleapis.com/youtube/v3',
  LIMIT: 20,
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const State = {
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  repeat: 'off',   // 'off' | 'one' | 'all'
  shuffle: false,
  volume: 0.8,
  liked: new Set(JSON.parse(localStorage.getItem('batoot_liked') || '[]')),
  history: [],
  playlists: JSON.parse(localStorage.getItem('batoot_playlists') || '[]'),
  recentSearches: JSON.parse(localStorage.getItem('batoot_searches') || '[]'),
  currentTrack: null,
};

// ─────────────────────────────────────────────
// YOUTUBE IFRAME API
// ─────────────────────────────────────────────
let ytPlayer = null;
let ytReady = false;
let pendingVideoId = null;
let progressTimer = null;

// Load YT IFrame API
(function loadYTApi() {
  if (document.getElementById('yt-iframe-api')) return;
  const tag = document.createElement('script');
  tag.id = 'yt-iframe-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
})();

window.onYouTubeIframeAPIReady = function () {
  ytReady = true;
  const container = document.getElementById('yt-player-container');
  if (!container) return;
  ytPlayer = new YT.Player('yt-player-frame', {
    height: '0', width: '0',
    playerVars: { autoplay: 0, controls: 0 },
    events: {
      onReady: () => {
        ytPlayer.setVolume(State.volume * 100);
        if (pendingVideoId) { _playVideo(pendingVideoId); pendingVideoId = null; }
      },
      onStateChange: onYTStateChange,
    }
  });
};

function onYTStateChange(e) {
  const YTS = YT.PlayerState;
  if (e.data === YTS.PLAYING) {
    State.isPlaying = true;
    updatePlayBtn();
    startProgressTimer();
    updateMediaSession(State.currentTrack);
  } else if (e.data === YTS.PAUSED) {
    State.isPlaying = false;
    updatePlayBtn();
    stopProgressTimer();
  } else if (e.data === YTS.ENDED) {
    stopProgressTimer();
    onTrackEnd();
  } else if (e.data === YTS.BUFFERING) {
    setPlayerLoading(true);
  }
  if (e.data === YTS.PLAYING) setPlayerLoading(false);
}

function _playVideo(videoId) {
  if (!ytPlayer || typeof ytPlayer.loadVideoById !== 'function') {
    pendingVideoId = videoId; return;
  }
  ytPlayer.loadVideoById(videoId);
}

function startProgressTimer() {
  stopProgressTimer();
  progressTimer = setInterval(onTimeUpdate, 500);
}
function stopProgressTimer() {
  if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
}

function onTimeUpdate() {
  if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
  const cur = ytPlayer.getCurrentTime() || 0;
  const dur = ytPlayer.getDuration() || 0;
  const pct = dur ? (cur / dur) * 100 : 0;
  setEl('#progress-fill', el => el.style.width = pct + '%');
  setEl('#current-time', el => el.textContent = formatTime(cur));
  setEl('#total-time', el => el.textContent = formatTime(dur));
  // Sync now-playing screen
  setEl('#np-current-time', el => el.textContent = formatTime(cur));
  setEl('#np-total-time', el => el.textContent = formatTime(dur));
  setEl('#np-progress-fill', el => el.style.width = pct + '%');
}

function onTrackEnd() {
  if (State.repeat === 'one') {
    if (ytPlayer) ytPlayer.seekTo(0);
    if (ytPlayer) ytPlayer.playVideo();
  } else {
    nextTrack();
  }
}

function setPlayerLoading(loading) {
  const btn = document.getElementById('play-pause-btn');
  if (!btn) return;
  btn.innerHTML = loading
    ? '<span class="material-symbols-outlined animate-spin" style="font-size:22px;font-variation-settings:\'FILL\' 1">autorenew</span>'
    : (State.isPlaying
      ? '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\' 1">pause</span>'
      : '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\' 1">play_arrow</span>');
}

// ─────────────────────────────────────────────
// PLAYBACK CONTROLS
// ─────────────────────────────────────────────
function playTrack(track, queueTracks) {
  if (queueTracks) State.queue = [...queueTracks];
  const idx = State.queue.findIndex(t => t.id === track.id);
  State.currentIndex = idx !== -1 ? idx : 0;
  if (idx === -1) State.queue.unshift(track);

  const t = State.queue[State.currentIndex];
  State.currentTrack = t;

  _playVideo(t.videoId);
  State.isPlaying = true;
  updatePlayerUI(t);
  addToHistory(t);
  document.title = `${t.title} — بطوط ميوزك`;
}

function togglePlay() {
  if (!ytPlayer || !State.currentTrack) return;
  if (State.isPlaying) { ytPlayer.pauseVideo(); }
  else { ytPlayer.playVideo(); }
}

function nextTrack() {
  if (!State.queue.length) return;
  let idx = State.currentIndex;
  if (State.shuffle) {
    let r; do { r = Math.floor(Math.random() * State.queue.length); } while (r === idx && State.queue.length > 1);
    idx = r;
  } else {
    idx = (idx + 1) % State.queue.length;
    if (State.repeat === 'off' && idx === 0) { if (ytPlayer) ytPlayer.pauseVideo(); State.isPlaying = false; updatePlayBtn(); return; }
  }
  State.currentIndex = idx;
  const t = State.queue[idx];
  State.currentTrack = t;
  _playVideo(t.videoId);
  State.isPlaying = true;
  updatePlayerUI(t);
  addToHistory(t);
}

function prevTrack() {
  if (!State.queue.length) return;
  if (ytPlayer && ytPlayer.getCurrentTime && ytPlayer.getCurrentTime() > 3) {
    ytPlayer.seekTo(0); return;
  }
  let idx = State.currentIndex - 1;
  if (idx < 0) idx = State.queue.length - 1;
  State.currentIndex = idx;
  const t = State.queue[idx];
  State.currentTrack = t;
  _playVideo(t.videoId);
  State.isPlaying = true;
  updatePlayerUI(t);
}

function setVolume(v) {
  State.volume = Math.max(0, Math.min(1, v));
  if (ytPlayer && ytPlayer.setVolume) ytPlayer.setVolume(State.volume * 100);
  setEl('#volume-fill', el => el.style.width = (State.volume * 100) + '%');
}

function toggleShuffle() {
  State.shuffle = !State.shuffle;
  const btn = document.getElementById('shuffle-btn');
  if (btn) btn.classList.toggle('active', State.shuffle);
}

function toggleRepeat() {
  const modes = ['off', 'all', 'one'];
  State.repeat = modes[(modes.indexOf(State.repeat) + 1) % modes.length];
  const btn = document.getElementById('repeat-btn');
  if (!btn) return;
  btn.classList.toggle('active', State.repeat !== 'off');
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = State.repeat === 'one' ? 'repeat_one' : 'repeat';
}

function seekTo(pct) {
  if (!ytPlayer || !ytPlayer.getDuration) return;
  const dur = ytPlayer.getDuration();
  if (dur) ytPlayer.seekTo(dur * pct, true);
}

// ─────────────────────────────────────────────
// PLAYER UI UPDATES
// ─────────────────────────────────────────────
function updatePlayerUI(track) {
  const img = document.getElementById('player-thumb-img');
  const ph  = document.getElementById('player-thumb-placeholder');
  if (img) {
    if (track.image) {
      img.src = track.image; img.alt = track.title || '';
      img.style.display = 'block';
      if (ph) ph.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (ph) ph.style.display = 'flex';
    }
  }
  setEl('#player-track-name', el => el.textContent = track.title || 'Unknown');
  setEl('#player-artist-name', el => el.textContent = track.artist || 'Unknown');
  updatePlayBtn();
  updateLikeBtn(track.id);

  // Update Now Playing screen
  updateNowPlayingScreen(track);
}

function updateNowPlayingScreen(track) {
  if (!track) return;
  setEl('#np-title', el => el.textContent = track.title || 'Unknown');
  setEl('#np-artist', el => el.textContent = track.artist || 'Unknown');
  setEl('#np-album', el => el.textContent = track.album || '');
  const npImg = document.getElementById('np-artwork');
  if (npImg) {
    npImg.src = track.image ? track.image.replace('mqdefault','maxresdefault') : '';
    npImg.style.display = track.image ? 'block' : 'none';
  }
  updateNpLikeBtn(track.id);
}

function updatePlayBtn() {
  const icon = State.isPlaying
    ? '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\' 1">pause</span>'
    : '<span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:\'FILL\' 1">play_arrow</span>';
  setEl('#play-pause-btn', el => el.innerHTML = icon);
  // np screen
  setEl('#np-play-btn', el => el.innerHTML = State.isPlaying
    ? '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">pause</span>'
    : '<span class="material-symbols-outlined" style="font-variation-settings:\'FILL\' 1">play_arrow</span>');
}

function updateLikeBtn(id) {
  const liked = State.liked.has(String(id));
  const btn = document.getElementById('player-like-btn');
  if (btn) {
    btn.classList.toggle('liked', liked);
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' ${liked?1:0}">${liked?'favorite':'favorite_border'}</span>`;
  }
}

function updateNpLikeBtn(id) {
  const liked = State.liked.has(String(id));
  const btn = document.getElementById('np-like-btn');
  if (btn) {
    btn.classList.toggle('liked', liked);
    btn.innerHTML = `<span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${liked?1:0}">${liked?'favorite':'favorite_border'}</span>`;
  }
}

function toggleLike(id) {
  const key = String(id);
  if (State.liked.has(key)) State.liked.delete(key);
  else State.liked.add(key);
  localStorage.setItem('batoot_liked', JSON.stringify([...State.liked]));
  updateLikeBtn(key);
  updateNpLikeBtn(key);
}

// ─────────────────────────────────────────────
// MEDIA SESSION
// ─────────────────────────────────────────────
function updateMediaSession(track) {
  if (!track || !('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || 'Unknown',
    artist: track.artist || 'Unknown',
    album: track.album || 'بطوط ميوزك',
    artwork: track.image ? [{ src: track.image, sizes: '480x360', type: 'image/jpeg' }] : [],
  });
  navigator.mediaSession.setActionHandler('play', () => { if (ytPlayer) ytPlayer.playVideo(); });
  navigator.mediaSession.setActionHandler('pause', () => { if (ytPlayer) ytPlayer.pauseVideo(); });
  navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
}

// ─────────────────────────────────────────────
// YOUTUBE DATA API v3
// ─────────────────────────────────────────────
async function ytFetch(endpoint, params) {
  const q = new URLSearchParams({ key: CONFIG.YT_KEY, ...params }).toString();
  const res = await fetch(`${CONFIG.YT_BASE}/${endpoint}?${q}`);
  if (!res.ok) throw new Error('YouTube API error ' + res.status);
  return res.json();
}

function mapYTVideo(item) {
  const id = typeof item.id === 'string' ? item.id : (item.id?.videoId || item.id?.playlistId || item.id);
  const snip = item.snippet || {};
  const thumb = snip.thumbnails?.medium?.url || snip.thumbnails?.default?.url || null;
  return {
    id: 'yt_' + id,
    videoId: id,
    title: snip.title || 'Unknown',
    artist: snip.channelTitle || snip.videoOwnerChannelTitle || 'Unknown',
    album: snip.playlistTitle || '',
    image: thumb,
    duration: item.contentDetails?.duration ? parseDuration(item.contentDetails.duration) : 0,
    source: 'youtube',
  };
}

function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1]||0)*3600) + (parseInt(m[2]||0)*60) + parseInt(m[3]||0);
}

// Search videos
async function searchYouTube(query, maxResults = CONFIG.LIMIT) {
  const data = await ytFetch('search', {
    part: 'snippet', q: query + ' music',
    type: 'video', videoCategoryId: '10',
    maxResults, order: 'relevance',
  });
  const items = (data.items || []).filter(i => i.id?.videoId);
  return items.map(mapYTVideo);
}

// Trending music videos
async function getYTTrending(regionCode = 'EG') {
  const data = await ytFetch('videos', {
    part: 'snippet,contentDetails',
    chart: 'mostPopular',
    videoCategoryId: '10',
    regionCode,
    maxResults: CONFIG.LIMIT,
  });
  return (data.items || []).map(i => mapYTVideo(i));
}

// Get videos by genre keyword
async function getYTByGenre(genre) {
  return searchYouTube(genre, CONFIG.LIMIT);
}

// Get artist's videos (top tracks)
async function getArtistTracks(artistName, maxResults = 20) {
  const data = await ytFetch('search', {
    part: 'snippet', q: artistName + ' official music video',
    type: 'video', videoCategoryId: '10',
    maxResults, order: 'relevance',
  });
  return (data.items || []).filter(i => i.id?.videoId).map(mapYTVideo);
}

// Get artist albums (playlists by channel)
async function getArtistAlbums(channelId, maxResults = 10) {
  const data = await ytFetch('playlists', {
    part: 'snippet,contentDetails',
    channelId, maxResults,
  });
  return (data.items || []).map(item => ({
    id: 'pl_yt_' + item.id,
    playlistId: item.id,
    title: item.snippet?.title || 'Album',
    artist: item.snippet?.channelTitle || '',
    image: item.snippet?.thumbnails?.medium?.url || null,
    trackCount: item.contentDetails?.itemCount || 0,
  }));
}

// Get playlist tracks
async function getPlaylistTracks(playlistId, maxResults = 20) {
  const data = await ytFetch('playlistItems', {
    part: 'snippet,contentDetails', playlistId, maxResults,
  });
  return (data.items || []).filter(i => i.snippet?.resourceId?.videoId).map(item => ({
    id: 'yt_' + item.snippet.resourceId.videoId,
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title || 'Unknown',
    artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle || 'Unknown',
    album: item.snippet.playlistTitle || '',
    image: item.snippet.thumbnails?.medium?.url || null,
    duration: 0,
    source: 'youtube',
  }));
}

// ─────────────────────────────────────────────
// HISTORY & PLAYLISTS
// ─────────────────────────────────────────────
function addToHistory(track) {
  State.history = [track, ...State.history.filter(t => t.id !== track.id)].slice(0, 50);
}

function savePlaylists() {
  localStorage.setItem('batoot_playlists', JSON.stringify(State.playlists));
}

function createPlaylist(name) {
  const pl = { id: 'pl_' + Date.now(), name, tracks: [], createdAt: Date.now() };
  State.playlists.unshift(pl);
  savePlaylists();
  return pl;
}

function addToPlaylist(playlistId, track) {
  const pl = State.playlists.find(p => p.id === playlistId);
  if (!pl || pl.tracks.find(t => t.id === track.id)) return;
  pl.tracks.push(track);
  savePlaylists();
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function setEl(selector, fn) {
  const el = document.querySelector(selector);
  if (el) fn(el);
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────
function renderMusicCards(tracks) {
  return tracks.map(t => `
    <div class="music-card" onclick="BatootApp.play('${t.id}')" data-id="${t.id}">
      <div class="music-card__thumb">
        ${t.image
          ? `<img src="${t.image}" alt="${escHtml(t.title)}" loading="lazy">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary-fixed),var(--secondary-fixed))"><span class="material-symbols-outlined" style="color:var(--primary-container);font-size:36px;font-variation-settings:'FILL' 1">music_note</span></div>`
        }
        <button class="music-card__play" onclick="event.stopPropagation();BatootApp.play('${t.id}')">
          <span class="material-symbols-outlined" style="font-size:20px;font-variation-settings:'FILL' 1">play_arrow</span>
        </button>
      </div>
      <div class="music-card__title">${escHtml(t.title)}</div>
      <div class="music-card__sub">${escHtml(t.artist)}</div>
    </div>
  `).join('');
}

function renderTrackRows(tracks, showNum = true) {
  return tracks.map((t, i) => `
    <div class="track-row ${State.currentTrack?.id === t.id ? 'playing' : ''}"
         onclick="BatootApp.play('${t.id}')" data-id="${t.id}">
      <div class="track-row__num">${showNum ? i + 1 : ''}</div>
      <div class="track-row__equalizer">
        <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
      </div>
      <div class="track-row__thumb">
        ${t.image ? `<img src="${t.image}" alt="${escHtml(t.title)}" loading="lazy">` : ''}
      </div>
      <div class="track-row__info">
        <div class="track-row__title">${escHtml(t.title)}</div>
        <div class="track-row__artist">${escHtml(t.artist)}</div>
      </div>
      <div class="track-row__duration">${formatTime(t.duration)}</div>
      <div class="track-row__actions">
        <button class="btn-icon" onclick="event.stopPropagation();BatootApp.toggleLike('${t.id}')" title="إعجاب">
          <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' ${State.liked.has(t.id)?1:0}">${State.liked.has(t.id)?'favorite':'favorite_border'}</span>
        </button>
        <button class="btn-icon" onclick="event.stopPropagation();BatootApp.openAddToPlaylist('${t.id}')" title="إضافة لقائمة">
          <span class="material-symbols-outlined" style="font-size:18px;font-variation-settings:'FILL' 1">playlist_add</span>
        </button>
      </div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// TRACK CACHE
// ─────────────────────────────────────────────
const trackCache = {};
function cacheTrack(t) { if (t && t.id) trackCache[t.id] = t; }
function cacheTracks(arr) { (arr || []).forEach(cacheTrack); }
function getTrack(id) { return trackCache[id] || State.queue.find(t => t.id === id) || null; }

// ─────────────────────────────────────────────
// ADD TO PLAYLIST MODAL
// ─────────────────────────────────────────────
function openAddToPlaylist(trackId) {
  const track = getTrack(trackId);
  if (!track) return;
  const modal = document.getElementById('add-to-playlist-modal');
  if (!modal) return;
  const list = document.getElementById('atp-list');
  if (list) {
    const pls = State.playlists;
    if (!pls.length) {
      list.innerHTML = `<div style="text-align:center;color:var(--outline);padding:20px">لا توجد قوائم. أنشئ قائمة أولاً.</div>`;
    } else {
      list.innerHTML = pls.map(pl => `
        <div class="track-row" onclick="BatootApp.addToPlaylist('${pl.id}','${trackId}');document.getElementById('add-to-playlist-modal').classList.remove('open')">
          <div class="track-row__thumb" style="background:var(--surface-container);display:flex;align-items:center;justify-content:center">
            <span class="material-symbols-outlined" style="color:var(--primary-container);font-variation-settings:'FILL' 1">queue_music</span>
          </div>
          <div class="track-row__info">
            <div class="track-row__title">${escHtml(pl.name)}</div>
            <div class="track-row__artist">${pl.tracks.length} أغنية</div>
          </div>
        </div>
      `).join('');
    }
  }
  modal.classList.add('open');
}

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────
window.BatootApp = {
  play(id) {
    const t = getTrack(id);
    if (t) playTrack(t, Object.values(trackCache));
  },
  playWithQueue(id, queue) {
    const t = getTrack(id);
    if (t) playTrack(t, queue);
  },
  togglePlay,
  next: nextTrack,
  prev: prevTrack,
  seek: pct => seekTo(pct),
  setVolume,
  toggleShuffle,
  toggleRepeat,
  toggleLike: id => toggleLike(id),
  isLiked: id => State.liked.has(String(id)),
  getState: () => State,
  formatTime,
  renderMusicCards,
  renderTrackRows,
  // YouTube API
  searchYouTube,
  getYTTrending,
  getYTByGenre,
  getArtistTracks,
  getArtistAlbums,
  getPlaylistTracks,
  // Cache
  cacheTracks, cacheTrack, getTrack,
  // Playlists
  createPlaylist,
  addToPlaylist(plId, trackId) {
    const t = getTrack(trackId);
    if (t) addToPlaylist(plId, t);
  },
  savePlaylists,
  openAddToPlaylist,
  escHtml,
};

if (typeof module !== 'undefined') module.exports = window.BatootApp;
