/* Cloud Lab — Console AWS simulado (EC2, S3, IAM) */
'use strict';

const AWS = (() => {
  const { esc, ICON } = UI;
  const MY_IP = '203.0.113.25';

  const REGIONS = [
    { id: 'us-east-1', name: 'US East (N. Virginia)', short: 'N. Virginia' },
    { id: 'us-east-2', name: 'US East (Ohio)', short: 'Ohio' },
    { id: 'us-west-2', name: 'US West (Oregon)', short: 'Oregon' },
    { id: 'sa-east-1', name: 'South America (São Paulo)', short: 'São Paulo' },
    { id: 'eu-west-1', name: 'Europe (Ireland)', short: 'Ireland' },
  ];
  const AMIS = [
    { id: 'ami-0fff1b9a61dec8a5f', short: 'Amazon Linux', name: 'Amazon Linux 2023 AMI', distro: 'amzn', user: 'ec2-user', badge: 'AL', color: '#232f3e', desc: 'Amazon Linux 2023 is a modern, general purpose Linux-based OS that comes with 5 years of long term support.' },
    { id: 'ami-0e86e20dae9224db8', short: 'Ubuntu', name: 'Ubuntu Server 24.04 LTS (HVM), SSD Volume Type', distro: 'ubuntu', user: 'ubuntu', badge: 'U', color: '#e95420', desc: 'Ubuntu Server 24.04 LTS (HVM), EBS General Purpose (SSD) Volume Type.' },
    { id: 'ami-0c5d61202c3b9c33e', short: 'Windows', name: 'Microsoft Windows Server 2022 Base', distro: 'windows', user: 'Administrator', badge: 'W', color: '#0078d4', desc: 'Microsoft Windows 2022 Datacenter edition.' },
    { id: 'ami-0583d8c7a9c35822c', short: 'Red Hat', name: 'Red Hat Enterprise Linux 9 (HVM), SSD Volume Type', distro: 'rhel', user: 'ec2-user', badge: 'RH', color: '#cc0000', desc: 'Red Hat Enterprise Linux version 9 (HVM), EBS General Purpose (SSD) Volume Type.' },
    { id: 'ami-064519b8c76274859', short: 'Debian', name: 'Debian 12 (HVM), SSD Volume Type', distro: 'debian', user: 'admin', badge: 'D', color: '#a80030', desc: 'Debian 12 (20240717-1811).' },
  ];
  const TYPES = [
    { id: 't2.micro', vcpu: 1, mem: 1, free: true, price: 0.0116 },
    { id: 't3.micro', vcpu: 2, mem: 1, free: true, price: 0.0104 },
    { id: 't3.small', vcpu: 2, mem: 2, price: 0.0208 },
    { id: 't3.medium', vcpu: 2, mem: 4, price: 0.0416 },
    { id: 't3.large', vcpu: 2, mem: 8, price: 0.0832 },
    { id: 'm5.large', vcpu: 2, mem: 8, price: 0.096 },
    { id: 'c5.xlarge', vcpu: 4, mem: 8, price: 0.17 },
  ];
  const RULE_TYPES = {
    'SSH': ['TCP', '22'], 'HTTP': ['TCP', '80'], 'HTTPS': ['TCP', '443'], 'RDP': ['TCP', '3389'],
    'MYSQL/Aurora': ['TCP', '3306'], 'Custom TCP': ['TCP', ''], 'All ICMP - IPv4': ['ICMP', 'All'], 'All traffic': ['All', 'All'],
  };

  // Políticas gerenciadas pela AWS (versões simplificadas das reais)
  const MANAGED = {
    AdministratorAccess: { desc: 'Provides full access to AWS services and resources.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: '*', Resource: '*' }] } },
    PowerUserAccess: { desc: 'Provides full access to AWS services and resources, but does not allow management of Users and groups.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', NotAction: ['iam:*', 'organizations:*', 'account:*'], Resource: '*' }] } },
    ReadOnlyAccess: { desc: 'Provides read-only access to AWS services and resources.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['ec2:Describe*', 's3:Get*', 's3:List*', 'iam:Get*', 'iam:List*'], Resource: '*' }] } },
    AmazonEC2FullAccess: { desc: 'Provides full access to Amazon EC2 via the AWS Management Console.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: 'ec2:*', Resource: '*' }] } },
    AmazonEC2ReadOnlyAccess: { desc: 'Provides read only access to Amazon EC2 via the AWS Management Console.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: 'ec2:Describe*', Resource: '*' }] } },
    AmazonS3FullAccess: { desc: 'Provides full access to all buckets via the AWS Management Console.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:*', 's3-object-lambda:*'], Resource: '*' }] } },
    AmazonS3ReadOnlyAccess: { desc: 'Provides read only access to all buckets via the AWS Management Console.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['s3:Get*', 's3:List*', 's3:Describe*'], Resource: '*' }] } },
    IAMFullAccess: { desc: 'Provides full access to IAM via the AWS Management Console.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['iam:*', 'organizations:DescribeAccount'], Resource: '*' }] } },
    IAMReadOnlyAccess: { desc: 'Provides read only access to IAM via the AWS Management Console.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['iam:Get*', 'iam:List*'], Resource: '*' }] } },
    IAMUserChangePassword: { desc: 'Provides the ability for an IAM user to change their own password.', doc: { Version: '2012-10-17', Statement: [{ Effect: 'Allow', Action: ['iam:ChangePassword'], Resource: ['arn:aws:iam::*:user/${aws:username}'] }, { Effect: 'Allow', Action: ['iam:GetAccountPasswordPolicy'], Resource: '*' }] } },
  };
  const SIM_ACTIONS = {
    'Amazon EC2': ['ec2:DescribeInstances', 'ec2:RunInstances', 'ec2:StartInstances', 'ec2:StopInstances', 'ec2:TerminateInstances', 'ec2:CreateSecurityGroup'],
    'Amazon S3': ['s3:ListAllMyBuckets', 's3:ListBucket', 's3:CreateBucket', 's3:DeleteBucket', 's3:GetObject', 's3:PutObject', 's3:DeleteObject'],
    'AWS IAM': ['iam:ListUsers', 'iam:CreateUser', 'iam:DeleteUser', 'iam:AttachUserPolicy', 'iam:ChangePassword'],
  };
  const TAKEN = ['test', 'teste', 'backup', 'backups', 'bucket', 'meu-bucket', 'my-bucket', 'images', 'data', 'dados', 'logs', 'files', 'arquivos', 'aws', 'amazon', 'www', 'site', 'website', 'assets', 'static'];

  Store.register('aws', () => ({
    account: '4' + UI.rand(11, '0123456789'),
    region: 'us-east-1',
    instances: [], keyPairs: [], securityGroups: [], buckets: [], accountBPA: false,
    iam: {
      users: [], groups: [], policies: [],
      roles: [
        { name: 'AWSServiceRoleForSupport', trusted: 'support.amazonaws.com', policies: [], created: Date.now() - 864e5 * 30, desc: 'Enables resource access for AWS to provide billing, administrative and support services' },
        { name: 'AWSServiceRoleForTrustedAdvisor', trusted: 'trustedadvisor.amazonaws.com', policies: [], created: Date.now() - 864e5 * 30, desc: 'Access for the AWS Trusted Advisor Service to help reduce cost, increase performance, and improve security of your AWS environment.' },
      ],
    },
  }));

  let root, frame, mh, th;
  const v = { svc: 'home', page: null, id: null, sel: [], form: false, tab: null, data: {}, menu: null, flash: null, q: '', filter: '' };
  const S = () => Store.s.aws;
  const region = () => REGIONS.find(r => r.id === S().region) || REGIONS[0];
  const amiOf = id => AMIS.find(a => a.id === id) || AMIS[0];
  const typeOf = id => TYPES.find(t => t.id === id) || TYPES[0];
  const acct = () => S().account;
  const acctFmt = () => acct().replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');

  // ---------- componentes no estilo Cloudscape ----------
  const btn = (label, act, o = {}) => `<button class="btn ${o.primary ? 'primary' : ''} ${o.link ? 'link' : ''} ${o.cls || ''}" data-act="${act}" ${o.data || ''} ${o.disabled ? 'disabled' : ''}>${label}</button>`;
  const info = '<a class="info" data-act="noop">Info</a>';
  const hdr = (title, o = {}) => `<div class="ct-h"><div class="ct-ht"><h2>${title}${o.count != null ? ` <span class="cnt">(${o.count})</span>` : ''} ${o.noInfo ? '' : info}</h2>${o.desc ? `<p>${o.desc}</p>` : ''}</div><div class="acts">${o.acts || ''}</div></div>`;
  const ct = (inner, cls = '') => `<div class="ct ${cls}">${inner}</div>`;
  const kv = (pairs, cols = 3) => `<div class="kv c${cols}">${pairs.map(([k, val]) => `<div><label>${k}</label><div>${val === '' || val == null ? '–' : val}</div></div>`).join('')}</div>`;
  const alert = (kind, html, title) => `<div class="alert ${kind}">${ICON[kind === 'error' ? 'err' : kind === 'warning' ? 'warn' : kind === 'success' ? 'ok' : 'info']}<div>${title ? `<b>${title}</b>` : ''}<div>${html}</div></div></div>`;
  const link = (label, act, data = '') => `<a class="lnk" data-act="${act}" ${data}>${label}</a>`;
  const tabs = (items, cur, act = 'tab') => `<div class="tabs">${items.map(([id, label]) => `<button class="${cur === id ? 'on' : ''}" data-act="${act}" data-id="${id}">${label}</button>`).join('')}</div>`;
  const field = (label, inner, desc = '', err = '') => `<div class="field"><label>${label}</label>${desc ? `<p class="desc">${desc}</p>` : ''}${inner}${err ? `<p class="ferr">${ICON.warn} ${err}</p>` : ''}</div>`;
  const dd = (id, label, items, o = {}) => `<div class="dd ${v.menu === id ? 'open' : ''}">
      <button class="btn ${o.primary ? 'primary' : ''}" data-act="menu" data-id="${id}" ${o.disabled ? 'disabled' : ''}>${label} ${ICON.caret}</button>
      ${v.menu === id ? `<div class="dd-menu ${o.right ? 'right' : ''}">${items.map(i => i === '-' ? '<hr>' : `<button data-act="${i.act}" ${i.data || ''} ${i.disabled ? 'disabled' : ''}>${i.label}</button>`).join('')}</div>` : ''}
    </div>`;

  function status(state) {
    const map = {
      running: ['ok', 'Running', 'g'], stopped: ['err', 'Stopped', 'r'], terminated: ['err', 'Terminated', 'n'],
      pending: ['pending', 'Pending', 'b'], stopping: ['pending', 'Stopping', 'b'], 'shutting-down': ['pending', 'Shutting-down', 'b'],
    };
    const [ic, label, c] = map[state] || ['info', state, 'b'];
    return `<span class="st st-${c}">${ICON[ic]} ${label}</span>`;
  }

  function modal(title, body, footer, cls = '') {
    return UI.modal(mh, `<div class="m-h"><h3>${title}</h3><button class="x" data-act="closeModal">${ICON.close}</button></div><div class="m-b">${body}</div><div class="m-f">${footer}</div>`, cls);
  }
  const closeModal = () => { mh.innerHTML = ''; };
  const toast = (html, kind = 'success') => UI.toast(th, html, kind);
  const flash = (kind, html) => { v.flash = { kind, html, fresh: true }; };

  function go(svc, page = null, id = null, extra = {}) {
    if (v.flash && !v.flash.fresh) v.flash = null;
    Object.assign(v, { svc, page, id, sel: [], form: false, tab: null, data: {}, menu: null, filter: '' }, extra);
    render();
  }

  // ---------- navegação ----------
  const SERVICES = [
    { id: 'ec2', name: 'EC2', desc: 'Virtual Servers in the Cloud', cat: 'Compute', color: '#ed7100' },
    { id: 's3', name: 'S3', desc: 'Scalable Storage in the Cloud', cat: 'Storage', color: '#7aa116' },
    { id: 'iam', name: 'IAM', desc: 'Manage access to AWS resources', cat: 'Security, Identity, & Compliance', color: '#dd344c' },
    { id: null, name: 'Lambda', desc: 'Run code without thinking about servers', cat: 'Compute', color: '#ed7100' },
    { id: null, name: 'RDS', desc: 'Managed Relational Database Service', cat: 'Database', color: '#3b48cc' },
    { id: null, name: 'VPC', desc: 'Isolated Cloud Resources', cat: 'Networking & Content Delivery', color: '#8c4fff' },
    { id: null, name: 'CloudWatch', desc: 'Monitor Resources and Applications', cat: 'Management & Governance', color: '#e7157b' },
    { id: null, name: 'Billing and Cost Management', desc: 'View and pay bills', cat: 'Cloud Financial Management', color: '#7aa116' },
  ];
  const svcIcon = (sv, size = 28) => `<span class="svc-ic" style="background:${sv.color};width:${size}px;height:${size}px">${esc(sv.name.slice(0, 3))}</span>`;

  const NAV = {
    ec2: { title: 'EC2', items: [['dashboard', 'Dashboard'], ['-', 'Instances'], ['instances', 'Instances'], ['types', 'Instance Types'], ['x', 'Launch Templates'], ['-', 'Images'], ['amis', 'AMIs'], ['-', 'Elastic Block Store'], ['volumes', 'Volumes'], ['x', 'Snapshots'], ['-', 'Network & Security'], ['sgs', 'Security Groups'], ['x', 'Elastic IPs'], ['keys', 'Key Pairs']] },
    s3: { title: 'Amazon S3', items: [['buckets', 'General purpose buckets'], ['x', 'Directory buckets'], ['x', 'Table buckets'], ['x', 'Access Points'], ['-', ''], ['bpa', 'Block Public Access settings for this account'], ['-', 'Storage Lens'], ['x', 'Dashboards']] },
    iam: { title: 'Identity and Access Management (IAM)', items: [['dashboard', 'Dashboard'], ['-', 'Access management'], ['groups', 'User groups'], ['users', 'Users'], ['roles', 'Roles'], ['policies', 'Policies'], ['x', 'Identity providers'], ['x', 'Account settings'], ['-', 'Access reports'], ['simulator', 'Policy simulator'], ['x', 'Access Analyzer']] },
  };
  const PAGE_PARENT = { launch: 'instances', connect: 'instances', bucket: 'buckets', create: 'buckets', object: 'buckets', user: 'users', createUser: 'users', accessKey: 'users', group: 'groups', createGroup: 'groups', role: 'roles', createRole: 'roles', policy: 'policies', createPolicy: 'policies' };

  function top() {
    const q = v.q.trim().toLowerCase();
    const results = q ? SERVICES.filter(s => (s.name + ' ' + s.desc).toLowerCase().includes(q)) : [];
    return `<header class="aws-top">
      <a class="aws-logo" data-act="home" title="Console Home">aws<span></span></a>
      <button class="top-btn ${v.menu === 'services' ? 'on' : ''}" data-act="menu" data-id="services"><span class="grid9"></span> Services</button>
      <div class="aws-search">
        ${ICON.search}<input id="aws-q" placeholder="Search" value="${esc(v.q)}" data-input="search" data-enter="searchGo" autocomplete="off"><kbd>[Alt+S]</kbd>
        ${q ? `<div class="search-res">${results.length ? results.map(s => `<button data-act="openSvc" data-id="${s.id || ''}">${svcIcon(s, 24)}<div><b>${esc(s.name)}</b><small>${esc(s.desc)}</small></div></button>`).join('') : '<p>No results</p>'}</div>` : ''}
      </div>
      <div class="top-right">
        <button class="top-ic" data-act="cloudshell" title="CloudShell">${ICON.terminal}</button>
        <button class="top-ic" data-act="noop" title="Notifications">${ICON.bell}</button>
        <button class="top-ic" data-act="noop" title="Help">${ICON.help}</button>
        <button class="top-ic" data-act="noop" title="Settings">${ICON.gear}</button>
        <div class="dd ${v.menu === 'region' ? 'open' : ''}"><button class="top-btn" data-act="menu" data-id="region">${['s3', 'iam'].includes(v.svc) ? 'Global' : esc(region().short)} ${ICON.caret}</button>
          ${v.menu === 'region' ? `<div class="dd-menu right dark">${REGIONS.map(r => `<button data-act="setRegion" data-id="${r.id}" class="${r.id === S().region ? 'cur' : ''}"><span>${esc(r.name)}</span><small>${r.id}</small></button>`).join('')}</div>` : ''}</div>
        <div class="dd ${v.menu === 'account' ? 'open' : ''}"><button class="top-btn" data-act="menu" data-id="account">aluno @ ${acctFmt()} ${ICON.caret}</button>
          ${v.menu === 'account' ? `<div class="dd-menu right dark acct"><p>Account ID<br><b>${acctFmt()}</b> </p><p>Federated user<br><b>aluno</b></p><hr><button data-act="go" data-svc="iam" data-page="dashboard">Security credentials</button><button data-act="noop">Sign out</button></div>` : ''}</div>
      </div>
      ${v.menu === 'services' ? servicesMenu() : ''}
    </header>
    <div class="aws-fav">${SERVICES.slice(0, 3).map(s => `<button data-act="openSvc" data-id="${s.id}">${svcIcon(s, 16)} ${s.name}</button>`).join('')}</div>`;
  }

  function servicesMenu() {
    const cats = [...new Set(SERVICES.map(s => s.cat))];
    return `<div class="svc-menu"><aside><b>Recently visited</b><b>Favorites</b><b>All applications</b><b class="on">All services</b>${cats.map(c => `<span>${esc(c)}</span>`).join('')}</aside>
      <div class="svc-list"><h3>All services</h3>${SERVICES.map(s => `<button data-act="openSvc" data-id="${s.id || ''}" class="${s.id ? '' : 'na'}">${svcIcon(s)}<div><b>${esc(s.name)}</b><small>${esc(s.desc)}${s.id ? '' : ' — não disponível no laboratório'}</small></div></button>`).join('')}</div></div>`;
  }

  function side() {
    const nav = NAV[v.svc];
    if (!nav) return '';
    const cur = PAGE_PARENT[v.page] || v.page;
    return `<nav class="aws-side" data-scroll="side"><h2>${nav.title}</h2>${nav.items.map(([id, label]) => id === '-' ? (label ? `<h4>${label}</h4>` : '<hr>')
      : `<a class="${id === cur ? 'on' : ''} ${id === 'x' ? 'na' : ''}" data-act="${id === 'x' ? 'na' : 'nav'}" data-id="${id}">${label}</a>`).join('')}</nav>`;
  }

  function crumbs() {
    if (v.svc === 'home') return '';
    const names = { ec2: 'EC2', s3: 'Amazon S3', iam: 'IAM' };
    const pageNames = { dashboard: 'Dashboard', instances: 'Instances', launch: 'Launch an instance', connect: 'Connect to instance', keys: 'Key pairs', sgs: 'Security Groups', volumes: 'Volumes', amis: 'AMIs', types: 'Instance types', buckets: 'Buckets', create: 'Create bucket', bpa: 'Block Public Access settings for this account', users: 'Users', createUser: 'Create user', groups: 'User groups', createGroup: 'Create user group', roles: 'Roles', createRole: 'Create role', policies: 'Policies', createPolicy: 'Create policy', simulator: 'Policy simulator', accessKey: 'Create access key' };
    const parts = [`<a data-act="nav" data-id="${v.svc === 's3' ? 'buckets' : 'dashboard'}">${names[v.svc]}</a>`];
    const parent = PAGE_PARENT[v.page];
    if (parent) parts.push(`<a data-act="nav" data-id="${parent}">${pageNames[parent]}</a>`);
    if (v.page === 'bucket' || v.page === 'object') {
      parts.push(v.page === 'object' ? `<a data-act="openBucket" data-id="${esc(v.id)}">${esc(v.id)}</a>` : `<span>${esc(v.id)}</span>`);
      if (v.page === 'object') parts.push(`<span>${esc(v.data.key.split('/').filter(Boolean).pop())}</span>`);
    } else if (['user', 'group', 'role', 'policy'].includes(v.page)) parts.push(`<span>${esc(v.id)}</span>`);
    else if (pageNames[v.page] && v.page !== 'dashboard' || v.page === 'dashboard' && v.svc === 'iam') parts.push(`<span>${pageNames[v.page]}</span>`);
    return `<div class="crumbs">${parts.join('<i>›</i>')}</div>`;
  }

  // ---------- render ----------
  function render() {
    const body = page();
    const html = `${top()}<div class="aws-body ${v.svc === 'home' ? 'home' : ''}">${side()}<main class="aws-main" data-scroll="main">${crumbs()}${v.flash ? `<div class="flash ${v.flash.kind}">${ICON[v.flash.kind === 'success' ? 'ok' : v.flash.kind === 'error' ? 'err' : 'info']}<div>${v.flash.html}</div><button data-act="closeFlash">${ICON.close}</button></div>` : ''}${body}</main></div>`;
    UI.paint(frame, html, `${v.svc}:${v.page}:${v.id}`);
    if (v.flash) v.flash.fresh = false;
  }
  function refresh() { if (!v.form && root && root.classList.contains('active')) render(); }

  function page() {
    if (v.svc === 'home') return pHome();
    const fn = PAGES[`${v.svc}:${v.page}`];
    return fn ? fn() : ct(hdr('Em breve', { noInfo: true }) + '<div class="ct-b"><p>Esta tela ainda não existe no laboratório.</p></div>');
  }

  function pHome() {
    const s = S();
    const running = s.instances.filter(i => i.state === 'running').length;
    return `<div class="home-h"><h1>Console Home ${info}</h1><div>${btn('Reset to default layout', 'noop')} ${btn('+ Add widgets', 'noop', { primary: true })}</div></div>
      <div class="home-grid">
        ${ct(hdr('Recently visited', { noInfo: true }) + `<div class="ct-b recent">${SERVICES.slice(0, 3).map(sv => `<a data-act="openSvc" data-id="${sv.id}">${svcIcon(sv, 22)} ${sv.name}</a>`).join('')}</div>`)}
        ${ct(hdr('Welcome to AWS', { noInfo: true }) + `<div class="ct-b welcome">
          <p><b>Laboratório de prática</b><br>Tudo aqui é simulado: nenhum recurso real é criado e nada é cobrado.</p>
          <p><a class="lnk" data-act="openSvc" data-id="ec2">Getting started with EC2 ›</a><br><small>Lance seu primeiro servidor virtual e conecte via SSH no terminal Linux do lab.</small></p>
          <p><a class="lnk" data-act="openSvc" data-id="s3">Store files in S3 ›</a><br><small>Crie um bucket e envie arquivos.</small></p>
          <p><a class="lnk" data-act="openSvc" data-id="iam">Secure access with IAM ›</a><br><small>Crie usuários, grupos e políticas e teste no Policy simulator.</small></p></div>`)}
        ${ct(hdr('AWS Health', { noInfo: true }) + `<div class="ct-b">${kv([['Open issues', '0 <small>Past 7 days</small>'], ['Scheduled changes', '0'], ['Other notifications', '0']], 1)}</div>`)}
        ${ct(hdr('Cost and usage', { noInfo: true }) + `<div class="ct-b"><div class="big">$0.00</div><small>Current month costs (simulated)</small><p style="margin-top:12px">${running} instance(s) running · ${s.buckets.length} bucket(s)</p></div>`)}
      </div>`;
  }

  // ================= EC2 =================
  const regInst = () => S().instances.filter(i => i.region === S().region);
  const regKeys = () => S().keyPairs.filter(k => k.region === S().region);
  function regSGs() {
    const s = S();
    if (!s.securityGroups.some(g => g.region === s.region && g.name === 'default')) {
      s.securityGroups.push({ id: 'sg-0' + UI.rand(16), name: 'default', desc: 'default VPC security group', region: s.region, vpc: vpcId(), rules: [{ type: 'All traffic', proto: 'All', port: 'All', source: 'sg (self)' }] });
      Store.save();
    }
    return s.securityGroups.filter(g => g.region === s.region);
  }
  function vpcId() {
    const s = S();
    s.vpcs = s.vpcs || {};
    return s.vpcs[s.region] || (s.vpcs[s.region] = 'vpc-0' + UI.rand(16));
  }
  const dnsOf = (ip, r) => ip ? `ec2-${ip.replace(/\./g, '-')}.${r === 'us-east-1' ? 'compute-1' : r + '.compute'}.amazonaws.com` : '';

  function pDashboard() {
    const inst = regInst();
    const res = [['Instances (running)', inst.filter(i => i.state === 'running').length, 'instances'], ['Instances', inst.filter(i => i.state !== 'terminated').length, 'instances'], ['Key pairs', regKeys().length, 'keys'], ['Security groups', regSGs().length, 'sgs'], ['Volumes', inst.filter(i => i.state !== 'terminated').length, 'volumes'], ['Elastic IPs', 0, null], ['Snapshots', 0, null], ['Load balancers', 0, null]];
    return `<h1 class="ph">EC2 Dashboard</h1>
      ${ct(hdr('Resources', { acts: btn('EC2 Global view', 'noop'), desc: `You are using the following Amazon EC2 resources in the ${esc(region().name)} Region:` }) + `<div class="ct-b res-grid">${res.map(([n, c, p]) => `<div><a class="lnk" data-act="${p ? 'nav' : 'na'}" data-id="${p}">${n}</a><b>${c}</b></div>`).join('')}</div>`)}
      <div class="two">
        ${ct(hdr('Launch instance', { desc: 'To get started, launch an Amazon EC2 instance, which is a virtual server in the cloud.' }) + `<div class="ct-b">${btn('Launch instance', 'launch', { primary: true })}<p class="muted" style="margin-top:10px">Note: Your instances will launch in the ${esc(region().name)} Region</p></div>`)}
        ${ct(hdr('Service health', { acts: btn('AWS Health Dashboard', 'noop') }) + `<div class="ct-b">${kv([['Region', esc(region().name)], ['Status', `<span class="st st-g">${ICON.ok} This service is operating normally</span>`]], 1)}</div>`)}
      </div>`;
  }

  function pInstances() {
    const s = S();
    const f = v.filter.toLowerCase();
    const rows = regInst().filter(i => !f || [i.name, i.id, i.type, i.state, i.publicIp].join(' ').toLowerCase().includes(f));
    const sel = s.instances.filter(i => v.sel.includes(i.id));
    const states = sel.map(i => i.state);
    const one = sel.length === 1 ? sel[0] : null;
    const table = UI.table({
      select: 'multi', selected: v.sel, rows,
      cols: [
        { h: 'Name', f: i => esc(i.name) || '–' },
        { h: 'Instance ID', f: i => link(i.id, 'pickInst', `data-id="${i.id}"`) },
        { h: 'Instance state', f: i => status(i.state) },
        { h: 'Instance type', f: i => i.type },
        { h: 'Status check', f: i => i.state === 'running' ? (i.status === 'ok' ? `<span class="st st-g">${ICON.ok} 2/2 checks passed</span>` : `<span class="st st-b">${ICON.pending} Initializing</span>`) : '–' },
        { h: 'Availability Zone', f: i => i.az },
        { h: 'Public IPv4 DNS', f: i => esc(dnsOf(i.publicIp, i.region)) || '–' },
        { h: 'Public IPv4 address', f: i => i.publicIp || '–' },
        { h: 'Private IPv4 address', f: i => i.privateIp },
        { h: 'Key name', f: i => esc(i.key) || '–' },
      ],
      empty: 'No instances', emptyHint: `You do not have any instances in this region<br><br>${btn('Launch instances', 'launch')}`,
    });
    return ct(hdr('Instances', {
      count: rows.length,
      acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Connect', 'connect', { disabled: !(one && one.state === 'running') })}
        ${dd('state', 'Instance state', [
          { label: 'Stop instance', act: 'instStop', disabled: !states.length || !states.every(x => x === 'running') },
          { label: 'Start instance', act: 'instStart', disabled: !states.length || !states.every(x => x === 'stopped') },
          { label: 'Reboot instance', act: 'instReboot', disabled: !states.length || !states.every(x => x === 'running') },
          { label: 'Terminate (delete) instance', act: 'instTerminate', disabled: !states.length || states.some(x => x === 'terminated' || x === 'shutting-down') },
        ], { disabled: !sel.length, right: true })}
        ${dd('actions', 'Actions', [
          { label: 'Connect', act: 'connect', disabled: !(one && one.state === 'running') },
          { label: 'View details', act: 'pickInst', data: one ? `data-id="${one.id}"` : '', disabled: !one },
          '-', { label: 'Security › Change security groups', act: 'na' }, { label: 'Monitor and troubleshoot › Get system log', act: 'na' },
        ], { disabled: !sel.length, right: true })}
        ${btn('Launch instances', 'launch', { primary: true })}`,
    }) + `<div class="ct-b"><div class="filter">${ICON.search}<input id="aws-filter" placeholder="Find Instance by attribute or tag (case-sensitive)" value="${esc(v.filter)}" data-input="filter"></div>${table}</div>`)
      + (one ? instDetails(one) : sel.length > 1 ? ct(`<div class="ct-b muted">${sel.length} instances selected</div>`) : ct(`<div class="ct-b muted center">Select an instance</div>`));
  }

  function instDetails(i) {
    const ami = amiOf(i.ami);
    const t = v.tab || 'details';
    const sgs = S().securityGroups.filter(g => i.sgs.includes(g.id));
    let body = '';
    if (t === 'details') {
      body = kv([
        ['Instance ID', `${i.id}`], ['Public IPv4 address', i.publicIp ? `${i.publicIp} <a class="lnk" data-act="copy" data-v="${i.publicIp}">open address</a>` : '–'], ['Private IPv4 addresses', i.privateIp],
        ['Instance state', status(i.state)], ['Public IPv4 DNS', esc(dnsOf(i.publicIp, i.region)) || '–'], ['Private IP DNS name (IPv4 only)', `ip-${i.privateIp.replace(/\./g, '-')}.ec2.internal`],
        ['Instance type', i.type], ['VPC ID', esc(i.vpc)], ['Subnet ID', esc(i.subnet)],
        ['AMI ID', i.ami], ['AMI name', esc(ami.name)], ['Platform', ami.distro === 'windows' ? 'Windows' : 'Linux/UNIX'],
        ['Key pair assigned at launch', esc(i.key) || '–'], ['Launch time', UI.date(i.launched)], ['Availability Zone', i.az],
      ]);
    } else if (t === 'security') {
      const rules = sgs.flatMap(g => g.rules.map(r => ({ ...r, sg: g.name, sgid: g.id })));
      body = kv([['Owner ID', acct()], ['Security groups', sgs.map(g => `${g.id} (${esc(g.name)})`).join('<br>')]], 2)
        + `<h4 class="sub">Inbound rules</h4>` + UI.table({ key: 'sgid', rows: rules, cols: [{ h: 'Security group rule ID', f: r => 'sgr-0' + r.sgid.slice(4, 15) }, { h: 'Port range', f: r => r.port }, { h: 'Protocol', f: r => r.proto }, { h: 'Source', f: r => esc(r.source) }, { h: 'Security groups', f: r => esc(r.sg) }], empty: 'No inbound rules' });
    } else if (t === 'networking') {
      body = kv([['Public IPv4 address', i.publicIp || '–'], ['Private IPv4 address', i.privateIp], ['VPC ID', i.vpc], ['Subnet ID', i.subnet], ['Availability Zone', i.az], ['Auto-assigned IP address', i.autoIp ? i.publicIp || '–' : '–']]);
    } else if (t === 'storage') {
      body = kv([['Root device name', ami.distro === 'windows' ? '/dev/sda1' : '/dev/xvda'], ['Root device type', 'EBS'], ['EBS optimization', 'disabled']]) + `<h4 class="sub">Block devices</h4>`
        + UI.table({ rows: [i.volume], cols: [{ h: 'Volume ID', f: x => x.id }, { h: 'Device name', f: () => '/dev/xvda' }, { h: 'Volume size (GiB)', f: x => x.size }, { h: 'Volume type', f: x => x.type }, { h: 'Attachment status', f: () => i.state === 'terminated' ? 'Detached' : 'Attached' }, { h: 'Delete on termination', f: () => 'Yes' }] });
    } else if (t === 'status') {
      body = kv([['System status checks', i.state === 'running' && i.status === 'ok' ? `<span class="st st-g">${ICON.ok} System reachability check passed</span>` : '–'], ['Instance status checks', i.state === 'running' && i.status === 'ok' ? `<span class="st st-g">${ICON.ok} Instance reachability check passed</span>` : '–']], 2);
    } else {
      body = `<div class="charts">${['CPU utilization (%)', 'Network in (bytes)', 'Network out (bytes)', 'Status check failed (any)'].map(n => `<div class="chart"><b>${n}</b>${spark(i)}</div>`).join('')}</div>`;
    }
    return ct(hdr(`Instance: ${i.id}${i.name ? ` (${esc(i.name)})` : ''}`, { noInfo: true }) + tabs([['details', 'Details'], ['status', 'Status and alarms'], ['monitoring', 'Monitoring'], ['security', 'Security'], ['networking', 'Networking'], ['storage', 'Storage']], t) + `<div class="ct-b">${body}</div>`);
  }

  function spark(i) {
    if (i.state !== 'running') return '<div class="muted center" style="padding:30px 0">No data available.</div>';
    let seed = parseInt(i.id.slice(-6), 16);
    const pts = Array.from({ length: 24 }, (_, k) => { seed = (seed * 9301 + 49297) % 233280; return `${k * 10},${60 - (seed / 233280) * 40 - (k > 20 ? 10 : 0)}`; }).join(' ');
    return `<svg viewBox="0 0 230 70" class="spark"><polyline points="${pts}" fill="none" stroke="#0972d3" stroke-width="2"/><line x1="0" y1="69" x2="230" y2="69" stroke="#d1d5db"/></svg>`;
  }

  function pLaunch() {
    v.form = true;
    const s = S();
    const d = v.data.draft || { name: '', ami: AMIS[0].id, type: 't2.micro', key: regKeys()[0]?.name || '', fw: 'new', ssh: true, sshFrom: '0.0.0.0/0', https: false, http: false, sgId: '', size: '8', vol: 'gp3', count: '1', autoIp: 'enable' };
    const err = v.data.err || {};
    const ami = amiOf(d.ami);
    const type = typeOf(d.type);
    const sgs = regSGs();
    return `<h1 class="ph">Launch an instance ${info}</h1><p class="muted ph-d">Amazon EC2 allows you to create virtual machines, or instances, that run on the AWS Cloud. Quickly get started by following the simple steps below.</p>
    <div class="launch" data-change="launchSum" data-input="launchSum">
      <div class="launch-main">
        ${ct(hdr('Name and tags') + `<div class="ct-b">${field('Name', `<div class="row"><input name="name" value="${esc(d.name)}" placeholder="e.g. My Web Server" class="grow"> <a class="lnk" data-act="noop">Add additional tags</a></div>`)}</div>`)}
        ${ct(hdr('Application and OS Images (Amazon Machine Image)', { desc: 'An AMI contains the operating system, application server, and applications for your instance. If you don\'t see a suitable AMI below, use the search field or choose Browse more AMIs.' }) + `<div class="ct-b">
          <div class="filter">${ICON.search}<input placeholder="Search our full catalog including 1000s of application and OS images"></div>
          <h4 class="sub">Quick Start</h4>
          <div class="ami-tiles">${AMIS.map(a => `<label class="ami ${a.id === d.ami ? 'on' : ''}"><input type="radio" name="ami" value="${a.id}" ${a.id === d.ami ? 'checked' : ''}><span>${esc(a.short)}</span><i style="background:${a.color}">${a.badge}</i></label>`).join('')}</div>
          ${field('Amazon Machine Image (AMI)', `<div class="ami-sel"><b>${esc(ami.name)}</b><span class="badge free">Free tier eligible</span><br><small class="muted">${ami.id} (64-bit (x86)) · Virtualization: hvm · ENA enabled: true · Root device type: ebs</small></div>`)}
          ${field('Description', `<small>${esc(ami.desc)}</small>`)}
          ${ami.distro === 'windows' ? alert('info', 'Instâncias Windows usam RDP (porta 3389), não SSH. No laboratório, prefira uma AMI Linux para praticar o terminal.') : ''}</div>`)}
        ${ct(hdr('Instance type') + `<div class="ct-b">${field('Instance type', `<select name="type" class="w-full">${TYPES.map(t => `<option value="${t.id}" ${t.id === d.type ? 'selected' : ''}>${t.id}  —  Family: ${t.id.split('.')[0]}  ${t.vcpu} vCPU  ${t.mem} GiB Memory  ·  On-Demand Linux base pricing: ${t.price} USD per Hour${t.free ? '  ·  Free tier eligible' : ''}</option>`).join('')}</select>`)}
          ${type.free ? '' : alert('warning', 'Este tipo de instância não está no Free Tier. Em uma conta real, você seria cobrado por hora.')}</div>`)}
        ${ct(hdr('Key pair (login)', { desc: 'You can use a key pair to securely connect to your instance. Ensure that you have access to the selected key pair before you launch the instance.' }) + `<div class="ct-b">${field('Key pair name - <i>required</i>', `<div class="row"><select name="key" class="grow"><option value="">Proceed without a key pair (Not recommended)</option>${regKeys().map(k => `<option ${k.name === d.key ? 'selected' : ''}>${esc(k.name)}</option>`).join('')}</select> <a class="lnk" data-act="newKeyInline">Create new key pair</a></div>`)}
          ${!d.key ? alert('warning', 'Sem um par de chaves você não conseguirá conectar via SSH pelo terminal (somente via EC2 Instance Connect).') : ''}</div>`)}
        ${ct(hdr('Network settings', { acts: btn('Edit', 'noop') }) + `<div class="ct-b">${kv([['Network', esc(vpcId())], ['Subnet', 'No preference (Default subnet in any availability zone)'], ['Auto-assign public IP', `<select name="autoIp"><option value="enable" ${d.autoIp === 'enable' ? 'selected' : ''}>Enable</option><option value="disable" ${d.autoIp === 'disable' ? 'selected' : ''}>Disable</option></select>`]], 3)}
          ${field('Firewall (security groups)', `<div class="radio-cards"><label class="${d.fw === 'new' ? 'on' : ''}"><input type="radio" name="fw" value="new" ${d.fw === 'new' ? 'checked' : ''}> Create security group</label><label class="${d.fw === 'existing' ? 'on' : ''}"><input type="radio" name="fw" value="existing" ${d.fw === 'existing' ? 'checked' : ''}> Select existing security group</label></div>`, 'A security group is a set of firewall rules that control the traffic for your instance. Add rules to allow specific traffic to reach your instance.')}
          ${d.fw === 'new' ? `<p class="muted">We'll create a new security group called '<b>launch-wizard-${s.securityGroups.filter(g => g.name.startsWith('launch-wizard')).length + 1}</b>' with the following rules:</p>
            <div class="checks"><label><input type="checkbox" name="ssh" ${d.ssh ? 'checked' : ''}> <span><b>Allow SSH traffic from</b><br><small>Helps you connect to your instance</small></span><select name="sshFrom"><option value="0.0.0.0/0" ${d.sshFrom === '0.0.0.0/0' ? 'selected' : ''}>Anywhere 0.0.0.0/0</option><option value="${MY_IP}/32" ${d.sshFrom !== '0.0.0.0/0' ? 'selected' : ''}>My IP ${MY_IP}/32</option></select></label>
            <label><input type="checkbox" name="https" ${d.https ? 'checked' : ''}> <span><b>Allow HTTPS traffic from the internet</b><br><small>To set up an endpoint, for example when creating a web server</small></span></label>
            <label><input type="checkbox" name="http" ${d.http ? 'checked' : ''}> <span><b>Allow HTTP traffic from the internet</b><br><small>To set up an endpoint, for example when creating a web server</small></span></label></div>
            ${d.ssh && d.sshFrom === '0.0.0.0/0' ? alert('warning', 'Rules with source of 0.0.0.0/0 allow all IP addresses to access your instance. We recommend setting security group rules to allow access from known IP addresses only.') : ''}`
        : field('Common security groups', `<select name="sgId" class="w-full">${sgs.map(g => `<option value="${g.id}" ${g.id === d.sgId ? 'selected' : ''}>${esc(g.name)} — ${g.id}</option>`).join('')}</select>`)}</div>`)}
        ${ct(hdr('Configure storage', { acts: btn('Advanced', 'noop', { link: true }) }) + `<div class="ct-b"><div class="row">1x <input name="size" value="${esc(d.size)}" style="width:70px"> GiB <select name="vol"><option ${d.vol === 'gp3' ? 'selected' : ''}>gp3</option><option ${d.vol === 'gp2' ? 'selected' : ''}>gp2</option><option ${d.vol === 'io1' ? 'selected' : ''}>io1</option></select> Root volume (Not encrypted)</div>
          ${err.size ? `<p class="ferr">${ICON.warn} ${err.size}</p>` : ''}${alert('info', 'Free tier eligible customers can get up to 30 GB of EBS General Purpose (SSD) or Magnetic storage')}</div>`)}
      </div>
      <aside class="launch-sum">${ct(hdr('Summary', { noInfo: true }) + `<div class="ct-b">${field('Number of instances', `<input name="count" value="${esc(d.count || '1')}" style="width:80px">`)}<div id="aws-sum">${launchSummary(d)}</div></div><div class="ct-f">${btn('Cancel', 'nav', { link: true, data: 'data-id="instances"' })} ${btn('Launch instance', 'launchGo', { primary: true })}</div>`)}</aside>
    </div>`;
  }

  function launchSummary(d) {
    const ami = amiOf(d.ami); const t = typeOf(d.type);
    const fw = d.fw === 'new' ? 'New security group' : (S().securityGroups.find(g => g.id === d.sgId) || {}).name || 'default';
    return `<dl class="sum"><dt>Software Image (AMI)</dt><dd>${esc(ami.name)}<br><small>${ami.id}</small></dd><dt>Virtual server type (instance type)</dt><dd>${t.id}</dd><dt>Firewall (security group)</dt><dd>${esc(fw)}</dd><dt>Storage (volumes)</dt><dd>1 volume(s) - ${esc(d.size || 8)} GiB</dd></dl>`
      + (t.free ? `<div class="free-box"><b>Free tier:</b> In your first year includes 750 hours of t2.micro (or t3.micro in the Regions in which t2.micro is unavailable) instance usage on free tier AMIs per month.</div>` : '');
  }

  function launchGo() {
    const s = S();
    const d = UI.form(frame.querySelector('.launch'));
    const err = {};
    const size = parseInt(d.size, 10);
    if (!(size >= 8 && size <= 16384)) err.size = 'The volume size must be at least 8 GiB (snapshot size) and at most 16384 GiB.';
    const count = Math.max(1, Math.min(5, parseInt(d.count, 10) || 1));
    if (Object.keys(err).length) { v.data = { draft: d, err }; render(); return; }
    let sg;
    if (d.fw === 'new') {
      const rules = [];
      if (d.ssh) rules.push({ type: 'SSH', proto: 'TCP', port: '22', source: d.sshFrom });
      if (d.https) rules.push({ type: 'HTTPS', proto: 'TCP', port: '443', source: '0.0.0.0/0' });
      if (d.http) rules.push({ type: 'HTTP', proto: 'TCP', port: '80', source: '0.0.0.0/0' });
      sg = { id: 'sg-0' + UI.rand(16), name: `launch-wizard-${s.securityGroups.filter(g => g.name.startsWith('launch-wizard')).length + 1}`, desc: `launch-wizard created ${new Date().toISOString()}`, region: s.region, vpc: vpcId(), rules };
      s.securityGroups.push(sg);
    } else sg = s.securityGroups.find(g => g.id === d.sgId) || regSGs()[0];
    const ami = amiOf(d.ami);
    const ids = [];
    for (let n = 0; n < count; n++) {
      const pub = d.autoIp === 'enable' ? UI.ipv4() : null;
      const inst = {
        id: 'i-0' + UI.rand(16), name: d.name.trim(), ami: ami.id, distro: ami.distro, user: ami.user, type: d.type,
        region: s.region, az: s.region + UI.pick(['a', 'b', 'c']), state: 'pending', status: 'init', autoIp: d.autoIp === 'enable',
        publicIp: pub, privateIp: `172.31.${UI.int(0, 95)}.${UI.int(2, 254)}`, key: d.key || null, sgs: [sg.id], vpc: vpcId(), subnet: 'subnet-0' + UI.rand(16),
        volume: { id: 'vol-0' + UI.rand(16), size, type: d.vol }, launched: Date.now(),
      };
      Store.queue(inst, [[3000, { state: 'running' }], [6000, { status: 'ok' }]]);
      s.instances.unshift(inst);
      ids.push(inst.id);
    }
    flash('success', `Successfully initiated launch of instance (${ids.map(i => `<a class="lnk" data-act="pickInst" data-id="${i}">${i}</a>`).join(', ')})`);
    go('ec2', 'instances', null, { sel: ids.slice(0, 1) });
    Store.commit();
  }

  function setInstState(ids, kind) {
    const s = S();
    for (const i of s.instances.filter(x => ids.includes(x.id))) {
      if (kind === 'stop' && i.state === 'running') { i.state = 'stopping'; Store.queue(i, [[3500, { state: 'stopped', publicIp: null, status: 'init' }]]); }
      if (kind === 'start' && i.state === 'stopped') { i.state = 'pending'; i.restarted = true; Store.queue(i, [[3000, { state: 'running', publicIp: i.autoIp ? UI.ipv4() : null }], [5000, { status: 'ok' }]]); }
      if (kind === 'reboot' && i.state === 'running') { i.status = 'init'; Store.queue(i, [[4000, { status: 'ok' }]]); }
      if (kind === 'terminate' && !['terminated', 'shutting-down'].includes(i.state)) { i.state = 'shutting-down'; Store.queue(i, [[4000, { state: 'terminated', publicIp: null }]]); }
    }
    Store.commit();
  }

  function pConnect() {
    const i = S().instances.find(x => x.id === v.id);
    if (!i) return pInstances();
    const t = v.tab || 'ic';
    const ami = amiOf(i.ami);
    const dns = dnsOf(i.publicIp, i.region);
    let body;
    if (t === 'ic') {
      const ok = i.state === 'running' && sgAllows(i, 'TCP', 22);
      body = (ami.distro === 'windows' ? alert('error', 'EC2 Instance Connect não suporta instâncias Windows. Use RDP.') : '')
        + kv([['Instance ID', i.id], ['Public IPv4 address', i.publicIp || '–'], ['IPv6 address', '–']], 3)
        + field('Connection type', `<div class="radio-cards"><label class="on"><input type="radio" checked> Connect using EC2 Instance Connect<br><small>Connect using the EC2 Instance Connect browser-based client, with a public IPv4 or IPv6 address.</small></label><label class="na"><input type="radio" disabled> Connect using EC2 Instance Connect Endpoint</label></div>`)
        + field('Username', `<input id="aws-ic-user" value="${esc(ami.user)}" style="width:300px">`, 'Enter the username defined in the AMI used to launch the instance. If you didn\'t define a custom username, use the default username, ' + esc(ami.user) + '.')
        + (!ok && i.state === 'running' ? alert('warning', `A porta 22 não está liberada no security group desta instância. O EC2 Instance Connect vai falhar. Edite as inbound rules em <a class="lnk" data-act="nav" data-id="sgs">Security Groups</a>.`) : '')
        + (!i.publicIp ? alert('warning', 'A instância não tem IPv4 público, então não é possível conectar pela internet.') : '');
    } else if (t === 'ssh') {
      const pem = i.key ? `${i.key}.pem` : 'sua-chave.pem';
      body = `<ol class="steps-list"><li>Open an SSH client.</li><li>Locate your private key file. The key used to launch this instance is <b>${esc(pem)}</b></li>
        <li>Run this command, if necessary, to ensure your key is not publicly viewable.<pre class="code">chmod 400 "${esc(pem)}"</pre></li>
        <li>Connect to your instance using its Public DNS:<pre class="code">${esc(dns) || '(sem DNS público)'}</pre></li></ol>
        <p><b>Example:</b></p><pre class="code">ssh -i "${esc(pem)}" ${esc(ami.user)}@${esc(dns || i.publicIp || '')}</pre>
        ${alert('info', `No laboratório, a chave baixada fica em <code>~/Downloads</code> no terminal Linux. Rode <code>cd ~/Downloads</code> antes dos comandos acima.`)}
        <p>${btn(`${ICON.terminal} Abrir terminal Linux do laboratório`, 'openTerminal')}</p>`;
    } else body = alert('info', t === 'ssm' ? 'Session Manager não está disponível neste laboratório.' : 'EC2 serial console não está disponível neste laboratório.');
    return `<h1 class="ph">Connect to instance ${info}</h1><p class="muted ph-d">Connect to your instance ${i.id}${i.name ? ` (${esc(i.name)})` : ''} using any of these options</p>`
      + ct(tabs([['ic', 'EC2 Instance Connect'], ['ssm', 'Session Manager'], ['ssh', 'SSH client'], ['serial', 'EC2 serial console']], t) + `<div class="ct-b">${body}</div>`)
      + `<div class="form-f">${btn('Cancel', 'nav', { link: true, data: 'data-id="instances"' })} ${t === 'ic' ? btn('Connect', 'icConnect', { primary: true, disabled: ami.distro === 'windows' || i.state !== 'running' }) : ''}</div>`;
  }

  function sgAllows(inst, proto, port) {
    const sgs = S().securityGroups.filter(g => inst.sgs.includes(g.id));
    return sgs.some(g => g.rules.some(r => ruleAllows(r, proto, port) && (r.source === '0.0.0.0/0' || r.source === `${MY_IP}/32` || r.source === '::/0')));
  }
  function ruleAllows(r, proto, port) {
    if (r.proto === 'All') return true;
    if (r.proto !== proto) return false;
    if (r.port === 'All') return true;
    const [a, b] = String(r.port).split('-').map(Number);
    return b ? port >= a && port <= b : port === a;
  }

  function pKeys() {
    const rows = regKeys();
    return ct(hdr('Key pairs', {
      count: rows.length,
      acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${dd('kactions', 'Actions', [{ label: 'Delete', act: 'keyDelete', disabled: !v.sel.length }], { right: true })} ${btn('Create key pair', 'newKey', { primary: true })}`,
    }) + `<div class="ct-b">${UI.table({
      select: 'multi', selected: v.sel, rows, key: 'name',
      cols: [{ h: 'Name', f: k => esc(k.name) }, { h: 'Type', f: k => k.type }, { h: 'Created', f: k => UI.date(k.created) }, { h: 'Fingerprint', f: k => `<small>${k.fingerprint}</small>` }, { h: 'ID', f: k => k.id }],
      empty: 'No key pairs', emptyHint: 'You don\'t have any key pairs in this region.',
    })}</div>`);
  }

  function keyModal(inline) {
    modal('Create key pair', `${field('Name', `<input name="kname" placeholder="Enter key pair name" class="w-full">`, '', '')}<p class="desc">The name can include up to 255 ASCII characters. It can't include leading or trailing spaces.</p>
      ${field('Key pair type', `<div class="radio-cards"><label class="on"><input type="radio" name="ktype" value="rsa" checked> RSA<br><small>RSA encrypted private and public key pair</small></label><label><input type="radio" name="ktype" value="ed25519"> ED25519<br><small>ED25519 encrypted private and public key pair</small></label></div>`)}
      ${field('Private key file format', `<div class="radio-cards"><label class="on"><input type="radio" name="kfmt" value="pem" checked> .pem<br><small>For use with OpenSSH</small></label><label><input type="radio" name="kfmt" value="ppk"> .ppk<br><small>For use with PuTTY</small></label></div>`)}
      ${alert('warning', 'When prompted, store the private key in a secure and accessible location on your computer. <b>You will need it later to connect to your instance.</b><br><small>No laboratório o arquivo é salvo em ~/Downloads do terminal Linux.</small>')}
      <p class="ferr" id="kerr"></p>`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Create key pair', 'keyCreate', { primary: true, data: inline ? 'data-inline="1"' : '' })}`);
  }

  function keyCreate(inline) {
    const s = S();
    const d = UI.form(mh);
    const name = d.kname.trim();
    const e = mh.querySelector('#kerr');
    if (!name) { e.textContent = 'Key pair name is required.'; return; }
    if (!/^[\w .\-]{1,255}$/.test(name)) { e.textContent = 'Key pair names can only contain alphanumeric characters, spaces, dashes, and underscores.'; return; }
    if (regKeys().some(k => k.name === name)) { e.textContent = `The key pair '${name}' already exists.`; return; }
    const material = UI.rand(48, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
    s.keyPairs.push({ name, type: d.ktype, id: 'key-0' + UI.rand(16), created: Date.now(), region: s.region, material, fingerprint: Array.from({ length: 16 }, () => UI.rand(2)).join(':') });
    const file = `${name}.${d.kfmt}`;
    const pem = `-----BEGIN ${d.ktype === 'rsa' ? 'RSA ' : 'OPENSSH '}PRIVATE KEY-----\n${material}\n${UI.rand(64, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')}\n-----END ${d.ktype === 'rsa' ? 'RSA ' : 'OPENSSH '}PRIVATE KEY-----\n`;
    Linux.saveDownload(file, pem);
    closeModal();
    if (inline) {
      const draft = UI.form(frame.querySelector('.launch'));
      draft.key = name;
      v.data.draft = draft;
      render();
    } else { flash('success', `Successfully created key pair <b>${esc(name)}</b>. O arquivo <code>${esc(file)}</code> foi "baixado" para <code>~/Downloads</code> no terminal Linux do laboratório.`); render(); }
    toast(`${esc(file)} salvo em ~/Downloads (terminal Linux)`, 'info');
    Store.commit();
  }

  function pSGs() {
    const rows = regSGs();
    const one = rows.find(g => g.id === v.sel[0]);
    return ct(hdr('Security Groups', {
      count: rows.length,
      acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${dd('sgactions', 'Actions', [{ label: 'Edit inbound rules', act: 'sgEdit', disabled: !one }, { label: 'Delete security groups', act: 'sgDelete', disabled: !one || one.name === 'default' }], { right: true })} ${btn('Create security group', 'sgNew', { primary: true })}`,
    }) + `<div class="ct-b">${UI.table({
      select: 'single', selected: v.sel, rows,
      cols: [{ h: 'Name', f: g => esc(g.name) }, { h: 'Security group ID', f: g => g.id }, { h: 'Security group name', f: g => esc(g.name) }, { h: 'VPC ID', f: g => g.vpc }, { h: 'Description', f: g => esc(g.desc) }, { h: 'Owner', f: () => acct() }, { h: 'Inbound rules count', f: g => `${g.rules.length} Permission entr${g.rules.length === 1 ? 'y' : 'ies'}` }],
    })}</div>`) + (one ? ct(hdr(`${one.id} - ${esc(one.name)}`, { noInfo: true }) + tabs([['in', 'Inbound rules'], ['out', 'Outbound rules']], v.tab || 'in') + `<div class="ct-b">${(v.tab || 'in') === 'in'
      ? `<div class="row between"><b>Inbound rules (${one.rules.length})</b>${btn('Edit inbound rules', 'sgEdit')}</div>` + UI.table({ rows: one.rules.map((r, k) => ({ ...r, id: k })), cols: [{ h: 'IP version', f: r => r.source.includes('.') ? 'IPv4' : '–' }, { h: 'Type', f: r => esc(r.type) }, { h: 'Protocol', f: r => r.proto }, { h: 'Port range', f: r => r.port }, { h: 'Source', f: r => esc(r.source) }], empty: 'No security group rules found' })
      : UI.table({ rows: [{ id: 1 }], cols: [{ h: 'IP version', f: () => 'IPv4' }, { h: 'Type', f: () => 'All traffic' }, { h: 'Protocol', f: () => 'All' }, { h: 'Port range', f: () => 'All' }, { h: 'Destination', f: () => '0.0.0.0/0' }] })}</div>`) : '');
  }

  function rulesEditor(rules) {
    return `<div class="rules">${rules.map((r, k) => `<div class="rule" data-k="${k}">
        <select name="rt${k}" data-change="ruleType" data-k="${k}">${Object.keys(RULE_TYPES).map(t => `<option ${t === r.type ? 'selected' : ''}>${t}</option>`).join('')}</select>
        <input value="${RULE_TYPES[r.type][0]}" disabled style="width:70px">
        <input name="rp${k}" value="${esc(r.port)}" ${r.type === 'Custom TCP' ? '' : 'disabled'} style="width:90px" placeholder="0-65535">
        <select name="rs${k}"><option value="0.0.0.0/0" ${r.source === '0.0.0.0/0' ? 'selected' : ''}>Anywhere-IPv4 (0.0.0.0/0)</option><option value="${MY_IP}/32" ${r.source === MY_IP + '/32' ? 'selected' : ''}>My IP (${MY_IP}/32)</option><option value="10.0.0.0/8" ${r.source === '10.0.0.0/8' ? 'selected' : ''}>Custom 10.0.0.0/8</option>${r.source === 'sg (self)' ? '<option selected value="sg (self)">sg (self)</option>' : ''}</select>
        ${btn('Delete', 'ruleDel', { data: `data-k="${k}"` })}</div>`).join('') || '<p class="muted">This security group has no inbound rules.</p>'}</div>${btn('Add rule', 'ruleAdd')}`;
  }
  function readRules() {
    return v.data.rules.map((r, k) => {
      const type = mh.querySelector(`[name=rt${k}]`).value;
      const [proto, port] = RULE_TYPES[type];
      return { type, proto, port: type === 'Custom TCP' ? mh.querySelector(`[name=rp${k}]`).value.trim() : port, source: mh.querySelector(`[name=rs${k}]`).value };
    });
  }
  function sgModal(sg) {
    v.data.sgEdit = sg ? sg.id : null;
    const keep = mh.querySelector('[name=sgname]') ? UI.form(mh) : {};
    modal(sg ? `Edit inbound rules — ${esc(sg.name)}` : 'Create security group', `${sg ? '' : `${field('Security group name', `<input name="sgname" class="w-full" value="${esc(keep.sgname || '')}">`)}${field('Description', `<input name="sgdesc" class="w-full" value="${esc(keep.sgdesc || '')}">`)}${field('VPC', `<input value="${vpcId()}" disabled class="w-full">`)}`}
      <h4 class="sub">Inbound rules</h4><div class="rule-h"><span>Type</span><span>Protocol</span><span>Port range</span><span>Source</span></div>${rulesEditor(v.data.rules)}<p class="ferr" id="sgerr"></p>`,
    `${btn('Cancel', 'closeModal', { link: true })} ${btn(sg ? 'Save rules' : 'Create security group', 'sgSave', { primary: true })}`, 'wide');
  }

  function pVolumes() {
    const rows = regInst().filter(i => i.state !== 'terminated');
    return ct(hdr('Volumes', { count: rows.length, acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Create volume', 'na', { primary: true })}` }) + `<div class="ct-b">${UI.table({
      rows, cols: [{ h: 'Volume ID', f: i => i.volume.id }, { h: 'Type', f: i => i.volume.type }, { h: 'Size', f: i => i.volume.size + ' GiB' }, { h: 'IOPS', f: () => '3000' }, { h: 'Availability Zone', f: i => i.az }, { h: 'Volume state', f: () => `<span class="st st-g">${ICON.ok} In-use</span>` }, { h: 'Attached resources', f: i => `${i.id} (${esc(i.name || '')}): /dev/xvda` }],
      empty: 'No volumes', emptyHint: 'Volumes são criados junto com as instâncias.',
    })}</div>`);
  }
  const pAmis = () => ct(hdr('Amazon Machine Images (AMIs)', { count: AMIS.length, acts: btn('Launch instance from AMI', 'launch', { primary: true }) }) + `<div class="ct-b">${UI.table({ rows: AMIS, cols: [{ h: 'Name', f: a => esc(a.name) }, { h: 'AMI ID', f: a => a.id }, { h: 'Source', f: () => 'amazon' }, { h: 'Platform', f: a => a.distro === 'windows' ? 'Windows' : 'Linux/UNIX' }, { h: 'Default username', f: a => a.user }, { h: 'Architecture', f: () => 'x86_64' }] })}</div>`);
  const pTypes = () => ct(hdr('Instance types', { count: TYPES.length }) + `<div class="ct-b">${UI.table({ rows: TYPES, cols: [{ h: 'Instance type', f: t => t.id }, { h: 'Free-Tier eligible', f: t => t.free ? 'true' : 'false' }, { h: 'vCPUs', f: t => t.vcpu }, { h: 'Memory (GiB)', f: t => t.mem }, { h: 'On-Demand Linux pricing', f: t => t.price + ' USD per Hour' }] })}</div>`);

  // ================= S3 =================
  const bucket = n => S().buckets.find(b => b.name === n);
  function bucketPublic(b) {
    if (b.blockPublic || S().accountBPA) return false;
    try {
      const p = JSON.parse(b.policy || '{}');
      return [].concat(p.Statement || []).some(st => st.Effect === 'Allow' && (st.Principal === '*' || (st.Principal && st.Principal.AWS === '*')) && [].concat(st.Action || []).some(a => /^s3:(\*|GetObject)$/.test(a)));
    } catch (e) { return false; }
  }
  function bucketNameError(n) {
    if (n.length < 3 || n.length > 63) return 'Bucket name must be between 3 and 63 characters long.';
    if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(n)) return 'Bucket name must not contain uppercase characters or spaces, and must start and end with a letter or number. Only lowercase letters, numbers, dots (.), and hyphens (-) are allowed.';
    if (/\.\./.test(n)) return 'Bucket name must not contain two adjacent periods.';
    if (/^\d+\.\d+\.\d+\.\d+$/.test(n)) return 'Bucket name must not be formatted as an IP address.';
    if (n.startsWith('xn--') || n.endsWith('-s3alias')) return 'Bucket name must not start with the prefix xn-- or end with the suffix -s3alias.';
    if (S().buckets.some(b => b.name === n) || TAKEN.includes(n)) return 'Bucket with the same name already exists. Bucket names must be unique across all AWS accounts in all the AWS Regions within a partition (globally unique).';
    return null;
  }
  function createBucket(name, reg, opts = {}) {
    const b = { name, region: reg, created: Date.now(), versioning: !!opts.versioning, blockPublic: opts.blockPublic !== false, acls: !!opts.acls, objects: [], policy: '', website: null };
    S().buckets.push(b);
    return b;
  }

  function pBuckets() {
    const s = S();
    const f = v.filter.toLowerCase();
    const rows = s.buckets.filter(b => !f || b.name.includes(f));
    const one = v.sel.length === 1 ? bucket(v.sel[0]) : null;
    return `${ct(hdr('Account snapshot', { noInfo: true, desc: 'Storage Lens provides visibility into storage usage and activity trends.', acts: btn('View Storage Lens dashboard', 'na') }) + `<div class="ct-b">${kv([['Total storage', UI.bytes(s.buckets.reduce((a, b) => a + b.objects.reduce((x, o) => x + o.size, 0), 0))], ['Object count', s.buckets.reduce((a, b) => a + b.objects.filter(o => !o.key.endsWith('/')).length, 0)], ['Buckets', s.buckets.length]], 3)}</div>`)}
      ${ct(hdr('General purpose buckets', {
      count: rows.length, desc: 'Buckets are containers for data stored in S3.',
      acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn(`${ICON.copy} Copy ARN`, 'copyArn', { disabled: !one })} ${btn('Empty', 'bucketEmpty', { disabled: !one })} ${btn('Delete', 'bucketDelete', { disabled: !one })} ${btn('Create bucket', 'nav', { primary: true, data: 'data-id="create"' })}`,
    }) + `<div class="ct-b"><div class="filter">${ICON.search}<input id="aws-filter" placeholder="Find buckets by name" value="${esc(v.filter)}" data-input="filter"></div>${UI.table({
      select: 'single', selected: v.sel, rows, key: 'name',
      cols: [{ h: 'Name', f: b => link(esc(b.name), 'openBucket', `data-id="${esc(b.name)}"`) }, { h: 'AWS Region', f: b => `${esc((REGIONS.find(r => r.id === b.region) || {}).name)} ${b.region}` }, { h: 'Access', f: b => bucketPublic(b) ? `<span class="st st-r">${ICON.warn} Public</span>` : 'Bucket and objects not public' }, { h: 'Creation date', f: b => UI.date(b.created) }],
      empty: 'No buckets', emptyHint: `You don't have any buckets.<br><br>${btn('Create bucket', 'nav', { data: 'data-id="create"' })}`,
    })}</div>`)}`;
  }

  function pCreateBucket() {
    v.form = true;
    const d = v.data.draft || { name: '', ver: 'off', block: true, own: 'disabled', ack: false };
    const err = v.data.err || {};
    return `<h1 class="ph">Create bucket ${info}</h1><p class="muted ph-d">Buckets are containers for data stored in S3.</p><div class="form-w" data-change="bucketDraft">
      ${ct(hdr('General configuration') + `<div class="ct-b">${kv([['AWS Region', `${esc(region().name)} ${region().id}`]], 1)}
        ${field('Bucket type', `<div class="radio-cards"><label class="on"><input type="radio" checked> General purpose<br><small>Recommended for most use cases and access patterns.</small></label><label class="na"><input type="radio" disabled> Directory<br><small>Not available in this lab.</small></label></div>`)}
        ${field('Bucket name', `<input name="name" class="w-full" placeholder="myawsbucket" value="${esc(d.name)}">`, '', err.name)}
        <p class="desc">Bucket names must be 3 to 63 characters and unique within the global namespace. Bucket names must also begin and end with a letter or number. Valid characters are a-z, 0-9, periods (.), and hyphens (-). <a class="lnk" data-act="noop">Learn More</a></p></div>`)}
      ${ct(hdr('Object Ownership', { desc: 'Control ownership of objects written to this bucket from other AWS accounts and the use of access control lists (ACLs).' }) + `<div class="ct-b"><div class="radio-cards"><label class="${d.own === 'disabled' ? 'on' : ''}"><input type="radio" name="own" value="disabled" ${d.own === 'disabled' ? 'checked' : ''}> <b>ACLs disabled (recommended)</b><br><small>All objects in this bucket are owned by this account. Access to this bucket and its objects is specified using only policies.</small></label><label class="${d.own === 'enabled' ? 'on' : ''}"><input type="radio" name="own" value="enabled" ${d.own === 'enabled' ? 'checked' : ''}> <b>ACLs enabled</b><br><small>Objects in this bucket can be owned by other AWS accounts.</small></label></div></div>`)}
      ${ct(hdr('Block Public Access settings for this bucket', { desc: 'Public access is granted to buckets and objects through access control lists (ACLs), bucket policies, access point policies, or all. In order to ensure that public access to this bucket and its objects is blocked, turn on Block all public access.' }) + `<div class="ct-b"><div class="checks"><label><input type="checkbox" name="block" ${d.block ? 'checked' : ''}> <span><b>Block <u>all</u> public access</b><br><small>Turning this setting on is the same as turning on all four settings below.</small></span></label></div>
        ${!d.block ? alert('warning', `Turning off block all public access might result in this bucket and the objects within becoming public. AWS recommends that you turn on block all public access, unless public access is required for specific and verified use cases such as static website hosting.<div class="checks"><label><input type="checkbox" name="ack" ${d.ack ? 'checked' : ''}> <span>I acknowledge that the current settings might result in this bucket and the objects within becoming public.</span></label></div>`) : ''}${err.ack ? `<p class="ferr">${ICON.warn} ${err.ack}</p>` : ''}</div>`)}
      ${ct(hdr('Bucket Versioning', { desc: 'Versioning is a means of keeping multiple variants of an object in the same bucket.' }) + `<div class="ct-b"><div class="radio-cards"><label class="${d.ver === 'off' ? 'on' : ''}"><input type="radio" name="ver" value="off" ${d.ver === 'off' ? 'checked' : ''}> Disable</label><label class="${d.ver === 'on' ? 'on' : ''}"><input type="radio" name="ver" value="on" ${d.ver === 'on' ? 'checked' : ''}> Enable</label></div></div>`)}
      ${ct(hdr('Default encryption', { desc: 'Server-side encryption is automatically applied to new objects stored in this bucket.' }) + `<div class="ct-b">${kv([['Encryption type', 'Server-side encryption with Amazon S3 managed keys (SSE-S3)'], ['Bucket Key', 'Enable']], 2)}</div>`)}
      ${alert('info', 'After creating the bucket, you can upload files and folders to the bucket, and configure additional bucket settings.')}
      <div class="form-f">${btn('Cancel', 'nav', { link: true, data: 'data-id="buckets"' })} ${btn('Create bucket', 'bucketCreate', { primary: true })}</div></div>`;
  }

  function listPrefix(b, prefix) {
    const seen = new Set(); const out = [];
    for (const o of b.objects) {
      if (!o.key.startsWith(prefix) || o.key === prefix) continue;
      const rest = o.key.slice(prefix.length);
      const k = rest.indexOf('/');
      if (k >= 0) { const name = rest.slice(0, k + 1); if (!seen.has(name)) { seen.add(name); out.push({ id: prefix + name, name, folder: true }); } }
      else out.push({ id: o.key, name: rest, folder: false, o });
    }
    return out.sort((a, c) => (c.folder - a.folder) || a.name.localeCompare(c.name));
  }

  function pBucket() {
    const b = bucket(v.id);
    if (!b) return pBuckets();
    const t = v.tab || 'objects';
    const pub = bucketPublic(b);
    let body = '';
    if (t === 'objects') {
      const prefix = v.data.prefix || '';
      const rows = listPrefix(b, prefix);
      const parts = prefix.split('/').filter(Boolean);
      body = ct(hdr('Objects', {
        count: rows.length,
        desc: 'Objects are the fundamental entities stored in Amazon S3. You can use Amazon S3 inventory to get a list of all objects in your bucket. For others to access your objects, you\'ll need to explicitly grant them permissions.',
        acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn(`${ICON.copy} Copy S3 URI`, 'copyUri', { disabled: v.sel.length !== 1 })} ${btn('Download', 'objDownload', { disabled: v.sel.length !== 1 || v.sel[0].endsWith('/') })} ${btn('Delete', 'objDelete', { disabled: !v.sel.length })} ${btn('Create folder', 'folderNew')} ${btn('Upload', 'upload', { primary: true })}`,
      }) + `<div class="ct-b">${parts.length ? `<div class="crumbs inner"><a data-act="prefix" data-id="">${esc(b.name)}</a>${parts.map((p, k) => `<i>/</i><a data-act="prefix" data-id="${esc(parts.slice(0, k + 1).join('/') + '/')}">${esc(p)}</a>`).join('')}<i>/</i></div>` : ''}
        ${UI.table({
          select: 'multi', selected: v.sel, rows,
          cols: [{ h: 'Name', f: r => r.folder ? `<span class="obj">${ICON.folder}${link(esc(r.name), 'prefix', `data-id="${esc(r.id)}"`)}</span>` : `<span class="obj">${ICON.file}${link(esc(r.name), 'openObj', `data-id="${esc(r.id)}"`)}</span>` }, { h: 'Type', f: r => r.folder ? 'Folder' : esc((r.name.split('.').pop() || '').slice(0, 8)) }, { h: 'Last modified', f: r => r.folder ? '–' : UI.date(r.o.modified) }, { h: 'Size', f: r => r.folder ? '–' : UI.bytes(r.o.size) }, { h: 'Storage class', f: r => r.folder ? '–' : 'Standard' }],
          empty: 'No objects', emptyHint: `You don't have any objects in this bucket.<br><br>${btn('Upload', 'upload')}`,
        })}</div>`);
    } else if (t === 'properties') {
      body = ct(hdr('Bucket overview', { noInfo: true }) + `<div class="ct-b">${kv([['AWS Region', `${esc((REGIONS.find(r => r.id === b.region) || {}).name)} ${b.region}`], ['Amazon Resource Name (ARN)', `arn:aws:s3:::${esc(b.name)}`], ['Creation date', UI.date(b.created)]])}</div>`)
        + ct(hdr('Bucket Versioning', { acts: btn('Edit', 'versioningEdit'), desc: 'Versioning is a means of keeping multiple variants of an object in the same bucket.' }) + `<div class="ct-b">${kv([['Bucket Versioning', b.versioning ? 'Enabled' : 'Disabled'], ['Multi-factor authentication (MFA) delete', 'Disabled']], 2)}</div>`)
        + ct(hdr('Default encryption', { acts: btn('Edit', 'na') }) + `<div class="ct-b">${kv([['Encryption type', 'Server-side encryption with Amazon S3 managed keys (SSE-S3)'], ['Bucket Key', 'Enabled']], 2)}</div>`)
        + ct(hdr('Static website hosting', { acts: btn('Edit', 'websiteEdit'), desc: 'Use this bucket to host a website or redirect requests.' }) + `<div class="ct-b">${b.website ? kv([['Static website hosting', 'Enabled'], ['Hosting type', 'Bucket hosting'], ['Bucket website endpoint', `<code>${websiteUrl(b)}</code><br><small class="muted">Teste no terminal Linux: <code>curl ${websiteUrl(b)}</code></small>`]], 1) + (pub ? '' : alert('warning', 'O bucket não é público: o endpoint vai responder 403 Forbidden. Desative o Block Public Access e adicione uma bucket policy permitindo s3:GetObject para Principal "*".')) : kv([['Static website hosting', 'Disabled']], 1)}</div>`);
    } else if (t === 'permissions') {
      body = ct(hdr('Permissions overview', { noInfo: true }) + `<div class="ct-b">${kv([['Access', pub ? `<span class="st st-r">${ICON.warn} Public</span>` : 'Bucket and objects not public']], 1)}</div>`)
        + ct(hdr('Block public access (bucket settings)', { acts: btn('Edit', 'bpaEdit'), desc: 'Public access is granted to buckets and objects through access control lists (ACLs), bucket policies, access point policies, or all.' }) + `<div class="ct-b">${kv([['Block <u>all</u> public access', b.blockPublic ? `<span class="st st-g">${ICON.ok} On</span>` : `<span class="st st-r">${ICON.warn} Off</span>`]], 1)}${S().accountBPA ? alert('info', 'O Block Public Access da <b>conta</b> está ligado e prevalece sobre esta configuração.') : ''}</div>`)
        + ct(hdr('Bucket policy', { acts: `${btn('Edit', 'policyEdit')} ${btn('Delete', 'policyDelete', { disabled: !b.policy })}`, desc: 'The bucket policy, written in JSON, provides access to the objects stored in the bucket. Bucket policies don\'t apply to objects owned by other accounts.' }) + `<div class="ct-b">${b.policy ? `<pre class="code">${esc(b.policy)}</pre>` : '<p class="muted">No policy to display.</p>'}</div>`)
        + ct(hdr('Object Ownership', { acts: btn('Edit', 'na') }) + `<div class="ct-b">${kv([['Object Ownership', b.acls ? 'Object writer' : 'Bucket owner enforced'], ['', b.acls ? 'ACLs are enabled.' : 'ACLs are disabled. All objects in this bucket are owned by this account.']], 1)}</div>`);
    } else body = ct(`<div class="ct-b">${alert('info', 'Esta aba ainda não está disponível no laboratório.')}</div>`);
    return `<h1 class="ph">${esc(b.name)} ${info}</h1>${pub ? `<span class="badge pub">${ICON.warn} Publicly accessible</span>` : ''}
      ${tabs([['objects', 'Objects'], ['metadata', 'Metadata'], ['properties', 'Properties'], ['permissions', 'Permissions'], ['metrics', 'Metrics'], ['management', 'Management'], ['ap', 'Access Points']], t)}<div class="tab-body">${body}</div>`;
  }
  const websiteUrl = b => `http://${b.name}.s3-website-${b.region}.amazonaws.com`;
  const objUrl = (b, key) => `https://${b.name}.s3.${b.region}.amazonaws.com/${key.split('/').map(encodeURIComponent).join('/')}`;

  function pObject() {
    const b = bucket(v.id);
    const o = b && b.objects.find(x => x.key === v.data.key);
    if (!o) return pBucket();
    return `<h1 class="ph">${esc(o.key.split('/').pop())} ${info}</h1>
      <div class="row end">${btn(`${ICON.copy} Copy S3 URI`, 'copy', { data: `data-v="s3://${esc(b.name)}/${esc(o.key)}"` })} ${btn('Download', 'objDownloadOne')} ${btn('Open', 'objOpen')} ${btn('Object actions', 'na')}</div>
      ${tabs([['props', 'Properties'], ['perm', 'Permissions'], ['ver', 'Versions']], 'props')}
      ${ct(hdr('Object overview', { noInfo: true }) + `<div class="ct-b">${kv([
        ['Owner', 'aluno'], ['AWS Region', `${b.region}`], ['Last modified', UI.date(o.modified)],
        ['Size', UI.bytes(o.size)], ['Type', esc(o.type)], ['Key', esc(o.key)],
        ['S3 URI', `s3://${esc(b.name)}/${esc(o.key)}`], ['Amazon Resource Name (ARN)', `arn:aws:s3:::${esc(b.name)}/${esc(o.key)}`], ['Entity tag (Etag)', o.etag],
        ['Object URL', `<a class="lnk" data-act="objUrl">${esc(objUrl(b, o.key))}</a>`],
      ])}</div>`)}
      ${o.content != null ? ct(hdr('Pré-visualização (laboratório)', { noInfo: true }) + `<div class="ct-b"><pre class="code">${esc(o.content.slice(0, 4000))}</pre></div>`) : ''}`;
  }

  async function upload() {
    const b = bucket(v.id);
    const files = await UI.pickFiles(true);
    if (!files.length) return;
    const prefix = v.data.prefix || '';
    for (const f of files) {
      const r = await UI.readFile(f);
      putObject(b, prefix + r.name, r.content, r.size, r.type);
    }
    flash('success', `Upload succeeded: ${files.length} file(s), ${UI.bytes(files.reduce((a, f) => a + f.size, 0))}. <a class="lnk" data-act="closeFlash">View details below.</a>`);
    render();
    Store.commit();
  }
  function putObject(b, key, content, size, type = 'text/plain') {
    b.objects = b.objects.filter(o => o.key !== key);
    b.objects.push({ key, size: size ?? (content || '').length, type, content, modified: Date.now(), etag: UI.rand(32) });
  }

  // ================= IAM =================
  const IAM = () => S().iam;
  const policyArn = n => MANAGED[n] ? `arn:aws:iam::aws:policy/${n}` : `arn:aws:iam::${acct()}:policy/${n}`;
  const allPolicies = () => [...Object.entries(MANAGED).map(([name, p]) => ({ name, type: 'AWS managed', desc: p.desc, doc: p.doc })), ...IAM().policies.map(p => ({ ...p, type: 'Customer managed', doc: JSON.parse(p.doc) }))];
  const policyDoc = n => (allPolicies().find(p => p.name === n) || {}).doc;
  const user = n => IAM().users.find(u => u.name === n);
  const group = n => IAM().groups.find(g => g.name === n);
  function userPolicies(u) {
    const out = u.policies.map(p => ({ name: p, via: 'Directly' }));
    for (const gn of u.groups) { const g = group(gn); if (g) g.policies.forEach(p => out.push({ name: p, via: `Group ${gn}` })); }
    return out;
  }
  function usedAs(pn) {
    const i = IAM();
    return i.users.some(u => u.policies.includes(pn)) || i.groups.some(g => g.policies.includes(pn)) || i.roles.some(r => r.policies.includes(pn));
  }

  function glob(pat, s, ci) {
    const re = new RegExp('^' + String(pat).replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$', ci ? 'i' : '');
    return re.test(s);
  }
  /** Avaliação simplificada de políticas IAM: Deny explícito > Allow > Deny implícito */
  function evaluate(names, action, resource, username) {
    let allow = null;
    for (const pn of names) {
      const doc = policyDoc(pn);
      if (!doc) continue;
      for (const st of [].concat(doc.Statement || [])) {
        const actOk = st.Action ? [].concat(st.Action).some(a => glob(a, action, true)) : st.NotAction ? ![].concat(st.NotAction).some(a => glob(a, action, true)) : false;
        const resList = [].concat(st.Resource || st.NotResource || []).map(r => String(r).replace('${aws:username}', username || '*'));
        const resMatch = resList.some(r => glob(r, resource));
        const resOk = st.Resource ? resMatch : st.NotResource ? !resMatch : false;
        if (actOk && resOk) {
          if (st.Effect === 'Deny') return { decision: 'explicitDeny', policy: pn };
          if (st.Effect === 'Allow' && !allow) allow = { decision: 'allowed', policy: pn };
        }
      }
    }
    return allow || { decision: 'implicitDeny' };
  }
  function authorize(username, action, resource) {
    const u = user(username);
    if (!u) return { decision: 'implicitDeny' };
    return evaluate(userPolicies(u).map(p => p.name), action, resource, username);
  }

  function pIamDashboard() {
    const i = IAM();
    return `<h1 class="ph">IAM Dashboard ${info}</h1><div class="two wide-l">
      <div>${ct(hdr('Security recommendations', { count: 2, noInfo: true }) + `<div class="ct-b sec-rec">
          <div>${'<span class="st st-r">' + ICON.warn + '</span>'} <div><b>Add MFA for root user</b><br><small>Add MFA for root user - Enable multi-factor authentication (MFA) for the root user to improve security for this account.</small></div>${btn('Add MFA', 'na')}</div>
          <div>${'<span class="st st-g">' + ICON.ok + '</span>'} <div><b>Root user has no active access keys</b><br><small>Using access keys attached to an IAM user instead of the root user improves security.</small></div></div>
          ${i.users.some(u => u.accessKeys.some(k => k.status === 'Active' && Date.now() - k.created > 864e5 * 90)) ? '' : ''}</div>`)}
        ${ct(hdr('IAM resources', { noInfo: true, desc: 'Resources in this AWS Account' }) + `<div class="ct-b res-grid c5">${[['User groups', i.groups.length, 'groups'], ['Users', i.users.length, 'users'], ['Roles', i.roles.length, 'roles'], ['Policies', i.policies.length, 'policies'], ['Identity providers', 0, null]].map(([n, c, p]) => `<div><span>${n}</span><a class="lnk big" data-act="${p ? 'nav' : 'na'}" data-id="${p}">${c}</a></div>`).join('')}</div>`)}
        ${ct(hdr("What's new", { noInfo: true }) + `<div class="ct-b"><ul class="news"><li>Use o <a class="lnk" data-act="nav" data-id="simulator">Policy simulator</a> para entender por que uma ação é permitida ou negada.</li><li>Boa prática: nunca use o usuário root no dia a dia. Crie usuários IAM com o mínimo de permissões necessárias (least privilege).</li><li>Prefira grupos para atribuir permissões em vez de anexar políticas diretamente aos usuários.</li></ul></div>`)}</div>
      <div>${ct(hdr('AWS Account', { noInfo: true }) + `<div class="ct-b">${kv([['Account ID', acct()], ['Account Alias', `${acct()} <a class="lnk" data-act="na">Create</a>`], ['Sign-in URL for IAM users in this account', `<code>https://${acct()}.signin.aws.amazon.com/console</code>`]], 1)}</div>`)}
        ${ct(hdr('Quick Links', { noInfo: true }) + `<div class="ct-b"><a class="lnk" data-act="nav" data-id="users">My security credentials</a><br><small>Manage your access keys, multi-factor authentication (MFA) and other credentials.</small></div>`)}</div></div>`;
  }

  function pUsers() {
    const i = IAM();
    const f = v.filter.toLowerCase();
    const rows = i.users.filter(u => !f || u.name.toLowerCase().includes(f));
    return ct(hdr('Users', {
      count: rows.length, desc: 'An IAM user is an identity with long-term credentials that is used to interact with AWS in an account.',
      acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Delete', 'userDelete', { disabled: !v.sel.length })} ${btn('Create user', 'nav', { primary: true, data: 'data-id="createUser"' })}`,
    }) + `<div class="ct-b"><div class="filter">${ICON.search}<input id="aws-filter" placeholder="Search" value="${esc(v.filter)}" data-input="filter"></div>${UI.table({
      select: 'multi', selected: v.sel, rows, key: 'name',
      cols: [{ h: 'User name', f: u => link(esc(u.name), 'openUser', `data-id="${esc(u.name)}"`) }, { h: 'Path', f: () => '/' }, { h: 'Groups', f: u => u.groups.length }, { h: 'Last activity', f: u => u.lastActivity ? UI.date(u.lastActivity) : '–' }, { h: 'MFA', f: () => '–' }, { h: 'Password age', f: u => u.console ? 'Today' : '–' }, { h: 'Console last sign-in', f: u => u.console ? 'Never' : '–' }, { h: 'Access key ID', f: u => u.accessKeys.map(k => `${k.status === 'Active' ? '' : '<s>'}${k.id}${k.status === 'Active' ? '' : '</s>'}`).join('<br>') || '–' }, { h: 'Creation time', f: u => UI.date(u.created) }],
      empty: 'No resources to display',
    })}</div>`);
  }

  function policyPicker(selected, name = 'pol') {
    const f = (v.data.pf || '').toLowerCase();
    const rows = allPolicies().filter(p => !f || p.name.toLowerCase().includes(f));
    return `<div class="filter">${ICON.search}<input id="aws-pf" placeholder="Filter by Type: Search" value="${esc(v.data.pf || '')}" data-input="pfilter"></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c-sel"></th><th>Policy name</th><th>Type</th><th>Attached entities</th></tr></thead><tbody>
      ${rows.map(p => `<tr><td class="c-sel"><input type="checkbox" name="${name}" value="${esc(p.name)}" data-multi="1" ${selected.includes(p.name) ? 'checked' : ''}></td><td><a class="lnk" data-act="policyPeek" data-id="${esc(p.name)}">${esc(p.name)}</a></td><td>${p.type}</td><td>${[...IAM().users.filter(u => u.policies.includes(p.name)), ...IAM().groups.filter(g => g.policies.includes(p.name))].length}</td></tr>`).join('')}
      </tbody></table></div>`;
  }

  function pCreateUser() {
    v.form = true;
    const w = v.data.wiz || (v.data.wiz = { step: 1, name: '', console: false, pwType: 'auto', pw: '', reset: true, mode: 'group', groups: [], pol: [] });
    const err = v.data.err || {};
    const steps = ['Specify user details', 'Set permissions', 'Review and create', 'Retrieve password'];
    const shown = w.console ? steps : steps.slice(0, 3);
    let body = '';
    if (w.step === 1) {
      body = ct(hdr('User details', { noInfo: true }) + `<div class="ct-b">${field('User name', `<input name="name" class="w-full" value="${esc(w.name)}">`, '', err.name)}<p class="desc">The user name can have up to 64 characters. Valid characters: A-Z, a-z, 0-9, and + = , . @ _ - (hyphen)</p>
        <div class="checks"><label><input type="checkbox" name="console" ${w.console ? 'checked' : ''} data-change="wizConsole"> <span><b>Provide user access to the AWS Management Console - <i>optional</i></b><br><small>If you're providing console access to a person, it's a best practice to manage their access in IAM Identity Center.</small></span></label></div>
        ${w.console ? `<div class="sub-box">${field('Console password', `<div class="radio-cards col"><label class="${w.pwType === 'auto' ? 'on' : ''}"><input type="radio" name="pwType" value="auto" ${w.pwType === 'auto' ? 'checked' : ''}> Autogenerated password<br><small>You can view the password after you create the user.</small></label><label class="${w.pwType === 'custom' ? 'on' : ''}"><input type="radio" name="pwType" value="custom" ${w.pwType === 'custom' ? 'checked' : ''}> Custom password<br><small>Enter a custom password for the user.</small></label></div>`)}
          <input name="pw" type="password" placeholder="Custom password" value="${esc(w.pw)}" style="width:300px">${err.pw ? `<p class="ferr">${ICON.warn} ${err.pw}</p>` : ''}
          <div class="checks"><label><input type="checkbox" name="reset" ${w.reset ? 'checked' : ''}> <span>Users must create a new password at next sign-in - <i>Recommended</i><br><small>Users automatically get the IAMUserChangePassword policy to allow them to change their own password.</small></span></label></div></div>` : ''}</div>`);
    } else if (w.step === 2) {
      const gs = IAM().groups;
      body = ct(hdr('Permissions options', { noInfo: true }) + `<div class="ct-b"><div class="radio-cards c3">${[['group', 'Add user to group', 'Add user to an existing group, or create a new group. We recommend using groups to manage user permissions by job function.'], ['copy', 'Copy permissions', 'Copy all group memberships, attached managed policies, and inline policies from an existing user.'], ['direct', 'Attach policies directly', 'Attach a managed policy directly to a user. As a best practice, we recommend attaching policies to a group instead.']].map(([id, t, dsc]) => `<label class="${w.mode === id ? 'on' : ''} ${id === 'copy' ? 'na' : ''}"><input type="radio" name="mode" value="${id}" ${w.mode === id ? 'checked' : ''} ${id === 'copy' ? 'disabled' : ''} data-change="wizMode"> <b>${t}</b><br><small>${dsc}</small></label>`).join('')}</div></div>`)
        + (w.mode === 'group' ? ct(hdr('User groups', { count: gs.length, acts: btn('Create group', 'groupQuick') }) + `<div class="ct-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c-sel"></th><th>Group name</th><th>Users</th><th>Attached policies</th><th>Created</th></tr></thead><tbody>${gs.length ? gs.map(g => `<tr><td class="c-sel"><input type="checkbox" name="groups" value="${esc(g.name)}" data-multi="1" ${w.groups.includes(g.name) ? 'checked' : ''}></td><td>${esc(g.name)}</td><td>${IAM().users.filter(u => u.groups.includes(g.name)).length}</td><td>${g.policies.map(esc).join(', ') || '–'}</td><td>${UI.date(g.created)}</td></tr>`).join('') : '<tr><td class="empty" colspan="5"><b>No groups</b><div>Crie um grupo com o botão "Create group".</div></td></tr>'}</tbody></table></div></div>`)
          : ct(hdr('Permissions policies', { count: allPolicies().length, desc: 'Choose one or more policies to attach to your new user.' }) + `<div class="ct-b">${policyPicker(w.pol)}</div>`));
    } else if (w.step === 3) {
      body = ct(hdr('User details', { noInfo: true, acts: btn('Edit', 'wizStep', { data: 'data-step="1"' }) }) + `<div class="ct-b">${kv([['User name', esc(w.name)], ['Console password type', w.console ? (w.pwType === 'auto' ? 'Autogenerated' : 'Custom password') : 'None'], ['Require password reset', w.console && w.reset ? 'Yes' : 'No']])}</div>`)
        + ct(hdr('Permissions summary', { noInfo: true, acts: btn('Edit', 'wizStep', { data: 'data-step="2"' }) }) + `<div class="ct-b">${UI.table({ key: 'name', rows: [...w.groups.map(g => ({ name: g, type: 'Group', used: 'Permissions group' })), ...w.pol.map(p => ({ name: p, type: MANAGED[p] ? 'AWS managed' : 'Customer managed', used: 'Permissions policy' })), ...(w.console && w.reset ? [{ name: 'IAMUserChangePassword', type: 'AWS managed', used: 'Permissions policy' }] : [])], cols: [{ h: 'Name', f: r => esc(r.name) }, { h: 'Type', f: r => r.type }, { h: 'Used as', f: r => r.used }], empty: 'No resources', emptyHint: 'O usuário não terá nenhuma permissão (implicit deny em tudo).' })}</div>`)
        + ct(hdr('Tags - <i>optional</i>', { noInfo: true }) + `<div class="ct-b muted">No tags associated with the resource. ${btn('Add new tag', 'noop')}</div>`);
    } else {
      body = flashHtml('success', 'User created successfully. You can view and download the user\'s password and email instructions for signing in to the AWS Management Console.')
        + ct(hdr('Console sign-in details', { noInfo: true }) + `<div class="ct-b">${kv([['Console sign-in URL', `<code>https://${acct()}.signin.aws.amazon.com/console</code>`], ['User name', esc(w.name)], ['Console password', `<code>${esc(w.pwShow)}</code> <small class="muted">(senha fictícia do laboratório)</small>`]], 1)}</div>`)
        + alert('warning', 'This is the only time that you can view this password. After you close this page, you can\'t view the password again.');
    }
    const foot = w.step === 4 ? `${btn('Return to users list', 'nav', { primary: true, data: 'data-id="users"' })}`
      : `${btn('Cancel', 'nav', { link: true, data: 'data-id="users"' })} ${w.step > 1 ? btn('Previous', 'wizPrev') : ''} ${w.step < 3 ? btn('Next', 'wizNext', { primary: true }) : btn('Create user', 'userCreate', { primary: true })}`;
    return `<div class="wizard"><ol class="wiz-steps">${shown.map((st, k) => `<li class="${k + 1 === w.step ? 'on' : k + 1 < w.step ? 'done' : ''}"><small>Step ${k + 1}</small><span>${st}</span></li>`).join('')}</ol>
      <div class="wiz-body" id="wiz"><h1 class="ph">${shown[w.step - 1]}</h1>${body}<div class="form-f">${foot}</div></div></div>`;
  }
  const flashHtml = (kind, html) => `<div class="flash ${kind}">${ICON.ok}<div>${html}</div></div>`;

  function wizRead() {
    const w = v.data.wiz;
    const d = UI.form(frame.querySelector('#wiz'));
    if (w.step === 1) Object.assign(w, { name: d.name.trim(), console: d.console, pwType: d.pwType || w.pwType, pw: d.pw || '', reset: d.reset ?? w.reset });
    if (w.step === 2) { if (d.mode) w.mode = d.mode; if (d.groups) w.groups = d.groups; if (d.pol) w.pol = d.pol; }
  }
  function wizNext() {
    wizRead();
    const w = v.data.wiz;
    v.data.err = {};
    if (w.step === 1) {
      if (!w.name) v.data.err.name = 'User name is required.';
      else if (!/^[\w+=,.@-]{1,64}$/.test(w.name)) v.data.err.name = 'The user name contains invalid characters.';
      else if (user(w.name)) v.data.err.name = `A user with name ${w.name} already exists.`;
      if (w.console && w.pwType === 'custom' && w.pw.length < 8) v.data.err.pw = 'Password must have at least 8 characters.';
      if (Object.keys(v.data.err).length) { render(); return; }
    }
    w.step++;
    render();
  }

  function pUser() {
    const u = user(v.id);
    if (!u) return pUsers();
    const t = v.tab || 'perm';
    const pols = userPolicies(u);
    let body = '';
    if (t === 'perm') {
      body = ct(hdr('Permissions policies', {
        count: pols.length, desc: 'Permissions are defined by policies attached to the user directly or through groups.',
        acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Remove', 'userPolRemove', { disabled: !v.sel.length })} ${btn('Add permissions', 'userPolAdd', { primary: true })}`,
      }) + `<div class="ct-b">${UI.table({
        select: 'multi', selected: v.sel, rows: pols.map(p => ({ ...p, id: p.via === 'Directly' ? p.name : '#' + p.name + p.via })), cols: [{ h: 'Policy name', f: p => link(esc(p.name), 'openPolicy', `data-id="${esc(p.name)}"`) }, { h: 'Type', f: p => MANAGED[p.name] ? 'AWS managed' : 'Customer managed' }, { h: 'Attached via', f: p => esc(p.via) }],
        empty: 'No resources to display', emptyHint: 'Este usuário não tem permissões: qualquer ação será negada (implicit deny).',
      })}</div>`);
    } else if (t === 'groups') {
      body = ct(hdr('User groups membership', { count: u.groups.length, acts: `${btn('Remove', 'userGroupRemove', { disabled: !v.sel.length })} ${btn('Add user to groups', 'userGroupAdd', { primary: true })}` }) + `<div class="ct-b">${UI.table({ select: 'multi', selected: v.sel, key: 'name', rows: u.groups.map(g => group(g)).filter(Boolean), cols: [{ h: 'Group name', f: g => link(esc(g.name), 'openGroup', `data-id="${esc(g.name)}"`) }, { h: 'Attached policies', f: g => g.policies.map(esc).join(', ') || '–' }], empty: 'No groups' })}</div>`);
    } else if (t === 'creds') {
      body = ct(hdr('Console sign-in', { acts: btn(u.console ? 'Disable console access' : 'Enable console access', 'userConsole') }) + `<div class="ct-b">${kv([['Console sign-in link', `<code>https://${acct()}.signin.aws.amazon.com/console</code>`], ['Console password', u.console ? 'Enabled' : 'Not enabled']], 2)}</div>`)
        + ct(hdr('Multi-factor authentication (MFA)', { count: 0, acts: btn('Assign MFA device', 'na') }) + `<div class="ct-b muted">No MFA devices. Assign an MFA device to improve the security of your AWS environment</div>`)
        + ct(hdr('Access keys', { count: u.accessKeys.length, desc: 'Use access keys to send programmatic calls to AWS from the AWS CLI, AWS Tools for PowerShell, AWS SDKs, or direct AWS API calls. You can have a maximum of two access keys (active or inactive) at a time.', acts: btn('Create access key', 'accessKeyNew', { disabled: u.accessKeys.length >= 2 }) }) + `<div class="ct-b">${u.accessKeys.length ? u.accessKeys.map(k => `<div class="akey"><div><b>${k.id}</b><br><small>${k.desc ? esc(k.desc) + ' · ' : ''}Created ${UI.date(k.created)} · Last used: ${k.lastUsed ? UI.date(k.lastUsed) : 'Never'}</small></div><span class="st ${k.status === 'Active' ? 'st-g' : 'st-n'}">${k.status === 'Active' ? ICON.ok : ICON.stop} ${k.status}</span>${dd('ak' + k.id, 'Actions', [{ label: k.status === 'Active' ? 'Deactivate' : 'Activate', act: 'akToggle', data: `data-id="${k.id}"` }, { label: 'Delete', act: 'akDelete', data: `data-id="${k.id}"`, disabled: k.status === 'Active' }], { right: true })}</div>`).join('') : '<p class="muted">No access keys. As a best practice, avoid using long-term credentials like access keys. Instead, use tools which provide short term credentials.</p>'}</div>`);
    } else body = ct(`<div class="ct-b">${alert('info', 'Esta aba ainda não está disponível no laboratório.')}</div>`);
    return `<h1 class="ph">${esc(u.name)} ${info}</h1><div class="row end">${btn('Delete', 'userDeleteOne')}</div>
      ${ct(hdr('Summary', { noInfo: true }) + `<div class="ct-b">${kv([['ARN', `arn:aws:iam::${acct()}:user/${esc(u.name)}`], ['Console access', u.console ? 'Enabled without MFA' : 'Disabled'], ['Access key 1', u.accessKeys[0] ? `${u.accessKeys[0].id} - ${u.accessKeys[0].status}` : `<a class="lnk" data-act="accessKeyNew">Create access key</a>`], ['Created', UI.date(u.created)], ['Last console sign-in', '–'], ['Access key 2', u.accessKeys[1] ? `${u.accessKeys[1].id} - ${u.accessKeys[1].status}` : '–']])}</div>`)}
      ${tabs([['perm', 'Permissions'], ['groups', 'Groups'], ['tags', 'Tags'], ['creds', 'Security credentials'], ['advisor', 'Last Accessed']], t)}<div class="tab-body">${body}</div>`;
  }

  function pAccessKey() {
    v.form = true;
    const u = user(v.id);
    const w = v.data.ak || (v.data.ak = { step: 1, use: 'cli', ack: false });
    const err = v.data.err || {};
    let body;
    if (w.step === 1) {
      const uses = [['cli', 'Command Line Interface (CLI)', 'You plan to use this access key to enable the AWS CLI to access your AWS account.'], ['local', 'Local code', 'You plan to use this access key to enable application code in a local development environment to access your AWS account.'], ['compute', 'Application running on an AWS compute service', 'You plan to use this access key to enable application code running on an AWS compute service like Amazon EC2 to access your AWS account.'], ['other', 'Other', 'Your use case is not listed here.']];
      body = ct(hdr('Use case', { noInfo: true }) + `<div class="ct-b"><div class="radio-cards col">${uses.map(([id, t, d]) => `<label class="${w.use === id ? 'on' : ''}"><input type="radio" name="use" value="${id}" ${w.use === id ? 'checked' : ''}> <b>${t}</b><br><small>${d}</small></label>`).join('')}</div>
        ${w.use === 'compute' ? alert('warning', 'Para aplicações rodando na EC2, a boa prática é usar uma <b>IAM Role</b> anexada à instância em vez de access keys.') : ''}
        ${alert('info', '<b>Alternatives recommended</b><br>Use AWS CloudShell, a browser-based CLI, to run commands, or use the AWS CLI V2 with IAM Identity Center for short-term credentials.')}
        <div class="checks"><label><input type="checkbox" name="ack" ${w.ack ? 'checked' : ''}> <span>I understand the above recommendation and want to proceed to create an access key.</span></label></div>${err.ack ? `<p class="ferr">${ICON.warn} ${err.ack}</p>` : ''}</div>`);
    } else if (w.step === 2) {
      body = ct(hdr('Set description tag - <i>optional</i>', { noInfo: true }) + `<div class="ct-b">${field('Description tag value', `<input name="desc" class="w-full" placeholder="ex.: notebook-aluno">`, 'Describe the purpose of this access key and where it will be used. A good description will help you rotate this access key confidently later.')}</div>`);
    } else {
      const k = w.key;
      body = flashHtml('success', 'Access key created. This is the only time that the secret access key can be viewed or downloaded. You cannot recover it later. However, you can create a new access key any time.')
        + ct(hdr('Access key', { noInfo: true, desc: 'If you lose or forget your secret access key, you cannot retrieve it. Instead, create a new access key and make the old key inactive.' }) + `<div class="ct-b">${UI.table({ rows: [k], cols: [{ h: 'Access key', f: x => `<code>${x.id}</code> <a class="lnk" data-act="copy" data-v="${x.id}">${ICON.copy}</a>` }, { h: 'Secret access key', f: x => v.data.showSecret ? `<code>${x.secret}</code> <a class="lnk" data-act="copy" data-v="${x.secret}">${ICON.copy}</a>` : `<code>************</code> <a class="lnk" data-act="showSecret">Show</a>` }] })}</div>`)
        + ct(hdr('Access key best practices', { noInfo: true }) + `<div class="ct-b"><ul class="news"><li>Never store your access key in plain text, in a code repository, or in code.</li><li>Disable or delete access key when no longer needed.</li><li>Enable least-privilege permissions.</li><li>Rotate access keys regularly.</li></ul>${alert('info', `No terminal Linux do laboratório, rode <code>aws configure</code> e cole a Access key e a Secret. Depois teste com <code>aws sts get-caller-identity</code> e <code>aws s3 ls</code>.`)}</div>`);
    }
    const names = ['Access key best practices & alternatives', 'Set description tag', 'Retrieve access keys'];
    const foot = w.step === 3 ? `${btn('Download .csv file', 'akCsv')} ${btn('Done', 'openUser', { primary: true, data: `data-id="${esc(u.name)}" data-tab="creds"` })}`
      : `${btn('Cancel', 'openUser', { link: true, data: `data-id="${esc(u.name)}"` })} ${w.step > 1 ? btn('Previous', 'akPrev') : ''} ${w.step === 1 ? btn('Next', 'akNext', { primary: true }) : btn('Create access key', 'akCreate', { primary: true })}`;
    return `<div class="wizard"><ol class="wiz-steps">${names.map((n, k) => `<li class="${k + 1 === w.step ? 'on' : k + 1 < w.step ? 'done' : ''}"><small>Step ${k + 1}</small><span>${n}</span></li>`).join('')}</ol><div class="wiz-body" id="wiz"><h1 class="ph">${names[w.step - 1]}</h1>${body}<div class="form-f">${foot}</div></div></div>`;
  }

  function pGroups() {
    const rows = IAM().groups;
    return ct(hdr('User groups', { count: rows.length, desc: 'A user group is a collection of IAM users. Use groups to specify permissions for a collection of users.', acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Delete', 'groupDelete', { disabled: !v.sel.length })} ${btn('Create group', 'nav', { primary: true, data: 'data-id="createGroup"' })}` }) + `<div class="ct-b">${UI.table({
      select: 'multi', selected: v.sel, rows, key: 'name',
      cols: [{ h: 'Group name', f: g => link(esc(g.name), 'openGroup', `data-id="${esc(g.name)}"`) }, { h: 'Users', f: g => IAM().users.filter(u => u.groups.includes(g.name)).length }, { h: 'Permissions', f: g => g.policies.length ? 'Defined' : `<span class="st st-r">${ICON.warn} Not defined</span>` }, { h: 'Creation time', f: g => UI.date(g.created) }],
      empty: 'No resources to display',
    })}</div>`);
  }
  function pCreateGroup() {
    v.form = true;
    const err = v.data.err || {};
    const d = v.data.draft || { gname: '', users: [], pol: [] };
    return `<h1 class="ph">Create user group</h1><div id="wiz">
      ${ct(hdr('Name the group', { noInfo: true }) + `<div class="ct-b">${field('User group name', `<input name="gname" class="w-full" placeholder="Enter a meaningful name to identify this group." value="${esc(d.gname)}">`, '', err.gname)}<p class="desc">Maximum 128 characters. Use alphanumeric and '+=,.@-_' characters.</p></div>`)}
      ${ct(hdr('Add users to the group - <i>Optional</i>', { count: IAM().users.length, noInfo: true }) + `<div class="ct-b"><div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c-sel"></th><th>User name</th><th>Groups</th><th>Creation time</th></tr></thead><tbody>${IAM().users.map(u => `<tr><td class="c-sel"><input type="checkbox" name="users" value="${esc(u.name)}" data-multi="1" ${d.users.includes(u.name) ? 'checked' : ''}></td><td>${esc(u.name)}</td><td>${u.groups.length}</td><td>${UI.date(u.created)}</td></tr>`).join('') || '<tr><td class="empty" colspan="4"><b>No users</b></td></tr>'}</tbody></table></div></div>`)}
      ${ct(hdr('Attach permissions policies - <i>Optional</i>', { count: allPolicies().length }) + `<div class="ct-b">${policyPicker(d.pol)}</div>`)}
      <div class="form-f">${btn('Cancel', 'nav', { link: true, data: 'data-id="groups"' })} ${btn('Create user group', 'groupCreate', { primary: true })}</div></div>`;
  }
  function pGroup() {
    const g = group(v.id);
    if (!g) return pGroups();
    const t = v.tab || 'users';
    const members = IAM().users.filter(u => u.groups.includes(g.name));
    const body = t === 'users'
      ? ct(hdr('Users in this group', { count: members.length, acts: `${btn('Remove', 'groupUserRemove', { disabled: !v.sel.length })} ${btn('Add users', 'groupUserAdd', { primary: true })}` }) + `<div class="ct-b">${UI.table({ select: 'multi', selected: v.sel, key: 'name', rows: members, cols: [{ h: 'User name', f: u => link(esc(u.name), 'openUser', `data-id="${esc(u.name)}"`) }, { h: 'Groups', f: u => u.groups.length }, { h: 'Creation time', f: u => UI.date(u.created) }], empty: 'No resources to display' })}</div>`)
      : ct(hdr('Permissions policies', { count: g.policies.length, acts: `${btn('Remove', 'groupPolRemove', { disabled: !v.sel.length })} ${btn('Add permissions', 'groupPolAdd', { primary: true })}` }) + `<div class="ct-b">${UI.table({ select: 'multi', selected: v.sel, key: 'name', rows: g.policies.map(name => ({ name })), cols: [{ h: 'Policy name', f: p => link(esc(p.name), 'openPolicy', `data-id="${esc(p.name)}"`) }, { h: 'Type', f: p => MANAGED[p.name] ? 'AWS managed' : 'Customer managed' }], empty: 'No resources to display' })}</div>`);
    return `<h1 class="ph">${esc(g.name)} ${info}</h1><div class="row end">${btn('Delete', 'groupDeleteOne')}</div>${ct(hdr('Summary', { noInfo: true }) + `<div class="ct-b">${kv([['User group name', esc(g.name)], ['Creation time', UI.date(g.created)], ['ARN', `arn:aws:iam::${acct()}:group/${esc(g.name)}`]])}</div>`)}${tabs([['users', `Users (${members.length})`], ['perm', 'Permissions'], ['advisor', 'Access Advisor']], t)}<div class="tab-body">${t === 'advisor' ? ct(`<div class="ct-b">${alert('info', 'Não disponível no laboratório.')}</div>`) : body}</div>`;
  }

  function pRoles() {
    const rows = IAM().roles;
    return ct(hdr('Roles', { count: rows.length, desc: 'An IAM role is an identity you can create that has specific permissions with credentials that are valid for short durations. Roles can be assumed by entities that you trust.', acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Delete', 'roleDelete', { disabled: !v.sel.length || v.sel.some(n => n.startsWith('AWSServiceRole')) })} ${btn('Create role', 'nav', { primary: true, data: 'data-id="createRole"' })}` }) + `<div class="ct-b">${UI.table({
      select: 'multi', selected: v.sel, rows, key: 'name',
      cols: [{ h: 'Role name', f: r => link(esc(r.name), 'openRole', `data-id="${esc(r.name)}"`) }, { h: 'Trusted entities', f: r => `AWS Service: ${esc(r.trusted.split('.')[0])}${r.name.startsWith('AWSServiceRole') ? ' (Service-Linked Role)' : ''}` }, { h: 'Last activity', f: () => '–' }],
    })}</div>`);
  }
  function pCreateRole() {
    v.form = true;
    const err = v.data.err || {};
    return `<h1 class="ph">Create role</h1><div id="wiz">
      ${ct(hdr('Trusted entity type', { noInfo: true }) + `<div class="ct-b"><div class="radio-cards c3"><label class="on"><input type="radio" checked> <b>AWS service</b><br><small>Allow AWS services like EC2, Lambda, or others to perform actions in this account.</small></label><label class="na"><input type="radio" disabled> <b>AWS account</b><br><small>Not available in this lab.</small></label><label class="na"><input type="radio" disabled> <b>Web identity</b><br><small>Not available in this lab.</small></label></div>
        ${field('Use case', `<select name="svc" class="w-full"><option value="ec2.amazonaws.com">EC2 — Allows EC2 instances to call AWS services on your behalf.</option><option value="lambda.amazonaws.com">Lambda — Allows Lambda functions to call AWS services on your behalf.</option></select>`)}</div>`)}
      ${ct(hdr('Add permissions', { noInfo: true }) + `<div class="ct-b">${policyPicker([])}</div>`)}
      ${ct(hdr('Name, review, and create', { noInfo: true }) + `<div class="ct-b">${field('Role name', `<input name="rname" class="w-full" placeholder="ex.: EC2-S3-ReadOnly-Role">`, 'Enter a meaningful name to identify this role.', err.rname)}${field('Description', `<input name="rdesc" class="w-full" value="Allows EC2 instances to call AWS services on your behalf.">`)}</div>`)}
      <div class="form-f">${btn('Cancel', 'nav', { link: true, data: 'data-id="roles"' })} ${btn('Create role', 'roleCreate', { primary: true })}</div></div>`;
  }
  function pRole() {
    const r = IAM().roles.find(x => x.name === v.id);
    if (!r) return pRoles();
    const t = v.tab || 'perm';
    const trust = JSON.stringify({ Version: '2012-10-17', Statement: [{ Effect: 'Allow', Principal: { Service: r.trusted }, Action: 'sts:AssumeRole' }] }, null, 4);
    return `<h1 class="ph">${esc(r.name)} ${info}</h1>${ct(hdr('Summary', { noInfo: true }) + `<div class="ct-b">${kv([['Creation date', UI.date(r.created)], ['ARN', `arn:aws:iam::${acct()}:role/${esc(r.name)}`], ['Maximum session duration', '1 hour'], ['Description', esc(r.desc)]], 2)}</div>`)}
      ${tabs([['perm', 'Permissions'], ['trust', 'Trust relationships']], t)}<div class="tab-body">${t === 'perm' ? ct(hdr('Permissions policies', { count: r.policies.length }) + `<div class="ct-b">${UI.table({ key: 'name', rows: r.policies.map(name => ({ name })), cols: [{ h: 'Policy name', f: p => link(esc(p.name), 'openPolicy', `data-id="${esc(p.name)}"`) }, { h: 'Type', f: p => MANAGED[p.name] ? 'AWS managed' : 'Customer managed' }], empty: 'No resources to display' })}</div>`)
      : ct(hdr('Trusted entities', { noInfo: true, desc: 'Entities that can assume this role under specified conditions.' }) + `<div class="ct-b"><pre class="code">${esc(trust)}</pre></div>`)}</div>`;
  }

  function pPolicies() {
    const f = v.filter.toLowerCase();
    const rows = allPolicies().filter(p => !f || p.name.toLowerCase().includes(f));
    return ct(hdr('Policies', { count: rows.length, desc: 'A policy is an object in AWS that defines permissions.', acts: `${btn(ICON.refresh, 'refresh', { cls: 'icon' })} ${btn('Delete', 'policyDel', { disabled: !v.sel.length || v.sel.some(n => MANAGED[n]) })} ${btn('Create policy', 'nav', { primary: true, data: 'data-id="createPolicy"' })}` }) + `<div class="ct-b"><div class="filter">${ICON.search}<input id="aws-filter" placeholder="Filter by Type: Search" value="${esc(v.filter)}" data-input="filter"></div>${UI.table({
      select: 'single', selected: v.sel, rows, key: 'name',
      cols: [{ h: 'Policy name', f: p => link(esc(p.name), 'openPolicy', `data-id="${esc(p.name)}"`) }, { h: 'Type', f: p => p.type }, { h: 'Used as', f: p => usedAs(p.name) ? 'Permissions policy' : '–' }, { h: 'Description', f: p => `<small>${esc(p.desc)}</small>` }],
    })}</div>`);
  }
  function pPolicy() {
    const p = allPolicies().find(x => x.name === v.id);
    if (!p) return pPolicies();
    const i = IAM();
    const entities = [...i.users.filter(u => u.policies.includes(p.name)).map(u => ({ name: u.name, type: 'User' })), ...i.groups.filter(g => g.policies.includes(p.name)).map(g => ({ name: g.name, type: 'Group' })), ...i.roles.filter(r => r.policies.includes(p.name)).map(r => ({ name: r.name, type: 'Role' }))];
    const t = v.tab || 'perm';
    return `<h1 class="ph">${esc(p.name)} ${info}</h1>${ct(hdr('Policy details', { noInfo: true }) + `<div class="ct-b">${kv([['Type', p.type], ['Edited time', p.created ? UI.date(p.created) : 'October 01, 2024'], ['ARN', policyArn(p.name)], ['Description', esc(p.desc)]], 2)}</div>`)}
      ${tabs([['perm', 'Permissions'], ['ent', 'Entities attached']], t)}<div class="tab-body">${t === 'perm' ? ct(hdr('Permissions defined in this policy', { noInfo: true, desc: 'Permissions defined in this policy document specify which actions are allowed or denied.' }) + `<div class="ct-b"><pre class="code json">${esc(JSON.stringify(p.doc, null, 4))}</pre></div>`)
      : ct(hdr('Entities attached', { count: entities.length }) + `<div class="ct-b">${UI.table({ key: 'name', rows: entities, cols: [{ h: 'Entity name', f: e => esc(e.name) }, { h: 'Entity type', f: e => e.type }], empty: 'No entities attached' })}</div>`)}</div>`;
  }
  function pCreatePolicy() {
    v.form = true;
    const err = v.data.err || {};
    const d = v.data.draft || { json: JSON.stringify({ Version: '2012-10-17', Statement: [{ Sid: 'Statement1', Effect: 'Allow', Action: ['s3:ListAllMyBuckets', 's3:ListBucket', 's3:GetObject'], Resource: '*' }] }, null, 4), pname: '', pdesc: '' };
    return `<h1 class="ph">Create policy ${info}</h1><p class="muted ph-d">Add permissions by selecting services, actions, resources, and conditions. Build permission statements using the JSON editor.</p><div id="wiz">
      ${ct(hdr('Policy editor', { noInfo: true, acts: `<div class="seg"><button data-act="na">Visual</button><button class="on">JSON</button></div>` }) + `<div class="ct-b"><textarea name="json" class="code-ed" spellcheck="false">${esc(d.json)}</textarea>${err.json ? `<p class="ferr">${ICON.warn} ${esc(err.json)}</p>` : ''}
        <p class="desc">Dica: <code>Effect</code> pode ser Allow ou Deny; <code>Action</code> aceita curingas como <code>s3:Get*</code>; <code>Resource</code> usa ARNs como <code>arn:aws:s3:::meu-bucket/*</code>.</p></div>`)}
      ${ct(hdr('Policy details', { noInfo: true }) + `<div class="ct-b">${field('Policy name', `<input name="pname" class="w-full" value="${esc(d.pname)}" placeholder="ex.: S3ListAndRead">`, 'Enter a meaningful name to identify this policy.', err.pname)}${field('Description - <i>optional</i>', `<input name="pdesc" class="w-full" value="${esc(d.pdesc)}">`)}</div>`)}
      <div class="form-f">${btn('Cancel', 'nav', { link: true, data: 'data-id="policies"' })} ${btn('Create policy', 'policyCreate', { primary: true })}</div></div>`;
  }
  function validatePolicy(txt) {
    let doc;
    try { doc = JSON.parse(txt); } catch (e) { return ['Ln: JSON inválido — ' + e.message]; }
    const errs = [];
    if (doc.Version !== '2012-10-17' && doc.Version !== '2008-10-17') errs.push('Missing Version: We recommend that you specify the Version element ("2012-10-17").');
    const sts = [].concat(doc.Statement || []);
    if (!sts.length) errs.push('Missing Statement: Add a Statement element to the policy.');
    sts.forEach((st, k) => {
      if (!['Allow', 'Deny'].includes(st.Effect)) errs.push(`Statement ${k + 1}: Effect must be "Allow" or "Deny".`);
      if (!st.Action && !st.NotAction) errs.push(`Statement ${k + 1}: Missing Action.`);
      if (!st.Resource && !st.NotResource) errs.push(`Statement ${k + 1}: Missing Resource.`);
      [].concat(st.Action || []).forEach(a => { if (a !== '*' && !/^[a-z0-9-]+:[A-Za-z0-9*?]+$/.test(a)) errs.push(`Statement ${k + 1}: Invalid Action "${a}". Use o formato servico:Acao.`); });
    });
    return errs.length ? errs : null;
  }

  function pSimulator() {
    v.form = true;
    const d = v.data.draft || { who: IAM().users[0] ? 'user:' + IAM().users[0].name : '', svc: 'Amazon S3', res: '*', acts: [] };
    const results = v.data.results;
    const ents = [...IAM().users.map(u => ['user:' + u.name, 'User: ' + u.name]), ...IAM().groups.map(g => ['group:' + g.name, 'Group: ' + g.name]), ...IAM().roles.filter(r => !r.name.startsWith('AWSServiceRole')).map(r => ['role:' + r.name, 'Role: ' + r.name])];
    return `<h1 class="ph">IAM Policy Simulator</h1><p class="muted ph-d">Teste se uma identidade tem permissão para executar ações. A avaliação segue a lógica real: um <b>Deny explícito</b> sempre vence; senão, um <b>Allow</b> permite; sem nenhum Allow, a ação é <b>negada implicitamente</b>.</p>
      <div class="two wide-r" id="wiz">${ct(hdr('Users, Groups, and Roles', { noInfo: true }) + `<div class="ct-b">${ents.length ? `<select name="who" class="w-full" size="8">${ents.map(([id, l]) => `<option value="${esc(id)}" ${id === d.who ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>` : '<p class="muted">Crie um usuário, grupo ou role para simular.</p>'}${d.who ? `<h4 class="sub">Policies</h4><p><small>${simPolicies(d.who).map(esc).join('<br>') || 'Nenhuma política anexada'}</small></p>` : ''}</div>`)}
      ${ct(hdr('Policy Simulator', { noInfo: true, acts: btn('Run Simulation', 'simRun', { primary: true, disabled: !ents.length }) }) + `<div class="ct-b"><div class="row">${field('Select service', `<select name="svc" data-change="simSvc">${Object.keys(SIM_ACTIONS).map(sv => `<option ${sv === d.svc ? 'selected' : ''}>${sv}</option>`).join('')}</select>`)}${field('Resource (ARN)', `<input name="res" value="${esc(d.res)}" style="width:320px" placeholder="arn:aws:s3:::meu-bucket/*">`)}</div>
        <div class="checks grid2">${SIM_ACTIONS[d.svc].map(a => `<label><input type="checkbox" name="acts" value="${a}" data-multi="1" ${d.acts.includes(a) ? 'checked' : ''}> <span>${a.split(':')[1]}</span></label>`).join('')}</div>
        ${results ? `<h4 class="sub">Results</h4>${UI.table({ key: 'action', rows: results, cols: [{ h: 'Service', f: () => esc(d.svc) }, { h: 'Action', f: r => r.action }, { h: 'Resource type', f: () => esc(d.res) }, { h: 'Permission', f: r => r.decision === 'allowed' ? `<span class="st st-g">${ICON.ok} allowed</span>` : `<span class="st st-r">${ICON.err} ${r.decision === 'explicitDeny' ? 'denied (explicit deny)' : 'denied (implicit)'}</span>` }, { h: 'Matched statement', f: r => esc(r.policy || '–') }] })}` : ''}</div>`)}</div>`;
  }
  function simPolicies(who) {
    const [kind, name] = who.split(':');
    if (kind === 'user') { const u = user(name); return u ? userPolicies(u).map(p => p.name) : []; }
    if (kind === 'group') return (group(name) || { policies: [] }).policies;
    return (IAM().roles.find(r => r.name === name) || { policies: [] }).policies;
  }

  function pAccountBPA() {
    const on = S().accountBPA;
    return `<h1 class="ph">Block Public Access settings for this account ${info}</h1>${ct(hdr('Block Public Access settings for this account', { acts: btn('Edit', 'acctBpaToggle'), desc: 'Account-level settings apply to all buckets in this account and override bucket-level settings.' }) + `<div class="ct-b">${kv([['Block <u>all</u> public access', on ? `<span class="st st-g">${ICON.ok} On</span>` : `<span class="st st-r">${ICON.warn} Off</span>`]], 1)}</div>`)}`;
  }

  const PAGES = {
    'ec2:dashboard': pDashboard, 'ec2:instances': pInstances, 'ec2:launch': pLaunch, 'ec2:connect': pConnect, 'ec2:keys': pKeys, 'ec2:sgs': pSGs, 'ec2:volumes': pVolumes, 'ec2:amis': pAmis, 'ec2:types': pTypes,
    's3:buckets': pBuckets, 's3:create': pCreateBucket, 's3:bucket': pBucket, 's3:object': pObject, 's3:bpa': pAccountBPA,
    'iam:dashboard': pIamDashboard, 'iam:users': pUsers, 'iam:createUser': pCreateUser, 'iam:user': pUser, 'iam:accessKey': pAccessKey, 'iam:groups': pGroups, 'iam:createGroup': pCreateGroup, 'iam:group': pGroup, 'iam:roles': pRoles, 'iam:createRole': pCreateRole, 'iam:role': pRole, 'iam:policies': pPolicies, 'iam:policy': pPolicy, 'iam:createPolicy': pCreatePolicy, 'iam:simulator': pSimulator,
  };
  const DEFAULT_PAGE = { ec2: 'dashboard', s3: 'buckets', iam: 'dashboard' };

  // ---------- ações ----------
  function confirmTyped(title, body, word, okLabel, onOk) {
    modal(title, `${body}${field(`To confirm, type <i>${esc(word)}</i> in the field.`, `<input id="aws-confirm" class="w-full" placeholder="${esc(word)}">`)}<p class="ferr" id="cerr"></p>`, `${btn('Cancel', 'closeModal', { link: true })} ${btn(okLabel, 'confirmOk', { primary: true })}`);
    v.data.confirm = () => { if (mh.querySelector('#aws-confirm').value !== word) { mh.querySelector('#cerr').textContent = `Digite exatamente "${word}" para confirmar.`; return; } closeModal(); onOk(); };
  }

  const H = {
    noop() { },
    na() { toast('Este recurso ainda não está disponível no laboratório.', 'info'); },
    home() { go('home'); },
    menu(d) { v.menu = v.menu === d.id ? null : d.id; render(); },
    search(val) { v.q = val; render(); },
    searchGo() { const q = v.q.trim().toLowerCase(); const sv = SERVICES.find(s => s.id && (s.name + ' ' + s.desc).toLowerCase().includes(q)); v.q = ''; if (sv) go(sv.id, DEFAULT_PAGE[sv.id]); else render(); },
    openSvc(d) { v.q = ''; if (!d.id) { v.menu = null; H.na(); render(); return; } go(d.id, DEFAULT_PAGE[d.id]); },
    go(d) { go(d.svc, d.page); },
    setRegion(d) { S().region = d.id; v.menu = null; v.sel = []; Store.commit(); render(); toast(`Region changed to ${esc(REGIONS.find(r => r.id === d.id).name)}`, 'info'); },
    nav(d) { go(v.svc, d.id); },
    tab(d) { v.tab = d.id; v.sel = v.page === 'bucket' ? [] : v.sel; render(); },
    refresh() { render(); },
    closeFlash() { v.flash = null; render(); },
    cloudshell() { App.switchTab('linux'); },
    copy(d) { UI.copy(d.v); toast('Copied', 'info'); },
    filter(val) { v.filter = val; render(); },
    pfilter(val) { const scope = frame.querySelector('#wiz'); const d = scope ? UI.form(scope) : {}; if (v.data.wiz) { wizRead(); } else { v.data.draft = { ...(v.data.draft || {}), ...d }; } v.data.pf = val; render(); },
    sel(d) { if (['sgs', 'buckets', 'policies'].includes(v.page)) v.sel = v.sel[0] === d.id ? [] : [d.id]; else v.sel = v.sel.includes(d.id) ? v.sel.filter(x => x !== d.id) : [...v.sel, d.id]; v.tab = v.page === 'instances' ? v.tab : null; render(); },
    selAll() { const ids = [...frame.querySelectorAll('tr[data-id]')].map(tr => tr.dataset.id); v.sel = v.sel.length === ids.length ? [] : ids; render(); },
    // EC2
    launch() { go('ec2', 'launch'); },
    launchSum() { const d = UI.form(frame.querySelector('.launch')); const prev = v.data.draft || {}; v.data.draft = d; if (prev.ami !== d.ami || prev.fw !== d.fw || prev.ssh !== d.ssh || prev.sshFrom !== d.sshFrom || prev.type !== d.type || prev.key !== d.key) render(); else frame.querySelector('#aws-sum').innerHTML = launchSummary(d); },
    launchGo,
    newKeyInline() { keyModal(true); },
    newKey() { keyModal(false); },
    keyCreate(d) { keyCreate(!!d.inline); },
    keyDelete() { const names = v.sel; modal('Delete key pairs', `<p>Are you sure that you want to delete the key pair(s) <b>${names.map(esc).join(', ')}</b>?</p>${alert('warning', 'Deleting a key pair does not affect instances already launched with it, but you cannot launch new instances with it.')}`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Delete', 'keyDeleteOk', { primary: true })}`); },
    keyDeleteOk() { S().keyPairs = S().keyPairs.filter(k => !(k.region === S().region && v.sel.includes(k.name))); v.sel = []; closeModal(); Store.commit(); toast('Key pair deleted'); },
    pickInst(d) { if (v.page !== 'instances') { go('ec2', 'instances', null, { sel: [d.id] }); return; } v.sel = [d.id]; v.tab = 'details'; v.menu = null; render(); },
    instStop() { v.menu = null; setInstState(v.sel, 'stop'); toast(`Successfully stopped ${v.sel.join(', ')}`); },
    instStart() { v.menu = null; setInstState(v.sel, 'start'); toast(`Successfully started ${v.sel.join(', ')}`); },
    instReboot() { v.menu = null; setInstState(v.sel, 'reboot'); toast(`Successfully rebooted ${v.sel.join(', ')}`); },
    instTerminate() {
      v.menu = null; render();
      modal('Terminate (delete) instance?', `${alert('warning', 'On an EBS-backed instance, the default action is for the root EBS volume to be deleted when the instance is terminated. Storage on any local drives will be lost.')}<p>Are you sure you want to terminate these instances?</p><ul>${v.sel.map(i => `<li><code>${i}</code></li>`).join('')}</ul><p class="muted">To confirm that you want to terminate the instances, choose the terminate button below. Terminating the instance cannot be undone.</p>`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Terminate (delete)', 'instTerminateOk', { primary: true })}`);
    },
    instTerminateOk() { closeModal(); setInstState(v.sel, 'terminate'); toast(`Successfully initiated termination of ${v.sel.join(', ')}`); },
    connect() { v.menu = null; const id = v.sel[0]; go('ec2', 'connect', id); },
    icConnect() {
      const i = S().instances.find(x => x.id === v.id);
      const userName = frame.querySelector('#aws-ic-user').value.trim();
      if (!i.publicIp || !sgAllows(i, 'TCP', 22)) { modal('Failed to connect to your instance', alert('error', 'EC2 Instance Connect is unable to connect to your instance. Ensure your instance network settings are configured correctly for EC2 Instance Connect: the security group must allow inbound SSH (port 22) and the instance needs a public IPv4 address.'), btn('Close', 'closeModal', { primary: true })); return; }
      if (userName !== amiOf(i.ami).user) { modal('Failed to connect to your instance', alert('error', `Error establishing SSH connection to your instance. Try again later. <br><small>(Dica: o usuário padrão desta AMI é <b>${amiOf(i.ami).user}</b>)</small>`), btn('Close', 'closeModal', { primary: true })); return; }
      Linux.connect({ provider: 'aws', id: i.id, user: userName, via: 'EC2 Instance Connect' });
    },
    openTerminal() { App.switchTab('linux'); },
    sgNew() { v.data.rules = [{ type: 'SSH', proto: 'TCP', port: '22', source: '0.0.0.0/0' }]; sgModal(null); },
    sgEdit() { v.menu = null; const g = S().securityGroups.find(x => x.id === v.sel[0]); if (!g) return; render(); v.data.rules = g.rules.map(r => ({ ...r })); sgModal(g); },
    ruleAdd() { if (mh.querySelector('.rule')) v.data.rules = readRules(); v.data.rules.push({ type: 'Custom TCP', proto: 'TCP', port: '', source: '0.0.0.0/0' }); sgModal(S().securityGroups.find(g => g.id === v.data.sgEdit)); },
    ruleDel(d) { v.data.rules = readRules(); v.data.rules.splice(+d.k, 1); sgModal(S().securityGroups.find(g => g.id === v.data.sgEdit)); },
    ruleType() { v.data.rules = readRules(); v.data.rules.forEach(r => { if (r.type !== 'Custom TCP') r.port = RULE_TYPES[r.type][1]; }); sgModal(S().securityGroups.find(g => g.id === v.data.sgEdit)); },
    sgSave() {
      const rules = readRules();
      const e = mh.querySelector('#sgerr');
      const bad = rules.find(r => r.type === 'Custom TCP' && !/^\d{1,5}(-\d{1,5})?$/.test(r.port));
      if (bad) { e.textContent = 'Port range must be a number (0-65535) or a range like 8000-8080.'; return; }
      const s = S();
      if (v.data.sgEdit) { s.securityGroups.find(g => g.id === v.data.sgEdit).rules = rules; toast('Inbound security group rules successfully modified'); }
      else {
        const d = UI.form(mh);
        if (!d.sgname.trim()) { e.textContent = 'Security group name is required.'; return; }
        if (regSGs().some(g => g.name === d.sgname.trim())) { e.textContent = 'A security group with this name already exists in the VPC.'; return; }
        const g = { id: 'sg-0' + UI.rand(16), name: d.sgname.trim(), desc: d.sgdesc.trim() || d.sgname.trim(), region: s.region, vpc: vpcId(), rules };
        s.securityGroups.push(g); v.sel = [g.id];
        toast(`Security group (${g.id} | ${esc(g.name)}) was created successfully`);
      }
      closeModal(); Store.commit();
    },
    sgDelete() {
      v.menu = null;
      const g = S().securityGroups.find(x => x.id === v.sel[0]);
      const used = S().instances.some(i => i.state !== 'terminated' && i.sgs.includes(g.id));
      if (used) { render(); modal('Delete security group', alert('error', `${g.id} is associated with one or more instances, and cannot be deleted. Change the security group of the instances first.`), btn('Close', 'closeModal', { primary: true })); return; }
      S().securityGroups = S().securityGroups.filter(x => x.id !== g.id); v.sel = []; Store.commit(); toast('Security group deleted');
    },
    // S3
    bucketDraft() { v.data.draft = UI.form(frame.querySelector('.form-w')); render(); },
    bucketCreate() {
      const d = UI.form(frame.querySelector('.form-w'));
      const err = {};
      const name = d.name.trim();
      const e = bucketNameError(name);
      if (e) err.name = e;
      if (!d.block && !d.ack) err.ack = 'You must acknowledge the warning before creating a bucket with public access possible.';
      if (Object.keys(err).length) { v.data = { draft: d, err }; render(); return; }
      createBucket(name, S().region, { versioning: d.ver === 'on', blockPublic: d.block, acls: d.own === 'enabled' });
      flash('success', `Successfully created bucket "<b>${esc(name)}</b>". To upload files and folders, or to configure additional bucket settings, choose View details.`);
      go('s3', 'buckets', null, { sel: [name] }); Store.commit();
    },
    openBucket(d) { go('s3', 'bucket', d.id, { data: { prefix: '' } }); },
    prefix(d) { v.data.prefix = d.id; v.sel = []; render(); },
    openObj(d) { go('s3', 'object', v.id, { data: { key: d.id } }); },
    upload,
    folderNew() { modal('Create folder', `${field('Folder name', `<input id="aws-folder" class="w-full">`, 'Folder names can\'t contain "/".')}<p class="ferr" id="ferr"></p>${alert('info', 'No S3 não existem pastas de verdade: uma "pasta" é só um prefixo no nome (key) dos objetos, ex.: <code>fotos/praia.jpg</code>.')}`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Create folder', 'folderOk', { primary: true })}`); },
    folderOk() { const n = mh.querySelector('#aws-folder').value.trim(); if (!n || n.includes('/')) { mh.querySelector('#ferr').textContent = 'Enter a valid folder name without "/".'; return; } const b = bucket(v.id); putObject(b, (v.data.prefix || '') + n + '/', '', 0, 'folder'); closeModal(); flash('success', `Successfully created folder "${esc(n)}".`); render(); Store.commit(); },
    objDelete() {
      const b = bucket(v.id); const keys = v.sel;
      confirmTyped('Delete objects', `${alert('warning', 'Deleting the specified objects can\'t be undone.')}<p>Specified objects:</p><ul>${keys.map(k => `<li><code>${esc(k)}</code></li>`).join('')}</ul>`, 'permanently delete', 'Delete objects', () => {
        b.objects = b.objects.filter(o => !keys.some(k => o.key === k || (k.endsWith('/') && o.key.startsWith(k))));
        v.sel = []; flash('success', `Successfully deleted ${keys.length} object(s).`); render(); Store.commit();
      });
    },
    confirmOk() { v.data.confirm && v.data.confirm(); },
    copyUri() { UI.copy(`s3://${v.id}/${v.sel[0]}`); toast('S3 URI copied', 'info'); },
    copyArn() { UI.copy(`arn:aws:s3:::${v.sel[0]}`); toast('ARN copied', 'info'); },
    objDownload() { const o = bucket(v.id).objects.find(x => x.key === v.sel[0]); dl(o); },
    objDownloadOne() { dl(bucket(v.id).objects.find(x => x.key === v.data.key)); },
    objOpen() { const o = bucket(v.id).objects.find(x => x.key === v.data.key); modal(esc(o.key), o.content != null ? `<pre class="code">${esc(o.content)}</pre>` : '<p class="muted">Pré-visualização disponível apenas para arquivos de texto pequenos.</p>', btn('Close', 'closeModal', { primary: true }), 'wide'); },
    objUrl() {
      const b = bucket(v.id); const o = b.objects.find(x => x.key === v.data.key);
      if (!bucketPublic(b)) modal('Object URL (acesso anônimo)', `<p class="muted">Abrir a Object URL faz uma requisição <b>anônima</b>. Como o bucket não é público, a resposta é:</p><pre class="code">&lt;Error&gt;\n  &lt;Code&gt;AccessDenied&lt;/Code&gt;\n  &lt;Message&gt;Access Denied&lt;/Message&gt;\n  &lt;RequestId&gt;${UI.rand(16).toUpperCase()}&lt;/RequestId&gt;\n&lt;/Error&gt;</pre>${alert('info', 'Para tornar público: Permissions → desligue o Block Public Access → adicione uma bucket policy com <code>"Principal": "*"</code> e <code>"Action": "s3:GetObject"</code>. Ou use o botão <b>Open</b>, que gera uma URL pré-assinada.')}`, btn('Close', 'closeModal', { primary: true }), 'wide');
      else H.objOpen(o);
    },
    bucketEmpty() {
      const b = bucket(v.sel[0]);
      confirmTyped('Empty bucket', `${alert('warning', `Emptying the bucket deletes all objects in the bucket and cannot be undone.`)}<p>Bucket: <b>${esc(b.name)}</b> (${b.objects.length} objects)</p>`, 'permanently delete', 'Empty', () => { b.objects = []; flash('success', `Successfully emptied bucket "${esc(b.name)}".`); render(); Store.commit(); });
    },
    bucketDelete() {
      const b = bucket(v.sel[0]);
      if (b.objects.length) { modal('Delete bucket', `${alert('error', 'This bucket is not empty. Buckets must be empty before they can be deleted. To delete all objects in the bucket, use the empty bucket configuration.')}`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Empty bucket', 'emptyFromDelete', { primary: true })}`); return; }
      confirmTyped('Delete bucket', `${alert('warning', 'Deleting a bucket cannot be undone. Bucket names are unique. If you delete a bucket, another AWS user can use the name.')}`, b.name, 'Delete bucket', () => { S().buckets = S().buckets.filter(x => x !== b); v.sel = []; flash('success', `Successfully deleted bucket "${esc(b.name)}".`); render(); Store.commit(); });
    },
    emptyFromDelete() { closeModal(); H.bucketEmpty(); },
    versioningEdit() { const b = bucket(v.id); b.versioning = !b.versioning; Store.commit(); toast(`Bucket Versioning ${b.versioning ? 'enabled' : 'suspended'}`); },
    websiteEdit() {
      const b = bucket(v.id);
      modal('Edit static website hosting', `${field('Static website hosting', `<div class="radio-cards"><label><input type="radio" name="wh" value="off" ${!b.website ? 'checked' : ''}> Disable</label><label><input type="radio" name="wh" value="on" ${b.website ? 'checked' : ''}> Enable</label></div>`)}${field('Index document', `<input name="idx" class="w-full" value="${esc((b.website && b.website.index) || 'index.html')}">`, 'Specify the home or default page of the website.')}${alert('info', 'Para o site funcionar, o bucket precisa ser público (veja a aba Permissions).')}`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Save changes', 'websiteSave', { primary: true })}`);
    },
    websiteSave() { const d = UI.form(mh); bucket(v.id).website = d.wh === 'on' ? { index: d.idx.trim() || 'index.html' } : null; closeModal(); Store.commit(); toast('Successfully edited static website hosting.'); },
    bpaEdit() {
      const b = bucket(v.id);
      const turningOff = b.blockPublic;
      if (!turningOff) { b.blockPublic = true; Store.commit(); toast('Successfully edited Block Public Access settings for this bucket.'); return; }
      confirmTyped('Edit Block Public Access (bucket settings)', `<p>Desligar <b>Block all public access</b> permite que políticas tornem o bucket público.</p>`, 'confirm', 'Confirm', () => { b.blockPublic = false; Store.commit(); toast('Successfully edited Block Public Access settings for this bucket.'); });
    },
    policyEdit() {
      const b = bucket(v.id);
      const tpl = JSON.stringify({ Version: '2012-10-17', Statement: [{ Sid: 'PublicReadGetObject', Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${b.name}/*` }] }, null, 4);
      modal('Edit bucket policy', `${field('Bucket ARN', `<input value="arn:aws:s3:::${esc(b.name)}" disabled class="w-full">`)}${field('Policy', `<textarea id="aws-bp" class="code-ed">${esc(b.policy || '')}</textarea>`)}<p>${btn('Inserir exemplo: leitura pública', 'policyTpl', { data: `data-tpl="${esc(tpl)}"` })}</p><p class="ferr" id="bperr"></p>`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Save changes', 'policySave', { primary: true })}`, 'wide');
    },
    policyTpl(d) { mh.querySelector('#aws-bp').value = d.tpl; },
    policySave() {
      const b = bucket(v.id); const txt = mh.querySelector('#aws-bp').value.trim(); const e = mh.querySelector('#bperr');
      if (!txt) { b.policy = ''; closeModal(); Store.commit(); return; }
      let p; try { p = JSON.parse(txt); } catch (x) { e.textContent = 'Policy has invalid JSON: ' + x.message; return; }
      const isPub = [].concat(p.Statement || []).some(st => st.Effect === 'Allow' && (st.Principal === '*' || (st.Principal && st.Principal.AWS === '*')));
      if (isPub && (b.blockPublic || S().accountBPA)) { e.innerHTML = 'You either don\'t have permissions to edit the bucket policy, or your bucket policy grants a level of public access that conflicts with your Block Public Access settings. <b>(Desligue o Block Public Access primeiro.)</b>'; return; }
      b.policy = JSON.stringify(p, null, 4); closeModal(); Store.commit(); toast('Successfully edited bucket policy.');
    },
    policyDelete() { bucket(v.id).policy = ''; Store.commit(); toast('Bucket policy deleted.'); },
    acctBpaToggle() { S().accountBPA = !S().accountBPA; Store.commit(); toast('Account Block Public Access settings updated.'); },
    // IAM
    wizNext, wizPrev() { wizRead(); v.data.wiz.step--; render(); },
    wizStep(d) { v.data.wiz.step = +d.step; render(); },
    wizConsole() { wizRead(); render(); },
    wizMode() { wizRead(); render(); },
    groupQuick() { wizRead(); modal('Create user group', `${field('User group name', `<input id="aws-gq" class="w-full">`)}${field('Permissions policies', `<select id="aws-gqp" class="w-full"><option value="">— none —</option>${allPolicies().map(p => `<option>${esc(p.name)}</option>`).join('')}</select>`)}<p class="ferr" id="gqerr"></p>`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Create user group', 'groupQuickOk', { primary: true })}`); },
    groupQuickOk() { const n = mh.querySelector('#aws-gq').value.trim(); const p = mh.querySelector('#aws-gqp').value; if (!/^[\w+=,.@-]{1,128}$/.test(n) || group(n)) { mh.querySelector('#gqerr').textContent = group(n) ? 'Group already exists.' : 'Invalid group name.'; return; } IAM().groups.push({ name: n, created: Date.now(), policies: p ? [p] : [] }); v.data.wiz.groups.push(n); closeModal(); Store.save(); render(); },
    userCreate() {
      const w = v.data.wiz;
      const pol = [...w.pol];
      if (w.console && w.reset && !pol.includes('IAMUserChangePassword')) pol.push('IAMUserChangePassword');
      IAM().users.push({ name: w.name, created: Date.now(), console: w.console, groups: w.mode === 'group' ? [...w.groups] : [], policies: w.mode === 'direct' ? pol : (w.console && w.reset ? ['IAMUserChangePassword'] : []), accessKeys: [] });
      Store.save();
      if (w.console) { w.pwShow = w.pwType === 'auto' ? UI.rand(4, 'ABCDEFGHJKLMNPQRSTUVWXYZ') + UI.rand(4, 'abcdefghijkmnpqrstuvwxyz') + '!' + UI.rand(3, '23456789') : w.pw.replace(/./g, '•'); w.step = 4; render(); Store.commit(); return; }
      flash('success', `User <b>${esc(w.name)}</b> created successfully. <a class="lnk" data-act="openUser" data-id="${esc(w.name)}">View user</a>`);
      go('iam', 'users'); Store.commit();
    },
    openUser(d) { go('iam', 'user', d.id, { tab: d.tab || null }); },
    userDelete() { const names = v.sel; confirmTyped(`Delete ${names.length} user(s)?`, `<p>${names.map(n => `<b>${esc(n)}</b>`).join(', ')}</p>${alert('warning', 'Deleting a user permanently removes their credentials (passwords and access keys).')}`, 'confirm', 'Delete', () => { IAM().users = IAM().users.filter(u => !names.includes(u.name)); v.sel = []; flash('success', 'User(s) deleted.'); render(); Store.commit(); }); },
    userDeleteOne() { v.sel = [v.id]; v.page = 'users'; H.userDelete(); },
    userPolAdd() { const u = user(v.id); v.data.pf = ''; modal(`Add permissions to ${esc(u.name)}`, `<p class="muted">Attach policies directly</p><div id="aws-pp">${policyPicker(u.policies, 'addpol')}</div>`, `${btn('Cancel', 'closeModal', { link: true })} ${btn('Add permissions', 'userPolAddOk', { primary: true })}`, 'wide'); },
    userPolAddOk() { const u = user(v.id); const d = UI.form(mh); u.policies = [...new Set([...(d.addpol || [])])]; closeModal(); Store.commit(); toast('Policies attached'); },
    userPolRemove() { const u = user(v.id); const groupOnes = v.sel.filter(s => s.startsWith('#')); u.policies = u.policies.filter(p => !v.sel.includes(p)); v.sel = []; Store.commit(); toast(groupOnes.length ? 'Políticas herdadas de grupos devem ser removidas no grupo.' : 'Policy removed', groupOnes.length ? 'info' : 'success'); },
    userGroupAdd() { const u = user(v.id); modal(`Add ${esc(u.name)} to groups`, IAM().groups.length ? `<div class="checks">${IAM().groups.map(g => `<label><input type="checkbox" name="gs" value="${esc(g.name)}" data-multi="1" ${u.groups.includes(g.name) ? 'checked' : ''}> <span><b>${esc(g.name)}</b><br><small>${g.policies.map(esc).join(', ') || 'No policies'}</small></span></label>`).join('')}</div>` : '<p class="muted">Nenhum grupo criado ainda.</p>', `${btn('Cancel', 'closeModal', { link: true })} ${btn('Add user to group(s)', 'userGroupAddOk', { primary: true })}`); },
    userGroupAddOk() { const u = user(v.id); u.groups = UI.form(mh).gs || []; closeModal(); Store.commit(); toast('User groups updated'); },
    userGroupRemove() { const u = user(v.id); u.groups = u.groups.filter(g => !v.sel.includes(g)); v.sel = []; Store.commit(); },
    userConsole() { const u = user(v.id); u.console = !u.console; Store.commit(); toast(u.console ? 'Console access enabled' : 'Console access disabled'); },
    accessKeyNew() { go('iam', 'accessKey', v.id); },
    akNext() { const d = UI.form(frame.querySelector('#wiz')); Object.assign(v.data.ak, { use: d.use, ack: d.ack }); if (!d.ack) { v.data.err = { ack: 'Confirme que entendeu a recomendação.' }; render(); return; } v.data.err = {}; v.data.ak.step = 2; render(); },
    akPrev() { v.data.ak.step--; render(); },
    akCreate() {
      const d = UI.form(frame.querySelector('#wiz'));
      const u = user(v.id);
      const key = { id: 'AKIA' + UI.rand(16, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), secret: UI.rand(40, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'), status: 'Active', created: Date.now(), desc: d.desc.trim() };
      u.accessKeys.push(key); v.data.ak.key = key; v.data.ak.step = 3; render(); Store.commit();
    },
    showSecret() { v.data.showSecret = true; render(); },
    akCsv() { const k = v.data.ak.key; const file = `${v.id}_accessKeys.csv`; Linux.saveDownload(file, `Access key ID,Secret access key\n${k.id},${k.secret}\n`); toast(`${esc(file)} salvo em ~/Downloads (terminal Linux)`, 'info'); },
    akToggle(d) { const k = user(v.id).accessKeys.find(x => x.id === d.id); k.status = k.status === 'Active' ? 'Inactive' : 'Active'; v.menu = null; Store.commit(); },
    akDelete(d) { const u = user(v.id); u.accessKeys = u.accessKeys.filter(x => x.id !== d.id); v.menu = null; Store.commit(); toast('Access key deleted'); },
    openGroup(d) { go('iam', 'group', d.id); },
    groupCreate() {
      const d = UI.form(frame.querySelector('#wiz'));
      const n = d.gname.trim();
      const err = {};
      if (!n) err.gname = 'User group name is required.'; else if (!/^[\w+=,.@-]{1,128}$/.test(n)) err.gname = 'Invalid characters in group name.'; else if (group(n)) err.gname = 'A group with this name already exists.';
      if (Object.keys(err).length) { v.data = { ...v.data, draft: { gname: n, users: d.users || [], pol: d.pol || [] }, err }; render(); return; }
      IAM().groups.push({ name: n, created: Date.now(), policies: d.pol || [] });
      (d.users || []).forEach(un => user(un).groups.push(n));
      flash('success', `${esc(n)} user group created.`); go('iam', 'groups'); Store.commit();
    },
    groupDelete() { const names = v.sel; IAM().groups = IAM().groups.filter(g => !names.includes(g.name)); IAM().users.forEach(u => { u.groups = u.groups.filter(g => !names.includes(g)); }); v.sel = []; Store.commit(); toast('Group(s) deleted'); },
    groupDeleteOne() { v.sel = [v.id]; H.groupDelete(); go('iam', 'groups'); },
    groupUserAdd() { const g = group(v.id); modal(`Add users to ${esc(g.name)}`, IAM().users.length ? `<div class="checks">${IAM().users.map(u => `<label><input type="checkbox" name="us" value="${esc(u.name)}" data-multi="1" ${u.groups.includes(g.name) ? 'checked' : ''}> <span>${esc(u.name)}</span></label>`).join('')}</div>` : '<p class="muted">Nenhum usuário criado.</p>', `${btn('Cancel', 'closeModal', { link: true })} ${btn('Add users', 'groupUserAddOk', { primary: true })}`); },
    groupUserAddOk() { const g = group(v.id); const us = UI.form(mh).us || []; IAM().users.forEach(u => { const has = u.groups.includes(g.name); if (us.includes(u.name) && !has) u.groups.push(g.name); if (!us.includes(u.name) && has) u.groups = u.groups.filter(x => x !== g.name); }); closeModal(); Store.commit(); },
    groupUserRemove() { const g = group(v.id); IAM().users.forEach(u => { if (v.sel.includes(u.name)) u.groups = u.groups.filter(x => x !== g.name); }); v.sel = []; Store.commit(); },
    groupPolAdd() { const g = group(v.id); v.data.pf = ''; modal(`Attach permission policies to ${esc(g.name)}`, policyPicker(g.policies, 'addpol'), `${btn('Cancel', 'closeModal', { link: true })} ${btn('Attach policies', 'groupPolAddOk', { primary: true })}`, 'wide'); },
    groupPolAddOk() { group(v.id).policies = UI.form(mh).addpol || []; closeModal(); Store.commit(); toast('Policies attached'); },
    groupPolRemove() { const g = group(v.id); g.policies = g.policies.filter(p => !v.sel.includes(p)); v.sel = []; Store.commit(); },
    openRole(d) { go('iam', 'role', d.id); },
    roleCreate() {
      const d = UI.form(frame.querySelector('#wiz'));
      const n = d.rname.trim();
      if (!/^[\w+=,.@-]{1,64}$/.test(n) || IAM().roles.some(r => r.name === n)) { v.data.err = { rname: IAM().roles.some(r => r.name === n) ? 'Role already exists.' : 'Role name is required (letters, numbers and +=,.@-_).' }; render(); return; }
      IAM().roles.push({ name: n, trusted: d.svc, policies: d.pol || [], created: Date.now(), desc: d.rdesc });
      flash('success', `Role ${esc(n)} created.`); go('iam', 'roles'); Store.commit();
    },
    roleDelete() { IAM().roles = IAM().roles.filter(r => !v.sel.includes(r.name)); v.sel = []; Store.commit(); },
    openPolicy(d) { closeModal(); go('iam', 'policy', d.id); },
    policyPeek(d) { const p = allPolicies().find(x => x.name === d.id); const host = mh.innerHTML ? null : 1; if (!host) { toast(`<b>${esc(p.name)}</b>: ${esc(p.desc)}`, 'info'); return; } modal(esc(p.name), `<p class="muted">${esc(p.desc)}</p><pre class="code json">${esc(JSON.stringify(p.doc, null, 4))}</pre>`, btn('Close', 'closeModal', { primary: true }), 'wide'); },
    policyCreate() {
      const d = UI.form(frame.querySelector('#wiz'));
      const err = {};
      const errs = validatePolicy(d.json);
      if (errs) err.json = errs.join(' ');
      if (!/^[\w+=,.@-]{1,128}$/.test(d.pname.trim())) err.pname = 'Policy name is required. Use alphanumeric and \'+=,.@-_\' characters.';
      else if (allPolicies().some(p => p.name === d.pname.trim())) err.pname = 'A policy with this name already exists.';
      if (Object.keys(err).length) { v.data = { draft: d, err }; render(); return; }
      IAM().policies.push({ name: d.pname.trim(), desc: d.pdesc.trim(), doc: JSON.stringify(JSON.parse(d.json)), created: Date.now() });
      flash('success', `Policy ${esc(d.pname.trim())} created.`); go('iam', 'policies'); Store.commit();
    },
    policyDel() { IAM().policies = IAM().policies.filter(p => !v.sel.includes(p.name)); [...IAM().users, ...IAM().groups, ...IAM().roles].forEach(e => { e.policies = e.policies.filter(p => !v.sel.includes(p)); }); v.sel = []; Store.commit(); },
    simSvc() { v.data.draft = { ...UI.form(frame.querySelector('#wiz')), acts: [] }; v.data.results = null; render(); },
    simRun() {
      const d = UI.form(frame.querySelector('#wiz'));
      d.acts = d.acts || [];
      if (!d.acts.length) d.acts = SIM_ACTIONS[d.svc];
      v.data.draft = d;
      const names = simPolicies(d.who);
      const uname = d.who.startsWith('user:') ? d.who.slice(5) : null;
      v.data.results = d.acts.map(a => ({ action: a, ...evaluate(names, a, d.res.trim() || '*', uname) }));
      render();
    },
  };
  function dl(o) { if (!o) return; if (o.content == null) { toast('O laboratório só guarda o conteúdo de arquivos de texto pequenos.', 'info'); return; } UI.download(o.key.split('/').pop(), o.content, o.type); }

  // ---------- API usada pelo terminal Linux ----------
  function targets() {
    return S().instances.map(i => ({
      provider: 'aws', id: i.id, name: i.name || i.id, ip: i.publicIp, dns: dnsOf(i.publicIp, i.region), running: i.state === 'running',
      distro: i.distro, users: [amiOf(i.ami).user], hostname: `ip-${i.privateIp.replace(/\./g, '-')}`, privateIp: i.privateIp,
      allows: (proto, port) => sgAllows(i, proto, port),
      keyMaterial: (S().keyPairs.find(k => k.name === i.key && k.region === i.region) || {}).material,
      keyName: i.key,
    }));
  }

  /** Implementação do AWS CLI (subset) usado no terminal */
  const cli = {
    REGIONS, AMIS, TYPES,
    findKey: id => { for (const u of IAM().users) { const k = u.accessKeys.find(x => x.id === id); if (k) return { user: u, key: k }; } return null; },
    authorize, acct, bucket, bucketNameError, createBucket, putObject, listPrefix, bucketPublic, websiteUrl,
    instances: () => S().instances,
    setInstState,
    s: S,
  };

  function tick() { return Store.advance(S().instances); }

  function init(el) {
    root = el;
    root.innerHTML = '<div class="frame"></div><div class="modal-host"></div><div class="toasts"></div>';
    frame = root.querySelector('.frame');
    mh = root.querySelector('.modal-host');
    th = root.querySelector('.toasts');
    UI.bind(root, H, e => {
      if (v.menu && !e.target.closest('.dd, .svc-menu, [data-id="services"]')) { v.menu = null; render(); }
      if (v.q && !e.target.closest('.aws-search')) { v.q = ''; render(); }
    });
    render();
  }

  return { init, render, refresh, tick, targets, cli, onShow: render };
})();
