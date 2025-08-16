// server.js
// ShadowMC site (Red/Red) with bilingual UI, roles, staff apply, and admin login
// Persistence: saves applications to ./data/applications.json

const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- SIMPLE STORAGE (JSON FILE) ----------
const DATA_DIR = path.join(__dirname, 'data');
const APPS_FILE = path.join(DATA_DIR, 'applications.json');

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(APPS_FILE)) fs.writeFileSync(APPS_FILE, '[]', 'utf8');
}
function readApplications() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(APPS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (e) {
    return [];
  }
}
function writeApplications(list) {
  ensureStorage();
  fs.writeFileSync(APPS_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// ---------- USERS (CHANGE THESE!) ----------
const USERS = [
  // role can be 'owner' or 'staff'
  { username: 'owner', password: 'owner123', role: 'owner' },
  { username: 'staff', password: 'staff123', role: 'staff' },
];

// ---------- MIDDLEWARE ----------
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: 'shadowmc-secret-change-me',
    resave: false,
    saveUninitialized: false,
  })
);

// ---------- SMALL HELPERS ----------
function isAuthed(req) {
  return req.session && req.session.user;
}
function requireAuth(req, res, next) {
  if (!isAuthed(req)) return res.redirect('/admin');
  next();
}
function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

// ---------- ROUTES ----------

// Home (index)
app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderIndex());
});

// Handle Staff Apply form (persist to JSON)
app.post('/apply', (req, res) => {
  const now = new Date().toISOString();
  const appEntry = {
    id: 'app_' + Date.now(),
    createdAt: now,
    // Fields
    name: req.body.name || '',
    discord: req.body.discord || '',
    age: req.body.age || '',
    country: req.body.country || '',
    activity: req.body.activity || '',
    experience: req.body.experience || '',
    servers: req.body.servers || '',
    why: req.body.why || '',
  };

  const apps = readApplications();
  apps.push(appEntry);
  writeApplications(apps);

  res.redirect('/applied');
});

// Simple "Thank you" page after applying
app.get('/applied', (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderApplied());
});

// Admin login page
app.get('/admin', (req, res) => {
  if (isAuthed(req)) return res.redirect('/dashboard');
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(renderLogin());
});

// Admin login submit
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = USERS.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.send(renderLogin('Invalid credentials'));
  }
  req.session.user = { username: user.username, role: user.role };
  res.redirect('/dashboard');
});

// Admin logout
app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin'));
});

// Dashboard (protected)
app.get('/dashboard', requireAuth, (req, res) => {
  res.set('Content-Type', 'text/html; charset=utf-8');
  const apps = readApplications();
  res.send(renderDashboard(req.session.user, apps));
});

// API to download JSON (protected)
app.get('/admin/download', requireAuth, (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="applications.json"');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(readApplications(), null, 2));
});

// ---------- SERVER ----------
app.listen(PORT, () => {
  console.log(`ShadowMC running: http://localhost:${PORT}`);
});

// ---------- HTML RENDERERS ----------

