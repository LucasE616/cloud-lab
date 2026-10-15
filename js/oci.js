/* Cloud Lab — Console Oracle Cloud Infrastructure simulado (Compute, Networking, Object Storage, Identity) */
'use strict';

const OCI = (() => {
  const { esc, ICON } = UI;
  const MY_IP = '203.0.113.25';
  const B32 = 'abcdefghijklmnopqrstuvwxyz234567';
  const ocid = (type, region = 'sa-saopaulo-1') => `ocid1.${type}.oc1.${type === 'tenancy' || type === 'compartment' || type === 'user' || type === 'group' || type === 'policy' ? '' : (REGIONS.find(r => r.id === region) || {}).code || 'gru'}.aaaaaaaa${UI.rand(52, B32)}`;
  const shortOcid = id => `...${id.slice(-6)}`;

  const REGIONS = [
    { id: 'sa-saopaulo-1', name: 'Brazil East (Sao Paulo)', code: 'gru' },
    { id: 'sa-vinhedo-1', name: 'Brazil Southeast (Vinhedo)', code: 'vcp' },
    { id: 'us-ashburn-1', name: 'US East (Ashburn)', code: 'iad' },
    { id: 'us-phoenix-1', name: 'US West (Phoenix)', code: 'phx' },
    { id: 'eu-frankfurt-1', name: 'Germany Central (Frankfurt)', code: 'fra' },
  ];
  const IMAGES = [
    { id: 'ol8', name: 'Oracle Linux 8', build: 'Oracle-Linux-8.10-2024.09.30-0', distro: 'oracle', user: 'opc', color: '#c74634' },
    { id: 'ol9', name: 'Oracle Linux 9', build: 'Oracle-Linux-9.4-2024.09.30-0', distro: 'oracle', user: 'opc', color: '#c74634' },
    { id: 'ubuntu', name: 'Canonical Ubuntu 22.04', build: 'Canonical-Ubuntu-22.04-2024.09.27-0', distro: 'ubuntu22', user: 'ubuntu', color: '#e95420' },
    { id: 'centos', name: 'CentOS Stream 9', build: 'CentOS-Stream-9-2024.09.11-0', distro: 'centos', user: 'opc', color: '#262577' },
    { id: 'windows', name: 'Windows Server 2022 Standard', build: 'Windows-Server-2022-Standard-Edition-VM-2024.09.10-0', distro: 'windows', user: 'opc', color: '#0078d4' },
  ];
  const SHAPES = [
    { id: 'VM.Standard.E2.1.Micro', proc: 'AMD EPYC 7551', ocpu: 1, mem: 1, free: true, flex: false, bw: 0.48 },
    { id: 'VM.Standard.A1.Flex', proc: 'Ampere Altra (ARM)', ocpu: 1, mem: 6, free: true, flex: true, max: 4, bw: 1 },
    { id: 'VM.Standard.E4.Flex', proc: 'AMD EPYC 7J13', ocpu: 1, mem: 16, flex: true, max: 64, bw: 1 },
    { id: 'VM.Standard3.Flex', proc: 'Intel Xeon Platinum 8358', ocpu: 1, mem: 16, flex: true, max: 32, bw: 1 },
  ];
  const VERBS = ['inspect', 'read', 'use', 'manage'];
  const RTYPES = ['all-resources', 'instance-family', 'instances', 'virtual-network-family', 'vcns', 'subnets', 'object-family', 'buckets', 'objects', 'volume-family', 'compartments', 'users', 'groups', 'policies', 'database-family'];

  Store.register('oci', () => {
    const rootId = ocid('tenancy');
    return {
      region: 'sa-saopaulo-1', tenancy: 'aluno-tenancy', namespace: UI.rand(12, 'abcdefghijklmnopqrstuvwxyz0123456789'),
      compartments: [{ id: rootId, name: 'aluno-tenancy', root: true, desc: 'The root compartment of the tenancy', created: Date.now() - 864e5 * 10 }],
      vcns: [], instances: [], buckets: [],
      users: [{ name: 'aluno@example.com', desc: 'Administrador do laboratório', email: 'aluno@example.com', created: Date.now() - 864e5 * 10, groups: ['Administrators'] }],
      groups: [{ name: 'Administrators', desc: 'Administrators of the tenancy', created: Date.now() - 864e5 * 10 }],
      policies: [{ name: 'Tenant Admin Policy', desc: 'Tenant Admin Policy', comp: rootId, statements: ['ALLOW GROUP Administrators to manage all-resources IN TENANCY'], created: Date.now() - 864e5 * 10 }],
    };
  });

  let root, frame, mh, th;
  const v = { area: 'home', page: null, id: null, sel: [], form: false, tab: null, data: {}, menu: null, comp: null, flash: null };
  const S = () => Store.s.oci;
  const region = () => REGIONS.find(r => r.id === S().region);
  const rootComp = () => S().compartments.find(c => c.root);
  const comp = id => S().compartments.find(c => c.id === id) || rootComp();
  const curComp = () => comp(v.comp || rootComp().id);
  const imageOf = id => IMAGES.find(i => i.id === id) || IMAGES[0];
  const shapeOf = id => SHAPES.find(s => s.id === id) || SHAPES[0];
  const nowName = p => `${p}-${UI.stamp()}`;

  // ---------- componentes (Redwood) ----------
  const btn = (label, act, o = {}) => `<button class="btn ${o.primary ? 'primary' : ''} ${o.danger ? 'danger' : ''} ${o.cls || ''}" data-act="${act}" ${o.data || ''} ${o.disabled ? 'disabled' : ''}>${label}</button>`;
  const link = (label, act, data = '') => `<a class="lnk" data-act="${act}" ${data}>${label}</a>`;
  const field = (label, inner, help = '', err = '') => `<div class="field"><label>${label}</label>${inner}${help ? `<p class="help">${help}</p>` : ''}${err ? `<p class="ferr">${err}</p>` : ''}</div>`;
  const kv = pairs => `<dl class="kv">${pairs.map(([k, x]) => `<div><dt>${k}:</dt><dd>${x === '' || x == null ? '-' : x}</dd></div>`).join('')}</dl>`;
  const note = (kind, html) => `<div class="note ${kind}">${ICON[kind === 'error' ? 'err' : kind === 'warning' ? 'warn' : kind === 'success' ? 'ok' : 'info']}<div>${html}</div></div>`;
  const panel = (title, inner, acts = '') => `<section class="panel"><div class="panel-h"><h3>${title}</h3><div>${acts}</div></div><div class="panel-b">${inner}</div></section>`;
  const toast = (html, kind = 'success') => UI.toast(th, html, kind);
  const closeModal = () => { mh.innerHTML = ''; };
  function modal(title, body, footer, cls = '') {
    return UI.modal(mh, `<div class="m-h"><h3>${title}</h3><button class="x" data-act="closeModal">${ICON.close}</button></div><div class="m-b">${body}</div><div class="m-f">${footer}</div>`, 'side ' + cls);
  }
  function stateBadge(st) {
    const c = { RUNNING: 'g', AVAILABLE: 'g', ACTIVE: 'g', PROVISIONING: 'o', STARTING: 'o', STOPPING: 'o', TERMINATING: 'o', STOPPED: 'r', TERMINATED: 'n' }[st] || 'n';
    return `<span class="state s-${c}"><i></i>${st.charAt(0) + st.slice(1).toLowerCase()}</span>`;
  }
  function bigState(st) {
    const c = { RUNNING: 'g', AVAILABLE: 'g', ACTIVE: 'g', PROVISIONING: 'o', STARTING: 'o', STOPPING: 'o', TERMINATING: 'o', STOPPED: 'r', TERMINATED: 'n' }[st] || 'n';
    return `<div class="big-state b-${c}"><div>${c === 'o' ? ICON.pending : ICON.terminal}</div><span>${st}</span></div>`;
  }
  const compSelect = (name = 'comp', sel) => `<select name="${name}" class="w-full">${S().compartments.map(c => `<option value="${c.id}" ${c.id === (sel || curComp().id) ? 'selected' : ''}>${esc(c.root ? c.name + ' (root)' : rootComp().name + ' (root)/' + c.name)}</option>`).join('')}</select>`;

  function go(area, page = null, id = null, extra = {}) {
    if (v.flash && !v.flash.fresh) v.flash = null;
    Object.assign(v, { area, page, id, sel: [], form: false, tab: null, data: {}, menu: null }, extra);
    render();
  }

  // ---------- estrutura ----------
  const MENU = [
    ['Compute', [['compute', 'instances', 'Instances'], [null, null, 'Dedicated Virtual Machine Hosts'], [null, null, 'Instance Configurations'], [null, null, 'Autoscaling Configurations']]],
    ['Storage', [['storage', 'buckets', 'Buckets'], [null, null, 'Block Volumes'], [null, null, 'File Systems']]],
    ['Networking', [['networking', 'vcns', 'Virtual cloud networks'], [null, null, 'Load balancers'], [null, null, 'DNS management']]],
    ['Identity & Security', [['identity', 'compartments', 'Compartments'], ['identity', 'users', 'Users'], ['identity', 'groups', 'Groups'], ['identity', 'policies', 'Policies'], [null, null, 'Vault']]],
    ['Databases', [[null, null, 'Autonomous Database'], [null, null, 'MySQL HeatWave']]],
  ];
  const SIDE = {
    compute: ['Compute', [['instances', 'Instances'], [null, 'Dedicated Virtual Machine Hosts'], [null, 'Instance Configurations'], [null, 'Instance Pools'], [null, 'Custom Images'], [null, 'Boot Volumes']]],
    storage: ['Object Storage & Archive Storage', [['buckets', 'Buckets'], [null, 'Private Endpoints']]],
    networking: ['Networking', [['vcns', 'Virtual cloud networks'], [null, 'Network Load Balancers'], [null, 'Customer connectivity']]],
    identity: ['Identity', [['compartments', 'Compartments'], ['users', 'Users'], ['groups', 'Groups'], ['policies', 'Policies'], [null, 'Dynamic groups']]],
  };

  function header() {
    return `<header class="oci-top">
      <button class="hb" data-act="menu" data-id="nav" title="Navigation menu">${ICON.menu}</button>
      <a class="oci-logo" data-act="home"><b>ORACLE</b> Cloud</a>
      <div class="oci-search">${ICON.search}<input placeholder="Search resources, services, documentation, and Marketplace" data-enter="search" id="oci-q"></div>
      <div class="oci-right">
        <div class="dd ${v.menu === 'region' ? 'open' : ''}"><button class="hdr-btn" data-act="menu" data-id="region">${esc(region().name)} ${ICON.caret}</button>
          ${v.menu === 'region' ? `<div class="dd-menu right">${REGIONS.map(r => `<button data-act="setRegion" data-id="${r.id}" class="${r.id === S().region ? 'cur' : ''}">${esc(r.name)}<small>${r.id}</small></button>`).join('')}<hr><button data-act="na">Manage regions</button></div>` : ''}</div>
        <button class="hdr-ic" data-act="cloudshell" title="Developer tools (Cloud Shell)">${ICON.terminal}</button>
        <button class="hdr-ic" data-act="noop" title="Announcements">${ICON.bell}</button>
        <button class="hdr-ic" data-act="noop" title="Help">${ICON.help}</button>
        <div class="dd ${v.menu === 'profile' ? 'open' : ''}"><button class="avatar" data-act="menu" data-id="profile">A</button>
          ${v.menu === 'profile' ? `<div class="dd-menu right prof"><p><b>Profile</b><br>aluno@example.com<br><small>Default domain</small></p><p><b>Tenancy:</b> ${esc(S().tenancy)}</p><p><small>Object storage namespace: ${esc(S().namespace)}</small></p><hr><button data-act="noop">Sign out</button></div>` : ''}</div>
      </div>
    </header>
    ${v.menu === 'nav' ? `<div class="oci-nav"><div class="nav-in"><div class="nav-h"><b>Home</b><button data-act="menu" data-id="nav">${ICON.close}</button></div><div class="nav-grid">${MENU.map(([cat, items]) => `<div><h4>${cat}</h4>${items.map(([a, p, l]) => `<a class="${a ? '' : 'na'}" data-act="${a ? 'goto' : 'na'}" data-area="${a || ''}" data-page="${p || ''}">${l}</a>`).join('')}</div>`).join('')}</div></div></div>` : ''}`;
  }

  function side() {
    const sd = SIDE[v.area];
    if (!sd) return '';
    const parent = { create: 'instances', instance: 'instances', bucket: 'buckets', vcn: 'vcns', wizard: 'vcns', group: 'groups', createPolicy: 'policies' }[v.page] || v.page;
    const scoped = v.area !== 'identity' || v.page === 'policies';
    return `<aside class="oci-side"><h2>${sd[0]}</h2><nav>${sd[1].map(([p, l]) => `<a class="${p === parent ? 'on' : ''} ${p ? '' : 'na'}" data-act="${p ? 'nav' : 'na'}" data-id="${p || ''}">${l}</a>`).join('')}</nav>
      ${scoped && ['instances', 'buckets', 'vcns', 'policies'].includes(v.page) ? `<div class="scope"><h4>List scope</h4>${field('Compartment', `<select data-change="setComp" class="w-full">${S().compartments.map(c => `<option value="${c.id}" ${c.id === curComp().id ? 'selected' : ''}>${esc(c.name)}${c.root ? ' (root)' : ''}</option>`).join('')}</select>`)}<p class="help">${esc(rootComp().name)} (root)${curComp().root ? '' : '/' + esc(curComp().name)}</p></div>` : ''}
      ${v.page === 'instances' ? `<div class="scope"><h4>Filters</h4>${field('State', `<select class="w-full" data-change="stateFilter"><option value="">Any state</option>${['RUNNING', 'STOPPED', 'TERMINATED'].map(x => `<option ${v.data.stf === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}</div>` : ''}</aside>`;
  }

  function crumbs() {
    if (v.area === 'home') return '';
    const sd = SIDE[v.area];
    const names = { instances: 'Instances', create: 'Create compute instance', instance: 'Instance details', buckets: 'Buckets', bucket: 'Bucket Details', vcns: 'Virtual Cloud Networks', vcn: 'Virtual Cloud Network Details', wizard: 'Start VCN Wizard', compartments: 'Compartments', users: 'Users', groups: 'Groups', group: 'Group Details', policies: 'Policies', createPolicy: 'Create Policy' };
    const parts = [`<a data-act="nav" data-id="${sd[1][0][0]}">${sd[0]}</a>`];
    const parent = { create: 'instances', instance: 'instances', bucket: 'buckets', vcn: 'vcns', wizard: 'vcns', group: 'groups', createPolicy: 'policies' }[v.page];
    if (parent) parts.push(`<a data-act="nav" data-id="${parent}">${names[parent]}</a>`);
    parts.push(`<span>${names[v.page] || ''}</span>`);
    return `<div class="crumbs">${parts.join('<i>»</i>')}</div>`;
  }

  function render() {
    const body = v.area === 'home' ? pHome() : (PAGES[v.page] || (() => panel('Em breve', '<p>Tela ainda não disponível no laboratório.</p>')))();
    const fl = v.flash ? `<div class="banner ${v.flash.kind}">${ICON[v.flash.kind === 'success' ? 'ok' : 'info']}<div>${v.flash.html}</div><button data-act="closeFlash">${ICON.close}</button></div>` : '';
    UI.paint(frame, `${header()}<div class="oci-body">${side()}<main class="oci-main ${v.area === 'home' ? 'home' : ''}" data-scroll="main">${crumbs()}${fl}${body}</main></div>`, `${v.area}:${v.page}:${v.id}`);
    if (v.flash) v.flash.fresh = false;
  }
  function refresh() { if (!v.form && root && root.classList.contains('active')) render(); }
  const flash = (kind, html) => { v.flash = { kind, html, fresh: true }; };

  // ---------- home ----------
  function pHome() {
    const s = S();
    const tiles = [
      ['Create a VM instance', 'Compute · 2-6 mins', 'compute', 'create', '#4c825c'],
      ['Set up a network with a wizard', 'Networking · 2-3 mins', 'networking', 'wizard', '#2d5967'],
      ['Store data in Object Storage', 'Storage · 2-3 mins', 'storage', 'buckets', '#ae562c'],
      ['Manage users, groups and policies', 'Identity · 3-5 mins', 'identity', 'policies', '#7e6b9e'],
    ];
    return `<div class="hero"><div><h1>Get started</h1><p>Tudo aqui é <b>simulado</b> — pratique sem custo e sem risco.</p></div><div class="hero-acts">${btn('Dashboard', 'noop')} ${btn('Get started', 'noop', { primary: true })}</div></div>
      <h2 class="sec">Launch resources</h2>
      <div class="tiles">${tiles.map(([t, d, a, p, c]) => `<a class="tile" data-act="goto" data-area="${a}" data-page="${p}"><i style="background:${c}">${ICON.terminal}</i><div><b>${t}</b><small>${d}</small></div></a>`).join('')}</div>
      <div class="home-cols">
        ${panel('Always Free resources', `<p>Recursos que ficam gratuitos para sempre em contas reais da OCI:</p><ul class="list"><li><b>2</b> VMs AMD <code>VM.Standard.E2.1.Micro</code></li><li>Até <b>4 OCPUs e 24 GB</b> de VMs Ampere <code>VM.Standard.A1.Flex</code></li><li><b>20 GB</b> de Object Storage</li><li><b>2</b> VCNs</li></ul>`)}
        ${panel('Your resources', kv([['Region', esc(region().name)], ['Instances', s.instances.filter(i => i.state !== 'TERMINATED').length], ['VCNs', s.vcns.length], ['Buckets', s.buckets.length], ['Compartments', s.compartments.length]]))}
        ${panel('Account center', kv([['Tenancy', esc(s.tenancy)], ['Home region', 'Brazil East (Sao Paulo)'], ['Subscription', 'Free Tier (simulado)'], ['Credits', 'US$ 300.00 restantes']]))}
      </div>`;
  }

  // ---------- compute ----------
  const regInst = () => S().instances.filter(i => i.region === S().region && i.comp === curComp().id);
  function pInstances() {
    const rows = regInst().filter(i => !v.data.stf || i.state === v.data.stf);
    const one = S().instances.find(i => i.id === v.sel[0]);
    return `<h1 class="pt">Instances <small>in <b>${esc(curComp().name)}</b> compartment</small></h1>
      <p class="pd">An instance is a compute host. Choose between virtual machines (VMs) and bare metal instances. The image that you use to launch an instance determines its operating system and other software.</p>
      <div class="toolbar">${btn('Create instance', 'nav', { primary: true, data: 'data-id="create"' })} ${dd('acts', 'Actions', [{ label: 'Start', act: 'instStart', disabled: !one || one.state !== 'STOPPED' }, { label: 'Stop', act: 'instStop', disabled: !one || one.state !== 'RUNNING' }, { label: 'Reboot', act: 'instReboot', disabled: !one || one.state !== 'RUNNING' }, '-', { label: 'Terminate', act: 'instTerminate', disabled: !one || ['TERMINATED', 'TERMINATING'].includes(one.state) }], !one)}</div>
      ${UI.table({
        select: 'single', selected: v.sel, rows,
        cols: [
          { h: 'Name', f: i => link(esc(i.name), 'openInst', `data-id="${i.id}"`) },
          { h: 'State', f: i => stateBadge(i.state) },
          { h: 'Public IP', f: i => i.publicIp || '-' },
          { h: 'Private IP', f: i => i.privateIp },
          { h: 'Shape', f: i => i.shape },
          { h: 'OCPU count', f: i => i.ocpu },
          { h: 'Memory (GB)', f: i => i.mem },
          { h: 'Availability domain', f: i => i.ad },
          { h: 'Fault domain', f: i => i.fd },
          { h: 'Created', f: i => UI.date(i.created) },
        ],
        empty: 'No items found.', emptyHint: 'Não há instâncias neste compartimento e região.',
      })}<p class="count">Showing ${rows.length} item${rows.length === 1 ? '' : 's'}</p>`;
  }
  function dd(id, label, items, disabled) {
    return `<div class="dd ${v.menu === id ? 'open' : ''}"><button class="btn" data-act="menu" data-id="${id}" ${disabled ? 'disabled' : ''}>${label} ${ICON.caret}</button>${v.menu === id ? `<div class="dd-menu">${items.map(i => i === '-' ? '<hr>' : `<button data-act="${i.act}" ${i.disabled ? 'disabled' : ''}>${i.label}</button>`).join('')}</div>` : ''}</div>`;
  }

  function pCreate() {
    v.form = true;
    const s = S();
    const vcns = s.vcns.filter(x => x.region === s.region);
    const d = v.data.draft || { name: nowName('instance'), comp: curComp().id, ad: 'AD-1', image: 'ol8', shape: 'VM.Standard.E2.1.Micro', ocpu: '1', mem: '6', net: vcns.length ? 'existing' : 'new', vcn: vcns[0] ? vcns[0].id : '', subnet: vcns[0] && vcns[0].subnets[0] ? vcns[0].subnets[0].id : '', pubip: true, ssh: 'generate', pubkey: '', bootSize: '' };
    const err = v.data.err || {};
    const img = imageOf(d.image), sh = shapeOf(d.shape);
    const vcn = vcns.find(x => x.id === d.vcn);
    return `<h1 class="pt">Create compute instance</h1><p class="pd">Create an instance to deploy and run applications, or save as a reusable Terraform stack for creating an instance with Resource Manager.</p>
      <div class="create" data-change="draft">
      ${panel('', `${field('Name', `<input name="name" class="w-full" value="${esc(d.name)}">`, '', err.name)}${field('Create in compartment', compSelect('comp', d.comp))}`)}
      ${panel('Placement', `<p class="help">The availability domain helps determine which shapes are available.</p><div class="radio-row">${['AD-1', 'AD-2', 'AD-3'].map(a => `<label class="rc ${d.ad === a ? 'on' : ''}"><input type="radio" name="ad" value="${a}" ${d.ad === a ? 'checked' : ''}><b>${a}</b><small>${esc(region().id.split('-')[1])}:${region().id.toUpperCase().replace(/-\d$/, '')}-${a}</small>${a === 'AD-1' ? '<span class="tag free">Always Free-eligible</span>' : ''}</label>`).join('')}</div>`)}
      ${panel('Image and shape', `<div class="sel-box"><div><h4>Image</h4><div class="img-tiles">${IMAGES.map(i => `<label class="img ${d.image === i.id ? 'on' : ''}"><input type="radio" name="image" value="${i.id}" ${d.image === i.id ? 'checked' : ''}><i style="background:${i.color}">${esc(i.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</i><b>${esc(i.name)}</b><small>${esc(i.build)}</small>${i.id !== 'windows' ? '<span class="tag free">Always Free-eligible</span>' : ''}</label>`).join('')}</div></div></div>
        <div class="sel-box"><h4>Shape</h4><div class="shape-list">${SHAPES.map(x => `<label class="shp ${d.shape === x.id ? 'on' : ''}"><input type="radio" name="shape" value="${x.id}" ${d.shape === x.id ? 'checked' : ''}><b>${x.id}</b><span>${x.proc}</span><span>${x.flex ? 'Flexible' : `${x.ocpu} core OCPU, ${x.mem} GB memory`}, ${x.bw} Gbps</span>${x.free ? '<span class="tag free">Always Free-eligible</span>' : ''}</label>`).join('')}</div>
        ${sh.flex ? `<div class="row">${field('Number of OCPUs', `<input name="ocpu" type="number" min="1" max="${sh.max}" value="${esc(d.ocpu)}" style="width:120px">`)}${field('Amount of memory (GB)', `<input name="mem" type="number" min="1" max="${sh.max * 16}" value="${esc(d.mem)}" style="width:140px">`)}</div>${sh.free ? note('info', 'Always Free: até 4 OCPUs e 24 GB de memória no total entre todas as instâncias A1.Flex.') : ''}` : ''}${err.shape ? note('error', err.shape) : ''}</div>`)}
      ${panel('Primary VNIC information', `<div class="radio-row">${[['existing', 'Select existing virtual cloud network'], ['new', 'Create new virtual cloud network']].map(([k, l]) => `<label class="rc ${d.net === k ? 'on' : ''}"><input type="radio" name="net" value="${k}" ${d.net === k ? 'checked' : ''}><b>${l}</b></label>`).join('')}</div>
        ${d.net === 'existing' ? (vcns.length ? `<div class="row">${field('Virtual cloud network', `<select name="vcn">${vcns.map(x => `<option value="${x.id}" ${x.id === d.vcn ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`)}${field('Subnet', `<select name="subnet">${(vcn || vcns[0]).subnets.map(sn => `<option value="${sn.id}" ${sn.id === d.subnet ? 'selected' : ''}>${esc(sn.name)} (${sn.public ? 'regional public' : 'private'} ${sn.cidr})</option>`).join('')}</select>`)}</div>` : note('warning', 'No virtual cloud networks found in this compartment and region. Escolha "Create new virtual cloud network" ou use o <a class="lnk" data-act="goto" data-area="networking" data-page="wizard">VCN Wizard</a>.'))
        : `<div class="row">${field('New virtual cloud network name', `<input name="newVcn" value="${esc(d.newVcn || nowName('vcn'))}" style="width:300px">`)}${field('New subnet name', `<input name="newSubnet" value="${esc(d.newSubnet || nowName('subnet'))}" style="width:300px">`)}</div><p class="help">CIDR block: 10.0.0.0/16 · Subnet: 10.0.0.0/24 (public) · inclui internet gateway e security list padrão (SSH liberado).</p>`}
        ${err.net ? note('error', err.net) : ''}
        <div class="checks"><label><input type="checkbox" name="pubip" ${d.pubip ? 'checked' : ''}> Automatically assign public IPv4 address</label></div>`)}
      ${panel('Add SSH keys', `<p class="help">Generate an SSH key pair to connect to the instance using a Secure Shell (SSH) connection, or upload a public key that you already have.</p>
        <div class="radio-row">${[['generate', 'Generate a key pair for me'], ['paste', 'Paste public key'], ['none', 'No SSH keys']].map(([k, l]) => `<label class="rc ${d.ssh === k ? 'on' : ''}"><input type="radio" name="ssh" value="${k}" ${d.ssh === k ? 'checked' : ''}><b>${l}</b></label>`).join('')}</div>
        ${d.ssh === 'generate' ? `${note('warning', 'Download the private key so that you can connect to the instance using SSH. <b>It will not be shown again.</b>')}<div class="row">${btn('Save private key', 'savePriv')} ${btn('Save public key', 'savePub')}</div>${v.data.keySaved ? `<p class="help ok">${ICON.ok} Chave privada salva em <code>~/Downloads/${esc(v.data.keyFile)}</code> no terminal Linux.</p>` : ''}`
        : d.ssh === 'paste' ? `${field('SSH keys', `<textarea name="pubkey" class="w-full" rows="3" placeholder="ssh-ed25519 AAAA... usuario@host">${esc(d.pubkey)}</textarea>`, 'Dica: gere uma chave no terminal Linux com <code>ssh-keygen</code> e copie o conteúdo de <code>~/.ssh/id_ed25519.pub</code>.', err.pubkey)}`
        : note('warning', 'Sem chaves SSH você não conseguirá se conectar à instância.')}`)}
      ${panel('Boot volume', `<div class="checks"><label><input type="checkbox" name="bootCustom" ${d.bootCustom ? 'checked' : ''}> Specify a custom boot volume size</label></div><p class="help">Boot volume size: ${d.bootCustom ? `<input name="bootSize" value="${esc(d.bootSize || '50')}" style="width:80px"> GB` : '46.6 GB (default)'} · Use in-transit encryption</p>`)}
      </div>
      <div class="sticky-f"><div class="est"><b>Estimated cost</b> ${sh.free ? '<span class="tag free">Always Free</span> $0.00/month' : `$${(sh.ocpu * (+d.ocpu || 1) * 0.025 * 730 + (+d.mem || 16) * 0.0015 * 730).toFixed(2)}/month (simulado)`}</div>${btn('Create', 'instCreate', { primary: true })} ${btn('Save as stack', 'na')} ${btn('Cancel', 'nav', { data: 'data-id="instances"' })}</div>`;
  }

  function instCreate() {
    const s = S();
    const d = UI.form(frame.querySelector('.create'));
    const err = {};
    const sh = shapeOf(d.shape);
    if (!d.name.trim()) err.name = 'Name is required.';
    const live = s.instances.filter(i => i.state !== 'TERMINATED');
    if (sh.id === 'VM.Standard.E2.1.Micro' && live.filter(i => i.shape === sh.id).length >= 2) err.shape = 'LimitExceeded: You have reached your service limit of 2 for VM.Standard.E2.1.Micro in this tenancy (Always Free). Termine uma instância antes de criar outra.';
    const ocpu = sh.flex ? +d.ocpu || 1 : sh.ocpu, mem = sh.flex ? +d.mem || 6 : sh.mem;
    if (sh.flex && (ocpu < 1 || ocpu > sh.max)) err.shape = `OCPU count must be between 1 and ${sh.max}.`;
    if (sh.id === 'VM.Standard.A1.Flex') {
      const used = live.filter(i => i.shape === sh.id);
      if (used.reduce((a, i) => a + i.ocpu, 0) + ocpu > 4 || used.reduce((a, i) => a + i.mem, 0) + mem > 24) err.shape = 'Out of host capacity / LimitExceeded: Always Free permite no total 4 OCPUs e 24 GB para VM.Standard.A1.Flex.';
    }
    if (d.image === 'windows' && sh.free) err.shape = 'The selected image is not compatible with Always Free shapes. Choose a paid shape (ex.: VM.Standard.E4.Flex) for Windows.';
    let vcn, subnet;
    if (d.net === 'existing') {
      vcn = s.vcns.find(x => x.id === d.vcn);
      subnet = vcn && (vcn.subnets.find(sn => sn.id === d.subnet) || vcn.subnets[0]);
      if (!vcn || !subnet) err.net = 'Select a virtual cloud network and a subnet, or create a new VCN.';
      else if (d.pubip && !subnet.public) err.net = 'A public IP address cannot be assigned to a VNIC in a private subnet.';
    }
    let material = null, keyName = null;
    if (d.ssh === 'generate') { material = v.data.keyMaterial || (v.data.keyMaterial = UI.rand(48, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')); keyName = v.data.keyFile || 'ssh-key'; }
    if (d.ssh === 'paste') {
      const m = /^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp256)\s+AAAA\S*?I?([A-Za-z0-9]{43})(\S*)/.exec(d.pubkey.trim());
      if (!/^(ssh-rsa|ssh-ed25519|ecdsa-sha2-nistp\d+)\s+AAAA/.test(d.pubkey.trim())) err.pubkey = 'Invalid SSH public key. The key must begin with ssh-rsa, ssh-ed25519 or ecdsa-sha2-nistp256.';
      else { const mm = /AAAAI([A-Za-z0-9]{43})/.exec(d.pubkey); material = mm ? mm[1] : (m ? m[2] : UI.rand(43)); keyName = 'pasted key'; }
    }
    if (Object.keys(err).length) { v.data.draft = d; v.data.err = err; render(); frame.querySelector('.oci-main').scrollTop = 0; return; }
    if (d.net === 'new') { vcn = makeVcn(d.newVcn || nowName('vcn'), d.comp, '10.0.0.0/16', [{ name: d.newSubnet || nowName('subnet'), cidr: '10.0.0.0/24', public: true }]); subnet = vcn.subnets[0]; }
    const img = imageOf(d.image);
    const inst = {
      id: ocid('instance', s.region), name: d.name.trim(), comp: d.comp, region: s.region, ad: d.ad, fd: 'FAULT-DOMAIN-' + UI.int(1, 3),
      image: img.id, distro: img.distro, user: img.user, shape: sh.id, ocpu, mem, state: 'PROVISIONING',
      publicIp: d.pubip ? `${UI.pick([129, 132, 140, 144, 150, 152, 158])}.${UI.int(0, 255)}.${UI.int(0, 255)}.${UI.int(1, 254)}` : null,
      privateIp: subnet.cidr.split('.').slice(0, 3).join('.') + '.' + UI.int(2, 250), vcn: vcn.id, subnet: subnet.id,
      keyMaterial: material, keyName, created: Date.now(), boot: d.bootCustom ? +d.bootSize || 50 : 46.6,
    };
    Store.queue(inst, [[4500, { state: 'RUNNING' }]]);
    s.instances.unshift(inst);
    go('compute', 'instance', inst.id);
    Store.commit();
  }

  function pInstance() {
    const i = S().instances.find(x => x.id === v.id);
    if (!i) return pInstances();
    const img = imageOf(i.image), vcn = S().vcns.find(x => x.id === i.vcn), sn = vcn && vcn.subnets.find(x => x.id === i.subnet);
    const t = v.tab || 'details';
    const body = t === 'details' ? `<div class="two">${panel('Instance information', `<h4 class="sub">General information</h4>${kv([['Availability domain', i.ad], ['Fault domain', i.fd], ['Region', esc(i.region)], ['OCID', `${shortOcid(i.id)} <a class="lnk" data-act="copy" data-v="${i.id}">Copy</a>`], ['Launched', UI.date(i.created)], ['Compartment', esc(comp(i.comp).name)], ['Capacity type', 'On-demand']])}
        <h4 class="sub">Shape configuration</h4>${kv([['Shape', i.shape], ['OCPU count', i.ocpu], ['Network bandwidth (Gbps)', shapeOf(i.shape).bw], ['Memory (GB)', i.mem], ['Local disk', 'Block storage only']])}`)}
      ${panel('Instance access', `${kv([['Public IP address', i.publicIp ? `${i.publicIp} <a class="lnk" data-act="copy" data-v="${i.publicIp}">Copy</a>` : '-'], ['Username', img.user]])}<p class="help">You connect to a running Linux instance using a Secure Shell (SSH) connection. You'll need the private key from the SSH key pair that was used to create the instance.</p>
        ${i.publicIp && img.distro !== 'windows' ? `<pre class="code">ssh -i ~/Downloads/${esc(i.keyName && i.keyName !== 'pasted key' ? i.keyName : 'sua-chave.key')} ${img.user}@${i.publicIp}</pre>` : ''}${!i.keyMaterial ? note('warning', 'Esta instância foi criada sem chaves SSH.') : ''}`)
      + panel('Primary VNIC', kv([['Private IP address', i.privateIp], ['Public IP address', i.publicIp || '-'], ['Virtual cloud network', vcn ? link(esc(vcn.name), 'openVcn', `data-id="${vcn.id}"`) : '-'], ['Subnet', sn ? esc(sn.name) : '-'], ['Network security groups', 'None']]))
      + panel('Image details', kv([['Operating system', esc(img.name)], ['Image', esc(img.build)], ['Launch mode', 'PARAVIRTUALIZED']]))}</div>`
      : t === 'boot' ? panel('Boot volume', kv([['Name', `${esc(i.name)} (Boot Volume)`], ['Size', i.boot + ' GB'], ['Attached', 'Yes'], ['Encryption', 'Oracle-managed key'], ['In-transit encryption', 'Enabled']]))
        : panel('Metrics', i.state === 'RUNNING' ? `<div class="metrics">${['CPU Utilization', 'Memory Utilization', 'Network Bytes In', 'Disk Read Bytes'].map(m => `<div><b>${m}</b><svg viewBox="0 0 200 60"><polyline fill="none" stroke="#227e9e" stroke-width="2" points="${Array.from({ length: 20 }, (_, k) => `${k * 10.5},${50 - Math.abs(Math.sin(k + i.privateIp.length)) * 30}`).join(' ')}"/></svg></div>`).join('')}</div>` : '<p class="help">No data available.</p>');
    return `<div class="detail-h">${bigState(i.state)}<div><h1 class="pt">${esc(i.name)}</h1><div class="toolbar">${btn('Start', 'instStart1', { disabled: i.state !== 'STOPPED' })} ${btn('Stop', 'instStop1', { disabled: i.state !== 'RUNNING' })} ${btn('Reboot', 'instReboot1', { disabled: i.state !== 'RUNNING' })} ${btn('Terminate', 'instTerminate1', { danger: true, disabled: ['TERMINATED', 'TERMINATING'].includes(i.state) })} ${btn(`${ICON.terminal} Abrir terminal Linux`, 'openTerminal')}</div></div></div>
      <div class="tabs">${[['details', 'Details'], ['boot', 'Boot volume'], ['metrics', 'Monitoring']].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="tab" data-id="${k}">${l}</button>`).join('')}</div>${body}`;
  }

  function setState(id, kind) {
    const i = S().instances.find(x => x.id === id);
    if (!i) return;
    if (kind === 'stop' && i.state === 'RUNNING') { i.state = 'STOPPING'; Store.queue(i, [[3500, { state: 'STOPPED' }]]); }
    if (kind === 'start' && i.state === 'STOPPED') { i.state = 'STARTING'; Store.queue(i, [[3500, { state: 'RUNNING' }]]); }
    if (kind === 'reboot' && i.state === 'RUNNING') { i.state = 'STOPPING'; Store.queue(i, [[2000, { state: 'STARTING' }], [2500, { state: 'RUNNING' }]]); }
    if (kind === 'terminate') { i.state = 'TERMINATING'; Store.queue(i, [[4000, { state: 'TERMINATED', publicIp: null }]]); }
    Store.commit();
  }
  function terminateModal(id) {
    const i = S().instances.find(x => x.id === id);
    modal('Terminate instance', `<p>Are you sure you want to terminate the instance <b>${esc(i.name)}</b>?</p><div class="checks"><label><input type="checkbox" checked> Permanently delete the attached boot volume</label></div>${note('warning', 'This action cannot be undone. Any data on the boot volume will be lost.')}`, `${btn('Terminate instance', 'instTerminateOk', { danger: true, data: `data-id="${id}"` })} ${btn('Cancel', 'closeModal')}`);
  }

  // ---------- networking ----------
  function makeVcn(name, compId, cidr, subnets) {
    const s = S();
    const vcn = {
      id: ocid('vcn', s.region), name, comp: compId, region: s.region, cidr, created: Date.now(), dns: name.replace(/[^a-z0-9]/gi, '').slice(0, 15).toLowerCase(),
      subnets: subnets.map(x => ({ id: ocid('subnet', s.region), ...x })), igw: subnets.some(x => x.public),
      secList: [
        { src: '0.0.0.0/0', proto: 'TCP', port: '22', desc: 'SSH' },
        { src: '0.0.0.0/0', proto: 'ICMP', port: '3, 4', desc: 'Destination Unreachable: Fragmentation Needed' },
        { src: cidr, proto: 'ICMP', port: '3', desc: 'Destination Unreachable' },
      ],
    };
    s.vcns.push(vcn);
    return vcn;
  }
  function vcnAllows(inst, proto, port) {
    const vcn = S().vcns.find(x => x.id === inst.vcn);
    if (!vcn) return false;
    return vcn.secList.some(r => (r.src === '0.0.0.0/0' || r.src === MY_IP + '/32') && (r.proto === 'All' || (r.proto === proto && (proto === 'ICMP' ? r.port.split(',').map(x => x.trim()).includes('8') || r.port === 'All' : r.port === 'All' || r.port === String(port) || (r.port.includes('-') && port >= +r.port.split('-')[0] && port <= +r.port.split('-')[1])))));
  }

  function pVcns() {
    const rows = S().vcns.filter(x => x.region === S().region && x.comp === curComp().id);
    return `<h1 class="pt">Virtual Cloud Networks <small>in <b>${esc(curComp().name)}</b> compartment</small></h1><p class="pd">Virtual Cloud Networks are virtual, private networks that you set up in Oracle data centers. It closely resembles a traditional network, with firewall rules and specific types of communication gateways.</p>
      <div class="toolbar">${btn('Create VCN', 'vcnNew', { primary: true })} ${btn('Start VCN Wizard', 'nav', { data: 'data-id="wizard"' })}</div>
      ${UI.table({ rows, cols: [{ h: 'Name', f: x => link(esc(x.name), 'openVcn', `data-id="${x.id}"`) }, { h: 'State', f: () => stateBadge('AVAILABLE') }, { h: 'IPv4 CIDR Block', f: x => x.cidr }, { h: 'Default Route Table', f: x => `Default Route Table for ${esc(x.name)}` }, { h: 'DNS Domain Name', f: x => `${x.dns}.oraclevcn.com` }, { h: 'Created', f: x => UI.date(x.created) }], empty: 'No items found.', emptyHint: 'Crie uma VCN ou use o VCN Wizard.' })}`;
  }
  function pVcn() {
    const x = S().vcns.find(y => y.id === v.id);
    if (!x) return pVcns();
    const t = v.tab || 'subnets';
    let body;
    if (t === 'subnets') body = `<div class="toolbar">${btn('Create Subnet', 'subnetNew', { primary: true })}</div>${UI.table({ rows: x.subnets, cols: [{ h: 'Name', f: s => esc(s.name) }, { h: 'State', f: () => stateBadge('AVAILABLE') }, { h: 'IPv4 CIDR Block', f: s => s.cidr }, { h: 'Subnet Access', f: s => s.public ? 'Public (Regional)' : 'Private (Regional)' }, { h: 'Route table', f: s => s.public ? 'Default Route Table' : 'route table for private subnet' }] })}`;
    else if (t === 'sec') body = `<p class="help"><b>Default Security List for ${esc(x.name)}</b> — Ingress Rules</p><div class="toolbar">${btn('Add Ingress Rules', 'ruleNew', { primary: true })} ${btn('Remove', 'ruleDel', { disabled: !v.sel.length })}</div>${UI.table({ select: 'multi', selected: v.sel, rows: x.secList.map((r, k) => ({ ...r, id: String(k) })), cols: [{ h: 'Stateless', f: () => 'No' }, { h: 'Source', f: r => esc(r.src) }, { h: 'IP Protocol', f: r => r.proto }, { h: 'Source Port Range', f: () => 'All' }, { h: 'Destination Port Range', f: r => r.proto === 'ICMP' ? '' : esc(r.port) }, { h: 'Type and Code', f: r => r.proto === 'ICMP' ? esc(r.port) : '' }, { h: 'Allows', f: r => `${r.proto} traffic for ports: ${esc(r.port)} ${esc(r.desc || '')}` }], empty: 'No ingress rules' })}
      ${note('info', 'Dica: para acessar um servidor web na instância, adicione uma regra <b>0.0.0.0/0 TCP 80</b>. Para o ping funcionar, libere <b>ICMP tipo 8</b>. Lembre também do firewall interno do Oracle Linux (firewalld) em ambientes reais.')}`;
    else body = UI.table({ rows: x.igw ? [{ id: 1 }] : [], cols: [{ h: 'Name', f: () => `Internet Gateway-${esc(x.name)}` }, { h: 'State', f: () => stateBadge('AVAILABLE') }, { h: 'Created', f: () => UI.date(x.created) }], empty: 'No internet gateways', emptyHint: 'Sem internet gateway as instâncias não acessam (nem são acessadas pela) internet.' });
    return `<div class="detail-h">${bigState('AVAILABLE')}<div><h1 class="pt">${esc(x.name)}</h1><div class="toolbar">${btn('Terminate', 'vcnDel', { danger: true })}</div></div></div>
      ${panel('VCN Information', kv([['Compartment', esc(comp(x.comp).name)], ['IPv4 CIDR Block', x.cidr], ['Created', UI.date(x.created)], ['DNS Resolver', `${x.dns}.oraclevcn.com`], ['OCID', shortOcid(x.id)], ['Default Security List', `Default Security List for ${esc(x.name)}`]]))}
      <div class="tabs">${[['subnets', `Subnets (${x.subnets.length})`], ['sec', 'Security Lists (1)'], ['igw', `Internet Gateways (${x.igw ? 1 : 0})`]].map(([k, l]) => `<button class="${t === k ? 'on' : ''}" data-act="tab" data-id="${k}">${l}</button>`).join('')}</div>${body}`;
  }
  function pWizard() {
    v.form = true;
    const d = v.data.draft || { name: nowName('vcn'), comp: curComp().id, cidr: '10.0.0.0/16', pub: '10.0.0.0/24', priv: '10.0.1.0/24' };
    const err = v.data.err || {};
    if (v.data.progress) return `<h1 class="pt">Create VCN with Internet Connectivity</h1>${panel('Creating Resources', `<ul class="prog">${v.data.progress.map(([l, done]) => `<li class="${done ? 'done' : ''}">${done ? ICON.ok : ICON.pending} ${l}</li>`).join('')}</ul>${v.data.done ? `<p>${btn('View VCN', 'openVcn', { primary: true, data: `data-id="${v.data.done}"` })}</p>` : ''}`)}`;
    return `<h1 class="pt">Start VCN Wizard</h1><p class="pd"><b>Create VCN with Internet Connectivity</b> — Creates a VCN with a public subnet that can be reached from the internet. Also creates a private subnet that can connect to the internet through a NAT gateway, and also privately connect to the Oracle Services Network.</p>
      <div id="wiz">${panel('Basic information', `${field('VCN name', `<input name="name" class="w-full" value="${esc(d.name)}">`, '', err.name)}${field('Compartment', compSelect('comp', d.comp))}`)}
      ${panel('Configure VCN', `${field('VCN IPv4 CIDR blocks', `<input name="cidr" value="${esc(d.cidr)}" style="width:240px">`, 'If you plan to peer this VCN with another VCN, the VCNs must not have overlapping CIDR blocks.', err.cidr)}`)}
      ${panel('Configure public subnet', field('IPv4 CIDR block', `<input name="pub" value="${esc(d.pub)}" style="width:240px">`, 'Must be within the VCN CIDR block.', err.pub))}
      ${panel('Configure private subnet', field('IPv4 CIDR block', `<input name="priv" value="${esc(d.priv)}" style="width:240px">`, '', err.priv))}</div>
      <div class="sticky-f">${btn('Next / Create', 'wizardGo', { primary: true })} ${btn('Cancel', 'nav', { data: 'data-id="vcns"' })}</div>`;
  }
  const cidrOk = c => { const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(c || ''); return m && m.slice(1, 5).every(x => +x <= 255) && +m[5] >= 16 && +m[5] <= 30; };
  const cidrIn = (inner, outer) => { const ip = c => c.split('/')[0].split('.').reduce((a, x) => a * 256 + +x, 0); const bits = +outer.split('/')[1]; const mask = bits ? (2 ** 32 - 2 ** (32 - bits)) : 0; return (ip(inner) & mask) >>> 0 === (ip(outer) & mask) >>> 0 && +inner.split('/')[1] >= bits; };

  // ---------- storage ----------
  const regBuckets = () => S().buckets.filter(b => b.region === S().region && b.comp === curComp().id);
  function pBuckets() {
    const rows = regBuckets();
    return `<h1 class="pt">Buckets <small>in <b>${esc(curComp().name)}</b> compartment</small></h1><p class="pd">A bucket is a container for storing objects in a compartment within an Object Storage namespace. Os nomes precisam ser únicos apenas dentro do seu <b>namespace</b> (<code>${esc(S().namespace)}</code>), diferente do S3, onde são globais.</p>
      <div class="toolbar">${btn('Create Bucket', 'bucketNew', { primary: true })} ${btn('Delete', 'bucketDel', { disabled: !v.sel.length })}</div>
      ${UI.table({ select: 'single', selected: v.sel, rows, key: 'name', cols: [{ h: 'Name', f: b => link(esc(b.name), 'openBucket', `data-id="${esc(b.name)}"`) }, { h: 'Default Storage Tier', f: b => b.tier }, { h: 'Visibility', f: b => b.visibility === 'public' ? `<span class="tag warn">Public</span>` : 'Private' }, { h: 'Created', f: b => UI.date(b.created) }], empty: 'No items found.' })}`;
  }
  function pBucket() {
    const b = S().buckets.find(x => x.name === v.id && x.region === S().region);
    if (!b) return pBuckets();
    const url = o => `https://objectstorage.${b.region}.oraclecloud.com/n/${S().namespace}/b/${b.name}/o/${encodeURIComponent(o.key)}`;
    return `<div class="detail-h">${bigState('ACTIVE')}<div><h1 class="pt">${esc(b.name)}</h1><div class="toolbar">${btn('Edit Visibility', 'visEdit')} ${btn('Move Resource', 'na')} ${btn('Delete', 'bucketDel1', { danger: true })}</div></div></div>
      ${panel('Bucket Information', kv([['Visibility', b.visibility === 'public' ? '<span class="tag warn">Public</span>' : 'Private'], ['Namespace', esc(S().namespace)], ['Default Storage Tier', b.tier], ['Approximate Count', b.objects.length + ' objects'], ['Approximate Size', UI.bytes(b.objects.reduce((a, o) => a + o.size, 0))], ['Object Versioning', b.versioning ? 'Enabled' : 'Disabled'], ['Encryption Key', 'Oracle managed key'], ['Compartment', esc(comp(b.comp).name)], ['Created', UI.date(b.created)]]))}
      ${panel('Objects', `<div class="toolbar">${btn('Upload', 'upload', { primary: true })} ${btn('Delete', 'objDel', { disabled: !v.sel.length })}</div>${UI.table({ select: 'multi', selected: v.sel, rows: b.objects, key: 'key', cols: [{ h: 'Name', f: o => `<span class="obj">${ICON.file} ${esc(o.key)}</span>` }, { h: 'Last Modified', f: o => UI.date(o.modified) }, { h: 'Size', f: o => UI.bytes(o.size) }, { h: 'Storage Tier', f: () => b.tier }, { h: 'URL Path (URI)', f: o => `<small class="uri">${esc(url(o))}</small>` }], empty: 'No items found.', emptyHint: 'Envie arquivos com o botão Upload.' })}
        ${b.objects.length ? note('info', `Teste no terminal Linux: <code>curl ${esc(url(b.objects[0]))}</code> — só funciona se o bucket estiver <b>Public</b>.`) : ''}`)}`;
  }

  // ---------- identity ----------
  function pCompartments() {
    const rows = S().compartments;
    return `<h1 class="pt">Compartments</h1><p class="pd">Compartments são "pastas" lógicas para organizar e isolar recursos. Políticas de IAM podem dar acesso a um compartimento específico.</p>
      <div class="toolbar">${btn('Create Compartment', 'compNew', { primary: true })}</div>
      ${UI.table({ rows, cols: [{ h: 'Name', f: c => `<b>${esc(c.name)}</b>${c.root ? ' (root)' : ''}` }, { h: 'Status', f: () => stateBadge('ACTIVE') }, { h: 'Authorized', f: () => 'Yes' }, { h: 'OCID', f: c => shortOcid(c.id) }, { h: 'Description', f: c => esc(c.desc) }, { h: 'Created', f: c => UI.date(c.created) }] })}`;
  }
  function pUsers() {
    return `<h1 class="pt">Users <small>in <b>Default</b> Domain</small></h1><p class="pd">Users are individuals who can sign in and access Oracle Cloud resources.</p>
      <div class="toolbar">${btn('Create user', 'userNew', { primary: true })} ${btn('Delete', 'userDel', { disabled: !v.sel.length || v.sel.includes('aluno@example.com') })}</div>
      ${UI.table({ select: 'single', selected: v.sel, key: 'name', rows: S().users, cols: [{ h: 'Username', f: u => esc(u.name) }, { h: 'Email', f: u => esc(u.email || '-') }, { h: 'Status', f: () => stateBadge('ACTIVE') }, { h: 'Groups', f: u => u.groups.map(esc).join(', ') || '-' }, { h: 'Created', f: u => UI.date(u.created) }] })}`;
  }
  function pGroups() {
    return `<h1 class="pt">Groups <small>in <b>Default</b> Domain</small></h1><p class="pd">Groups are collections of users. Policies give permissions to groups, never directly to users.</p>
      <div class="toolbar">${btn('Create group', 'groupNew', { primary: true })}</div>
      ${UI.table({ key: 'name', rows: S().groups, cols: [{ h: 'Name', f: g => link(esc(g.name), 'openGroup', `data-id="${esc(g.name)}"`) }, { h: 'Description', f: g => esc(g.desc) }, { h: 'Members', f: g => S().users.filter(u => u.groups.includes(g.name)).length }, { h: 'Created', f: g => UI.date(g.created) }] })}`;
  }
  function pGroup() {
    const g = S().groups.find(x => x.name === v.id);
    if (!g) return pGroups();
    const members = S().users.filter(u => u.groups.includes(g.name));
    return `<div class="detail-h">${bigState('ACTIVE')}<div><h1 class="pt">${esc(g.name)}</h1></div></div>${panel('Group information', kv([['Description', esc(g.desc)], ['Created', UI.date(g.created)]]))}
      ${panel(`Group members (${members.length})`, `<div class="toolbar">${btn('Assign user to group', 'memberAdd', { primary: true })} ${btn('Remove', 'memberDel', { disabled: !v.sel.length })}</div>${UI.table({ select: 'multi', selected: v.sel, key: 'name', rows: members, cols: [{ h: 'Username', f: u => esc(u.name) }, { h: 'Email', f: u => esc(u.email || '-') }], empty: 'No members' })}`)}`;
  }
  function pPolicies() {
    const rows = S().policies.filter(p => p.comp === curComp().id);
    return `<h1 class="pt">Policies <small>in <b>${esc(curComp().name)}</b> compartment</small></h1><p class="pd">A policy is a document that specifies who can access which Oracle Cloud Infrastructure resources and how. Sintaxe: <code>Allow group &lt;grupo&gt; to &lt;verbo&gt; &lt;recurso&gt; in &lt;compartment nome | tenancy&gt;</code></p>
      <div class="toolbar">${btn('Create Policy', 'nav', { primary: true, data: 'data-id="createPolicy"' })} ${btn('Delete', 'policyDel', { disabled: !v.sel.length || v.sel.includes('Tenant Admin Policy') })}</div>
      ${UI.table({ select: 'single', selected: v.sel, key: 'name', rows, cols: [{ h: 'Name', f: p => `<b>${esc(p.name)}</b>` }, { h: 'Statements', f: p => p.statements.length }, { h: 'Description', f: p => esc(p.desc) }, { h: 'Created', f: p => UI.date(p.created) }], empty: 'No items found.' })}
      ${rows.filter(p => v.sel.includes(p.name)).map(p => panel(`Statements — ${esc(p.name)}`, `<pre class="code">${p.statements.map(esc).join('\n')}</pre>`)).join('')}`;
  }
  function pCreatePolicy() {
    v.form = true;
    const d = v.data.draft || { name: '', desc: '', comp: curComp().id, text: 'Allow group Desenvolvedores to manage instance-family in compartment lab\nAllow group Desenvolvedores to read buckets in tenancy' };
    const err = v.data.err || {};
    return `<h1 class="pt">Create Policy</h1><div id="wiz">${panel('', `${field('Name', `<input name="name" class="w-full" value="${esc(d.name)}">`, 'No spaces. Only letters, numerals, hyphens, periods, or underscores.', err.name)}${field('Description', `<input name="desc" class="w-full" value="${esc(d.desc)}">`, '', err.desc)}${field('Compartment', compSelect('comp', d.comp))}`)}
      ${panel('Policy Builder', `<div class="seg"><button data-act="na">Show manual editor ○</button><button class="on">Manual editor ●</button></div>${field('Policy statements', `<textarea name="text" class="code-ed" spellcheck="false">${esc(d.text)}</textarea>`, 'Um statement por linha. Verbos: inspect &lt; read &lt; use &lt; manage. Recursos: all-resources, instance-family, virtual-network-family, object-family, buckets, objects...', '')}${err.text ? note('error', err.text) : ''}
        ${note('info', `Grupos existentes: ${S().groups.map(g => `<code>${esc(g.name)}</code>`).join(' ')} · Compartimentos: ${S().compartments.filter(c => !c.root).map(c => `<code>${esc(c.name)}</code>`).join(' ') || '<i>nenhum além do root (crie um em Compartments)</i>'}`)}`)}</div>
      <div class="sticky-f">${btn('Create', 'policyCreate', { primary: true })} ${btn('Cancel', 'nav', { data: 'data-id="policies"' })}</div>`;
  }
  function validateStatements(text) {
    const errs = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.length) return ['At least one policy statement is required.'];
    lines.forEach((l, k) => {
      const m = /^allow\s+(group|dynamic-group|any-user)\s*(\S*)\s+to\s+(\S+)\s+(\S+)\s+in\s+(tenancy|compartment\s+(\S+))(\s+where\s+.+)?$/i.exec(l);
      if (!m) { errs.push(`Statement ${k + 1}: Invalid policy statement. Expected format: Allow group &lt;group_name&gt; to &lt;verb&gt; &lt;resource-type&gt; in &lt;compartment name | tenancy&gt;.`); return; }
      const [, kind, gname, verb, rtype, , cname] = m;
      if (kind.toLowerCase() === 'group' && !S().groups.some(g => g.name.toLowerCase() === gname.toLowerCase())) errs.push(`Statement ${k + 1}: No group found with name '${esc(gname)}' in the Default domain.`);
      if (!VERBS.includes(verb.toLowerCase())) errs.push(`Statement ${k + 1}: Invalid verb '${esc(verb)}'. Use inspect, read, use or manage.`);
      if (!RTYPES.includes(rtype.toLowerCase())) errs.push(`Statement ${k + 1}: Unknown resource type '${esc(rtype)}'.`);
      if (cname && !S().compartments.some(c => !c.root && c.name.toLowerCase() === cname.toLowerCase())) errs.push(`Statement ${k + 1}: No compartment found with name '${esc(cname)}'.`);
    });
    return errs;
  }

  const PAGES = { instances: pInstances, create: pCreate, instance: pInstance, vcns: pVcns, vcn: pVcn, wizard: pWizard, buckets: pBuckets, bucket: pBucket, compartments: pCompartments, users: pUsers, groups: pGroups, group: pGroup, policies: pPolicies, createPolicy: pCreatePolicy };
  const AREA_OF = { instances: 'compute', create: 'compute', instance: 'compute', vcns: 'networking', vcn: 'networking', wizard: 'networking', buckets: 'storage', bucket: 'storage', compartments: 'identity', users: 'identity', groups: 'identity', group: 'identity', policies: 'identity', createPolicy: 'identity' };

  const H = {
    noop() { },
    na() { toast('Não disponível neste laboratório.', 'info'); },
    home() { go('home'); },
    menu(d) { v.menu = v.menu === d.id ? null : d.id; render(); },
    goto(d) { if (!d.area) return H.na(); go(d.area, d.page); },
    nav(d) { go(AREA_OF[d.id] || v.area, d.id); },
    tab(d) { v.tab = d.id; v.sel = []; render(); },
    search(q) { q = q.toLowerCase(); const map = [['instance', 'instances'], ['compute', 'instances'], ['vm', 'instances'], ['bucket', 'buckets'], ['storage', 'buckets'], ['vcn', 'vcns'], ['network', 'vcns'], ['polic', 'policies'], ['user', 'users'], ['group', 'groups'], ['compartment', 'compartments']]; const hit = map.find(([k]) => q.includes(k)); if (hit) H.nav({ id: hit[1] }); else toast('No results found', 'info'); },
    setRegion(d) { S().region = d.id; v.menu = null; Store.commit(); render(); toast(`Region: ${esc(region().name)}`, 'info'); },
    setComp(val) { v.comp = val; v.sel = []; render(); },
    stateFilter(val) { v.data.stf = val; render(); },
    cloudshell() { App.switchTab('linux'); },
    openTerminal() { App.switchTab('linux'); },
    closeFlash() { v.flash = null; render(); },
    copy(d) { UI.copy(d.v); toast('Copied', 'info'); },
    sel(d) { const multi = v.page === 'bucket' || (v.page === 'vcn' && v.tab === 'sec') || v.page === 'group'; v.sel = multi ? (v.sel.includes(d.id) ? v.sel.filter(x => x !== d.id) : [...v.sel, d.id]) : (v.sel[0] === d.id ? [] : [d.id]); render(); },
    selAll() { const ids = [...frame.querySelectorAll('tr[data-id]')].map(tr => tr.dataset.id); v.sel = v.sel.length === ids.length ? [] : ids; render(); },
    draft() { const d = UI.form(frame.querySelector('.create')); const p = v.data.draft || {}; v.data.draft = d; if (d.net !== p.net || d.ssh !== p.ssh || d.shape !== p.shape || d.image !== p.image || d.vcn !== p.vcn || d.ad !== p.ad || d.bootCustom !== p.bootCustom) render(); },
    savePriv() {
      v.data.draft = UI.form(frame.querySelector('.create'));
      v.data.keyMaterial = v.data.keyMaterial || UI.rand(48, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
      v.data.keyFile = `ssh-key-${new Date().toISOString().slice(0, 10)}.key`;
      Linux.saveDownload(v.data.keyFile, `-----BEGIN PRIVATE KEY-----\n${v.data.keyMaterial}\n${UI.rand(64, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')}\n-----END PRIVATE KEY-----\n`);
      v.data.keySaved = true; render(); toast(`${esc(v.data.keyFile)} salvo em ~/Downloads (terminal Linux)`, 'info');
    },
    savePub() { v.data.keyMaterial = v.data.keyMaterial || UI.rand(48, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'); Linux.saveDownload(`ssh-key-${new Date().toISOString().slice(0, 10)}.key.pub`, `ssh-rsa AAAAB3NzaC1yc2E${UI.rand(40)} ssh-key-${new Date().toISOString().slice(0, 10)}\n`); toast('Chave pública salva em ~/Downloads', 'info'); },
    instCreate,
    openInst(d) { go('compute', 'instance', d.id); },
    instStart() { v.menu = null; setState(v.sel[0], 'start'); }, instStop() { v.menu = null; setState(v.sel[0], 'stop'); }, instReboot() { v.menu = null; setState(v.sel[0], 'reboot'); },
    instTerminate() { v.menu = null; render(); terminateModal(v.sel[0]); },
    instStart1() { setState(v.id, 'start'); }, instStop1() { setState(v.id, 'stop'); }, instReboot1() { setState(v.id, 'reboot'); },
    instTerminate1() { terminateModal(v.id); },
    instTerminateOk(d) { closeModal(); setState(d.id, 'terminate'); toast('Instance is being terminated'); },
    vcnNew() { modal('Create a Virtual Cloud Network', `${field('Name', `<input name="name" class="w-full" value="${nowName('vcn')}">`)}${field('Create In Compartment', compSelect())}${field('IPv4 CIDR Blocks', `<input name="cidr" class="w-full" value="10.0.0.0/16">`, 'Ex.: 10.0.0.0/16 (de /16 a /30).')}${field('DNS label', `<input name="dns" class="w-full" placeholder="vcn1">`)}<p class="ferr" id="oerr"></p>${note('info', 'Uma VCN criada assim vem sem subnets e sem internet gateway. O VCN Wizard cria tudo pronto para uso.')}`, `${btn('Create VCN', 'vcnCreate', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    vcnCreate() { const d = UI.form(mh); if (!d.name.trim()) { mh.querySelector('#oerr').textContent = 'Name is required.'; return; } if (!cidrOk(d.cidr)) { mh.querySelector('#oerr').textContent = 'Invalid CIDR block. Use o formato 10.0.0.0/16 (prefixo entre /16 e /30).'; return; } const x = makeVcn(d.name.trim(), d.comp, d.cidr, []); x.igw = false; closeModal(); go('networking', 'vcn', x.id); Store.commit(); },
    openVcn(d) { go('networking', 'vcn', d.id); },
    vcnDel() { const x = S().vcns.find(y => y.id === v.id); if (S().instances.some(i => i.vcn === x.id && i.state !== 'TERMINATED')) { modal('Terminate Virtual Cloud Network', note('error', 'The VCN contains resources (instances/VNICs) that must be terminated first.'), btn('Close', 'closeModal')); return; } S().vcns = S().vcns.filter(y => y !== x); go('networking', 'vcns'); Store.commit(); toast('VCN terminated'); },
    subnetNew() { modal('Create Subnet', `${field('Name', `<input name="name" class="w-full" value="${nowName('subnet')}">`)}${field('IPv4 CIDR Block', `<input name="cidr" class="w-full" value="10.0.${S().vcns.find(y => y.id === v.id).subnets.length}.0/24">`)}${field('Subnet Access', `<div class="radio-row"><label class="rc on"><input type="radio" name="access" value="public" checked><b>Public Subnet</b></label><label class="rc"><input type="radio" name="access" value="private"><b>Private Subnet</b></label></div>`)}<p class="ferr" id="oerr"></p>`, `${btn('Create Subnet', 'subnetCreate', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    subnetCreate() { const x = S().vcns.find(y => y.id === v.id); const d = UI.form(mh); if (!cidrOk(d.cidr) || !cidrIn(d.cidr, x.cidr)) { mh.querySelector('#oerr').textContent = `The subnet CIDR must be valid and within the VCN CIDR (${x.cidr}).`; return; } x.subnets.push({ id: ocid('subnet', x.region), name: d.name.trim() || nowName('subnet'), cidr: d.cidr, public: d.access === 'public' }); if (d.access === 'public') x.igw = true; closeModal(); Store.commit(); },
    ruleNew() { modal('Add Ingress Rules', `${field('Source Type', '<select class="w-full"><option>CIDR</option></select>')}${field('Source CIDR', `<input name="src" class="w-full" value="0.0.0.0/0">`)}${field('IP Protocol', `<select name="proto" class="w-full"><option>TCP</option><option>UDP</option><option>ICMP</option><option value="All">All Protocols</option></select>`)}${field('Destination Port Range', `<input name="port" class="w-full" placeholder="80 (ou 8000-8080). Para ICMP: tipo, ex.: 8">`)}${field('Description', `<input name="desc" class="w-full" placeholder="HTTP">`)}<p class="ferr" id="oerr"></p>`, `${btn('Add Ingress Rules', 'ruleAdd', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    ruleAdd() { const x = S().vcns.find(y => y.id === v.id); const d = UI.form(mh); if (!/^(\d+\.){3}\d+\/\d+$/.test(d.src.trim())) { mh.querySelector('#oerr').textContent = 'Invalid source CIDR.'; return; } x.secList.push({ src: d.src.trim(), proto: d.proto, port: d.port.trim() || 'All', desc: d.desc.trim() }); closeModal(); Store.commit(); toast('Ingress rule added'); },
    ruleDel() { const x = S().vcns.find(y => y.id === v.id); x.secList = x.secList.filter((r, k) => !v.sel.includes(String(k))); v.sel = []; Store.commit(); },
    wizardGo() {
      const d = UI.form(frame.querySelector('#wiz'));
      const err = {};
      if (!d.name.trim()) err.name = 'VCN name is required.';
      if (!cidrOk(d.cidr)) err.cidr = 'Invalid CIDR block.';
      if (!cidrOk(d.pub) || (cidrOk(d.cidr) && !cidrIn(d.pub, d.cidr))) err.pub = 'The public subnet CIDR must be within the VCN CIDR block.';
      if (!cidrOk(d.priv) || (cidrOk(d.cidr) && !cidrIn(d.priv, d.cidr))) err.priv = 'The private subnet CIDR must be within the VCN CIDR block.';
      else if (d.priv === d.pub) err.priv = 'Subnet CIDR blocks must not overlap.';
      if (Object.keys(err).length) { v.data = { draft: d, err }; render(); return; }
      const steps = ['Create Virtual Cloud Network', 'Create Internet Gateway', 'Create NAT Gateway', 'Create Service Gateway', 'Create Public Subnet', 'Create Private Subnet', 'Update Default Route Table', 'Create Route Table for Private Subnet', 'Update Security Lists'];
      v.data.progress = steps.map(s => [s, false]);
      render();
      steps.forEach((_, k) => setTimeout(() => {
        v.data.progress[k][1] = true;
        if (k === steps.length - 1) { const x = makeVcn(d.name.trim(), d.comp, d.cidr, [{ name: `public subnet-${d.name.trim()}`, cidr: d.pub, public: true }, { name: `private subnet-${d.name.trim()}`, cidr: d.priv, public: false }]); v.data.done = x.id; Store.save(); }
        if (v.page === 'wizard') render();
        if (k === steps.length - 1) Store.commit();
      }, 350 * (k + 1)));
    },
    bucketNew() { modal('Create Bucket', `${field('Bucket Name', `<input name="name" class="w-full" value="${nowName('bucket')}">`)}${field('Default Storage Tier', `<div class="radio-row"><label class="rc on"><input type="radio" name="tier" value="Standard" checked><b>Standard</b></label><label class="rc"><input type="radio" name="tier" value="Archive"><b>Archive</b></label></div>`, 'The default storage tier for a bucket can only be specified during creation. Once set, you cannot change the storage tier in which a bucket resides.')}<div class="checks"><label><input type="checkbox" name="auto"> Enable Auto-Tiering</label><label><input type="checkbox" name="ver"> Enable Object Versioning</label><label><input type="checkbox" name="events"> Emit Object Events</label></div>${field('Encryption', '<div class="radio-row"><label class="rc on"><input type="radio" checked><b>Encrypt using Oracle managed keys</b></label></div>')}<p class="ferr" id="oerr"></p>`, `${btn('Create', 'bucketCreate', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    bucketCreate() {
      const d = UI.form(mh); const n = d.name.trim(); const e = mh.querySelector('#oerr');
      if (!/^[A-Za-z0-9._-]{1,256}$/.test(n)) { e.textContent = 'Bucket names can contain only letters, numbers, dashes, underscores and periods (no spaces).'; return; }
      if (S().buckets.some(b => b.name === n && b.region === S().region)) { e.textContent = `Either the bucket named '${n}' already exists in this namespace or you are not authorized to create it.`; return; }
      S().buckets.push({ name: n, comp: curComp().id, region: S().region, tier: d.tier, versioning: d.ver, visibility: 'private', objects: [], created: Date.now() });
      closeModal(); Store.commit(); toast(`Bucket ${esc(n)} created`);
    },
    openBucket(d) { go('storage', 'bucket', d.id); },
    bucketDel() { const b = S().buckets.find(x => x.name === v.sel[0] && x.region === S().region); delBucket(b); },
    bucketDel1() { delBucket(S().buckets.find(x => x.name === v.id && x.region === S().region)); },
    visEdit() { const b = S().buckets.find(x => x.name === v.id && x.region === S().region); modal('Edit Visibility', `<div class="radio-row col"><label class="rc ${b.visibility === 'private' ? 'on' : ''}"><input type="radio" name="vis" value="private" ${b.visibility === 'private' ? 'checked' : ''}><b>Private</b><small>Access to the bucket requires user authentication and authorization.</small></label><label class="rc ${b.visibility === 'public' ? 'on' : ''}"><input type="radio" name="vis" value="public" ${b.visibility === 'public' ? 'checked' : ''}><b>Public</b><small>Allows anonymous and unauthenticated access to the bucket's objects.</small></label></div>${note('warning', 'Enabling public visibility lets anonymous and unauthenticated users access data stored in the bucket.')}`, `${btn('Save Changes', 'visSave', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    visSave() { const b = S().buckets.find(x => x.name === v.id && x.region === S().region); b.visibility = UI.form(mh).vis; closeModal(); Store.commit(); toast('Visibility updated'); },
    async upload() { const b = S().buckets.find(x => x.name === v.id && x.region === S().region); const files = await UI.pickFiles(true); for (const f of files) { const r = await UI.readFile(f); b.objects = b.objects.filter(o => o.key !== r.name); b.objects.push({ key: r.name, size: r.size, type: r.type, content: r.content, modified: Date.now() }); } if (files.length) { Store.commit(); toast(`${files.length} object(s) uploaded`); } },
    objDel() { const b = S().buckets.find(x => x.name === v.id && x.region === S().region); b.objects = b.objects.filter(o => !v.sel.includes(o.key)); v.sel = []; Store.commit(); toast('Objects deleted'); },
    compNew() { modal('Create Compartment', `${field('Name', '<input name="name" class="w-full" placeholder="lab">')}${field('Description', '<input name="desc" class="w-full" placeholder="Compartimento do laboratório">')}${field('Parent Compartment', compSelect('parent', rootComp().id))}<p class="ferr" id="oerr"></p>`, `${btn('Create Compartment', 'compCreate', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    compCreate() { const d = UI.form(mh); const n = d.name.trim(); const e = mh.querySelector('#oerr'); if (!/^[A-Za-z0-9._-]{1,100}$/.test(n)) { e.textContent = 'Name is required. Only letters, numbers, periods, hyphens and underscores.'; return; } if (!d.desc.trim()) { e.textContent = 'Description is required.'; return; } if (S().compartments.some(c => c.name === n)) { e.textContent = 'A compartment with this name already exists.'; return; } S().compartments.push({ id: ocid('compartment'), name: n, desc: d.desc.trim(), created: Date.now(), parent: d.parent }); closeModal(); Store.commit(); toast(`Compartment ${esc(n)} created`); },
    userNew() { modal('Create user', `${field('First name', '<input name="first" class="w-full">')}${field('Last name', '<input name="last" class="w-full">')}${field('Username / Email', '<input name="email" class="w-full" placeholder="maria@example.com">')}<p class="ferr" id="oerr"></p>`, `${btn('Create', 'userCreate', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    userCreate() { const d = UI.form(mh); const e = mh.querySelector('#oerr'); if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) { e.textContent = 'A valid email address is required.'; return; } if (S().users.some(u => u.name === d.email.trim())) { e.textContent = 'User already exists.'; return; } S().users.push({ name: d.email.trim(), email: d.email.trim(), desc: `${d.first} ${d.last}`.trim(), created: Date.now(), groups: [] }); closeModal(); Store.commit(); toast('User created'); },
    userDel() { S().users = S().users.filter(u => !v.sel.includes(u.name)); v.sel = []; Store.commit(); },
    groupNew() { modal('Create group', `${field('Name', '<input name="name" class="w-full" placeholder="Desenvolvedores">')}${field('Description', '<input name="desc" class="w-full">')}<p class="ferr" id="oerr"></p>`, `${btn('Create', 'groupCreate', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    groupCreate() { const d = UI.form(mh); const n = d.name.trim(); if (!/^[A-Za-z0-9._-]{1,100}$/.test(n) || S().groups.some(g => g.name === n)) { mh.querySelector('#oerr').textContent = S().groups.some(g => g.name === n) ? 'Group already exists.' : 'Invalid name (no spaces).'; return; } S().groups.push({ name: n, desc: d.desc.trim() || n, created: Date.now() }); closeModal(); Store.commit(); toast('Group created'); },
    openGroup(d) { go('identity', 'group', d.id); },
    memberAdd() { const g = v.id; modal('Assign users to group', `<div class="checks">${S().users.map(u => `<label><input type="checkbox" name="us" value="${esc(u.name)}" data-multi="1" ${u.groups.includes(g) ? 'checked' : ''}> ${esc(u.name)}</label>`).join('')}</div>`, `${btn('Assign', 'memberSave', { primary: true })} ${btn('Cancel', 'closeModal')}`); },
    memberSave() { const us = UI.form(mh).us || []; S().users.forEach(u => { const has = u.groups.includes(v.id); if (us.includes(u.name) && !has) u.groups.push(v.id); if (!us.includes(u.name) && has) u.groups = u.groups.filter(x => x !== v.id); }); closeModal(); Store.commit(); },
    memberDel() { S().users.forEach(u => { if (v.sel.includes(u.name)) u.groups = u.groups.filter(x => x !== v.id); }); v.sel = []; Store.commit(); },
    policyCreate() {
      const d = UI.form(frame.querySelector('#wiz'));
      const err = {};
      if (!/^[A-Za-z0-9._-]{1,100}$/.test(d.name.trim())) err.name = 'Name is required. No spaces.';
      else if (S().policies.some(p => p.name === d.name.trim())) err.name = 'A policy with this name already exists.';
      if (!d.desc.trim()) err.desc = 'Description is required.';
      const se = validateStatements(d.text);
      if (se.length) err.text = se.join('<br>');
      if (Object.keys(err).length) { v.data = { draft: d, err }; render(); return; }
      S().policies.push({ name: d.name.trim(), desc: d.desc.trim(), comp: d.comp, statements: d.text.split('\n').map(l => l.trim()).filter(Boolean), created: Date.now() });
      v.comp = d.comp; flash('success', `Policy <b>${esc(d.name.trim())}</b> created.`); go('identity', 'policies', null, { sel: [d.name.trim()] }); Store.commit();
    },
    policyDel() { S().policies = S().policies.filter(p => !v.sel.includes(p.name)); v.sel = []; Store.commit(); },
  };
  function delBucket(b) {
    if (!b) return;
    if (b.objects.length) { modal('Delete Bucket', note('error', `Bucket named '${esc(b.name)}' is not empty. Delete all objects first.`), btn('Close', 'closeModal')); return; }
    modal('Delete Bucket', `<p>Are you sure you want to delete bucket <b>${esc(b.name)}</b>?</p>${field(`Type the bucket name to confirm`, '<input id="oci-conf" class="w-full">')}<p class="ferr" id="oerr"></p>`, `${btn('Delete', 'bucketDelOk', { danger: true, data: `data-id="${esc(b.name)}"` })} ${btn('Cancel', 'closeModal')}`);
  }
  H.bucketDelOk = d => { if (mh.querySelector('#oci-conf').value !== d.id) { mh.querySelector('#oerr').textContent = 'The name does not match.'; return; } S().buckets = S().buckets.filter(b => !(b.name === d.id && b.region === S().region)); closeModal(); go('storage', 'buckets'); Store.commit(); toast('Bucket deleted'); };

  function targets() {
    return S().instances.map(i => ({
      provider: 'oci', id: i.id, name: i.name, ip: i.publicIp, dns: null, running: i.state === 'RUNNING', distro: i.distro,
      users: [imageOf(i.image).user], hostname: i.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'), privateIp: i.privateIp,
      allows: (proto, port) => vcnAllows(i, proto, port), keyMaterial: i.keyMaterial, keyName: i.keyName,
    }));
  }
  const cli = {
    publicObject(url) {
      const m = /^\/n\/([^/]+)\/b\/([^/]+)\/o\/(.+)$/.exec(url.pathname);
      const err = (st, code, msg) => ({ status: st, body: JSON.stringify({ code, message: msg }, null, 2) });
      if (!m || m[1] !== S().namespace) return err(404, 'NamespaceNotFound', 'You do not have authorization to perform this request, or the requested resource could not be found.');
      const b = S().buckets.find(x => x.name === m[2]);
      if (!b || b.visibility !== 'public') return err(404, 'BucketNotFound', `Either the bucket named '${m[2]}' does not exist in the namespace '${m[1]}' or you are not authorized to access it`);
      const o = b.objects.find(x => x.key === decodeURIComponent(m[3]));
      if (!o) return err(404, 'ObjectNotFound', `The object '${decodeURIComponent(m[3])}' was not found in the bucket '${b.name}'`);
      return { status: 200, body: o.content != null ? o.content : `(conteúdo binário de ${o.key}, ${o.size} bytes)` };
    },
    s: S,
  };

  function tick() { return Store.advance(S().instances); }
  function init(el) {
    root = el;
    root.innerHTML = '<div class="frame"></div><div class="modal-host"></div><div class="toasts"></div>';
    frame = root.querySelector('.frame'); mh = root.querySelector('.modal-host'); th = root.querySelector('.toasts');
    UI.bind(root, H, e => { if (v.menu && !e.target.closest('.dd, .nav-in, [data-id="nav"]')) { v.menu = null; render(); } });
    render();
  }
  return { init, render, refresh, tick, targets, cli, onShow: render };
})();
