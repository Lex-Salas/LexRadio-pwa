(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const STORAGE = { fav:'lexradio_favorites_v2', votes:'lexradio_votes_v1' };
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const read = (key, fallback=[]) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const timeToMinutes = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };

  let schedule = [];
  let currentMeta = {song:'LEX RADIO', artist:'En vivo', artwork:'logo-lexradio.png'};

  function crNow(){
    const parts = new Intl.DateTimeFormat('en-US',{timeZone:'America/Costa_Rica',weekday:'short',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(new Date());
    const get = type => parts.find(p=>p.type===type)?.value;
    const dayMap={Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6};
    return {day:dayMap[get('weekday')], minutes:Number(get('hour'))*60+Number(get('minute'))};
  }

  function currentAndNext(){
    const now=crNow();
    const current=schedule.find(p=>p.days.includes(now.day)&&now.minutes>=timeToMinutes(p.start)&&now.minutes<timeToMinutes(p.end));
    const upcoming=[];
    for(let offset=0;offset<8;offset++){
      const day=(now.day+offset)%7;
      schedule.filter(p=>p.days.includes(day)).forEach(p=>{
        const start=timeToMinutes(p.start);
        if(offset>0||start>now.minutes) upcoming.push({...p,offset});
      });
      if(upcoming.length) break;
    }
    upcoming.sort((a,b)=>a.offset-b.offset||timeToMinutes(a.start)-timeToMinutes(b.start));
    return {current,next:upcoming[0]};
  }

  function renderLive(){
    const box=$('#lex-live-context'); if(!box) return;
    const {current,next}=currentAndNext();
    box.innerHTML=`<div class="lex-live-label">${current?'🔴 AHORA EN LEX RADIO':'📻 LEX RADIO 24/7'}</div>
      <div class="lex-live-program">${esc(current?.name||'Tus Recuerdos En El Presente')}</div>
      <div class="lex-live-host">${current?`${esc(current.host)} · hasta ${esc(current.end)}`:'Música continua mientras llega el próximo programa'}</div>
      ${next?`<div class="lex-next"><span>SIGUE</span><strong>${esc(next.name)}</strong><small>${next.offset?'Próximo día · ':''}${esc(next.start)}</small></div>`:''}`;
  }

  function renderSchedule(){
    const grid=$('#lex-schedule-grid'); if(!grid) return;
    grid.innerHTML=schedule.map(p=>`<article class="lex-schedule-card"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy"><div><span>${esc(p.start)}–${esc(p.end)}</span><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><button class="lex-remind" data-program="${esc(p.name)}">🔔 Avisarme</button></div></article>`).join('');
  }

  async function loadSchedule(){
    try { const r=await fetch('data/programacion.json',{cache:'no-store'}); const d=await r.json(); schedule=d.programs||[]; renderLive(); renderSchedule(); }
    catch(e){ console.warn('Programación no disponible',e); }
  }

  function favoriteKey(m=currentMeta){ return `${m.artist} - ${m.song}`.trim(); }
  function isFavorite(){ return read(STORAGE.fav).some(x=>x.key===favoriteKey()); }
  function syncFavorite(){ const b=$('#lex-favorite'); if(b) b.textContent=isFavorite()?'♥ Guardada':'♡ Favorita'; }
  function toggleFavorite(){
    let list=read(STORAGE.fav); const key=favoriteKey();
    if(isFavorite()) list=list.filter(x=>x.key!==key); else list.unshift({key,...currentMeta,savedAt:Date.now()});
    write(STORAGE.fav,list.slice(0,100)); syncFavorite(); renderFavorites();
  }
  function renderFavorites(){
    const el=$('#lex-favorites-list'); if(!el) return; const list=read(STORAGE.fav);
    el.innerHTML=list.length?list.slice(0,12).map(x=>`<div class="lex-fav-row"><span>♥</span><div><strong>${esc(x.song)}</strong><small>${esc(x.artist)}</small></div></div>`).join(''):'<p class="lex-empty">Marcá ♥ en una canción y aparecerá aquí.</p>';
  }

  function renderTop(){
    const el=$('#lex-top-list'); if(!el) return;
    const recent=read('lexradio_recently_played'); const counts={};
    recent.forEach(x=>{ if(x.label) counts[x.label]=(counts[x.label]||0)+1; });
    const ranked=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    el.innerHTML=ranked.length?ranked.map(([name],i)=>`<div class="lex-top-row"><b>${String(i+1).padStart(2,'0')}</b><span>${esc(name)}</span></div>`).join(''):'<p class="lex-empty">El ranking se irá formando con la música que escuchás en LEX Radio.</p>';
  }

  function injectUI(){
    const player=$('.audio-player'); if(player && !$('#lex-live-context')){
      const live=document.createElement('div'); live.id='lex-live-context'; live.className='lex-live-context'; player.prepend(live);
      const actions=document.createElement('div'); actions.className='lex-track-actions'; actions.innerHTML='<button id="lex-favorite">♡ Favorita</button><button id="lex-share">↗ Compartir</button>'; $('.now-playing',player)?.after(actions);
    }
    const main=$('main'); if(main && !$('#lex-discover')){
      const section=document.createElement('section'); section.id='lex-discover'; section.innerHTML=`
        <h2 class="section-title">⚡ LEX Radio Ahora</h2><div id="lex-schedule-grid" class="lex-schedule-grid"></div>
        <div class="lex-dashboard"><article><h3>♥ Mis favoritas</h3><div id="lex-favorites-list"></div></article><article><h3>🔥 LEX Top 10</h3><div id="lex-top-list"></div></article></div>`;
      const programs=$('#programas'); main.insertBefore(section,programs||main.firstChild);
    }
    if(!$('#lex-mini-player')){
      document.body.insertAdjacentHTML('beforeend',`<div id="lex-mini-player" class="lex-mini-player"><img id="lex-mini-art" src="logo-lexradio.png" alt=""><div><strong id="lex-mini-song">LEX RADIO</strong><small id="lex-mini-artist">Tus Recuerdos En El Presente</small></div><button id="lex-mini-play" aria-label="Reproducir o pausar">▶</button></div>`);
    }
  }

  function syncMetadata(){
    const song=$('#songTitle')?.textContent?.replace(/^🎵\s*/,'').trim(); const artist=$('#artistName')?.textContent?.trim(); const art=$('#albumArt')?.src;
    if(song && song!=='CONECTANDO...') currentMeta={song,artist:artist||'LEX Radio',artwork:art||'logo-lexradio.png'};
    $('#lex-mini-song') && ($('#lex-mini-song').textContent=currentMeta.song);
    $('#lex-mini-artist') && ($('#lex-mini-artist').textContent=currentMeta.artist);
    $('#lex-mini-art') && ($('#lex-mini-art').src=currentMeta.artwork);
    if('mediaSession' in navigator){
      navigator.mediaSession.metadata=new MediaMetadata({title:currentMeta.song,artist:currentMeta.artist,album:'LEX Radio',artwork:[{src:currentMeta.artwork,sizes:'512x512'}]});
    }
    syncFavorite(); renderTop();
  }

  async function share(){
    const data={title:'LEX Radio',text:`Estoy escuchando ${currentMeta.artist} - ${currentMeta.song} en LEX Radio 🎶`,url:location.href};
    try { if(navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(`${data.text} ${data.url}`); alert('Enlace copiado'); } } catch {}
  }

  async function remind(program){
    try {
      if(!('Notification' in window)) return alert('Tu navegador no admite notificaciones.');
      const permission=await Notification.requestPermission();
      if(permission==='granted') new Notification('LEX Radio',{body:`Listo. Activaste las notificaciones para ${program}.`,icon:'icons/lexradio_192.png'});
    } catch {}
  }

  function bind(){
    $('#lex-favorite')?.addEventListener('click',toggleFavorite); $('#lex-share')?.addEventListener('click',share);
    $('#lex-mini-play')?.addEventListener('click',()=>$('#playBtn')?.click());
    document.addEventListener('click',e=>{ const b=e.target.closest('.lex-remind'); if(b) remind(b.dataset.program); });
    const title=$('#songTitle'); if(title) new MutationObserver(syncMetadata).observe(title,{childList:true,subtree:true,characterData:true});
    const artist=$('#artistName'); if(artist) new MutationObserver(syncMetadata).observe(artist,{childList:true,subtree:true,characterData:true});
    const art=$('#albumArt'); if(art) new MutationObserver(syncMetadata).observe(art,{attributes:true,attributeFilter:['src']});
    const play=$('#playBtn'); if(play) new MutationObserver(()=>{ const playing=play.textContent.includes('⏸'); $('#lex-mini-play').textContent=playing?'Ⅱ':'▶'; }).observe(play,{childList:true,subtree:true,characterData:true});
  }

  document.addEventListener('DOMContentLoaded',()=>{ injectUI(); bind(); loadSchedule(); renderFavorites(); renderTop(); syncMetadata(); setInterval(renderLive,60000); });
})();