function renderIndex() {
  // Static roles data in both languages (prices show inside modal only)
  const rolesEn = [
    { id: 'vip', name: 'VIP', price: '5,000 Credit', perks: ['VIP kit', 'Money'] },
    { id: 'vip+', name: 'VIP+', price: '20,000 Credit', perks: ['VIP+ kit', 'Money'] },
    { id: 'mvp', name: 'MVP', price: '40,000 Credit', perks: ['MVP kit', 'Money'] },
    { id: 'legend', name: 'Legend', price: '70,000 Credit', perks: ['Legend kit', 'Money'] },
  ];
  const rolesAr = [
    { id: 'vip', name: 'VIP', price: '٥٬٠٠٠ رصيد', perks: ['طقم VIP', 'أموال'] },
    { id: 'vip+', name: 'VIP+', price: '٢٠٬٠٠٠ رصيد', perks: ['طقم VIP+', 'أموال'] },
    { id: 'mvp', name: 'MVP', price: '٤٠٬٠٠٠ رصيد', perks: ['طقم MVP', 'أموال'] },
    { id: 'legend', name: 'Legend', price: '٧٠٬٠٠٠ رصيد', perks: ['طقم Legend', 'أموال'] },
  ];

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ShadowMC</title>
<style>
  :root{
    --bg:#2a0006; --panel:#4a000b; --card:#5b000d;
    --accent:#ff1f3d; --accent-2:#ff5a6f;
    --text:#fff; --muted:rgba(255,255,255,.85);
    --shadow:0 18px 50px rgba(0,0,0,.55); --radius:16px;
  }
  *{box-sizing:border-box}
  html,body{height:100%}
  body{
    margin:0; font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;
    background:linear-gradient(180deg,var(--bg),#1d0004); color:var(--text);
  }
  .wrap{width:min(1120px,92%);margin:24px auto}
  header{
    background:linear-gradient(90deg,var(--accent),#8b0016);
    border-radius:var(--radius); padding:22px 16px; text-align:center; box-shadow:var(--shadow);
  }
  .brand{font-weight:900;letter-spacing:.6px;font-size:clamp(24px,4vw,38px);margin:0}
  .meta{margin:6px 0 0;opacity:.95}
  .top-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}
  .btn{
    appearance:none;border:none;cursor:pointer;text-decoration:none;color:#fff;background:var(--accent);
    padding:10px 14px;border-radius:12px;font-weight:800;box-shadow:var(--shadow);display:inline-flex;align-items:center;gap:8px
  }
  .btn:hover{background:var(--accent-2);transform:translateY(-1px)}
  .btn.outline{background:transparent;border:2px solid rgba(255,255,255,.15)}
  main{margin-top:22px;display:grid;gap:22px}
  .section{background:var(--panel);border-radius:var(--radius);padding:18px;box-shadow:var(--shadow)}
  .section-title{margin:0 0 12px;color:var(--accent-2);font-size:clamp(18px,2.6vw,26px)}
  .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
  .card{background:var(--card);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px;cursor:pointer}
  .card:hover{outline:2px solid var(--accent);transform:translateY(-2px)}
  .card h3{margin:0 0 8px}
  .card p{margin:0;color:var(--muted)}
  .note{background:rgba(255,31,61,.09);border:1px dashed rgba(255,255,255,.2);padding:12px;border-radius:10px}
  footer{margin-top:22px;text-align:center;color:var(--muted)}

  /* Modal */
  .modal{position:fixed;inset:0;background:rgba(0,0,0,.6);display:none;align-items:center;justify-content:center;z-index:40}
  .modal.open{display:flex}
  .modal-card{width:min(720px,92%);background:var(--panel);border-radius:16px;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.08)}
  .modal-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:linear-gradient(90deg,var(--accent),#8b0016);border-top-left-radius:16px;border-top-right-radius:16px}
  .modal-title{font-weight:900}
  .modal-body{padding:16px}
  .modal-close{background:transparent;border:none;color:#fff;font-size:22px;cursor:pointer}

  form.apply{display:grid;gap:12px;margin-top:12px}
  .field{display:grid;gap:6px}
  label{font-weight:700}
  input,textarea{
    padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);
    background:#2a0006;color:#fff
  }
  textarea{min-height:96px;resize:vertical}
</style>
</head>
<body>
  <div class="wrap">
    <header>
      <h1 id="t-title" class="brand">ShadowMC</h1>
      <p id="t-meta" class="meta">Website Maker: Dracos • Web Developers: Dracos</p>
      <div class="top-actions">
        <button id="langBtn" class="btn outline" type="button">العربية</button>
        <a id="btnDiscord" class="btn" href="https://discord.gg/NB4U4ENWDC" target="_blank" rel="noopener">Join Discord</a>
        <a class="btn outline" href="/admin">Admin</a>
      </div>
    </header>

    <!-- ROLES -->
    <section class="section">
      <h2 id="t-roles" class="section-title">ROLES</h2>
      <div class="cards" id="roles"></div>
    </section>

    <!-- STAFF APPLY -->
    <section class="section">
      <h2 id="t-apply" class="section-title">STAFF APPLY</h2>
      <div class="note" id="t-warnings">
        <div>⚠️ DO NOT APPLY WHEN IT'S CLOSED</div>
        <div>✅ CHECK OUR DISCORD BEFORE APPLYING</div>
      </div>

      <form class="apply" method="post" action="/apply" autocomplete="off">
        <div class="field">
          <label id="l1" for="name">Your name</label>
          <input id="name" name="name" required />
        </div>
        <div class="field">
          <label id="lHash" for="discord">Your discord username</label>
          <input id="discord" name="discord" placeholder="Example: user#1234" required />
        </div>
        <div class="field">
          <label id="l2" for="age">Your age</label>
          <input id="age" name="age" type="number" min="10" max="120" required />
        </div>
        <div class="field">
          <label id="l3" for="country">Your country</label>
          <input id="country" name="country" required />
        </div>
        <div class="field">
          <label id="l4" for="activity">Your activity</label>
          <input id="activity" name="activity" required />
        </div>
        <div class="field">
          <label id="l5" for="experience">Your experience</label>
          <textarea id="experience" name="experience" required></textarea>
        </div>
        <div class="field">
          <label id="l6" for="servers">What servers did you worked in?</label>
          <textarea id="servers" name="servers" required></textarea>
        </div>
        <div class="field">
          <label id="l7" for="why">Why did you choose us?</label>
          <textarea id="why" name="why" required></textarea>
        </div>
        <div class="top-actions">
          <button class="btn" type="submit" id="submitBtn">Submit</button>
        </div>
      </form>
    </section>

    <footer>
      <small id="t-footer">© ShadowMC • Crafted with ❤️ by Dracos</small>
    </footer>
  </div>

  <!-- Role Details Modal -->
  <div class="modal" id="roleModal" aria-hidden="true" role="dialog" aria-label="Role Details">
    <div class="modal-card">
      <div class="modal-head">
        <div class="modal-title" id="m-title">Role</div>
        <button class="modal-close" id="m-close" aria-label="Close">✕</button>
      </div>
      <div class="modal-body">
        <p id="m-price" style="font-weight:900"></p>
        <div>
          <strong id="m-perks-title">Perks</strong>
          <ul id="m-perks" style="margin:10px 0 0 18px"></ul>
        </div>
      </div>
    </div>
  </div>

<script>
  // ===== Roles data in both languages =====
  const ROLES = {
    en: [
      {id:'vip',   name:'VIP',    price:'5,000 Credit',  perks:['VIP kit','Money']},
      {id:'vip+',  name:'VIP+',   price:'20,000 Credit', perks:['VIP+ kit','Money']},
      {id:'mvp',   name:'MVP',    price:'40,000 Credit', perks:['MVP kit','Money']},
      {id:'legend',name:'Legend', price:'70,000 Credit', perks:['Legend kit','Money']},
    ],
    ar: [
      {id:'vip',   name:'VIP',    price:'٥٬٠٠٠ رصيد',  perks:['طقم VIP','أموال']},
      {id:'vip+',  name:'VIP+',   price:'٢٠٬٠٠٠ رصيد', perks:['طقم VIP+','أموال']},
      {id:'mvp',   name:'MVP',    price:'٤٠٬٠٠٠ رصيد', perks:['طقم MVP','أموال']},
      {id:'legend',name:'Legend', price:'٧٠٬٠٠٠ رصيد', perks:['طقم Legend','أموال']},
    ]
  };

  // ===== UI Strings =====
  const I18N = {
    en: {
      title:'ShadowMC',
      meta:'Website Maker: Dracos • Web Developers: Dracos',
      join:'Join Discord',
      roles:'ROLES',
      apply:'STAFF APPLY',
      warnings:["⚠️ DO NOT APPLY WHEN IT'S CLOSED","✅ CHECK OUR DISCORD BEFORE APPLYING"],
      footer:'© ShadowMC • Crafted with ❤️ by Dracos',
      lang:'العربية',
      labels:['Your name','Your discord username','Your age','Your country','Your activity','Your experience','What servers did you worked in?','Why did you choose us?'],
      submit:'Submit',
      rolePerks:'Perks',
      click:'Click for details'
    },
    ar: {
      title:'شادو إم سي',
      meta:'صانع الويب: دراكس • مطورو الويب: دراكس',
      join:'انضم إلى ديسكورد',
      roles:'الأدوار',
      apply:'تقديم للموظفين',
      warnings:['⚠️ لا تقدّم عندما يكون مغلقًا','✅ تحقّق من ديسكورد قبل التقديم'],
      footer:'© شادو إم سي • صُمِّم بحب بواسطة دراكس',
      lang:'English',
      labels:['اسمك','اسمك في ديسكورد','عمرك','بلدك','نشاطك','خبرتك','في أي خوادم عملت؟','لماذا اخترتنا؟'],
      submit:'إرسال',
      rolePerks:'المزايا',
      click:'اضغط للتفاصيل'
    }
  };

  let currentLang = localStorage.getItem('shadow_lang') || 'en';

  // Elements
  const tTitle=document.getElementById('t-title');
  const tMeta=document.getElementById('t-meta');
  const tRoles=document.getElementById('t-roles');
  const tApply=document.getElementById('t-apply');
  const tFooter=document.getElementById('t-footer');
  const btnDiscord=document.getElementById('btnDiscord');
  const langBtn=document.getElementById('langBtn');
  const rolesWrap=document.getElementById('roles');

  const labelsEls = [
    document.getElementById('l1'),
    document.getElementById('lHash'),
    document.getElementById('l2'),
    document.getElementById('l3'),
    document.getElementById('l4'),
    document.getElementById('l5'),
    document.getElementById('l6'),
    document.getElementById('l7'),
  ];
  const submitBtn=document.getElementById('submitBtn');

  // Modal elements
  const modal=document.getElementById('roleModal');
  const mTitle=document.getElementById('m-title');
  const mPrice=document.getElementById('m-price');
  const mPerksTitle=document.getElementById('m-perks-title');
  const mPerks=document.getElementById('m-perks');
  const mClose=document.getElementById('m-close');

  function renderLang(){
    const T = I18N[currentLang];
    const R = ROLES[currentLang];
    document.documentElement.lang = currentLang;
    document.documentElement.dir = (currentLang==='ar')?'rtl':'ltr';

    tTitle.textContent  = T.title;
    tMeta.textContent   = T.meta;
    tRoles.textContent  = T.roles;
    tApply.textContent  = T.apply;
    tFooter.textContent = T.footer;
    btnDiscord.textContent = T.join;
    langBtn.textContent = T.lang;

    // warnings
    const w = document.getElementById('t-warnings');
    w.innerHTML = '<div>'+T.warnings[0]+'</div><div>'+T.warnings[1]+'</div>';

    // form labels
    labelsEls.forEach((el,i)=> el.textContent = T.labels[i]);
    submitBtn.textContent = T.submit;

    // roles cards (no price on card)
    rolesWrap.innerHTML = R.map(role => (
      '<article class="card" data-id="'+role.id+'" data-name="'+role.name+'" data-price="'+role.price+'" data-perks=\''+JSON.stringify(role.perks)+'\'>' +
        '<h3>'+role.name+'</h3>' +
        '<p>'+T.click+'</p>' +
      '</article>'
    )).join('');
  }

  langBtn.addEventListener('click', ()=>{
    currentLang = (currentLang==='en')?'ar':'en';
    localStorage.setItem('shadow_lang', currentLang);
    renderLang();
  });

  // Open modal for role
  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    const T = I18N[currentLang];
    mTitle.textContent = card.getAttribute('data-name');
    mPrice.textContent = card.getAttribute('data-price');
    mPerksTitle.textContent = T.rolePerks;
    let perks=[];
    try{ perks = JSON.parse(card.getAttribute('data-perks')) || []; }catch(_){}
    mPerks.innerHTML = perks.map(p => '<li>'+p+'</li>').join('');
    modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
  });
  mClose.addEventListener('click', ()=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); });
  modal.addEventListener('click', (e)=>{ if(e.target===modal) mClose.click(); });

  renderLang();
