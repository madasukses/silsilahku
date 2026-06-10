/* ============================================================
   SilsilahKu — tree.js  v6
   H-bar pakai CSS pure: tidak ada JS measurement
   ============================================================ */

const GEN_NAMES = ['','Leluhur','Anak','Cucu','Cicit','Canggah','Wareng','Udeg-udeg'];
let ALL_MEMBERS = [];

async function loadMembers() {
  const { data, error } = await window._db
    .from('members').select('*').order('generation', { ascending: true });
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
    img.src = p.avatar_url; img.alt = p.name;
    img.onerror = () => { img.remove(); el.textContent = (p.initials||p.name[0]).toUpperCase(); };
    el.appendChild(img);
  } else {
    el.textContent = (p.initials||p.name[0]).toUpperCase();
  }
  if (p.is_deceased) {
    const rose = document.createElement('div');
    rose.className = 'node-rose'; rose.textContent = '🌹';
    el.appendChild(rose);
  }
  return el;
}

function makeNode(p, onClickFn) {
  const nd = document.createElement('div');
  nd.className = 'node' + (p.is_inlaw?' inlaw':'') + (p.is_deceased?' dec':'');
  nd.dataset.id = p.id;
  nd.appendChild(makeAvaEl(p));

  const nm = document.createElement('div');
  nm.className = 'node-name';
  nm.textContent = p.nickname || p.name.split(' ')[0];
  nd.appendChild(nm);

  if (p.child_order && !p.is_inlaw) {
    const o = document.createElement('div');
    o.className = 'node-order';
    o.textContent = 'Anak ke-' + p.child_order;
    nd.appendChild(o);
  }

  const birth = p.birth_date ? new Date(p.birth_date).getFullYear() : '';
  const death = p.is_deceased && p.death_date ? ' - '+new Date(p.death_date).getFullYear() : '';
  if (birth||death) {
    const yr = document.createElement('div');
    yr.className = 'node-year'; yr.textContent = birth+death;
    nd.appendChild(yr);
  }
  if (p.is_inlaw) {
    const pill = document.createElement('div');
    pill.className = 'inlaw-pill'; pill.textContent = 'menantu';
    nd.appendChild(pill);
  }
  nd.addEventListener('click', () => onClickFn(p));
  return nd;
}

/* ══════════════════════════════════════════════════════════════
   FAMILY BLOCK

   Kunci desain CSS-pure h-bar:
   Setiap child-col lebarnya SAMA = VAR(--cell).
   Avatar selalu di tengah cell = center.
   H-bar menggunakan:
     margin-left:  calc(var(--cell)/2)   ← mulai dari center cell pertama
     margin-right: calc(var(--cell)/2)   ← berakhir di center cell terakhir
   Sehingga selalu tepat tanpa JS measurement.

   Pasangan (menantu) TIDAK menambah lebar cell —
   dia di-overlay ke kanan via absolute/flex tanpa mengubah lebar cell.
══════════════════════════════════════════════════════════════ */

function buildFamilyBlock(person, drawn, members, onClickFn) {
  if (drawn.has(person.id)) return null;
  drawn.add(person.id);

  let spouse = person.spouse_id
    ? members.find(m => m.id === person.spouse_id)
    : members.find(m => m.spouse_id === person.id);
  if (spouse && drawn.has(spouse.id)) spouse = null;
  if (spouse) drawn.add(spouse.id);

  const seenCh = new Set();
  const children = [];
  [person, spouse].filter(Boolean).forEach(p => {
    childrenOf(p.id, members).forEach(c => {
      if (!seenCh.has(c.id) && !drawn.has(c.id)) {
        seenCh.add(c.id); children.push(c);
      }
    });
  });
  children.sort((a,b) => (a.child_order||99)-(b.child_order||99));

  const block = document.createElement('div');
  block.className = 'family-block';

  /* ── Couple row ──
     Wrapper flex dengan lebar = var(--cell).
     Pasangan ditampilkan di luar cell (tidak menambah lebar). */
  const coupleWrap = document.createElement('div');
  coupleWrap.className = 'couple-wrap';

  // Node inti — selalu di tengah cell
  const coreNode = makeNode(person, onClickFn);
  coreNode.className += ' core-node';
  coupleWrap.appendChild(coreNode);

  if (spouse) {
    // Pasangan + garis horizontal di luar cell kanan
    const spouseWrap = document.createElement('div');
    spouseWrap.className = 'spouse-wrap';
    const hLine = document.createElement('div');
    hLine.className = 'couple-hline';
    spouseWrap.appendChild(hLine);
    spouseWrap.appendChild(makeNode(spouse, onClickFn));
    coupleWrap.appendChild(spouseWrap);
  }

  block.appendChild(coupleWrap);

  if (!children.length) return block;

  // Garis vertikal dari bawah cell (bukan dari pasangan)
  const vConn = document.createElement('div');
  vConn.className = 'v-conn';
  block.appendChild(vConn);

  // Children container
  const childrenWrap = document.createElement('div');
  childrenWrap.className = children.length > 1 ? 'children-wrap multi' : 'children-wrap';

  children.forEach(child => {
    const col = document.createElement('div');
    col.className = 'child-col';

    const drop = document.createElement('div');
    drop.className = 'child-drop';
    col.appendChild(drop);

    const childBlock = buildFamilyBlock(child, drawn, members, onClickFn);
    if (childBlock) col.appendChild(childBlock);
    childrenWrap.appendChild(col);
  });

  block.appendChild(childrenWrap);
  return block;
}

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
  ALL_MEMBERS
    .filter(p => !p.is_inlaw && !p.father_id && !p.mother_id)
    .forEach(rp => {
      if (drawn.has(rp.id)) return;
      const block = buildFamilyBlock(rp, drawn, ALL_MEMBERS, onClickFn);
      if (block) container.appendChild(block);
    });
}
