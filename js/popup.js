/* ============================================================
   SilsilahKu — popup.js
   Bio popup sheet — klik avatar → muncul dari bawah
   Depends on: config.js, tree.js (ALL_MEMBERS, GEN_NAMES)
   ============================================================ */

function openBio(person) {
  const p = person;
  const overlay = document.getElementById('bioOverlay');
  if (!overlay) return;

  // Avatar
  const avaEl = document.getElementById('bioAva');
  avaEl.className = 'sheet-ava' + (p.is_inlaw ? ' inlaw' : '');
  if (p.avatar_url) {
    avaEl.innerHTML = `<img src="${p.avatar_url}" alt="${p.name}">`;
  } else {
    avaEl.innerHTML = (p.initials || p.name[0]).toUpperCase();
  }
  if (p.is_deceased) {
    avaEl.innerHTML += '<span class="ava-rose">🌹</span>';
  }

  // Name & meta
  document.getElementById('bioName').textContent = p.name;
  const birth = p.birth_date ? new Date(p.birth_date).getFullYear() : '';
  const death = p.is_deceased && p.death_date ? ' · † ' + new Date(p.death_date).getFullYear() : '';
  const city = p.birth_city || '';
  document.getElementById('bioMeta').innerHTML =
    (birth ? 'b. ' + birth : '') + death + (city ? ' · ' + city : '');

  // Tags
  const genLabel = GEN_NAMES[p.generation] || '';
  document.getElementById('bioTags').innerHTML = `
    <span class="stag">Generasi ${p.generation} — ${genLabel}</span>
    ${p.is_inlaw ? '<span class="stag inl">Menantu</span>' : ''}
    ${p.is_deceased ? '<span class="stag rose">🌹 Almarhum</span>' : ''}
  `;

  // Ancestry trail: climb via father_id
  const trail = [];
  let cur = p;
  let limit = 0;
  while ((cur.father_id || cur.mother_id) && limit < 10) {
    const parent = ALL_MEMBERS.find(m => m.id === cur.father_id)
                || ALL_MEMBERS.find(m => m.id === cur.mother_id);
    if (!parent) break;
    trail.unshift(parent);
    cur = parent;
    limit++;
  }
  const ancEl = document.getElementById('bioAncestry');
  if (trail.length === 0) {
    ancEl.innerHTML = '<span style="font-size:12px;color:var(--muted);">Leluhur utama keluarga.</span>';
  } else {
    ancEl.innerHTML = trail.map(a =>
      `<div class="anc-chip" onclick="openBio(ALL_MEMBERS.find(m=>m.id==='${a.id}'))">
        <div class="anc-av">${(a.initials || a.name[0]).toUpperCase()}</div>
        ${a.name.split(' ')[0]}
      </div><span class="anc-arr">›</span>`
    ).join('') +
    `<div class="anc-chip" style="background:var(--sepia);color:var(--ink);">
      <div class="anc-av" style="background:var(--ink);color:var(--sepia);">
        ${(p.initials || p.name[0]).toUpperCase()}
      </div>
      ${p.name.split(' ')[0]}
    </div>`;
  }

  // Bio rows
  const father = p.father_id ? ALL_MEMBERS.find(m => m.id === p.father_id) : null;
  const mother = p.mother_id ? ALL_MEMBERS.find(m => m.id === p.mother_id) : null;
  const spouse = p.spouse_id ? ALL_MEMBERS.find(m => m.id === p.spouse_id) : null;
  const birthFull = p.birth_date
    ? new Date(p.birth_date).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})
    : '—';
  const deathFull = p.is_deceased && p.death_date
    ? new Date(p.death_date).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'})
    : null;

  const rows = [
    ['Ayah',         father ? father.name : '—'],
    ['Ibu',          mother ? mother.name : '—'],
    ['Pasangan',     spouse ? spouse.name : '—'],
    ['Tanggal Lahir', birthFull],
    ['Kota Lahir',   p.birth_city || '—'],
    ['Pekerjaan',    p.job || '—'],
    ['Alamat',       p.address || '—'],
    deathFull ? ['Tanggal Wafat', deathFull] : null,
    ['Keluarga',     p.family_id ? 'Keluarga Soehardjo' : '(Dari luar keluarga)'],
    ['Status',       p.is_deceased
      ? '<span style="color:var(--rose)">Almarhum/Almarhumah</span>'
      : '<span style="color:var(--green)">Masih hidup</span>'],
  ].filter(Boolean);

  document.getElementById('bioBio').innerHTML = rows.map(([l, v]) =>
    `<div class="bio-row"><span class="rl">${l}</span><span class="rv">${v}</span></div>`
  ).join('');

  // Relatives
  const rels = [];
  if (father) rels.push({ p: father, role: 'Ayah' });
  if (mother) rels.push({ p: mother, role: 'Ibu' });
  if (spouse) rels.push({ p: spouse, role: 'Pasangan' });
  ALL_MEMBERS.filter(m =>
    (m.father_id === p.id || m.mother_id === p.id) && !m.is_inlaw
  ).forEach(c => rels.push({ p: c, role: 'Anak' }));

  document.getElementById('bioRels').innerHTML = rels.slice(0, 8).map(({ p: r, role }) => {
    const ini = (r.initials || r.name[0]).toUpperCase();
    const avaContent = r.avatar_url
      ? `<img src="${r.avatar_url}" alt="${r.name}">`
      : ini;
    return `<div class="rel-card" onclick="openBio(ALL_MEMBERS.find(m=>m.id==='${r.id}'))">
      <div class="rel-av${r.is_inlaw ? ' dsh' : ''}">
        ${avaContent}
        ${r.is_deceased ? '<span style="position:absolute;bottom:-1px;right:-1px;font-size:10px;">🌹</span>' : ''}
      </div>
      <div class="rel-name">${r.name.split(' ')[0]}</div>
      <div class="rel-role">${role}</div>
    </div>`;
  }).join('');

  // Show/hide edit button (only in admin context)
  const editBtn = document.getElementById('bioEditBtn');
  if (editBtn) {
    editBtn.dataset.id = p.id;
    const isAdmin = document.body.dataset.admin === 'true';
    editBtn.style.display = isAdmin ? '' : 'none';
  }

  overlay.classList.add('open');
}

function closeBio(e) {
  const overlay = document.getElementById('bioOverlay');
  if (!e || e.target === overlay) {
    overlay.classList.remove('open');
  }
}

/* Init popup close handlers */
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('bioOverlay');
  if (overlay) {
    overlay.addEventListener('click', closeBio);
  }
  const closeBtn = document.getElementById('bioClose');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => closeBio());
  }
});
