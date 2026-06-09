/* ============================================================
   SilsilahKu — tree.js
   Recursive top-down tree renderer
   Depends on: config.js (window._db client)
   ============================================================ */

const GEN_NAMES = ['','Leluhur','Anak','Cucu','Cicit','Canggah','Wareng','Udeg-udeg'];

let ALL_MEMBERS = [];

/* ── Load members from Supabase ── */
async function loadMembers() {
  const { data, error } = await window._db
    .from('members')
    .select('*')
    .order('generation', { ascending: true });
  if (error) { console.error('Error loading members:', error); return []; }
  return data || [];
}

/* ── Children of a member (non-inlaw only) ── */
function childrenOf(pid, members) {
  return members.filter(p =>
    (p.father_id === pid || p.mother_id === pid) && !p.is_inlaw
  );
}

/* ── Avatar element ── */
function makeAvaEl(p, size = 54) {
  const el = document.createElement('div');
  el.className = 'node-ava';
  el.style.width  = size + 'px';
  el.style.height = size + 'px';
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

/* ── Single node ── */
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
    const orderEl = document.createElement('div');
    orderEl.className = 'node-order';
    orderEl.textContent = 'Anak ke-' + p.child_order;
    nd.appendChild(orderEl);
  }

  const birth = p.birth_date ? new Date(p.birth_date).getFullYear() : '';
  const death = p.is_deceased && p.death_date ? '- ' + new Date(p.death_date).getFullYear() : '';
  if (birth || death) {
    const yr = document.createElement('div');
    yr.className = 'node-year';
    yr.textContent = birth + (death ? ' ' + death : '');
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

/* ── Line element ── */
function makeLine(cls, extraStyle = '') {
  const el = document.createElement('div');
  el.className = cls;
  if (extraStyle) el.style.cssText += extraStyle;
  return el;
}

/* ══════════════════════════════════════════════════
   BUILD FAMILY BLOCK
   Layout:
   
   [core-node]🤍[spouse-node]
       │   ← garis turun tepat di bawah core-node
   ────┼────────   ← h-bar hanya saat > 1 anak
       │       │
    [anak1] [anak2]

   Kunci: garis vertikal disejajarkan ke KIRI
   yaitu di bawah core-node, bukan tengah couple.
══════════════════════════════════════════════════ */
function buildFamilyBlock(person, drawn, members, onClickFn) {
  if (drawn.has(person.id)) return null;
  drawn.add(person.id);

  // Cari pasangan
  let spouse = person.spouse_id
    ? members.find(m => m.id === person.spouse_id)
    : members.find(m => m.spouse_id === person.id);
  if (spouse && drawn.has(spouse.id)) spouse = null;
  if (spouse) drawn.add(spouse.id);

  // Gather children
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

  const hasChildren = children.length > 0;

  /* ── Outer block: align-items flex-start agar v-conn
     jatuh di bawah node PERTAMA (anggota inti), bukan tengah ── */
  const block = document.createElement('div');
  block.className = 'family-block';
  // align flex-start → children tidak di-center, dimulai dari kiri
  block.style.alignItems = 'flex-start';

  /* ── Couple row ── */
  const coupleRow = document.createElement('div');
  coupleRow.className = 'couple-row';
  coupleRow.style.cssText = 'display:flex;align-items:center;gap:0;';

  const coreNode = makeNode(person, onClickFn);
  coupleRow.appendChild(coreNode);

  if (spouse) {
    const heart = document.createElement('div');
    heart.className = 'heart-sep';
    heart.textContent = '🤍';
    coupleRow.appendChild(heart);
    coupleRow.appendChild(makeNode(spouse, onClickFn));
  }
  block.appendChild(coupleRow);

  if (!hasChildren) return block;

  /* ── Wrapper untuk garis + children ──
     Di-offset ke kanan sejumlah (nodeWidth / 2) = 27px
     agar garis tepat di tengah avatar anggota inti ── */
  const AVA_HALF = 27; // 54px / 2
  const NODE_WIDTH = 80; // min-width node
  // offset = AVA_HALF agar garis turun dari tengah avatar inti
  const lineOffset = AVA_HALF;

  const treeBelow = document.createElement('div');
  treeBelow.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-left: ${lineOffset}px;
  `;

  // Garis vertikal turun dari avatar inti
  const vConn = document.createElement('div');
  vConn.className = 'v-conn';
  treeBelow.appendChild(vConn);

  if (children.length === 1) {
    // Hanya 1 anak — garis lurus ke bawah, tidak perlu h-bar
    const col = document.createElement('div');
    col.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;';
    const childBlock = buildFamilyBlock(children[0], drawn, members, onClickFn);
    if (childBlock) {
      // Offset balik ke kiri supaya avatar anak juga center di garis
      childBlock.style.marginLeft = '-' + lineOffset + 'px';
      col.appendChild(childBlock);
    }
    treeBelow.appendChild(col);
  } else {
    // > 1 anak — buat h-bar lalu drop ke masing-masing
    // Hitung total lebar siblings untuk h-bar
    const spreadWrap = document.createElement('div');
    spreadWrap.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;';

    const siblingsRow = document.createElement('div');
    siblingsRow.className = 'siblings-row';
    siblingsRow.style.cssText = 'display:flex;align-items:flex-start;';

    children.forEach((child, i) => {
      const col = document.createElement('div');
      col.className = 'child-col';
      col.style.cssText = 'display:flex;flex-direction:column;align-items:center;padding:0 12px;';

      const drop = makeLine('child-drop');
      col.appendChild(drop);

      const childBlock = buildFamilyBlock(child, drawn, members, onClickFn);
      if (childBlock) col.appendChild(childBlock);
      siblingsRow.appendChild(col);
    });

    // H-bar: mulai dari garis v-conn (offset 0) ke kanan
    // Lebar = total anak * (nodeWidth + padding*2) / 2
    // Cara mudah: render siblings dulu, lalu h-bar otomatis stretch
    const hBar = document.createElement('div');
    hBar.className = 'h-bar';
    // h-bar harus stretch selebar siblingsRow
    // Gunakan relative wrapper
    const hWrap = document.createElement('div');
    hWrap.style.cssText = 'position:relative;display:flex;align-items:flex-start;flex-direction:column;';

    // Overlay h-bar di atas drop lines menggunakan flex trick:
    // Render siblingsRow dalam relative container, h-bar absolute di atas
    const relWrap = document.createElement('div');
    relWrap.style.cssText = 'position:relative;';

    // h-bar di atas
    const hBarLine = document.createElement('div');
    hBarLine.style.cssText = `
      height: 3px;
      background: var(--ink);
      position: absolute;
      top: 0; left: 0; right: 0;
    `;
    relWrap.appendChild(hBarLine);
    relWrap.appendChild(siblingsRow);
    spreadWrap.appendChild(relWrap);
    treeBelow.appendChild(spreadWrap);
  }

  block.appendChild(treeBelow);
  return block;
}

/* ── Main render ── */
async function renderTree(containerId, onClickFn) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="page-loading"><div class="spinner"></div> Memuat silsilah...</div>';

  ALL_MEMBERS = await loadMembers();
  if (ALL_MEMBERS.length === 0) {
    container.innerHTML = '<div class="page-loading">Belum ada data anggota.</div>';
    return;
  }

  container.innerHTML = '';
  const drawn = new Set();

  // Root = tidak punya ayah/ibu, dan bukan menantu
  const roots = ALL_MEMBERS.filter(p =>
    !p.is_inlaw && !p.father_id && !p.mother_id
  );

  roots.forEach(rp => {
    if (drawn.has(rp.id)) return;
    const block = buildFamilyBlock(rp, drawn, ALL_MEMBERS, onClickFn);
    if (block) container.appendChild(block);
  });
}
