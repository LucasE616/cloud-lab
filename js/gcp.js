/* Cloud Lab — Console Google Cloud simulado (Compute Engine, VPC, Cloud Storage, IAM) */
'use strict';

const GCP = (() => {
  const { esc, ICON } = UI;
  const MY_IP = '203.0.113.25';
  const ME = 'aluno@example.com';

  const REGIONS = [
    { id: 'us-central1', name: 'Iowa', zones: ['a', 'b', 'c', 'f'], free: true },
    { id: 'us-east1', name: 'South Carolina', zones: ['b', 'c', 'd'], free: true },
    { id: 'us-west1', name: 'Oregon', zones: ['a', 'b', 'c'], free: true },
    { id: 'southamerica-east1', name: 'São Paulo', zones: ['a', 'b', 'c'] },
    { id: 'europe-west1', name: 'Belgium', zones: ['b', 'c', 'd'] },
  ];
  const MACHINES = [
    { id: 'e2-micro', vcpu: '2 vCPU (1 shared core)', mem: 1, price: 6.11 },
    { id: 'e2-small', vcpu: '2 vCPU (1 shared core)', mem: 2, price: 12.23 },
    { id: 'e2-medium', vcpu: '2 vCPU (1 shared core)', mem: 4, price: 24.46 },
    { id: 'e2-standard-2', vcpu: '2 vCPU (1 core)', mem: 8, price: 48.92 },
    { id: 'n2-standard-2', vcpu: '2 vCPU (1 core)', mem: 8, price: 56.71 },
    { id: 'n1-standard-1', vcpu: '1 vCPU', mem: 3.75, price: 24.27 },
  ];
  const IMAGES = [
    { id: 'debian-12', name: 'Debian GNU/Linux 12 (bookworm)', family: 'debian-12', project: 'debian-cloud', distro: 'debian' },
    { id: 'ubuntu-2204', name: 'Ubuntu 22.04 LTS', family: 'ubuntu-2204-lts', project: 'ubuntu-os-cloud', distro: 'ubuntu22' },
    { id: 'centos-9', name: 'CentOS Stream 9', family: 'centos-stream-9', project: 'centos-cloud', distro: 'centos' },
    { id: 'rhel-9', name: 'Red Hat Enterprise Linux 9', family: 'rhel-9', project: 'rhel-cloud', distro: 'rhel' },
    { id: 'windows-2022', name: 'Windows Server 2022 Datacenter', family: 'windows-2022', project: 'windows-cloud', distro: 'windows' },
  ];
  const ROLES = [
    ['Basic', ['Owner', 'Editor', 'Viewer']],
    ['Compute Engine', ['Compute Admin', 'Compute Instance Admin (v1)', 'Compute Viewer']],
    ['Cloud Storage', ['Storage Admin', 'Storage Object Admin', 'Storage Object Creator', 'Storage Object Viewer']],
    ['IAM', ['Security Reviewer', 'Service Account User']],
  ];
  const TAKEN = ['test', 'teste', 'backup', 'bucket', 'meu-bucket', 'my-bucket', 'images', 'data', 'dados', 'logs', 'files', 'www', 'site', 'assets', 'static'];

  const pnum = () => String(UI.int(100000000000, 999999999999));
  function newProject(name, id) {
    return { id, name, number: pnum(), created: Date.now(), apis: { compute: false, storage: true }, instances: [], buckets: [], firewall: [], iam: [{ principal: 'user:' + ME, roles: ['Owner'] }], serviceAccounts: [] };
  }
  Store.register('gcp', () => {
    const p = newProject('My First Project', `my-first-project-${UI.int(100000, 999999)}`);
    return { current: p.id, projects: [p], ops: [] };
  });

  let root, frame, mh, th;
  const v = { area: 'home', page: null, id: null, sel: [], form: false, tab: null, data: {}, menu: null, flash: null };
  const S = () => Store.s.gcp;
  const P = () => S().projects.find(p => p.id === S().current) || S().projects[0];
  const machineOf = id => MACHINES.find(m => m.id === id) || MACHINES[0];
  const imageOf = id => IMAGES.find(i => i.id === id) || IMAGES[0];

  // ---------- componentes (Material) ----------
  const btn = (label, act, o = {}) => `<button class="mbtn ${o.primary ? 'filled' : ''} ${o.text ? 'text' : ''} ${o.danger ? 'danger' : ''} ${o.cls || ''}" data-act="${act}" ${o.data || ''} ${o.disabled ? 'disabled' : ''}>${label}</button>`;
  const abtn = (label, act, o = {}) => `<button class="abtn ${o.danger ? 'danger' : ''}" data-act="${act}" ${o.data || ''} ${o.disabled ? 'disabled' : ''}>${label}</button>`;
  const link = (label, act, data = '') => `<a class="lnk" data-act="${act}" ${data}>${label}</a>`;
  const field = (label, inner, help = '', err = '') => `<div class="mfield ${err ? 'has-err' : ''}"><label>${label}</label>${inner}${err ? `<p class="ferr">${err}</p>` : help ? `<p class="help">${help}</p>` : ''}</div>`;
  const card = (title, inner, extra = '') => `<section class="card ${extra}">${title ? `<h3>${title}</h3>` : ''}${inner}</section>`;
  const kv = pairs => `<table class="kvt">${pairs.map(([k, x]) => `<tr><th>${k}</th><td>${x === '' || x == null ? '—' : x}</td></tr>`).join('')}</table>`;
  const note = (kind, html) => `<div class="mnote ${kind}">${ICON[kind === 'error' ? 'err' : kind === 'warning' ? 'warn' : 'info']}<div>${html}</div></div>`;
  const toast = (html, kind = 'success') => UI.toast(th, html, kind);
  const closeModal = () => { mh.innerHTML = ''; };
  const modal = (title, body, footer, cls = '') => UI.modal(mh, `<div class="m-h"><h3>${title}</h3></div><div class="m-b">${body}</div><div class="m-f">${footer}</div>`, cls);
  const side = (title, body, footer) => UI.modal(mh, `<div class="m-h"><h3>${title}</h3><button class="x" data-act="closeModal">${ICON.close}</button></div><div class="m-b">${body}</div><div class="m-f">${footer}</div>`, 'panel-r');
  const flash = (kind, html) => { v.flash = { kind, html, fresh: true }; };

  function status(st) {
    if (st === 'RUNNING') return `<span class="vst ok" title="Running">${ICON.ok}</span>`;
    if (st === 'TERMINATED') return `<span class="vst off" title="Stopped (TERMINATED)">${ICON.stop}</span>`;
    return `<span class="vst busy" title="${st}">${ICON.pending}</span>`;
  }
  const statusText = st => ({ RUNNING: 'Running', TERMINATED: 'Stopped', PROVISIONING: 'Provisioning', STAGING: 'Staging', STOPPING: 'Stopping' }[st] || st);

  function op(text) {
    const o = { id: UI.rand(8), text, at: Date.now(), done: false };
    S().ops.unshift(o);
    S().ops = S().ops.slice(0, 12);
    Store.queue(o, [[2500, { done: true }]]);
  }

  function go(area, page = null, id = null, extra = {}) {
    if (v.flash && !v.flash.fresh) v.flash = null;
    Object.assign(v, { area, page, id, sel: [], form: false, tab: null, data: {}, menu: null }, extra);
    render();
  }

  // ---------- estrutura ----------
  const PRODUCTS = [
    ['home', null, 'Cloud overview', '#5f6368'],
    ['compute', 'instances', 'Compute Engine', '#4285f4'],
    ['storage', 'buckets', 'Cloud Storage', '#4285f4'],
    ['vpc', 'networks', 'VPC network', '#4285f4'],
    ['iam', 'iam', 'IAM & Admin', '#4285f4'],
    ['apis', 'apis', 'APIs & Services', '#4285f4'],
    ['billing', 'billing', 'Billing', '#4285f4'],
    [null, null, 'Kubernetes Engine', '#9aa0a6'], [null, null, 'Cloud Run', '#9aa0a6'], [null, null, 'BigQuery', '#9aa0a6'], [null, null, 'Cloud SQL', '#9aa0a6'],
  ];
  const NAVS = {
    compute: ['Compute Engine', [['instances', 'VM instances'], [null, 'Instance templates'], [null, 'Instance groups'], [null, 'Disks'], [null, 'Snapshots'], [null, 'Images'], [null, 'Machine images']]],
    storage: ['Cloud Storage', [['buckets', 'Buckets'], [null, 'Monitoring'], [null, 'Settings']]],
    vpc: ['VPC network', [['networks', 'VPC networks'], [null, 'IP addresses'], ['firewall', 'Firewall'], [null, 'Routes']]],
    iam: ['IAM & Admin', [['iam', 'IAM'], [null, 'Policy Analyzer'], [null, 'Organization Policies'], ['sa', 'Service Accounts'], [null, 'Roles'], [null, 'Audit Logs']]],
    apis: ['APIs & Services', [['apis', 'Enabled APIs & services'], ['library', 'Library'], [null, 'Credentials']]],
  };
  const PARENT = { create: 'instances', instance: 'instances', createBucket: 'buckets', bucket: 'buckets', createFw: 'firewall', enable: 'instances' };

  function header() {
    const busy = S().ops.filter(o => !o.done).length;
    return `<header class="gtop">
      <button class="gic" data-act="menu" data-id="nav" title="Navigation menu">${ICON.menu}</button>
      <a class="glogo" data-act="home"><span class="gcloud-mark"><i></i><i></i><i></i></span><b>Google</b> Cloud</a>
      <button class="proj" data-act="projPicker"><span class="dots"></span>${esc(P().name)} ${ICON.caret}</button>
      <div class="gsearch">${ICON.search}<input id="gcp-q" placeholder="Search (/) for resources, docs, products, and more" data-enter="search"><button data-act="searchBtn">Search</button></div>
      <div class="gright">
        <button class="gic" data-act="cloudshell" title="Activate Cloud Shell">${ICON.terminal}</button>
        <div class="dd ${v.menu === 'ops' ? 'open' : ''}"><button class="gic ${busy ? 'badge' : ''}" data-act="menu" data-id="ops" title="Notifications">${ICON.bell}${busy ? `<em>${busy}</em>` : ''}</button>
          ${v.menu === 'ops' ? `<div class="dd-menu right ops"><h4>Notifications</h4>${S().ops.length ? S().ops.map(o => `<div class="opr">${o.done ? `<span class="ok">${ICON.ok}</span>` : ICON.pending}<div><b>${esc(o.text)}</b><small>${o.done ? 'Completed' : 'In progress'} · ${UI.date(o.at)}</small></div></div>`).join('') : '<p class="help">No notifications</p>'}</div>` : ''}</div>
        <button class="gic" data-act="noop" title="Help">${ICON.help}</button>
        <button class="gav" data-act="noop" title="${ME}">A</button>
      </div>
    </header>
    ${v.menu === 'nav' ? `<div class="gnav-back" data-act="menu" data-id="nav"></div><nav class="gnav"><div class="gnav-h"><button class="gic" data-act="menu" data-id="nav">${ICON.menu}</button><span class="glogo"><b>Google</b> Cloud</span></div>${PRODUCTS.map(([a, p, l, c]) => `<a class="${a ? '' : 'na'} ${a === v.area ? 'on' : ''}" data-act="${a ? 'goto' : 'na'}" data-area="${a || ''}" data-page="${p || ''}"><i style="background:${c}"></i>${l}</a>`).join('')}</nav>` : ''}`;
  }

  function sidebar() {
    const n = NAVS[v.area];
    if (!n) return '';
    const cur = PARENT[v.page] || v.page;
    return `<aside class="gside"><div class="gside-h"><i></i>${n[0]}</div>${n[1].map(([p, l]) => `<a class="${p === cur ? 'on' : ''} ${p ? '' : 'na'}" data-act="${p ? 'nav' : 'na'}" data-id="${p || ''}">${l}</a>`).join('')}</aside>`;
  }

  function render() {
    let body;
    if (v.area === 'home') body = pHome();
    else if (v.area === 'compute' && !P().apis.compute) body = pEnable();
    else body = (PAGES[v.page] || (() => card('', '<p>Página ainda não disponível no laboratório.</p>')))();
    const fl = v.flash ? `<div class="gflash ${v.flash.kind}">${ICON[v.flash.kind === 'error' ? 'err' : 'ok']}<div>${v.flash.html}</div><button data-act="closeFlash">${ICON.close}</button></div>` : '';
    UI.paint(frame, `${header()}<div class="gbody">${sidebar()}<main class="gmain" data-scroll="main">${fl}${body}</main></div>`, `${v.area}:${v.page}:${v.id}:${S().current}`);
    if (v.flash) v.flash.fresh = false;
  }
  function refresh() { if (!v.form && root && root.classList.contains('active')) render(); }
  const titleBar = (title, acts = '', back) => `<div class="tbar">${back ? `<button class="gic back" data-act="nav" data-id="${back}">←</button>` : ''}<h1>${title}</h1><div class="tacts">${acts}</div></div>`;

  // ---------- home ----------
  function pHome() {
    const p = P();
    const quick = [['compute', 'instances', 'Compute Engine', 'VM instances'], ['storage', 'buckets', 'Cloud Storage', 'Buckets'], ['iam', 'iam', 'IAM & Admin', 'IAM'], ['vpc', 'firewall', 'VPC network', 'Firewall'], ['apis', 'apis', 'APIs & Services', 'Enabled APIs'], ['billing', 'billing', 'Billing', 'Overview']];
    return `<div class="welcome"><h1>Welcome</h1><p>You're working in <a class="lnk" data-act="projPicker">${esc(p.name)}</a></p>
      <div class="pinfo"><span>Project number: <b>${p.number}</b></span><span>Project ID: <b>${esc(p.id)}</b></span></div>
      <div class="wacts">${btn('Create a VM', 'goto', { primary: true, data: 'data-area="compute" data-page="create"' })} ${btn('Create a storage bucket', 'goto', { data: 'data-area="storage" data-page="createBucket"' })} ${btn('Grant access (IAM)', 'goto', { data: 'data-area="iam" data-page="iam"' })}</div></div>
      <h2 class="h2">Quick access</h2>
      <div class="quick">${quick.map(([a, pg, t, d]) => `<a class="qcard" data-act="goto" data-area="${a}" data-page="${pg}"><i></i><b>${t}</b><small>${d}</small></a>`).join('')}</div>
      <div class="grid3">
        ${card('Resources', kv([['VM instances', p.instances.length], ['Buckets', p.buckets.length], ['Firewall rules', p.firewall.length], ['Principals (IAM)', p.iam.length]]))}
        ${card('Billing', `<div class="bigno">$0.00</div><p class="help">Estimated charges for this billing period (simulado)</p><p>Free trial: <b>$300.00</b> de créditos</p>`)}
        ${card('Laboratório', `<p>Tudo aqui é simulado. Experimente:</p><ol class="olist"><li>Ativar a <b>Compute Engine API</b></li><li>Criar uma VM <code>e2-micro</code> em <code>us-central1</code> (Free Tier)</li><li>Clicar em <b>SSH</b> para abrir o terminal</li><li>Instalar o nginx e liberar HTTP</li></ol>`)}
      </div>`;
  }

  function pEnable() {
    const p = P();
    return `<div class="api-page"><div class="api-logo">${ICON.terminal}</div><div><h1>Compute Engine API</h1><p class="help">Google Enterprise API</p><p>Compute Engine lets you use virtual machines that run on Google's infrastructure. Create micro-VMs or larger instances running Debian, Windows, or other standard images.</p>
      ${p.enabling ? `<p class="enabling">${ICON.pending} Enabling Compute Engine API... isto leva alguns segundos</p>` : btn('Enable', 'enableCompute', { primary: true })}
      ${note('info', 'No Google Cloud, cada serviço (API) precisa ser <b>ativado por projeto</b> antes do primeiro uso. Em uma conta real isso também exige uma conta de faturamento vinculada.')}</div></div>`;
  }

  // ---------- compute ----------
  function pInstances() {
    const p = P();
    const f = (v.data.filter || '').toLowerCase();
    const rows = p.instances.filter(i => !f || (i.name + i.zone + i.internalIp + (i.externalIp || '')).toLowerCase().includes(f));
    const sel = p.instances.filter(i => v.sel.includes(i.id));
    const all = st => sel.length && sel.every(i => i.status === st);
    return titleBar('VM instances', `${abtn('+ CREATE INSTANCE', 'nav', { data: 'data-id="create"' })} ${abtn('IMPORT VM', 'na')} ${abtn(`${ICON.refresh} REFRESH`, 'refresh')}
      <span class="sep"></span>${abtn('START / RESUME', 'vmStart', { disabled: !all('TERMINATED') })} ${abtn('STOP', 'vmStop', { disabled: !all('RUNNING') })} ${abtn('RESET', 'vmReset', { disabled: !all('RUNNING') })} ${abtn('DELETE', 'vmDelete', { danger: true, disabled: !sel.length })}`)
      + `<div class="gtabs"><button class="on">INSTANCES</button><button data-act="na">OBSERVABILITY</button><button data-act="na">INSTANCE SCHEDULES</button></div>
      <div class="filterbar">${ICON.search}<span>Filter</span><input id="gcp-filter" placeholder="Enter property name or value" value="${esc(v.data.filter || '')}" data-input="filter"></div>
      ${UI.table({
        select: 'multi', selected: v.sel, rows,
        cols: [
          { h: 'Status', f: i => status(i.status) },
          { h: 'Name ↑', f: i => link(esc(i.name), 'openVm', `data-id="${i.id}"`) },
          { h: 'Zone', f: i => i.zone },
          { h: 'Recommendations', f: () => '' },
          { h: 'In use by', f: () => '' },
          { h: 'Internal IP', f: i => `${i.internalIp} (nic0)` },
          { h: 'External IP', f: i => i.externalIp ? `${i.externalIp} <span class="muted">(nic0)</span>` : '' },
          { h: 'Connect', f: i => `<button class="ssh-btn" data-act="sshVm" data-id="${i.id}" ${i.status !== 'RUNNING' || i.distro === 'windows' ? 'disabled' : ''}>${i.distro === 'windows' ? 'RDP' : 'SSH'} ${ICON.caret}</button>` },
        ],
        empty: 'No rows to display', emptyHint: `${btn('Create instance', 'nav', { primary: true, data: 'data-id="create"' })}`,
      })}`;
  }

  function pCreate() {
    v.form = true;
    const d = v.data.draft || { name: `instance-${UI.stamp().replace('-', '-')}`, region: 'us-central1', zone: 'us-central1-c', series: 'E2', machine: 'e2-micro', image: 'debian-12', disk: '10', diskType: 'pd-balanced', http: false, https: false, del: false };
    const err = v.data.err || {};
    const reg = REGIONS.find(r => r.id === d.region) || REGIONS[0];
    const m = machineOf(d.machine), img = imageOf(d.image);
    const free = m.id === 'e2-micro' && reg.free && +d.disk <= 30 && d.diskType === 'pd-standard';
    const total = m.price + (+d.disk || 10) * (d.diskType === 'pd-ssd' ? 0.17 : d.diskType === 'pd-balanced' ? 0.1 : 0.04);
    return titleBar('Create an instance', '', 'instances') + `<div class="create-g" data-change="draft">
      <div class="cform">
        <div class="lnav"><a class="on">Machine configuration</a><a>OS and storage</a><a>Data protection</a><a>Networking</a><a>Observability</a><a>Security</a><a>Advanced</a></div>
        <div>
        ${card('Machine configuration', `${field('Name *', `<input name="name" value="${esc(d.name)}" class="w-full">`, 'Lowercase letters, numbers and hyphens. Must start with a letter.', err.name)}
          <div class="row2">${field('Region *', `<select name="region" class="w-full">${REGIONS.map(r => `<option value="${r.id}" ${r.id === d.region ? 'selected' : ''}>${r.id} (${r.name})</option>`).join('')}</select>`, 'Region is permanent')}${field('Zone *', `<select name="zone" class="w-full">${reg.zones.map(z => `<option ${d.region + '-' + z === d.zone ? 'selected' : ''}>${d.region}-${z}</option>`).join('')}</select>`, 'Zone is permanent')}</div>
          <div class="seg">${['General purpose', 'Compute optimized', 'Memory optimized', 'GPUs'].map((s, k) => `<button class="${k === 0 ? 'on' : ''}" ${k ? 'data-act="na"' : ''}>${s}</button>`).join('')}</div>
          ${UI.table({ rows: [{ id: 'E2', d: 'Low cost, day-to-day computing', p: 'Intel Broadwell' }, { id: 'N2', d: 'Balanced price & performance', p: 'Intel Cascade Lake' }, { id: 'N1', d: 'Balanced price & performance', p: 'Intel Skylake' }], cols: [{ h: 'Series', f: r => `<label class="rad"><input type="radio" name="series" value="${r.id}" ${d.series === r.id ? 'checked' : ''}> ${r.id}</label>` }, { h: 'Description', f: r => r.d }, { h: 'Platform', f: r => r.p }] })}
          ${field('Machine type', `<select name="machine" class="w-full">${MACHINES.filter(x => x.id.toUpperCase().startsWith(d.series)).map(x => `<option value="${x.id}" ${x.id === d.machine ? 'selected' : ''}>${x.id} (${x.vcpu}, ${x.mem} GB memory)</option>`).join('')}</select>`)}
          <div class="mt-sum"><span><b>vCPU</b> ${m.vcpu}</span><span><b>Memory</b> ${m.mem} GB</span></div>`)}
        ${card('Boot disk', `<div class="bootbox"><div>${kv([['Name', esc(d.name)], ['Type', { 'pd-balanced': 'New balanced persistent disk', 'pd-ssd': 'New SSD persistent disk', 'pd-standard': 'New standard persistent disk' }[d.diskType]], ['Size', `${esc(d.disk)} GB`], ['Image', esc(img.name)]])}</div>${btn('CHANGE', 'bootChange', { text: true })}</div>`)}
        ${card('Firewall', `<p class="help">Add tags and firewall rules to allow specific network traffic from the Internet</p><div class="checks"><label><input type="checkbox" name="http" ${d.http ? 'checked' : ''}> Allow HTTP traffic</label><label><input type="checkbox" name="https" ${d.https ? 'checked' : ''}> Allow HTTPS traffic</label><label><input type="checkbox" name="lb"> Allow Load Balancer Health Checks</label></div>`)}
        ${card('Data protection', `<div class="checks"><label><input type="checkbox" name="del" ${d.del ? 'checked' : ''}> Enable deletion protection</label></div>`)}
        ${err.general ? note('error', err.general) : ''}
        <div class="form-acts">${btn('Create', 'vmCreate', { primary: true })} ${btn('Cancel', 'nav', { text: true, data: 'data-id="instances"' })} ${btn('Equivalent code', 'eqCode', { text: true })}</div>
        </div>
      </div>
      <aside class="estimate">${card('Monthly estimate', `<div class="bigno">$${free ? '0.00' : total.toFixed(2)}</div><p class="help">That's about $${(total / 730).toFixed(3)} hourly</p><p class="help">Pay for what you use: no upfront costs and per second billing</p>
        <table class="kvt"><tr><th>Item</th><td><b>Monthly estimate</b></td></tr><tr><th>${m.id}</th><td>$${m.price.toFixed(2)}</td></tr><tr><th>${esc(d.disk)} GB ${d.diskType}</th><td>$${(total - m.price).toFixed(2)}</td></tr><tr><th><b>Total</b></th><td><b>$${total.toFixed(2)}</b></td></tr></table>
        ${m.id === 'e2-micro' ? note(free ? 'info' : 'warning', free ? 'Elegível ao <b>Free Tier</b>: 1 e2-micro por mês em us-west1, us-central1 ou us-east1 com até 30 GB de disco <b>standard</b>.' : 'Para o Free Tier use região us-west1, us-central1 ou us-east1 e disco <b>standard persistent disk</b> de até 30 GB.') : ''}`)}</aside>
    </div>`;
  }

  function gcloudCreateCmd(d) {
    const img = imageOf(d.image);
    const tags = [d.http && 'http-server', d.https && 'https-server'].filter(Boolean);
    return `gcloud compute instances create ${d.name} \\\n    --project=${P().id} \\\n    --zone=${d.zone} \\\n    --machine-type=${d.machine} \\\n    --network-interface=network-tier=PREMIUM,stack-type=IPV4_ONLY,subnet=default \\\n    --image-family=${img.family} --image-project=${img.project} \\\n    --boot-disk-size=${d.disk}GB --boot-disk-type=${d.diskType}${tags.length ? ` \\\n    --tags=${tags.join(',')}` : ''}${d.del ? ' \\\n    --deletion-protection' : ''}`;
  }

  function nameErr(n, p) {
    if (!/^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/.test(n)) return 'Name must start with a lowercase letter followed by up to 62 lowercase letters, numbers, or hyphens, and cannot end with a hyphen.';
    if (p.instances.some(i => i.name === n)) return `The resource 'projects/${p.id}/zones/.../instances/${n}' already exists`;
    return null;
  }

  function createVm(p, d) {
    const img = imageOf(d.image);
    const tags = [d.http && 'http-server', d.https && 'https-server'].filter(Boolean);
    if (d.http && !p.firewall.some(r => r.name === 'default-allow-http')) p.firewall.push(fw('default-allow-http', ['tcp:80'], ['http-server'], 1000));
    if (d.https && !p.firewall.some(r => r.name === 'default-allow-https')) p.firewall.push(fw('default-allow-https', ['tcp:443'], ['https-server'], 1000));
    const vm = {
      id: String(UI.int(1e15, 9e15)) + UI.int(100, 999), name: d.name, zone: d.zone, machine: d.machine, image: img.id, distro: img.distro,
      status: 'PROVISIONING', internalIp: `10.${{ 'us-central1': 128, 'us-east1': 142, 'us-west1': 138, 'southamerica-east1': 158, 'europe-west1': 132 }[d.zone.replace(/-[a-z]$/, '')] || 128}.0.${UI.int(2, 250)}`,
      externalIp: `${UI.pick([34, 35, 104])}.${UI.int(0, 255)}.${UI.int(0, 255)}.${UI.int(1, 254)}`, tags, disk: +d.disk || 10, diskType: d.diskType || 'pd-balanced', del: !!d.del, created: Date.now(),
    };
    Store.queue(vm, [[1500, { status: 'STAGING' }], [2500, { status: 'RUNNING' }]]);
    p.instances.push(vm);
    op(`Create VM instance "${d.name}"`);
    return vm;
  }

  function pInstance() {
    const vm = P().instances.find(i => i.id === v.id);
    if (!vm) return pInstances();
    const img = imageOf(vm.image), m = machineOf(vm.machine);
    return titleBar(esc(vm.name), `<button class="ssh-btn big" data-act="sshVm" data-id="${vm.id}" ${vm.status !== 'RUNNING' || vm.distro === 'windows' ? 'disabled' : ''}>SSH ${ICON.caret}</button> ${abtn('EDIT', 'na')} ${abtn('RESET', 'vmReset1', { disabled: vm.status !== 'RUNNING' })} ${abtn('CREATE MACHINE IMAGE', 'na')} ${abtn(vm.status === 'TERMINATED' ? 'START / RESUME' : 'STOP', vm.status === 'TERMINATED' ? 'vmStart1' : 'vmStop1', { disabled: !['RUNNING', 'TERMINATED'].includes(vm.status) })} ${abtn('DELETE', 'vmDelete1', { danger: true })}`, 'instances')
      + `<div class="gtabs"><button class="on">DETAILS</button><button data-act="na">OBSERVABILITY</button><button data-act="na">OS INFO</button><button data-act="na">SCREENSHOT</button></div>
      <div class="detail">${card('Basic information', kv([['Name', esc(vm.name)], ['Instance Id', vm.id], ['Description', 'None'], ['Type', 'Instance'], ['Status', `${status(vm.status)} ${statusText(vm.status)}${vm.status === 'TERMINATED' ? ' <span class="muted">(na API: TERMINATED)</span>' : ''}`], ['Creation time', UI.date(vm.created)], ['Zone', vm.zone], ['Instance template', 'None'], ['Labels', 'None'], ['Tags', vm.tags.join(', ') || 'None'], ['Deletion protection', vm.del ? 'Enabled' : 'Disabled']]))}
        ${card('Machine configuration', kv([['Machine type', `${vm.machine}`], ['CPU platform', 'Intel Broadwell'], ['Architecture', 'x86/64'], ['vCPUs to core ratio', '—'], ['Memory', m.mem + ' GB']]))}
        ${card('Networking', kv([['Public DNS PTR Record', 'None'], ['Network interfaces', 'nic0 — default (default)'], ['Internal IP', vm.internalIp], ['External IP', vm.externalIp ? `${vm.externalIp} (Ephemeral)` : 'None'], ['Network tags', vm.tags.join(', ') || 'None'], ['Firewall rules', `${firewallFor(vm).map(r => esc(r.name)).join(', ')}`]]) + (vm.status === 'TERMINATED' ? note('info', 'IPs externos efêmeros são liberados quando a VM para. Ao iniciar de novo ela recebe um IP diferente.') : ''))}
        ${card('Storage', kv([['Boot disk', `${esc(vm.name)} — ${vm.disk} GB ${vm.diskType}`], ['Image', esc(img.name)], ['Encryption', 'Google-managed']]))}</div>`;
  }
  const fw = (name, protos, targets, priority, sources = ['0.0.0.0/0'], desc = '') => ({ name, network: 'default', direction: 'INGRESS', action: 'ALLOW', priority, targets, sources, protos, desc, created: Date.now() });
  function firewallFor(vm) { return P().firewall.filter(r => r.targets === 'all' || r.targets.some(t => vm.tags.includes(t))); }
  function fwAllows(p, vm, proto, port) {
    const rules = p.firewall.filter(r => r.direction === 'INGRESS' && (r.targets === 'all' || r.targets.some(t => vm.tags.includes(t))) && r.sources.some(s => s === '0.0.0.0/0' || s === MY_IP + '/32'))
      .filter(r => r.protos === 'all' || r.protos.some(x => { const [pr, ports] = x.split(':'); if (pr !== proto.toLowerCase()) return false; if (!ports) return true; return ports.split(',').some(pp => { const [a, b] = pp.split('-').map(Number); return b ? port >= a && port <= b : port === a; }); }))
      .sort((a, b) => a.priority - b.priority);
    return rules.length ? rules[0].action === 'ALLOW' : false;
  }
  function setVm(p, vm, kind) {
    if (kind === 'stop' && vm.status === 'RUNNING') { vm.status = 'STOPPING'; Store.queue(vm, [[3000, { status: 'TERMINATED', externalIp: null }]]); op(`Stop VM instance "${vm.name}"`); }
    if (kind === 'start' && vm.status === 'TERMINATED') { vm.status = 'STAGING'; Store.queue(vm, [[3000, { status: 'RUNNING', externalIp: `${UI.pick([34, 35, 104])}.${UI.int(0, 255)}.${UI.int(0, 255)}.${UI.int(1, 254)}` }]]); op(`Start VM instance "${vm.name}"`); }
    if (kind === 'reset' && vm.status === 'RUNNING') { vm.status = 'STAGING'; Store.queue(vm, [[2500, { status: 'RUNNING' }]]); op(`Reset VM instance "${vm.name}"`); }
    if (kind === 'delete') { if (vm.del) return `The resource 'projects/${p.id}/zones/${vm.zone}/instances/${vm.name}' cannot be deleted because deletion protection is enabled.`; p.instances = p.instances.filter(x => x !== vm); op(`Delete VM instance "${vm.name}"`); }
    return null;
  }

  // ---------- VPC ----------
  function pNetworks() {
    const on = P().apis.compute;
    return titleBar('VPC networks', `${abtn('+ CREATE VPC NETWORK', 'na')} ${abtn(`${ICON.refresh} REFRESH`, 'refresh')}`)
      + (on ? UI.table({ rows: REGIONS.map((r, k) => ({ id: r.id, r, cidr: `10.${[128, 142, 138, 158, 132][k]}.0.0/20` })), cols: [{ h: 'Name', f: () => 'default' }, { h: 'Subnets', f: () => REGIONS.length + ' (exemplo)' }, { h: 'Region', f: x => x.r.id }, { h: 'Subnet', f: () => 'default' }, { h: 'Internal IP ranges', f: x => x.cidr }, { h: 'Mode', f: () => 'Auto' }, { h: 'Firewall rules', f: () => P().firewall.length }] })
        : note('info', 'A rede <b>default</b> é criada quando você ativa a Compute Engine API. ' + link('Ativar agora', 'goto', 'data-area="compute" data-page="instances"')));
  }
  function pFirewall() {
    const rows = P().firewall;
    return titleBar('Firewall policies', `${abtn('+ CREATE FIREWALL RULE', 'nav', { data: 'data-id="createFw"', disabled: !P().apis.compute })} ${abtn('DELETE', 'fwDelete', { danger: true, disabled: !v.sel.length })}`)
      + `<p class="help pad">Firewall rules control incoming or outgoing traffic to an instance. By default, incoming traffic from outside your network is blocked. A regra de <b>menor número de prioridade</b> vence.</p>
      ${UI.table({ select: 'multi', selected: v.sel, rows, key: 'name', cols: [{ h: 'Name', f: r => esc(r.name) }, { h: 'Type', f: r => r.direction === 'INGRESS' ? 'Ingress' : 'Egress' }, { h: 'Targets', f: r => r.targets === 'all' ? 'Apply to all' : r.targets.map(esc).join(', ') }, { h: 'Filters', f: r => `IP ranges: ${r.sources.map(esc).join(', ')}` }, { h: 'Protocols / ports', f: r => r.protos === 'all' ? 'all' : r.protos.map(esc).join(', ') }, { h: 'Action', f: r => r.action === 'ALLOW' ? 'Allow' : '<b class="danger-t">Deny</b>' }, { h: 'Priority', f: r => r.priority }, { h: 'Network', f: () => 'default' }], empty: 'No rows to display', emptyHint: P().apis.compute ? '' : 'Ative a Compute Engine API para criar a rede default e suas regras.' })}`;
  }
  function pCreateFw() {
    v.form = true;
    const d = v.data.draft || { name: 'allow-http-8080', priority: '1000', action: 'ALLOW', targets: 'all', tags: '', sources: '0.0.0.0/0', protoMode: 'specified', tcp: true, tcpPorts: '8080', udp: false, udpPorts: '', other: false };
    const err = v.data.err || {};
    return titleBar('Create a firewall rule', '', 'firewall') + `<div class="narrow" id="wiz" data-change="fwDraft">
      ${field('Name *', `<input name="name" class="w-full" value="${esc(d.name)}">`, 'Lowercase letters, numbers, hyphens allowed', err.name)}
      ${field('Network *', '<select class="w-full"><option>default</option></select>')}
      ${field('Priority *', `<input name="priority" class="w-full" value="${esc(d.priority)}">`, 'Priority can be 0 - 65535', err.priority)}
      ${field('Direction of traffic', '<div class="radios"><label><input type="radio" checked> Ingress</label><label><input type="radio" disabled> Egress</label></div>')}
      ${field('Action on match', `<div class="radios"><label><input type="radio" name="action" value="ALLOW" ${d.action === 'ALLOW' ? 'checked' : ''}> Allow</label><label><input type="radio" name="action" value="DENY" ${d.action === 'DENY' ? 'checked' : ''}> Deny</label></div>`)}
      ${field('Targets', `<select name="targets" class="w-full"><option value="all" ${d.targets === 'all' ? 'selected' : ''}>All instances in the network</option><option value="tags" ${d.targets === 'tags' ? 'selected' : ''}>Specified target tags</option></select>`)}
      ${d.targets === 'tags' ? field('Target tags *', `<input name="tags" class="w-full" value="${esc(d.tags)}" placeholder="web-server">`, '', err.tags) : ''}
      ${field('Source filter', '<select class="w-full"><option>IPv4 ranges</option></select>')}
      ${field('Source IPv4 ranges *', `<input name="sources" class="w-full" value="${esc(d.sources)}">`, `Ex.: 0.0.0.0/0 (qualquer lugar) ou ${MY_IP}/32 (seu IP)`, err.sources)}
      ${field('Protocols and ports', `<div class="radios"><label><input type="radio" name="protoMode" value="all" ${d.protoMode === 'all' ? 'checked' : ''}> Allow all</label><label><input type="radio" name="protoMode" value="specified" ${d.protoMode === 'specified' ? 'checked' : ''}> Specified protocols and ports</label></div>
        ${d.protoMode === 'specified' ? `<div class="protos"><label><input type="checkbox" name="tcp" ${d.tcp ? 'checked' : ''}> TCP</label><input name="tcpPorts" value="${esc(d.tcpPorts)}" placeholder="Ports: ex. 80, 443, 8000-8080"><label><input type="checkbox" name="udp" ${d.udp ? 'checked' : ''}> UDP</label><input name="udpPorts" value="${esc(d.udpPorts)}" placeholder="Ports"><label><input type="checkbox" name="other" ${d.other ? 'checked' : ''}> Other (icmp)</label></div>` : ''}`, '', err.protos)}
      <div class="form-acts">${btn('Create', 'fwCreate', { primary: true })} ${btn('Cancel', 'nav', { text: true, data: 'data-id="firewall"' })}</div></div>`;
  }

  // ---------- storage ----------
  function bucketNameErr(n) {
    if (n.length < 3 || n.length > 63) return 'Bucket names must contain 3-63 characters.';
    if (!/^[a-z0-9][a-z0-9._-]*[a-z0-9]$/.test(n)) return 'Bucket names must start and end with a number or letter, and contain only lowercase letters, numbers, dashes (-), underscores (_), and dots (.).';
    if (n.startsWith('goog') || n.includes('google')) return 'Bucket names cannot begin with the "goog" prefix or contain "google".';
    if (S().projects.some(p => p.buckets.some(b => b.name === n)) || TAKEN.includes(n)) return 'This bucket name is already in use. Bucket names must be globally unique across all of Google Cloud. Try another name.';
    return null;
  }
  const bucketPublic = b => !b.pap && b.iam.some(x => x.principal === 'allUsers' && ['Storage Object Viewer', 'Storage Object Admin', 'Storage Admin'].includes(x.role));
  function makeBucket(p, d) {
    const b = { name: d.name, created: Date.now(), locType: d.locType || 'Region', location: d.location || 'us-central1', cls: d.cls || 'Standard', pap: d.pap !== false, uniform: d.access !== 'fine', objects: [], iam: [] };
    p.buckets.push(b);
    op(`Create bucket "${d.name}"`);
    return b;
  }
  function pBuckets() {
    const p = P();
    return titleBar('Buckets', `${abtn('+ CREATE', 'nav', { data: 'data-id="createBucket"' })} ${abtn(`${ICON.refresh} REFRESH`, 'refresh')} ${abtn('DELETE', 'bucketDelete', { danger: true, disabled: !v.sel.length })}`)
      + UI.table({
        select: 'multi', selected: v.sel, rows: p.buckets, key: 'name',
        cols: [{ h: 'Name', f: b => link(esc(b.name), 'openBucket', `data-id="${esc(b.name)}"`) }, { h: 'Created', f: b => UI.date(b.created) }, { h: 'Location type', f: b => b.locType }, { h: 'Location', f: b => b.location }, { h: 'Default storage class', f: b => b.cls }, { h: 'Last modified', f: b => UI.date(b.created) }, { h: 'Public access', f: b => bucketPublic(b) ? '<b class="danger-t">Public to internet</b>' : 'Not public' }, { h: 'Access control', f: b => b.uniform ? 'Uniform' : 'Fine-grained' }],
        empty: 'No rows to display', emptyHint: `Você ainda não tem buckets neste projeto.<br><br>${btn('Create', 'nav', { primary: true, data: 'data-id="createBucket"' })}`,
      });
  }
  function pCreateBucket() {
    v.form = true;
    const d = v.data.draft || { name: '', locType: 'Region', location: 'us-central1', cls: 'Standard', pap: true, access: 'uniform' };
    const err = v.data.err || {};
    const step = (n, t, inner) => `<div class="step"><div class="sn">${n}</div><div class="sc"><h3>${t}</h3>${inner}</div></div>`;
    return titleBar('Create a bucket', '', 'buckets') + `<div class="narrow" id="wiz" data-change="bucketDraft">
      ${step(1, 'Get started', `${field('Name your bucket', `<input name="name" class="w-full" value="${esc(d.name)}" placeholder="Globally unique, permanent name">`, 'Tip: Don\'t include any sensitive information. Os nomes são globais em todo o Google Cloud.', err.name)}`)}
      ${step(2, 'Choose where to store your data', `<div class="radios col">${[['Multi-region', 'Highest availability across largest area'], ['Dual-region', 'High availability and low latency across 2 regions'], ['Region', 'Lowest latency within a single region']].map(([k, t]) => `<label><input type="radio" name="locType" value="${k}" ${d.locType === k ? 'checked' : ''}> <b>${k}</b> <span class="help">${t}</span></label>`).join('')}</div>
        ${field('Location', `<select name="location" class="w-full">${(d.locType === 'Multi-region' ? ['us', 'eu', 'asia'] : d.locType === 'Dual-region' ? ['nam4', 'eur4', 'asia1'] : REGIONS.map(r => r.id)).map(l => `<option ${l === d.location ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}`)}
      ${step(3, 'Choose a storage class for your data', `<div class="radios col">${[['Standard', 'Best for short-term storage and frequently accessed data'], ['Nearline', 'Best for backups and data accessed less than once a month'], ['Coldline', 'Best for disaster recovery and data accessed less than once a quarter'], ['Archive', 'Best for long-term digital preservation of data accessed less than once a year']].map(([k, t]) => `<label><input type="radio" name="cls" value="${k}" ${d.cls === k ? 'checked' : ''}> <b>${k}</b> <span class="help">${t}</span></label>`).join('')}</div>`)}
      ${step(4, 'Choose how to control access to objects', `<div class="checks"><label><input type="checkbox" name="pap" ${d.pap ? 'checked' : ''}> <b>Enforce public access prevention on this bucket</b></label></div><p class="help">Restricts data from being publicly accessible via the internet. Will prevent this bucket from being used for web hosting.</p>
        <div class="radios col"><label><input type="radio" name="access" value="uniform" ${d.access === 'uniform' ? 'checked' : ''}> <b>Uniform</b> <span class="help">Ensure uniform access to all objects in the bucket by using only bucket-level permissions (IAM).</span></label><label><input type="radio" name="access" value="fine" ${d.access === 'fine' ? 'checked' : ''}> <b>Fine-grained</b> <span class="help">Specify access to individual objects by using object-level permissions (ACLs).</span></label></div>`)}
      ${step(5, 'Choose how to protect object data', '<p class="help">Soft delete policy: 7 days (default) · Object versioning: off · Encryption: Google-managed</p>')}
      <div class="form-acts">${btn('Create', 'bucketCreate', { primary: true })} ${btn('Cancel', 'nav', { text: true, data: 'data-id="buckets"' })}</div></div>`;
  }
  function pBucket() {
    const b = P().buckets.find(x => x.name === v.id);
    if (!b) return pBuckets();
    const t = v.tab || 'objects';
    const pub = bucketPublic(b);
    let body;
    if (t === 'objects') {
      body = `${kv([['Location', `${b.location} (${b.locType})`], ['Storage class', b.cls], ['Public access', pub ? '<b class="danger-t">Public to internet</b>' : 'Not public'], ['Protection', 'Soft Delete']])}
        <div class="obar">${abtn('UPLOAD FILES', 'upload')} ${abtn('UPLOAD FOLDER', 'na')} ${abtn('CREATE FOLDER', 'na')} ${abtn('TRANSFER DATA', 'na')} ${abtn('DELETE', 'objDelete', { danger: true, disabled: !v.sel.length })}</div>
        <div class="crumbs">Buckets › <b>${esc(b.name)}</b></div>
        ${UI.table({ select: 'multi', selected: v.sel, rows: b.objects, key: 'key', cols: [{ h: 'Name', f: o => `<span class="obj">${ICON.file} ${esc(o.key)}</span>` }, { h: 'Size', f: o => UI.bytes(o.size) }, { h: 'Type', f: o => esc(o.type) }, { h: 'Created', f: o => UI.date(o.modified) }, { h: 'Storage class', f: () => b.cls }, { h: 'Public access', f: () => pub ? `<a class="lnk" data-act="copy" data-v="">Copy URL</a>` : 'Not public' }, { h: 'Public URL', f: o => pub ? `<small>https://storage.googleapis.com/${esc(b.name)}/${esc(o.key)}</small>` : '—' }], empty: 'No rows to display', emptyHint: 'Arraste arquivos ou use UPLOAD FILES.' })}`;
    } else if (t === 'perm') {
      body = card('Public access', `<p>${pub ? '<b class="danger-t">Public to internet</b> — qualquer pessoa na internet pode ler os objetos.' : b.pap ? '<b>Not public</b> — public access prevention is <b>enforced</b>.' : '<b>Not public</b> — sem permissões para allUsers.'}</p>${b.pap ? btn('REMOVE PUBLIC ACCESS PREVENTION', 'papOff', { text: true }) : btn('PREVENT PUBLIC ACCESS', 'papOn', { text: true })}`)
        + card('Access control', `<p>${b.uniform ? 'Uniform: acesso definido só por IAM no nível do bucket.' : 'Fine-grained: IAM + ACLs por objeto.'}</p>`)
        + card('Permissions', `<div class="obar">${abtn('GRANT ACCESS', 'bucketGrant')} ${abtn('REMOVE ACCESS', 'bucketRevoke', { danger: true, disabled: !v.sel.length })}</div>${UI.table({ select: 'multi', selected: v.sel, rows: [{ id: '_owner', principal: 'projectOwner:' + P().id, role: 'Storage Legacy Bucket Owner' }, ...b.iam.map((x, k) => ({ ...x, id: String(k) }))], cols: [{ h: 'Principal', f: x => esc(x.principal) }, { h: 'Role', f: x => esc(x.role) }] })}
          ${note('info', 'Para deixar o bucket público: remova o <i>public access prevention</i> e conceda ao principal <code>allUsers</code> o papel <code>Storage Object Viewer</code>.')}`);
    } else body = card('Configuration', kv([['Bucket name', esc(b.name)], ['gsutil URI', `gs://${esc(b.name)}`], ['Location type', b.locType], ['Location', b.location], ['Default storage class', b.cls], ['Public access prevention', b.pap ? 'Enforced' : 'Not enforced'], ['Access control', b.uniform ? 'Uniform' : 'Fine-grained'], ['Created', UI.date(b.created)]]));
    return titleBar(`Bucket details: ${esc(b.name)}`, `${abtn(`${ICON.refresh} REFRESH`, 'refresh')}`, 'buckets')
      + `<div class="gtabs">${[['objects', 'OBJECTS'], ['config', 'CONFIGURATION'], ['perm', 'PERMISSIONS'], ['prot', 'PROTECTION'], ['life', 'LIFECYCLE']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="${['prot', 'life'].includes(k) ? 'na' : 'tab'}" data-id="${k}">${l}</button>`).join('')}</div><div class="pad">${body}</div>`;
  }

  // ---------- IAM ----------
  function pIam() {
    const p = P();
    return titleBar(`Permissions for project "${esc(p.name)}"`, `${abtn('+ GRANT ACCESS', 'grant')} ${abtn('REMOVE ACCESS', 'revoke', { danger: true, disabled: !v.sel.length })}`)
      + `<p class="help pad">These permissions affect this project and all of its resources. Conceda papéis (roles) a principais: usuários, grupos e service accounts. Siga o princípio do <b>menor privilégio</b>.</p>
      <div class="gtabs"><button class="on">VIEW BY PRINCIPALS</button><button data-act="na">VIEW BY ROLES</button></div>
      ${UI.table({ select: 'multi', selected: v.sel, rows: p.iam.map(x => ({ ...x, id: x.principal })), cols: [{ h: 'Type', f: x => x.principal.startsWith('serviceAccount') ? ICON.gear : ICON.user }, { h: 'Principal', f: x => esc(x.principal.split(':')[1]) }, { h: 'Name', f: x => x.principal.startsWith('serviceAccount') ? (x.principal.includes('-compute@') ? 'Compute Engine default service account' : esc(x.principal.split(':')[1].split('@')[0])) : x.principal.endsWith(ME) ? 'Aluno' : '' }, { h: 'Role', f: x => x.roles.map(esc).join('<br>') }, { h: 'Inheritance', f: () => '' }, { h: '', f: x => `<a class="lnk" data-act="editPrincipal" data-id="${esc(x.principal)}">✎</a>` }] })}`;
  }
  function pSA() {
    const p = P();
    return titleBar('Service accounts', `${abtn('+ CREATE SERVICE ACCOUNT', 'saNew')} ${abtn('DELETE', 'saDelete', { danger: true, disabled: !v.sel.length })}`)
      + `<p class="help pad">Service accounts for project "${esc(p.name)}" — identidades usadas por aplicações e VMs (não por pessoas).</p>`
      + UI.table({ select: 'multi', selected: v.sel, rows: p.serviceAccounts, key: 'email', cols: [{ h: 'Email', f: s => esc(s.email) }, { h: 'Status', f: () => `<span class="okc">${ICON.ok} Enabled</span>` }, { h: 'Name', f: s => esc(s.name) }, { h: 'Description', f: s => esc(s.desc || '') }, { h: 'Key ID', f: () => 'No keys' }], empty: 'No rows to display', emptyHint: p.apis.compute ? '' : 'Ao ativar a Compute Engine API, a conta de serviço padrão é criada.' });
  }
  function pApis() {
    const p = P();
    const list = [['Cloud Storage API', p.apis.storage, 'storage'], ['Compute Engine API', p.apis.compute, 'compute'], ['Cloud Logging API', true, null], ['Cloud Monitoring API', true, null]].filter(x => x[1]);
    return titleBar('APIs & Services', `${abtn('+ ENABLE APIS AND SERVICES', 'nav', { data: 'data-id="library"' })}`)
      + UI.table({ rows: list.map(x => ({ id: x[0], n: x[0] })), cols: [{ h: 'Name', f: x => esc(x.n) }, { h: 'Requests', f: () => UI.int(0, 40) }, { h: 'Errors (%)', f: () => '0' }, { h: 'Latency, median (ms)', f: () => UI.int(20, 90) }] });
  }
  function pLibrary() {
    const p = P();
    return titleBar('API Library', '', 'apis') + `<div class="quick">${[['Compute Engine API', 'compute', 'Virtual machines on Google infrastructure'], ['Cloud Storage API', 'storage', 'Object storage'], ['Kubernetes Engine API', null, 'Managed Kubernetes'], ['BigQuery API', null, 'Data warehouse']].map(([n, k, d]) => `<a class="qcard" data-act="${k === 'compute' ? 'goto' : 'na'}" data-area="compute" data-page="instances"><i></i><b>${n}</b><small>${d}${k && p.apis[k] ? ' · <b class="okc">API Enabled</b>' : ''}</small></a>`).join('')}</div>`;
  }
  const pBilling = () => titleBar('Billing') + `<div class="grid3">${card('Billing account', kv([['Account', 'Conta de faturamento do laboratório'], ['Status', 'Active (simulado)'], ['Free trial', '$300.00 restantes · 90 dias']]))}${card('Costs this month', '<div class="bigno">$0.00</div><p class="help">Nenhum custo real — tudo é simulado.</p>')}${card('Dica', '<p>Em contas reais, configure <b>alertas de orçamento</b> (Budgets & alerts) antes de criar recursos.</p>')}</div>`;

  const PAGES = { instances: pInstances, create: pCreate, instance: pInstance, networks: pNetworks, firewall: pFirewall, createFw: pCreateFw, buckets: pBuckets, createBucket: pCreateBucket, bucket: pBucket, iam: pIam, sa: pSA, apis: pApis, library: pLibrary, billing: pBilling };
  const AREA = { instances: 'compute', create: 'compute', instance: 'compute', networks: 'vpc', firewall: 'vpc', createFw: 'vpc', buckets: 'storage', createBucket: 'storage', bucket: 'storage', iam: 'iam', sa: 'iam', apis: 'apis', library: 'apis', billing: 'billing' };

  function enableCompute(p) {
    p.apis.compute = true;
    p.enabling = null;
    if (!p.firewall.length) p.firewall.push(fw('default-allow-icmp', ['icmp'], 'all', 65534, ['0.0.0.0/0'], 'Allow ICMP from anywhere'), fw('default-allow-internal', ['tcp:0-65535', 'udp:0-65535', 'icmp'], 'all', 65534, ['10.128.0.0/9'], 'Allow internal traffic on the default network'), fw('default-allow-rdp', ['tcp:3389'], 'all', 65534, ['0.0.0.0/0'], 'Allow RDP from anywhere'), fw('default-allow-ssh', ['tcp:22'], 'all', 65534, ['0.0.0.0/0'], 'Allow SSH from anywhere'));
    const sa = `${p.number}-compute@developer.gserviceaccount.com`;
    if (!p.serviceAccounts.some(s => s.email === sa)) { p.serviceAccounts.push({ email: sa, name: 'Compute Engine default service account', desc: '' }); p.iam.push({ principal: 'serviceAccount:' + sa, roles: ['Editor'] }); }
  }

  // ---------- ações ----------
  const H = {
    noop() { },
    na() { toast('Não disponível neste laboratório.', 'info'); },
    home() { go('home'); },
    menu(d) { v.menu = v.menu === d.id ? null : d.id; render(); },
    goto(d) { if (!d.area) return H.na(); go(d.area, d.page || null); },
    nav(d) { go(AREA[d.id] || v.area, d.id); },
    tab(d) { v.tab = d.id; v.sel = []; render(); },
    refresh() { render(); },
    closeFlash() { v.flash = null; render(); },
    cloudshell() { App.switchTab('linux'); },
    copy(d) { UI.copy(d.v); toast('Copied to clipboard', 'info'); },
    search(q) { q = q.toLowerCase(); const map = [['vm', 'instances'], ['compute', 'instances'], ['instance', 'instances'], ['bucket', 'buckets'], ['storage', 'buckets'], ['firewall', 'firewall'], ['vpc', 'networks'], ['iam', 'iam'], ['service account', 'sa'], ['api', 'apis'], ['billing', 'billing']]; const hit = map.find(([k]) => q.includes(k)); if (hit) H.nav({ id: hit[1] }); else toast('No results', 'info'); },
    searchBtn() { H.search(frame.querySelector('#gcp-q').value); },
    filter(val) { v.data.filter = val; render(); },
    sel(d) { v.sel = v.sel.includes(d.id) ? v.sel.filter(x => x !== d.id) : [...v.sel, d.id]; render(); },
    selAll() { const ids = [...frame.querySelectorAll('tr[data-id]')].map(tr => tr.dataset.id); v.sel = v.sel.length === ids.length ? [] : ids; render(); },
    projPicker() {
      v.menu = null;
      modal('Select a resource', `<div class="pp-top"><div class="filterbar">${ICON.search}<input placeholder="Search projects and folders"></div>${btn('NEW PROJECT', 'projNew', { text: true })}</div><div class="gtabs"><button>RECENT</button><button>STARRED</button><button class="on">ALL</button></div>
        <table class="tbl"><thead><tr><th>Name</th><th>Type</th><th>ID</th></tr></thead><tbody>${S().projects.map(p => `<tr class="${p.id === S().current ? 'on' : ''}" data-act="projSelect" data-id="${esc(p.id)}"><td>${p.id === S().current ? '✓ ' : ''}<a class="lnk">${esc(p.name)}</a></td><td>Project</td><td>${esc(p.id)}</td></tr>`).join('')}</tbody></table>`, `${btn('CANCEL', 'closeModal', { text: true })}`, 'wide');
    },
    projSelect(d) { S().current = d.id; closeModal(); Store.commit(); go(v.area === 'home' ? 'home' : v.area, v.area === 'home' ? null : (PARENT[v.page] || v.page)); toast(`Project: ${esc(P().name)}`, 'info'); },
    projNew() {
      const n = 'My Project ' + UI.int(10000, 99999);
      modal('New Project', `${note('warning', 'Em contas reais existe uma cota de projetos por conta.')}${field('Project name *', `<input name="pname" class="w-full" value="${n}" data-input="projSlug">`)}<p class="help">Project ID: <b id="gcp-pid">${slug(n)}</b>. It cannot be changed later.</p>${field('Organization', '<select class="w-full"><option>No organization</option></select>')}${field('Location *', '<input class="w-full" value="No organization" disabled>')}<p class="ferr" id="gerr"></p>`, `${btn('CREATE', 'projCreate', { primary: true })} ${btn('CANCEL', 'closeModal', { text: true })}`);
    },
    projSlug(val) { mh.querySelector('#gcp-pid').textContent = slug(val); },
    projCreate() {
      const name = mh.querySelector('[name=pname]').value.trim();
      if (name.length < 4 || name.length > 30 || !/^[A-Za-z0-9 '"!-]+$/.test(name)) { mh.querySelector('#gerr').textContent = 'Project name must be between 4 and 30 characters (letters, numbers, spaces, hyphens).'; return; }
      const id = mh.querySelector('#gcp-pid').textContent;
      const p = newProject(name, id);
      S().projects.push(p); S().current = id; op(`Create Project: ${name}`); closeModal(); go('home'); Store.commit();
      toast(`Projeto <b>${esc(name)}</b> criado e selecionado`);
    },
    enableCompute() {
      const p = P(); p.enabling = Date.now(); render(); op('Enable Compute Engine API');
      setTimeout(() => { enableCompute(p); Store.commit(); toast('Compute Engine API enabled'); }, 3000);
    },
    draft() {
      const d = UI.form(frame.querySelector('.create-g'));
      const prev = v.data.draft || {};
      const reg = REGIONS.find(r => r.id === d.region);
      if (d.region !== prev.region && reg) d.zone = `${d.region}-${reg.zones[0]}`;
      if (d.series !== prev.series) d.machine = MACHINES.find(m => m.id.toUpperCase().startsWith(d.series)).id;
      v.data.draft = { ...prev, ...d };
      render();
    },
    bootChange() {
      const d = v.data.draft = { ...(v.data.draft || {}), ...UI.form(frame.querySelector('.create-g')) };
      side('Boot disk', `${field('Operating system', `<select name="image" class="w-full">${IMAGES.map(i => `<option value="${i.id}" ${i.id === (d.image || 'debian-12') ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select>`)}${field('Boot disk type', `<select name="diskType" class="w-full">${[['pd-balanced', 'Balanced persistent disk'], ['pd-ssd', 'SSD persistent disk'], ['pd-standard', 'Standard persistent disk']].map(([k, l]) => `<option value="${k}" ${k === (d.diskType || 'pd-balanced') ? 'selected' : ''}>${l}</option>`).join('')}</select>`)}${field('Size (GB) *', `<input name="disk" class="w-full" value="${esc(d.disk || '10')}">`, 'Provision between 10 and 65536 GB')}`, `${btn('SELECT', 'bootSave', { primary: true })} ${btn('CANCEL', 'closeModal', { text: true })}`);
    },
    bootSave() { const x = UI.form(mh); if (!(+x.disk >= 10)) x.disk = '10'; v.data.draft = { ...v.data.draft, ...x }; closeModal(); render(); },
    eqCode() { const d = { ...(v.data.draft || {}), ...UI.form(frame.querySelector('.create-g')) }; d.image = d.image || 'debian-12'; d.disk = d.disk || '10'; d.diskType = d.diskType || 'pd-balanced'; modal('Equivalent code', `<p class="help">Rode este comando no terminal Linux do laboratório para criar a mesma VM pela CLI:</p><pre class="code">${esc(gcloudCreateCmd(d))}</pre>`, `${btn('COPY', 'copy', { text: true, data: `data-v="${esc(gcloudCreateCmd(d).replace(/\\\n\s+/g, ''))}"` })} ${btn('CLOSE', 'closeModal', { primary: true })}`, 'wide'); },
    vmCreate() {
      const p = P();
      const d = { ...(v.data.draft || {}), ...UI.form(frame.querySelector('.create-g')) };
      d.image = d.image || 'debian-12'; d.disk = d.disk || '10'; d.diskType = d.diskType || 'pd-balanced';
      const e = nameErr(d.name.trim(), p);
      if (e) { v.data = { draft: d, err: { name: e } }; render(); return; }
      d.name = d.name.trim();
      createVm(p, d);
      flash('success', `VM <b>${esc(d.name)}</b> está sendo criada. Quando o status ficar verde, clique em <b>SSH</b>.`);
      go('compute', 'instances'); Store.commit();
    },
    openVm(d) { go('compute', 'instance', d.id); },
    sshVm(d) {
      const p = P(); const vm = p.instances.find(i => i.id === d.id);
      if (!vm || vm.status !== 'RUNNING') return;
      if (!fwAllows(p, vm, 'TCP', 22)) { modal('SSH-in-browser', note('error', `Connection via Cloud Identity-Aware Proxy Failed. Code: 4003. Reason: failed to connect to backend. Verifique se existe uma regra de firewall liberando <b>tcp:22</b> (ex.: default-allow-ssh).`), btn('CLOSE', 'closeModal', { primary: true })); return; }
      modal('SSH-in-browser', `<div class="sshw"><p>${ICON.pending} Connecting...</p><p class="help">Transferring SSH keys to the VM.</p></div>`, '');
      setTimeout(() => { closeModal(); Linux.connect({ provider: 'gcp', id: vm.id, user: 'aluno', via: 'SSH-in-browser' }); }, 1600);
    },
    vmStart() { const p = P(); p.instances.filter(i => v.sel.includes(i.id)).forEach(i => setVm(p, i, 'start')); Store.commit(); },
    vmStop() { const p = P(); modal('Stop VM instance?', `<p>Stopping ${v.sel.length} instance(s). You won't be billed for vCPU or memory while they are stopped. Ephemeral external IP addresses will be released.</p>`, `${btn('CANCEL', 'closeModal', { text: true })} ${btn('STOP', 'vmStopOk', { primary: true })}`); },
    vmStopOk() { const p = P(); closeModal(); p.instances.filter(i => v.sel.includes(i.id)).forEach(i => setVm(p, i, 'stop')); Store.commit(); },
    vmReset() { const p = P(); p.instances.filter(i => v.sel.includes(i.id)).forEach(i => setVm(p, i, 'reset')); Store.commit(); },
    vmDelete() { modal('Delete instance?', `<p>Are you sure you want to delete ${v.sel.length} instance(s)? The boot disk will also be deleted.</p>`, `${btn('CANCEL', 'closeModal', { text: true })} ${btn('DELETE', 'vmDeleteOk', { primary: true, danger: true })}`); },
    vmDeleteOk() { const p = P(); closeModal(); const errs = p.instances.filter(i => v.sel.includes(i.id)).map(i => setVm(p, i, 'delete')).filter(Boolean); v.sel = []; if (errs.length) toast(esc(errs[0]), 'error'); if (v.page === 'instance') go('compute', 'instances'); Store.commit(); },
    vmStart1() { const p = P(); setVm(p, p.instances.find(i => i.id === v.id), 'start'); Store.commit(); },
    vmStop1() { v.sel = [v.id]; H.vmStop(); },
    vmReset1() { const p = P(); setVm(p, p.instances.find(i => i.id === v.id), 'reset'); Store.commit(); },
    vmDelete1() { v.sel = [v.id]; H.vmDelete(); },
    fwDraft() { v.data.draft = UI.form(frame.querySelector('#wiz')); render(); },
    fwCreate() {
      const p = P(); const d = UI.form(frame.querySelector('#wiz')); const err = {};
      if (!/^[a-z]([-a-z0-9]{0,61}[a-z0-9])?$/.test(d.name.trim())) err.name = 'Name must start with a lowercase letter, followed by lowercase letters, numbers or hyphens.';
      else if (p.firewall.some(r => r.name === d.name.trim())) err.name = 'A firewall rule with this name already exists.';
      if (!(+d.priority >= 0 && +d.priority <= 65535) || d.priority === '') err.priority = 'Priority must be between 0 and 65535.';
      const sources = d.sources.split(/[\s,]+/).filter(Boolean);
      if (!sources.length || sources.some(s => !/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(s))) err.sources = 'Enter valid IPv4 ranges in CIDR notation, e.g. 0.0.0.0/0';
      if (d.targets === 'tags' && !d.tags.trim()) err.tags = 'At least one target tag is required.';
      let protos = 'all';
      if (d.protoMode === 'specified') {
        protos = [];
        if (d.tcp) protos.push(...(d.tcpPorts.trim() ? d.tcpPorts.split(/[\s,]+/).filter(Boolean).map(x => 'tcp:' + x) : ['tcp']));
        if (d.udp) protos.push(...(d.udpPorts.trim() ? d.udpPorts.split(/[\s,]+/).filter(Boolean).map(x => 'udp:' + x) : ['udp']));
        if (d.other) protos.push('icmp');
        if (!protos.length) err.protos = 'Select at least one protocol.';
        if (protos.some(x => x.includes(':') && !/^(tcp|udp):\d{1,5}(-\d{1,5})?$/.test(x))) err.protos = 'Invalid port. Use números como 80, 443 ou faixas 8000-8080.';
      }
      if (Object.keys(err).length) { v.data = { draft: d, err }; render(); return; }
      p.firewall.push({ ...fw(d.name.trim(), protos, d.targets === 'all' ? 'all' : d.tags.split(/[\s,]+/).filter(Boolean), +d.priority, sources), action: d.action });
      op(`Create firewall rule "${d.name.trim()}"`);
      flash('success', `Firewall rule <b>${esc(d.name.trim())}</b> created.${d.targets === 'tags' ? ' Lembre de adicionar a network tag às VMs.' : ''}`); go('vpc', 'firewall'); Store.commit();
    },
    fwDelete() { const p = P(); p.firewall = p.firewall.filter(r => !v.sel.includes(r.name)); v.sel = []; Store.commit(); toast('Firewall rule(s) deleted'); },
    bucketDraft() { v.data.draft = UI.form(frame.querySelector('#wiz')); render(); },
    bucketCreate() {
      const d = UI.form(frame.querySelector('#wiz')); const n = d.name.trim();
      const e = bucketNameErr(n);
      if (e) { v.data = { draft: d, err: { name: e } }; render(); return; }
      const finish = () => { closeModal(); makeBucket(P(), { name: n, locType: d.locType, location: d.location, cls: d.cls, pap: d.pap, access: d.access }); go('storage', 'bucket', n); Store.commit(); };
      if (d.pap) { v.data.finish = finish; modal('Public access will be prevented', '<p>This bucket is set to prevent public access. Data in this bucket will not be publicly accessible on the internet.</p><div class="checks"><label><input type="checkbox" checked disabled> Enforce public access prevention on this bucket</label></div>', `${btn('CONFIRM', 'bucketFinish', { primary: true })}`); }
      else finish();
    },
    bucketFinish() { v.data.finish && v.data.finish(); },
    openBucket(d) { go('storage', 'bucket', d.id); },
    bucketDelete() {
      const p = P(); const names = v.sel;
      modal(`Delete ${names.length} bucket(s)?`, `<p>${names.map(n => `<b>${esc(n)}</b>`).join(', ')} and all objects inside will be permanently deleted.</p>${field('To confirm, type <b>DELETE</b>', '<input id="gcp-conf" class="w-full">')}<p class="ferr" id="gerr"></p>`, `${btn('CANCEL', 'closeModal', { text: true })} ${btn('DELETE', 'bucketDeleteOk', { primary: true, danger: true })}`);
      v.data.del = () => { if (mh.querySelector('#gcp-conf').value !== 'DELETE') { mh.querySelector('#gerr').textContent = 'Type DELETE to confirm.'; return; } p.buckets = p.buckets.filter(b => !names.includes(b.name)); v.sel = []; closeModal(); Store.commit(); toast('Bucket(s) deleted'); };
    },
    bucketDeleteOk() { v.data.del && v.data.del(); },
    async upload() {
      const b = P().buckets.find(x => x.name === v.id);
      const files = await UI.pickFiles(true);
      for (const f of files) { const r = await UI.readFile(f); b.objects = b.objects.filter(o => o.key !== r.name); b.objects.push({ key: r.name, size: r.size, type: r.type, content: r.content, modified: Date.now() }); }
      if (files.length) { op(`Upload ${files.length} file(s) to "${b.name}"`); Store.commit(); }
    },
    objDelete() { const b = P().buckets.find(x => x.name === v.id); b.objects = b.objects.filter(o => !v.sel.includes(o.key)); v.sel = []; Store.commit(); toast('Object(s) deleted'); },
    papOff() { const b = P().buckets.find(x => x.name === v.id); b.pap = false; Store.commit(); toast('Public access prevention removed', 'info'); },
    papOn() { const b = P().buckets.find(x => x.name === v.id); b.pap = true; Store.commit(); toast('Public access prevention enforced'); },
    bucketGrant() { side(`Grant access to "${esc(v.id)}"`, `${field('New principals *', '<input name="principal" class="w-full" placeholder="usuario@example.com ou allUsers">', 'allUsers = qualquer pessoa na internet')}${field('Role *', `<select name="role" class="w-full">${ROLES[2][1].map(r => `<option>${r}</option>`).join('')}</select>`)}<p class="ferr" id="gerr"></p>`, `${btn('SAVE', 'bucketGrantOk', { primary: true })} ${btn('CANCEL', 'closeModal', { text: true })}`); },
    bucketGrantOk() {
      const b = P().buckets.find(x => x.name === v.id); const d = UI.form(mh); const pr = d.principal.trim();
      if (!(pr === 'allUsers' || pr === 'allAuthenticatedUsers' || /^\S+@\S+\.\S+$/.test(pr))) { mh.querySelector('#gerr').textContent = 'Enter a valid email address or allUsers.'; return; }
      if (pr.startsWith('all') && b.pap) { mh.querySelector('#gerr').textContent = 'Public access prevention is enforced on this bucket. You cannot grant access to allUsers or allAuthenticatedUsers.'; return; }
      if (pr.startsWith('all') && !b.uniform && false) return;
      b.iam.push({ principal: pr, role: d.role }); closeModal(); Store.commit(); toast(pr === 'allUsers' ? 'Bucket agora é <b>público</b>' : 'Access granted');
    },
    bucketRevoke() { const b = P().buckets.find(x => x.name === v.id); b.iam = b.iam.filter((x, k) => !v.sel.includes(String(k))); v.sel = []; Store.commit(); },
    grant(d) {
      const ex = d && d.id ? P().iam.find(x => x.principal === d.id) : null;
      side(ex ? 'Edit access' : `Grant access to "${esc(P().name)}"`, `${field('New principals *', `<input name="principal" class="w-full" placeholder="usuario@example.com" value="${ex ? esc(ex.principal.split(':')[1]) : ''}" ${ex ? 'disabled' : ''}>`, 'Users, groups, domains or service accounts')}
        ${field('Assign roles', `<select name="role" class="w-full">${ROLES.map(([g, rs]) => `<optgroup label="${g}">${rs.map(r => `<option ${ex && ex.roles[0] === r ? 'selected' : ''}>${r}</option>`).join('')}</optgroup>`).join('')}</select>`, 'Owner > Editor > Viewer. Prefira papéis específicos (ex.: Storage Object Viewer).')}<p class="ferr" id="gerr"></p>`, `${btn('SAVE', 'grantOk', { primary: true, data: ex ? `data-id="${esc(ex.principal)}"` : '' })} ${btn('CANCEL', 'closeModal', { text: true })}`);
    },
    editPrincipal(d) { H.grant(d); },
    grantOk(d) {
      const p = P(); const f = UI.form(mh);
      if (d.id) { const ex = p.iam.find(x => x.principal === d.id); if (ex.principal.endsWith(ME) && f.role !== 'Owner' && !p.iam.some(x => x !== ex && x.roles.includes('Owner'))) { mh.querySelector('#gerr').textContent = 'The project must have at least one Owner.'; return; } if (!ex.roles.includes(f.role)) ex.roles = [f.role]; closeModal(); Store.commit(); return; }
      const pr = f.principal.trim();
      if (!/^\S+@\S+\.\S+$/.test(pr)) { mh.querySelector('#gerr').textContent = 'Email addresses and domains must be associated with an active Google Account, Google Workspace account, or Cloud Identity account.'; return; }
      const key = (pr.endsWith('.gserviceaccount.com') ? 'serviceAccount:' : 'user:') + pr;
      const ex = p.iam.find(x => x.principal === key);
      if (ex) { if (!ex.roles.includes(f.role)) ex.roles.push(f.role); } else p.iam.push({ principal: key, roles: [f.role] });
      closeModal(); Store.commit(); toast(`Policy updated: ${esc(pr)} → ${esc(f.role)}`);
    },
    revoke() {
      const p = P();
      const left = p.iam.filter(x => !v.sel.includes(x.principal));
      if (!left.some(x => x.roles.includes('Owner'))) { toast('The project must have at least one Owner.', 'error'); return; }
      p.iam = left; v.sel = []; Store.commit(); toast('Access removed');
    },
    saNew() { side('Create service account', `${field('Service account name', '<input name="name" class="w-full" placeholder="app-backend" data-input="saSlug">')}${field('Service account ID *', '<input name="sid" id="gcp-sid" class="w-full">', `Email: <span id="gcp-saemail">...@${esc(P().id)}.iam.gserviceaccount.com</span>`)}${field('Service account description', '<input name="desc" class="w-full">')}${field('Grant this service account access to project (optional)', `<select name="role" class="w-full"><option value="">— none —</option>${ROLES.flatMap(r => r[1]).map(r => `<option>${r}</option>`).join('')}</select>`)}<p class="ferr" id="gerr"></p>`, `${btn('DONE', 'saCreate', { primary: true })} ${btn('CANCEL', 'closeModal', { text: true })}`); },
    saSlug(val) { const s = val.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30); mh.querySelector('#gcp-sid').value = s; mh.querySelector('#gcp-saemail').textContent = `${s}@${P().id}.iam.gserviceaccount.com`; },
    saCreate() {
      const p = P(); const d = UI.form(mh);
      if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(d.sid)) { mh.querySelector('#gerr').textContent = 'Service account ID must be 6-30 characters: lowercase letters, digits and hyphens, starting with a letter.'; return; }
      const email = `${d.sid}@${p.id}.iam.gserviceaccount.com`;
      if (p.serviceAccounts.some(s => s.email === email)) { mh.querySelector('#gerr').textContent = 'Service account already exists.'; return; }
      p.serviceAccounts.push({ email, name: d.name || d.sid, desc: d.desc });
      if (d.role) p.iam.push({ principal: 'serviceAccount:' + email, roles: [d.role] });
      closeModal(); Store.commit(); toast('Service account created');
    },
    saDelete() { const p = P(); p.serviceAccounts = p.serviceAccounts.filter(s => !v.sel.includes(s.email)); p.iam = p.iam.filter(x => !v.sel.some(e => x.principal === 'serviceAccount:' + e)); v.sel = []; Store.commit(); },
  };
  const slug = n => (n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'project').slice(0, 22) + '-' + UI.int(100000, 999999);

  // ---------- integração com o terminal ----------
  function targets() {
    return S().projects.flatMap(p => p.instances.map(vm => ({
      provider: 'gcp', id: vm.id, name: vm.name, ip: vm.externalIp, dns: null, running: vm.status === 'RUNNING', distro: vm.distro,
      users: ['aluno'], hostname: vm.name, privateIp: vm.internalIp, allows: (proto, port) => fwAllows(p, vm, proto, port), project: p.id, zone: vm.zone,
    })));
  }

  const cli = {
    publicObject(url) {
      const [, bn, ...rest] = url.pathname.split('/');
      const key = decodeURIComponent(rest.join('/'));
      const b = S().projects.flatMap(p => p.buckets).find(x => x.name === bn);
      const xml = (code, msg) => ({ status: code === 'NoSuchKey' || code === 'NoSuchBucket' ? 404 : 403, body: `<?xml version='1.0' encoding='UTF-8'?><Error><Code>${code}</Code><Message>${msg}</Message></Error>` });
      if (!b) return xml('NoSuchBucket', 'The specified bucket does not exist.');
      if (!bucketPublic(b)) return xml('AccessDenied', 'Access denied.<Details>Anonymous caller does not have storage.objects.get access to the Google Cloud Storage object. Permission \'storage.objects.get\' denied on resource (or it may not exist).</Details>');
      const o = b.objects.find(x => x.key === key);
      if (!o) return xml('NoSuchKey', 'The specified key does not exist.');
      return { status: 200, body: o.content != null ? o.content : `(conteúdo binário de ${o.key}, ${o.size} bytes)` };
    },

    async gcloud(a, ctx, api) {
      const proj = () => S().projects.find(p => p.id === (ctx.h.gcloudProject || S().current));
      const flag = n => { const i = a.findIndex(x => x === '--' + n || x.startsWith('--' + n + '=')); if (i < 0) return null; return a[i].includes('=') ? a[i].split('=').slice(1).join('=') : a[i + 1]; };
      const pos = a.filter((x, i) => !x.startsWith('--') && !(a[i - 1] && a[i - 1].startsWith('--') && !a[i - 1].includes('=') && !['--quiet', '--force'].includes(a[i - 1])));
      const [g1, g2, g3, g4] = pos;
      const table = (head, rows) => { const w = head.map((h, k) => Math.max(h.length, ...rows.map(r => String(r[k]).length))); ctx.out([head, ...rows].map(r => r.map((c, k) => String(c).padEnd(w[k])).join('  ')).join('\n')); };
      const needCompute = (p, cmd) => { if (p.apis.compute) return true; ctx.err(`ERROR: (gcloud.${cmd}) PERMISSION_DENIED: Compute Engine API has not been used in project ${p.number} before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/compute.googleapis.com/overview?project=${p.number} then retry.`); return false; };
      if (!g1 || g1 === 'help') { ctx.out('Usage: gcloud GROUP | COMMAND [optional flags]\n\nNo laboratório:\n  gcloud config list | config set project ID\n  gcloud projects list\n  gcloud compute instances list | create | start | stop | delete\n  gcloud compute ssh NOME [--zone ZONA]\n  gcloud compute firewall-rules list\n  gcloud storage ls | buckets create | cp'); return 0; }
      if (g1 === '--version' || g1 === 'version') { ctx.out('Google Cloud SDK 496.0.0\nbq 2.1.9\ncore 2024.10.04\ngcloud-crc32c 1.0.0\ngsutil 5.31'); return 0; }
      if (g1 === 'auth' && g2 === 'list') { ctx.out(`Credentialed Accounts\nACTIVE  ACCOUNT\n*       ${ME}\n\nTo set the active account, run:\n    $ gcloud config set account \`ACCOUNT\``); return 0; }
      if (g1 === 'config') {
        if (g2 === 'list') { ctx.out(`[core]\naccount = ${ME}\ndisable_usage_reporting = True\nproject = ${proj() ? proj().id : '(unset)'}\n\nYour active configuration is: [default]`); return 0; }
        if (g2 === 'set' && g3 === 'project') { const p = S().projects.find(x => x.id === g4); ctx.h.gcloudProject = g4; if (!p) ctx.err(`WARNING: [${ME}] does not have permission to access projects instance [${g4}] (or it may not exist): The caller does not have permission. This command is authenticated as ${ME} which is the active account specified by the [core/account] property`); ctx.err('Updated property [core/project].'); return 0; }
      }
      if (g1 === 'projects' && g2 === 'list') { table(['PROJECT_ID', 'NAME', 'PROJECT_NUMBER'], S().projects.map(p => [p.id, p.name, p.number])); return 0; }
      const p = proj();
      if (!p) { ctx.err('ERROR: (gcloud) The project property is set to an invalid project. Use gcloud config set project PROJECT_ID'); return 1; }
      if (g1 === 'services' && g2 === 'enable') { if (g3 === 'compute.googleapis.com') { ctx.out(`Operation "operations/acf.p2-${p.number}-${UI.rand(8)}" in progress...`); await api.sleep(1500); enableCompute(p); Store.commit(); ctx.out(`Operation "operations/acf.p2-${p.number}" finished successfully.`); return 0; } ctx.out('Operation finished successfully.'); return 0; }
      if (g1 === 'compute') {
        if (!needCompute(p, `compute.${g2}.${g3 || ''}`.replace(/\.$/, ''))) return 1;
        const zoneOf = name => { const z = flag('zone'); const list = p.instances.filter(i => i.name === name && (!z || i.zone === z)); return list; };
        if (g2 === 'instances') {
          if (g3 === 'list') { table(['NAME', 'ZONE', 'MACHINE_TYPE', 'PREEMPTIBLE', 'INTERNAL_IP', 'EXTERNAL_IP', 'STATUS'], p.instances.map(i => [i.name, i.zone, i.machine, '', i.internalIp, i.externalIp || '', i.status])); if (!p.instances.length) ctx.err('Listed 0 items.'); return 0; }
          if (g3 === 'create') {
            if (!g4) { ctx.err('ERROR: (gcloud.compute.instances.create) argument INSTANCE_NAMES [INSTANCE_NAMES ...]: Must be specified.'); return 2; }
            const zone = flag('zone') || 'us-central1-a';
            if (!REGIONS.some(r => r.zones.some(z => `${r.id}-${z}` === zone))) { ctx.err(`ERROR: (gcloud.compute.instances.create) Could not fetch resource:\n - Invalid value for field 'zone': '${zone}'. Unknown zone.`); return 1; }
            const e = nameErr(g4, p); if (e) { ctx.err(`ERROR: (gcloud.compute.instances.create) Could not fetch resource:\n - ${e}`); return 1; }
            const fam = flag('image-family') || 'debian-12'; const img = IMAGES.find(i => i.family === fam || i.id === fam) || IMAGES[0];
            const tags = (flag('tags') || '').split(',').filter(Boolean);
            const machine = machineOf(flag('machine-type') || 'e2-medium').id;
            const vm = createVm(p, { name: g4, zone, machine, image: img.id, disk: (flag('boot-disk-size') || '10').replace(/GB$/i, ''), diskType: flag('boot-disk-type') || 'pd-balanced', http: tags.includes('http-server'), https: tags.includes('https-server') });
            vm.tags = tags;
            ctx.out(`Created [https://www.googleapis.com/compute/v1/projects/${p.id}/zones/${zone}/instances/${g4}].`);
            table(['NAME', 'ZONE', 'MACHINE_TYPE', 'PREEMPTIBLE', 'INTERNAL_IP', 'EXTERNAL_IP', 'STATUS'], [[vm.name, vm.zone, vm.machine, '', vm.internalIp, vm.externalIp, 'RUNNING']]);
            Store.commit(); return 0;
          }
          if (['start', 'stop', 'delete', 'reset'].includes(g3)) {
            const list = zoneOf(g4);
            if (!g4) { ctx.err(`ERROR: (gcloud.compute.instances.${g3}) argument INSTANCE_NAMES [INSTANCE_NAMES ...]: Must be specified.`); return 2; }
            if (!list.length) { ctx.err(`ERROR: (gcloud.compute.instances.${g3}) Could not fetch resource:\n - The resource 'projects/${p.id}/zones/${flag('zone') || 'ZONE'}/instances/${g4}' was not found`); return 1; }
            const vm = list[0];
            if (g3 === 'delete' && !a.includes('--quiet') && !a.includes('-q')) { ctx.out(`The following instances will be deleted. Any attached disks configured to be auto-deleted will be deleted unless they are attached to any other instances or the \`--keep-disks\` flag is given and specifies them for keeping. Deleting a disk is irreversible and any data on the disk will be lost.\n - [${vm.name}] in [${vm.zone}]\n`); if (!/^(y|yes|)$/i.test((await api.ask('Do you want to continue (Y/n)?  ')).trim())) { ctx.err('ERROR: (gcloud.compute.instances.delete) Aborted by user.'); return 1; } }
            const err = setVm(p, vm, g3);
            if (err) { ctx.err(`ERROR: (gcloud.compute.instances.delete) Could not fetch resource:\n - ${err}`); return 1; }
            ctx.out(`${g3 === 'delete' ? 'Deleted' : 'Updated'} [https://compute.googleapis.com/compute/v1/projects/${p.id}/zones/${vm.zone}/instances/${vm.name}].`);
            Store.commit(); return 0;
          }
        }
        if (g2 === 'firewall-rules' && g3 === 'list') { table(['NAME', 'NETWORK', 'DIRECTION', 'PRIORITY', 'ALLOW', 'DENY', 'DISABLED'], p.firewall.map(r => [r.name, 'default', r.direction, r.priority, r.action === 'ALLOW' ? (r.protos === 'all' ? 'all' : r.protos.join(',')) : '', r.action === 'DENY' ? (r.protos === 'all' ? 'all' : r.protos.join(',')) : '', 'False'])); return 0; }
        if (g2 === 'ssh') {
          if (!g3) { ctx.err('ERROR: (gcloud.compute.ssh) argument [USER@]INSTANCE: Must be specified.'); return 2; }
          const name = g3.includes('@') ? g3.split('@')[1] : g3;
          const user = g3.includes('@') ? g3.split('@')[0] : ctx.user;
          const list = zoneOf(name);
          if (!list.length) { ctx.err(`ERROR: (gcloud.compute.ssh) Could not fetch resource:\n - The resource 'projects/${p.id}/zones/${flag('zone') || '?'}/instances/${name}' was not found`); return 1; }
          if (list.length > 1 && !flag('zone')) { ctx.err('ERROR: (gcloud.compute.ssh) Use --zone para escolher entre instâncias com o mesmo nome.'); return 1; }
          const vm = list[0];
          if (vm.status !== 'RUNNING') { ctx.err(`ERROR: (gcloud.compute.ssh) [/usr/bin/ssh] exited with return code [255].\nssh: connect to host ${vm.externalIp || vm.internalIp} port 22: Connection timed out`); return 1; }
          const keyPath = ctx.home + '/.ssh/google_compute_engine';
          if (!api.getNode(ctx.h, keyPath)) {
            ctx.out(`WARNING: The private SSH key file for gcloud does not exist.\nWARNING: The public SSH key file for gcloud does not exist.\nWARNING: You do not have an SSH key for gcloud.\nWARNING: SSH keygen will be executed to generate a key.\nGenerating public/private rsa key pair.\nYour identification has been saved in ${keyPath}\nYour public key has been saved in ${keyPath}.pub`);
            if (!api.getNode(ctx.h, ctx.home + '/.ssh')) { ctx.h.fs.c.home.c[ctx.user] && (ctx.h.fs.c.home.c[ctx.user].c['.ssh'] = { t: 'd', o: ctx.user, m: 0o700, c: {}, mt: Date.now() }); }
            api.writeFile(ctx.h, keyPath, `-----BEGIN RSA PRIVATE KEY-----\n${UI.rand(64, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')}\n-----END RSA PRIVATE KEY-----\n`, ctx);
            const kn = api.getNode(ctx.h, keyPath); if (kn) kn.m = 0o600;
            ctx.out(`Updating project ssh metadata...done.\nWaiting for SSH key to propagate.`);
            await api.sleep(1200);
          }
          if (!fwAllows(p, vm, 'TCP', 22)) { await api.sleep(1500); ctx.err(`ssh: connect to host ${vm.externalIp} port 22: Connection timed out\nERROR: (gcloud.compute.ssh) [/usr/bin/ssh] exited with return code [255].`); return 255; }
          const t = targets().find(x => x.id === vm.id);
          api.connectTo(t, user, ctx);
          return 0;
        }
      }
      if (g1 === 'storage') {
        const gs = x => { const m = /^gs:\/\/([^/]+)\/?(.*)$/.exec(x || ''); return m ? { b: m[1], k: m[2] } : null; };
        const bk = n => p.buckets.find(b => b.name === n);
        if (g2 === 'ls') {
          const t = gs(g3);
          if (!t) { p.buckets.forEach(b => ctx.out(`gs://${b.name}/`)); return 0; }
          const b = bk(t.b); if (!b) { ctx.err(`ERROR: (gcloud.storage.ls) gs://${t.b} not found: 404.`); return 1; }
          b.objects.filter(o => o.key.startsWith(t.k)).forEach(o => ctx.out(`gs://${b.name}/${o.key}`)); return 0;
        }
        if (g2 === 'buckets' && g3 === 'create') {
          const t = gs(g4); if (!t) { ctx.err('ERROR: (gcloud.storage.buckets.create) argument URL: Must be specified.'); return 2; }
          const e = bucketNameErr(t.b); if (e) { ctx.err(`ERROR: (gcloud.storage.buckets.create) HTTPError ${/in use/.test(e) ? '409: The requested bucket name is not available. The bucket namespace is shared by all users of the system. Please select a different name and try again.' : '400: Invalid bucket name: ' + t.b}`); return 1; }
          ctx.out(`Creating gs://${t.b}/...`); makeBucket(p, { name: t.b, location: (flag('location') || 'us').toLowerCase(), locType: (flag('location') || 'us').includes('-') ? 'Region' : 'Multi-region' }); Store.commit(); return 0;
        }
        if (g2 === 'cp') {
          const [src, dst] = [g3, g4];
          const s = gs(src), d = gs(dst);
          if (!s && d) { const n = api.getNode(ctx.h, ctx.p(src)); if (!n || n.t !== 'f') { ctx.err(`ERROR: (gcloud.storage.cp) The following URLs matched no objects or files:\n-${src}`); return 1; } const b = bk(d.b); if (!b) { ctx.err(`ERROR: (gcloud.storage.cp) gs://${d.b} not found: 404.`); return 1; } const key = !d.k || d.k.endsWith('/') ? d.k + api.split(ctx.p(src))[1] : d.k; b.objects = b.objects.filter(o => o.key !== key); b.objects.push({ key, size: n.d.length, type: 'text/plain', content: n.d, modified: Date.now() }); ctx.out(`Copying file://${src} to gs://${b.name}/${key}\n  Completed files 1/1 | ${n.d.length}B`); Store.commit(); return 0; }
          if (s && !d) { const b = bk(s.b); const o = b && b.objects.find(x => x.key === s.k); if (!o) { ctx.err(`ERROR: (gcloud.storage.cp) The following URLs matched no objects or files:\n-${src}`); return 1; } let target = ctx.p(dst); const dn = api.getNode(ctx.h, target); if (dn && dn.t === 'd') target += '/' + o.key.split('/').pop(); const e = api.writeFile(ctx.h, target, o.content || '', ctx); if (e) { ctx.err(e); return 1; } ctx.out(`Copying gs://${b.name}/${o.key} to file://${dst}\n  Completed files 1/1 | ${o.size}B`); return 0; }
          ctx.err('ERROR: use cp entre arquivo local e gs://'); return 1;
        }
        if (g2 === 'rm') { const t = gs(g3); const b = t && bk(t.b); if (!b) { ctx.err('ERROR: (gcloud.storage.rm) not found'); return 1; } b.objects = b.objects.filter(o => o.key !== t.k); ctx.out(`Removing gs://${b.name}/${t.k}...`); Store.commit(); return 0; }
      }
      ctx.err(`ERROR: (gcloud) Invalid choice: '${pos.join(' ')}'.\nNo laboratório, digite "gcloud help" para ver os comandos suportados.`);
      return 2;
    },
    async gsutil(a, ctx, api) {
      const [cmd, ...rest] = a;
      if (cmd === 'ls') return cli.gcloud(['storage', 'ls', ...rest], ctx, api);
      if (cmd === 'mb') return cli.gcloud(['storage', 'buckets', 'create', ...rest.filter(x => !x.startsWith('-'))], ctx, api);
      if (cmd === 'cp') return cli.gcloud(['storage', 'cp', ...rest], ctx, api);
      if (cmd === 'rm') return cli.gcloud(['storage', 'rm', ...rest], ctx, api);
      ctx.out('Usage: gsutil [ls|mb|cp|rm] ... (no laboratório)'); return 1;
    },
  };

  function tick() {
    let ch = Store.advance(S().ops);
    for (const p of S().projects) if (Store.advance(p.instances)) ch = true;
    for (const p of S().projects) if (p.enabling && Date.now() - p.enabling > 3500) { enableCompute(p); ch = true; }
    return ch;
  }
  function init(el) {
    root = el;
    root.innerHTML = '<div class="frame"></div><div class="modal-host"></div><div class="toasts"></div>';
    frame = root.querySelector('.frame'); mh = root.querySelector('.modal-host'); th = root.querySelector('.toasts');
    UI.bind(root, H, e => { if (v.menu && !e.target.closest('.dd, .gnav, [data-id="nav"]')) { v.menu = null; render(); } });
    render();
  }
  return { init, render, refresh, tick, targets, cli, onShow: render };
})();
