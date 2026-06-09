/* ============================================================
   SilsilahKu — tree.js
   Recursive top-down tree renderer
   Depends on: config.js (supabase client)
   ============================================================ */

const GEN_NAMES = ['','Leluhur','Anak','Cucu','Cicit','Canggah','Wareng','Udeg-udeg'];

let ALL_MEMBERS = [];

/* ── Load all members from Supabase ── */
async function loadMembers() {
  const { data, error } = await _db
    .from('members')
    .select('*')
    .order('generation', { ascending: true });

  if (error) {
    console.error('Error loading members:', error);
    return [];
  }
  return data || [];
}

/* ── Get children of a member ── */
function childrenOf(pid, members) {
  return members.filter(p =>
    (p.father_id === pid || p.mother_id === pid) && !p.is_inlaw
  );
}

/* ── Build avatar element ── */
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

/* ── Build a single node element ── */
function makeNode(p, onClickFn) {
  const nd = document.createElement('div');
  nd.className = 'node' + (p.is_inlaw ? ' inlaw' : '') + (p.is_deceased ? ' dec' : '');
  nd.dataset.id = p.id;

  nd.appendChild(makeAvaEl(p));

  const nameEl = document.createElement('div');
  nameEl.className = 'node-name';
  nameEl.textContent = p.name.split(' ')[0];
  nd.appendChild(nameEl);

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

/* ── Recursively build family block ── */
function buildFamilyBlock(person, drawn, members, onClickFn) {
  if (drawn.has(person.id)) return null;
  drawn.add(person.id);

  const block = document.createElement('div');
  block.className = 'family-block';

  // Couple row
  const coupleRow = document.createElement('div');
  coupleRow.className = 'couple-row';
  coupleRow.appendChild(makeNode(person, onClickFn));

  const spouse = person.spouse_id ? members.find(m => m.id === person.spouse_id) : null;
  if (spouse) {
    drawn.add(spouse.id);
    const heart = document.createElement('div');
    heart.className = 'heart-sep';
    heart.textContent = '🤍';
    coupleRow.appendChild(heart);
    coupleRow.appendChild(makeNode(spouse, onClickFn));
  }
  block.appendChild(coupleRow);

  // Gather children
  const seenChildren = new Set();
  const children = [];
  [person, spouse].filter(Boolean).forEach(p => {
    childrenOf(p.id, members).forEach(c => {
      if (!seenChildren.has(c.id) && !drawn.has(c.id)) {
        seenChildren.add(c.id);
        children.push(c);
      }
    });
  });

  if (children.length === 0) return block;

  // Connector down
  const vConn = document.createElement('div');
  vConn.className = 'v-conn';
  block.appendChild(vConn);

  // H-bar + siblings row
  const spreadWrap = document.createElement('div');
  spreadWrap.style.cssText = 'display:flex;flex-direction:column;align-items:stretch;';

  if (children.length > 1) {
    const hBar = document.createElement('div');
    hBar.className = 'h-bar';
    spreadWrap.appendChild(hBar);
  }

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

  spreadWrap.appendChild(siblingsRow);
  block.appendChild(spreadWrap);
  return block;
}

/* ── Main render function ── */
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

  // Find root ancestors: no father, no mother, not inlaw
  const roots = ALL_MEMBERS.filter(p => !p.is_inlaw && !p.father_id && !p.mother_id);

  roots.forEach(rp => {
    if (drawn.has(rp.id)) return;
    const block = buildFamilyBlock(rp, drawn, ALL_MEMBERS, onClickFn);
    if (block) container.appendChild(block);
  });
}
