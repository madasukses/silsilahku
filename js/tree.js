/* ============================================================
   SilsilahKu — tree.js  (v5 — garis menempel avatar, center, mobile)
   ============================================================ */

const GEN_NAMES = ['','Leluhur','Anak','Cucu','Cicit','Canggah','Wareng','Udeg-udeg'];
let ALL_MEMBERS = [];

async function loadMembers() {
  const { data, error } = await window._db
    .from('members')
    .select('*')
    .order('generation', { ascending: true });
  if (error) { console.error(error); return []; }
  return data || [];
}

function childrenOf(pid, members) {
  return members.filter(p =>
    (p.father_id === pid || p.mother_id === pid) && !p.is_inlaw
  );
}

function makeAvaEl(p) {
  const el = document.createElement('div');
  el.className = 'node-ava';
  if (p.avatar_url) {
    const img = document.createElement('img');
    img.src = p.avatar_url;
    img.alt = p.name;
    img.onerror = () => { img.remove(); el.textContent = (p.initials || p.name[0]).toUpperCase(); };
    el.appendChild(img);
  } else {
    el.textContent = (p.initials || p.name[0]).toUpperCase();
  }
  if (p.is_deceased) {
    const rose = document.createElement('div');
    rose.className = 'node-rose';
    rose.textContent = '🌹';
    el.appendChild(rose);
  }
  return el;
}

function makeNode(p, onClickFn) {
  const nd = document.createElement('div');
  nd.className = 'node' + (p.is_inlaw ? ' inlaw' : '') + (p.is_deceased ? ' dec' : '');
  nd.dataset.id = p.id;
  nd.appendChild(makeAvaEl(p));

  const nameEl = document.createElement('div');
  nameEl.className = 'node-name';
  nameEl.textContent = p.nickname || p.name.split(' ')[0];
  nd.appendChild(nameEl);

  if (p.child_order && !p.is_inlaw) {
    const o = document.createElement('div');
    o.className = 'node-order';
    o.textContent = 'Anak ke-' + p.child_order;
    nd.appendChild(o);
  }

  const birth = p.birth_date ? new Date(p.birth_date).getFullYear() : '';
  const death = p.is_deceased && p.death_date ? ' - ' + new Date(p.death_date).getFullYear() : '';
  if (birth || death) {
    const yr = document.createElement('div');
    yr.className = 'node-year';
    yr.textContent = birth + death;
    nd.appendChild(yr);
  }

  if (p.is_inlaw) {
    const pill = document.createElement('div');
    pill.className = 'inlaw-pill';
    pill.textContent = 'menantu';
    nd.appendChild(pill);
  }

  nd.addEventListener('click', () => onClickFn(p));
  return nd;
}

/* ══════════════════════════════════════════════════════════
   FAMILY BLOCK — SVG lines, garis tepat ke lingkaran avatar
   
   Struktur HTML:
   <div class="family-block">
     <div class="couple-row">
       <div class="node core">...</div>   ← anggota inti
       <div class="couple-line-h"></div>  ← garis horizontal ke pasangan
       <div class="node inlaw">...</div>  ← menantu
     </div>
     <div class="v-conn"></div>           ← garis lurus bawah
     <div class="spread-wrap">
       <div class="h-bar"></div>          ← garis horizontal jika >1 anak
       <div class="siblings-row">
         <div class="child-col">
           <div class="child-drop"></div>
           ... child family-block ...
         </div>
       </div>
     </div>
   </div>
   
   Garis horizontal ke pasangan = garis nyata dari tepi kanan
   avatar inti ke tepi kiri avatar pasangan.
   Tidak ada jarak kosong — langsung menempel.
══════════════════════════════════════════════════════════ */

const AVA = 54;   // avatar diameter px
const HALF = AVA / 2; // 27px — radius