</script>
</body>
</html>`;
}

function renderApplied() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ShadowMC — Applied</title>
<style>
  :root{--bg:#2a0006;--panel:#4a000b;--accent:#ff1f3d;--text:#fff}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(180deg,var(--bg),#1d0004);color:var(--text)}
  .wrap{max-width:700px;margin:12vh auto;padding:0 16px;text-align:center}
  .card{background:var(--panel);padding:24px;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55)}
  a{color:#fff;text-decoration:none;padding:.6rem 1rem;border:2px solid rgba(255,255,255,.15);border-radius:10px;display:inline-block;margin-top:16px}
  a:hover{background:rgba(255,255,255,.06)}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>Thank you!</h1>
      <p>Your application has been submitted.</p>
      <a href="/">← Back to ShadowMC</a>
    </div>
  </div>
</body>
</html>`;
}

function renderLogin(errorMsg = '') {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ShadowMC — Admin Login</title>
<style>
  :root{--bg:#2a0006;--panel:#4a000b;--accent:#ff1f3d;--text:#fff}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(180deg,var(--bg),#1d0004);color:var(--text)}
  .wrap{max-width:420px;margin:12vh auto;padding:0 16px}
  .card{background:var(--panel);padding:20px;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55)}
  label{font-weight:700}
  input{width:100%;margin-top:6px;margin-bottom:12px;padding:10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:#2a0006;color:#fff}
  button{appearance:none;border:none;background:var(--accent);color:#fff;font-weight:800;border-radius:10px;padding:10px 14px;cursor:pointer}
  .err{background:#681218;padding:10px;border-radius:10px;margin-bottom:12px}
  .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}
  a{color:#fff;text-decoration:none}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="top">
        <h2 style="margin:0">Admin Login</h2>
        <a href="/">← Back</a>
      </div>
      ${errorMsg ? `<div class="err">${escapeHtml(errorMsg)}</div>` : ''}
      <form method="post" action="/admin/login" autocomplete="off">
        <label>Username</label>
        <input name="username" required />
        <label>Password</label>
        <input name="password" type="password" required />
        <button type="submit">Login</button>
      </form>
      <p style="opacity:.8;margin-top:12px">Demo: owner/owner123 or staff/staff123</p>
    </div>
  </div>
</body>
</html>`;
}

function renderDashboard(user, apps) {
  const rows = apps
    .slice()
    .reverse()
    .map(a => {
      return `<tr>
        <td>${escapeHtml(a.createdAt)}</td>
        <td>${escapeHtml(a.name)}</td>
        <td>${escapeHtml(a.discord)}</td>
        <td>${escapeHtml(String(a.age))}</td>
        <td>${escapeHtml(a.country)}</td>
        <td>${escapeHtml(a.activity)}</td>
        <td>${escapeHtml(a.experience)}</td>
        <td>${escapeHtml(a.servers)}</td>
        <td>${escapeHtml(a.why)}</td>
      </tr>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>ShadowMC — Dashboard</title>
<style>
  :root{--bg:#2a0006;--panel:#4a000b;--card:#5b000d;--accent:#ff1f3d;--text:#fff}
  body{margin:0;font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(180deg,var(--bg),#1d0004);color:var(--text)}
  .wrap{width:min(1200px,94%);margin:20px auto}
  .top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
  .badge{padding:6px 10px;border-radius:999px;background:#7a1220}
  .card{background:var(--panel);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55);padding:14px}
  table{width:100%;border-collapse:collapse}
  th, td{border-bottom:1px solid rgba(255,255,255,.08);padding:8px 10px;vertical-align:top}
  th{background:#5b000d;position:sticky;top:0}
  a,button{color:#fff;text-decoration:none;appearance:none;border:none;background:transparent;cursor:pointer}
  .btn{background:var(--accent);padding:8px 12px;border-radius:10px}
  .btn.outline{border:2px solid rgba(255,255,255,.15);background:transparent}
  .actions{display:flex;gap:8px;align-items:center}
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <h2 style="margin:0">Applications Dashboard</h2>
      <div class="actions">
        <span class="badge">${escapeHtml(user.username)} • ${escapeHtml(user.role)}</span>
        <a class="btn outline" href="/">Home</a>
        <a class="btn" href="/admin/download">Download JSON</a>
        <form method="post" action="/admin/logout" style="display:inline"><button class="btn" type="submit">Logout</button></form>
      </div>
    </div>

    <div class="card" style="overflow:auto;max-height:75vh">
      <table>
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Name</th>
            <th>Discord</th>
            <th>Age</th>
            <th>Country</th>
            <th>Activity</th>
            <th>Experience</th>
            <th>Servers worked in</th>
            <th>Why us</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="9" style="opacity:.8">No applications yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}