function buildFamilyBlock(person, drawn, members, onClickFn) {
  if (drawn.has(person.id)) return null;
  drawn.add(person.id);

  // Cari pasangan
  let spouse = person.spouse_id
    ? members.find(m => m.id === person.spouse_id)
    : members.find(m => m.spouse_id === person.id);
  if (spouse && drawn.has(spouse.id)) spouse = null;
  if (spouse) drawn.add(spouse.id);

  // Anak-anak, urutkan by child_order
  const seenCh = new Set();
  const children = [];
  [person, spouse].filter(Boolean).forEach(p => {
    childrenOf(p.id, members).forEach(c => {
      if (!seenCh.has(c.id) && !drawn.has(c.id)) {
        seenCh.add(c.id);
        children.push(c);
      }
    });
  });
  // Urutkan anak ke- dari kiri ke kanan
  children.sort((a, b) => (a.child_order || 99) - (b.child_order || 99));

  const hasChildren = children.length > 0;

  /* ── outer block — CENTER semua ── */
  const block = document.createElement('div');
  block.className = 'family-block';

  /* ── Couple row ── */
  const coupleRow = document.createElement('div');
  coupleRow.className = 'couple-row';

  // Node inti
  const coreNode = makeNode(person, onClickFn);
  coupleRow.appendChild(coreNode);

  if (spouse) {
    // Garis horizontal dari tepi kanan avatar inti ke tepi kiri avatar pasangan
    // Garis berada di middle (vertikal center avatar = HALF dari atas)
    const hLine = document.createElement('div');
    hLine.className = 'couple-hline';
    coupleRow.appendChild(hLine);

    const spouseNode = makeNode(spouse, onClickFn);
    coupleRow.appendChild(spouseNode);
  }

  block.appendChild(coupleRow);

  if (!hasChildren) return block;

  // Garis vertikal dari bawah avatar inti
  const vConn = document.createElement('div');
  vConn.className = 'v-conn';
  block.appendChild(vConn);

  // Spread wrap
  const spreadWrap = document.createElement('div');
  spreadWrap.className = 'spread-wrap';

  const siblingsRow = document.createElement('div');
  siblingsRow.className = 'siblings-row';

  children.forEach(child => {
    const col = document.createElement('div');
    col.className = 'child-col';
    const drop = document.createElement('div');
    drop.className = 'child-drop';
    col.appendChild(drop);
    const childBlock = buildFamilyBlock(child, drawn, members, onClickFn);
    if (childBlock) col.appendChild(childBlock);
    siblingsRow.appendChild(col);
  });

  if (children.length > 1) {
    // h-bar digambar SETELAH mount via JS agar posisi tepat di center avatar
    const hBar = document.createElement('div');
    hBar.className = 'h-bar-js';
    spreadWrap.appendChild(hBar);
    // Simpan referensi untuk diukur setelah DOM render
    spreadWrap._hBar = hBar;
    spreadWrap._siblingsRow = siblingsRow;
  }

  spreadWrap.appendChild(siblingsRow);
  block.appendChild(spreadWrap);
  return block;
}

/* ── Fix h-bar positions after DOM is rendered ──
   Mengukur posisi center avatar dari child-col pertama dan terakhir,
   lalu set h-bar.style left/right secara presisi.
   Ini menghindari h-bar melampaui avatar karena couple-row lebih lebar.
── */
function fixHBars(container) {
  const spreadWraps = container.querySelectorAll('.spread-wrap');
  spreadWraps.forEach(sw => {
    if (!sw._hBar || !sw._siblingsRow) return;
    const cols = sw._siblingsRow.querySelectorAll(':scope > .child-col');
    if (cols.length < 2) return;

    // Avatar pertama (child-col pertama → .node-ava pertama di dalamnya)
    const firstAva = cols[0].querySelector('.node-ava');
    const lastAva  = cols[cols.length - 1].querySelector('.node-ava');
    if (!firstAva || !lastAva) return;

    const swRect    = sw.getBoundingClientRect();
    const firstRect = firstAva.getBoundingClientRect();
    const lastRect  = lastAva.getBoundingClientRect();

    // Center x dari masing-masing avatar relatif terhadap spreadWrap
    const leftCenter  = firstRect.left + firstRect.width / 2 - swRect.left;
    const rightCenter = lastRect.left  + lastRect.width  / 2 - swRect.left;

    const hBar = sw._hBar;
    hBar.style.left  = leftCenter + 'px';
    hBar.style.width = (rightCenter - leftCenter) + 'px';
  });
}

/* ── Render ── */
async function renderTree(containerId, onClickFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="page-loading"><div class="spinner"></div> Memuat silsilah...</div>';

  ALL_MEMBERS = await loadMembers();
  if (!ALL_MEMBERS.length) {
    container.innerHTML = '<div class="page-loading">Belum ada data anggota.</div>';
    return;
  }

  container.innerHTML = '';
  const drawn = new Set();
  const roots = ALL_MEMBERS.filter(p => !p.is_inlaw && !p.father_id && !p.mother_id);
  roots.forEach(rp => {
    if (drawn.has(rp.id)) return;
    const block = buildFamilyBlock(rp, drawn, ALL_MEMBERS, onClickFn);
    if (block) container.appendChild(block);
  });

  // Ukur posisi avatar setelah DOM selesai di-render
  requestAnimationFrame(() => {
    fixHBars(container);
    // Re-fix saat window resize (rotasi layar di HP)
    window.addEventListener('resize', () => fixHBars(container), { passive: true });
  });
}
