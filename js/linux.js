/* Cloud Lab — terminal Linux simulado (sistema de arquivos, pacotes, serviços, SSH e CLIs de nuvem) */
'use strict';

const Linux = (() => {
  const { esc } = UI;
  const MY_IP = '203.0.113.25';

  const DISTROS = {
    local: { name: 'Ubuntu 24.04.1 LTS', id: 'ubuntu', ver: '24.04', family: 'debian', kernel: '6.8.0-45-generic', code: 'noble' },
    ubuntu: { name: 'Ubuntu 24.04.1 LTS', id: 'ubuntu', ver: '24.04', family: 'debian', kernel: '6.8.0-1015-aws', code: 'noble' },
    ubuntu22: { name: 'Ubuntu 22.04.4 LTS', id: 'ubuntu', ver: '22.04', family: 'debian', kernel: '6.5.0-1020-oracle', code: 'jammy' },
    debian: { name: 'Debian GNU/Linux 12 (bookworm)', id: 'debian', ver: '12', family: 'debian', kernel: '6.1.0-25-cloud-amd64', code: 'bookworm' },
    amzn: { name: 'Amazon Linux 2023.5.20240916', id: 'amzn', ver: '2023', family: 'rhel', kernel: '6.1.109-118.189.amzn2023.x86_64', repo: 'amazonlinux' },
    rhel: { name: 'Red Hat Enterprise Linux 9.4 (Plow)', id: 'rhel', ver: '9.4', family: 'rhel', kernel: '5.14.0-427.13.1.el9_4.x86_64', repo: 'rhel-9-appstream-rhui-rpms' },
    oracle: { name: 'Oracle Linux Server 8.10', id: 'ol', ver: '8.10', family: 'rhel', kernel: '5.15.0-209.161.7.2.el8uek.x86_64', repo: 'ol8_appstream' },
    centos: { name: 'CentOS Stream 9', id: 'centos', ver: '9', family: 'rhel', kernel: '5.14.0-503.el9.x86_64', repo: 'appstream' },
  };

  // Pacotes que podem ser instalados (deb = nome no apt, rpm = nome no dnf/yum)
  const PKGS = {
    nginx: { deb: 1, rpm: 1, svc: 'nginx', ver: { debian: '1.24.0-2ubuntu7', rhel: '1:1.24.0-1.el9' }, size: '552 kB' },
    apache2: { deb: 1, svc: 'apache2', ver: { debian: '2.4.58-1ubuntu8.4' }, size: '1,642 kB' },
    httpd: { rpm: 1, svc: 'httpd', ver: { rhel: '2.4.62-1.el9' }, size: '1.6 M' },
    'mariadb-server': { deb: 1, rpm: 1, svc: 'mariadb', ver: { debian: '1:10.11.8-0ubuntu0.24.04.1', rhel: '3:10.5.22-1.el9' }, size: '9,312 kB' },
    git: { deb: 1, rpm: 1, ver: { debian: '1:2.43.0-1ubuntu7.1', rhel: '2.43.5-1.el9' }, size: '3,679 kB' },
    htop: { deb: 1, rpm: 1, ver: { debian: '3.3.0-4build1', rhel: '3.3.0-1.el9' }, size: '171 kB' },
    tree: { deb: 1, rpm: 1, ver: { debian: '2.1.1-2ubuntu3', rhel: '1.8.0-10.el9' }, size: '47.4 kB' },
    neofetch: { deb: 1, rpm: 1, ver: { debian: '7.1.0-4', rhel: '7.1.0-7.el9' }, size: '74.9 kB' },
    unzip: { deb: 1, rpm: 1, ver: { debian: '6.0-28ubuntu4', rhel: '6.0-57.el9' }, size: '174 kB' },
    wget: { deb: 1, rpm: 1, ver: { debian: '1.21.4-1ubuntu4.1', rhel: '1.21.1-8.el9' }, size: '334 kB' },
    curl: { deb: 1, rpm: 1, ver: { debian: '8.5.0-2ubuntu10.4', rhel: '7.76.1-29.el9' }, size: '226 kB' },
    nodejs: { deb: 1, rpm: 1, ver: { debian: '18.19.1+dfsg-6ubuntu5', rhel: '1:18.20.4-1.el9' }, size: '12.0 MB' },
    awscli: { deb: 1, rpm: 1, ver: { debian: '2.14.6-1', rhel: '2.15.30-1.amzn2023' }, size: '9,021 kB' },
  };
  const SVC_DESC = { nginx: 'A high performance web server and a reverse proxy server', apache2: 'The Apache HTTP Server', httpd: 'The Apache HTTP Server', mariadb: 'MariaDB 10.11 database server', ssh: 'OpenBSD Secure Shell server', sshd: 'OpenSSH server daemon', cron: 'Regular background program processing daemon', crond: 'Command Scheduler' };
  const BIN_PKG = { nginx: 'nginx', apache2: 'apache2', httpd: 'httpd', git: 'git', htop: 'htop', tree: 'tree', neofetch: 'neofetch', unzip: 'unzip', wget: 'wget', curl: 'curl', node: 'nodejs', npm: 'nodejs', mysql: 'mariadb-server', mariadb: 'mariadb-server', aws: 'awscli', gcloud: 'gcloud', gsutil: 'gcloud' };

  Store.register('linux', () => ({ hosts: {}, history: [], events: {} }));
  const L = () => Store.s.linux;

  // ---------- sistema de arquivos ----------
  const D = (o, m, c = {}) => ({ t: 'd', o, m, c, mt: Date.now() });
  const F = (o, m, d) => ({ t: 'f', o, m, d, mt: Date.now() });

  function baseFs(distro, user, hostname, extra = {}) {
    const dist = DISTROS[distro] || DISTROS.ubuntu;
    const home = D(user, 0o750, {
      '.bashrc': F(user, 0o644, `# ~/.bashrc\nalias ll='ls -alF'\nexport PATH=$PATH:$HOME/.local/bin\n`),
      '.profile': F(user, 0o644, '# ~/.profile: executed by the command interpreter for login shells.\n'),
      '.ssh': D(user, 0o700, extra.authorized ? { authorized_keys: F(user, 0o600, extra.authorized + '\n') } : {}),
      ...(extra.home || {}),
    });
    const etc = {
      hostname: F('root', 0o644, hostname + '\n'),
      hosts: F('root', 0o644, `127.0.0.1 localhost\n127.0.1.1 ${hostname}\n`),
      'os-release': F('root', 0o644, `NAME="${dist.name.split(' ').slice(0, -1).join(' ') || dist.name}"\nVERSION="${dist.ver}"\nID=${dist.id}\nID_LIKE=${dist.family === 'debian' ? 'debian' : '"rhel fedora"'}\nPRETTY_NAME="${dist.name}"\nVERSION_ID="${dist.ver}"\n`),
      passwd: F('root', 0o644, `root:x:0:0:root:/root:/bin/bash\n${user}:x:1000:1000::/home/${user}:/bin/bash\n`),
      group: F('root', 0o644, `root:x:0:\nsudo:x:27:${user}\n${user}:x:1000:\n`),
      shadow: F('root', 0o640, `root:*:19800:0:99999:7:::\n${user}:!:19800:0:99999:7:::\n`),
      fstab: F('root', 0o644, 'LABEL=cloudimg-rootfs / ext4 defaults 0 1\n'),
      'resolv.conf': F('root', 0o644, 'nameserver 127.0.0.53\noptions edns0 trust-ad\n'),
      ssh: D('root', 0o755, { sshd_config: F('root', 0o644, 'Port 22\nPermitRootLogin no\nPasswordAuthentication no\nPubkeyAuthentication yes\n') }),
    };
    return D('root', 0o755, {
      bin: D('root', 0o755), boot: D('root', 0o755), dev: D('root', 0o755), etc: D('root', 0o755, etc),
      home: D('root', 0o755, { [user]: home }),
      opt: D('root', 0o755), root: D('root', 0o700, { '.bashrc': F('root', 0o644, '# root bashrc\n') }), srv: D('root', 0o755),
      tmp: D('root', 0o777),
      usr: D('root', 0o755, { bin: D('root', 0o755), lib: D('root', 0o755), local: D('root', 0o755, { bin: D('root', 0o755) }), share: D('root', 0o755, { doc: D('root', 0o755) }) }),
      var: D('root', 0o755, { log: D('root', 0o755, { [dist.family === 'debian' ? 'syslog' : 'messages']: F('root', 0o640, `${new Date().toString().slice(4, 24)} ${hostname} systemd[1]: Started Session 1 of User ${user}.\n`) }), lib: D('root', 0o755), www: D('root', 0o755) }),
    });
  }

  function makeHost(key, { distro, user, hostname, ip, privateIp, authorized, home, pkgs = [] }) {
    const dist = DISTROS[distro] || DISTROS.ubuntu;
    const h = {
      key, distro, hostname, ip, privateIp, users: { [user]: { uid: 1000, home: `/home/${user}` }, root: { uid: 0, home: '/root' } }, defaultUser: user,
      fs: baseFs(distro, user, hostname, { authorized, home }),
      pkgs: Object.fromEntries(['curl', 'python3', ...pkgs].map(p => [p, true])),
      svcs: { [dist.family === 'debian' ? 'ssh' : 'sshd']: { active: true, enabled: true, since: Date.now() }, [dist.family === 'debian' ? 'cron' : 'crond']: { active: true, enabled: true, since: Date.now() } },
      aptUpdated: key === 'local', boot: Date.now(), env: {},
    };
    L().hosts[key] = h;
    return h;
  }

  function localHost() {
    return L().hosts.local || makeHost('local', {
      distro: 'local', user: 'aluno', hostname: 'cloudlab', ip: MY_IP, privateIp: '192.168.0.42', pkgs: ['wget', 'awscli', 'gcloud', 'git'],
      home: {
        'LEIA-ME.txt': F('aluno', 0o644, 'Bem-vindo ao terminal do Cloud Lab!\n\nEste é um Linux simulado (Ubuntu) rodando no seu navegador.\nDigite "help" para ver os comandos disponíveis.\n\nIdeias para praticar:\n  - Crie pastas e arquivos: mkdir, touch, nano, cat\n  - Instale pacotes: sudo apt update && sudo apt install nginx\n  - Crie uma instância EC2 na aba AWS e conecte com ssh -i\n  - Configure o AWS CLI com "aws configure" e liste buckets com "aws s3 ls"\n'),
        Downloads: D('aluno', 0o755), Documentos: D('aluno', 0o755),
      },
    });
  }

  function norm(p, cwd, home) {
    if (p === '~' || p.startsWith('~/')) p = home + p.slice(1);
    const parts = (p.startsWith('/') ? p : cwd + '/' + p).split('/');
    const out = [];
    for (const x of parts) { if (!x || x === '.') continue; if (x === '..') out.pop(); else out.push(x); }
    return '/' + out.join('/');
  }
  function getNode(h, abs) {
    let n = h.fs;
    for (const x of abs.split('/').filter(Boolean)) { if (!n || n.t !== 'd') return null; n = n.c[x]; }
    return n || null;
  }
  const split = abs => { const k = abs.lastIndexOf('/'); return [abs.slice(0, k) || '/', abs.slice(k + 1)]; };
  const canWrite = (n, ctx) => ctx.root || n.o === ctx.user || (n.m & 0o002);
  const canRead = (n, ctx) => ctx.root || (n.o === ctx.user ? n.m & 0o400 : n.m & 0o004);
  const canEnter = (n, ctx) => ctx.root || (n.o === ctx.user ? n.m & 0o100 : n.m & 0o001);

  function writeFile(h, abs, data, ctx, append = false) {
    const [dir, name] = split(abs);
    const dn = getNode(h, dir);
    if (!dn || dn.t !== 'd') return `${abs}: No such file or directory`;
    const ex = dn.c[name];
    if (ex && ex.t === 'd') return `${abs}: Is a directory`;
    if (ex ? !(ctx.root || (ex.o === ctx.user && ex.m & 0o200) || ex.m & 0o002) : !canWrite(dn, ctx)) return `${abs}: Permission denied`;
    if (ex) { ex.d = append ? ex.d + data : data; ex.mt = Date.now(); }
    else dn.c[name] = F(ctx.root ? 'root' : ctx.user, 0o644, data);
    return null;
  }

  // ---------- terminal ----------
  let root, out, term, inputLine, promptEl, input, guide, titleEl, nanoHost;
  let stack = []; // sessões: [{key, user, cwd, via, target}]
  let busy = false, abort = false, asking = null;
  let histPos = -1, draft = '';
  const sess = () => stack[stack.length - 1];
  const host = () => L().hosts[sess().key];

  function promptText(s = sess()) {
    const h = L().hosts[s.key];
    const hm = h.users[s.user] ? h.users[s.user].home : '/home/' + s.user;
    const dir = s.cwd === hm ? '~' : s.cwd.startsWith(hm + '/') ? '~' + s.cwd.slice(hm.length) : s.cwd;
    const short = h.hostname.split('.')[0];
    const sym = s.user === 'root' ? '#' : '$';
    if (DISTROS[h.distro] && DISTROS[h.distro].family === 'rhel') return { html: `[${esc(s.user)}@${esc(short)} ${esc(dir === '~' ? '~' : dir.split('/').pop() || '/')}]${sym} `, title: `${s.user}@${short}:${dir}` };
    return { html: `<b class="c-g">${esc(s.user)}@${esc(short)}</b>:<b class="c-b">${esc(dir)}</b>${sym} `, title: `${s.user}@${short}: ${dir}` };
  }
  function updatePrompt() {
    if (asking) return;
    const p = promptText();
    promptEl.innerHTML = p.html;
    titleEl.textContent = p.title;
  }
  function printHtml(html) {
    const d = document.createElement('div');
    d.className = 'ln';
    d.innerHTML = html;
    out.appendChild(d);
    while (out.childNodes.length > 1500) out.firstChild.remove();
    term.scrollTop = term.scrollHeight;
  }
  const print = text => printHtml(esc(text));
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function ask(q, { secret = false } = {}) {
    return new Promise(res => {
      asking = { res, secret };
      promptEl.innerHTML = esc(q);
      input.type = secret ? 'password' : 'text';
      inputLine.style.display = '';
      input.value = '';
      input.focus();
    });
  }

  // ---------- parser ----------
  function tokenize(line, env) {
    const toks = [];
    let cur = '', quoted = false, has = false, glob = false, i = 0;
    const push = () => { if (has) toks.push({ v: cur, q: quoted, g: glob }); cur = ''; quoted = false; has = false; glob = false; };
    const expand = s => s.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*|\?)\}?/g, (_, n) => env[n] ?? '');
    while (i < line.length) {
      const c = line[i];
      if (c === "'") { const j = line.indexOf("'", i + 1); if (j < 0) throw new Error("unexpected EOF while looking for matching `''"); cur += line.slice(i + 1, j); quoted = has = true; i = j + 1; continue; }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < line.length && line[j] !== '"') { if (line[j] === '\\' && j + 1 < line.length) { s += line[j + 1]; j += 2; continue; } s += line[j]; j++; }
        if (j >= line.length) throw new Error('unexpected EOF while looking for matching `"\'');
        cur += expand(s); quoted = has = true; i = j + 1; continue;
      }
      if (c === '\\') { cur += line[i + 1] || ''; has = true; i += 2; continue; }
      if (/\s/.test(c)) { push(); i++; continue; }
      if (c === '>' && cur === '2' && has && !quoted) { cur = ''; has = false; const ap = line[i + 1] === '>'; toks.push({ op: ap ? '2>>' : '2>' }); i += ap ? 2 : 1; continue; }
      if ('|;&><'.includes(c)) {
        push();
        const two = line.slice(i, i + 2);
        if (['&&', '||', '>>'].includes(two)) { toks.push({ op: two }); i += 2; continue; }
        toks.push({ op: c }); i++; continue;
      }
      if (c === '$') { const m = line.slice(i).match(/^\$\{?([A-Za-z_][A-Za-z0-9_]*|\?)\}?/); if (m) { cur += env[m[1]] ?? ''; has = true; i += m[0].length; continue; } }
      if (c === '~' && !has && (i + 1 >= line.length || /[/\s]/.test(line[i + 1]))) { cur += env.HOME; has = true; i++; continue; }
      if (c === '#' && !has) break;
      if (c === '*' || c === '?') glob = true;
      cur += c; has = true; i++;
    }
    push();
    return toks;
  }

  function parse(toks) {
    const seq = []; // [{join, pipe:[{args, out, append, inp}]}]
    let join = null, pipe = [], cmd = { args: [] };
    const endCmd = () => { if (cmd.args.length || cmd.out || cmd.inp) pipe.push(cmd); cmd = { args: [] }; };
    const endPipe = j => { endCmd(); if (pipe.length) seq.push({ join, pipe }); pipe = []; join = j; };
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (!t.op) { cmd.args.push(t); continue; }
      if (t.op === '|') { endCmd(); continue; }
      if ([';', '&', '&&', '||'].includes(t.op)) { endPipe(t.op === '&' ? ';' : t.op); continue; }
      const target = toks[++k];
      if (!target || target.op) throw new Error("syntax error near unexpected token `newline'");
      if (t.op === '>' || t.op === '>>') { cmd.out = target.v; cmd.append = t.op === '>>'; }
      else if (t.op === '<') cmd.inp = target.v;
      // 2> e 2>> são ignorados (stderr vai para o terminal)
    }
    endPipe(null);
    return seq;
  }

  function globExpand(tok, ctx) {
    if (!tok.g || tok.q) return [tok.v];
    const abs = norm(tok.v, ctx.cwd, ctx.home);
    const [dir, pat] = split(abs);
    const dn = getNode(ctx.h, dir);
    if (!dn || dn.t !== 'd' || /[*?]/.test(dir)) return [tok.v];
    const re = new RegExp('^' + pat.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const names = Object.keys(dn.c).filter(n => re.test(n) && (pat.startsWith('.') || !n.startsWith('.'))).sort();
    if (!names.length) return [tok.v];
    const prefix = tok.v.includes('/') ? tok.v.slice(0, tok.v.lastIndexOf('/') + 1) : '';
    return names.map(n => prefix + n);
  }

  // ---------- execução ----------
  function makeCtx(opts) {
    const s = sess();
    const h = L().hosts[s.key];
    const home = h.users[s.user] ? h.users[s.user].home : '/home/' + s.user;
    const ctx = {
      h, s, user: s.user, root: s.user === 'root' || !!opts.sudo, cwd: s.cwd, home,
      stdin: opts.stdin, capture: opts.capture, buf: '', tty: !opts.capture,
      env: { HOME: home, USER: s.user, PWD: s.cwd, SHELL: '/bin/bash', PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', HOSTNAME: h.hostname, LANG: 'C.UTF-8', '?': String(opts.last ?? 0), ...h.env },
      out(t) { if (ctx.capture) ctx.buf += t + '\n'; else print(t); },
      html(html, plain) { if (ctx.capture) ctx.buf += plain + '\n'; else printHtml(html); },
      err(t) { printHtml(`<span class="c-err">${esc(t)}</span>`); },
      p: p => norm(p, ctx.cwd, home),
    };
    return ctx;
  }

  async function runLine(line) {
    let seq;
    const s = sess();
    const h = L().hosts[s.key];
    const env = { HOME: h.users[s.user] ? h.users[s.user].home : '/home/' + s.user, USER: s.user, PWD: s.cwd, HOSTNAME: h.hostname, ...h.env, '?': String(h.lastCode || 0) };
    try { seq = parse(tokenize(line, env)); }
    catch (e) { printHtml(`<span class="c-err">-bash: ${esc(e.message)}</span>`); return; }
    let code = 0;
    for (const item of seq) {
      if (abort) break;
      if (item.join === '&&' && code !== 0) continue;
      if (item.join === '||' && code === 0) continue;
      code = await runPipe(item.pipe, code);
      const hh = L().hosts[sess().key];
      if (hh) hh.lastCode = code;
    }
  }

  async function runPipe(pipe, last) {
    let stdin = null, code = 0;
    for (let k = 0; k < pipe.length; k++) {
      const c = pipe[k];
      const isLast = k === pipe.length - 1;
      const ctx = makeCtx({ stdin, capture: !isLast || !!c.out, last });
      if (c.inp) {
        const n = getNode(ctx.h, ctx.p(c.inp));
        if (!n || n.t !== 'f') { ctx.err(`-bash: ${c.inp}: No such file or directory`); return 1; }
        ctx.stdin = n.d;
      }
      const args = c.args.flatMap(t => globExpand(t, ctx));
      code = args.length ? await exec(args, ctx) : 0;
      if (c.out) {
        const e = writeFile(ctx.h, ctx.p(c.out), ctx.buf, ctx, c.append);
        if (e) { ctx.err(`-bash: ${e}`); code = 1; }
        stdin = '';
      } else stdin = ctx.buf;
    }
    return code;
  }

  async function exec(args, ctx) {
    let [name, ...rest] = args;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(name) && !rest.length) { const [k, ...vv] = name.split('='); ctx.h.env[k] = vv.join('='); return 0; }
    if (name === 'sudo') {
      if (!rest.length) { ctx.out('usage: sudo [-u user] command'); return 1; }
      if (rest[0] === '-i' || rest[0] === '-s' || (rest[0] === 'su' && rest.length <= 2)) return pushRoot(ctx);
      if (ctx.user === 'root') { /* já é root */ }
      ctx.root = true; [name, ...rest] = rest;
    }
    if (name === 'll') { name = 'ls'; rest = ['-alF', ...rest]; }
    const fn = CMDS[name];
    const need = BIN_PKG[name];
    if (!fn || (need && !ctx.h.pkgs[need]) || (name === 'apt' || name === 'apt-get') && fam(ctx) !== 'debian' || (name === 'dnf' || name === 'yum') && fam(ctx) !== 'rhel') {
      if (fam(ctx) === 'debian' && need && PKGS[need] && PKGS[need].deb) { ctx.out(`Command '${name}' not found, but can be installed with:\n\nsudo apt install ${need}\n`); return 127; }
      if ((name === 'apt' || name === 'apt-get') && fam(ctx) === 'rhel') { ctx.err(`-bash: ${name}: command not found`); ctx.html(`<span class="c-dim">dica do lab: esta distribuição (${esc(DISTROS[ctx.h.distro].name)}) usa <b>dnf</b> (ou yum), não apt.</span>`, ''); return 127; }
      if ((name === 'dnf' || name === 'yum') && fam(ctx) === 'debian') { ctx.out(`Command '${name}' not found, did you mean:\n  command 'apt' from deb apt\n`); ctx.html(`<span class="c-dim">dica do lab: Ubuntu/Debian usam <b>apt</b>.</span>`, ''); return 127; }
      ctx.err(`${name}: command not found`);
      return 127;
    }
    try { const r = await fn(rest, ctx); return typeof r === 'number' ? r : 0; }
    catch (e) { console.error(e); ctx.err(`${name}: erro interno do simulador: ${e.message}`); return 1; }
  }
  const fam = ctx => (DISTROS[ctx.h.distro] || DISTROS.ubuntu).family;

  function pushRoot(ctx) {
    stack.push({ key: sess().key, user: 'root', cwd: '/root', via: 'sudo' });
    return 0;
  }

  const flags = (args, known = '') => {
    const f = new Set(); const pos = [];
    for (const a of args) {
      if (a.startsWith('--')) f.add(a);
      else if (a.startsWith('-') && a.length > 1 && !/^-\d/.test(a)) [...a.slice(1)].forEach(x => f.add(x));
      else pos.push(a);
    }
    return { f, pos };
  };
  const modeStr = n => (n.t === 'd' ? 'd' : '-') + [6, 3, 0].map(s => { const b = (n.m >> s) & 7; return (b & 4 ? 'r' : '-') + (b & 2 ? 'w' : '-') + (b & 1 ? 'x' : '-'); }).join('');
  const fdate = t => { const d = new Date(t); return d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(d.getDate()).padStart(2) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  const sizeOf = n => n.t === 'd' ? 4096 : (n.d || '').length;
  const colorName = (name, n) => n.t === 'd' ? `<b class="c-b">${esc(name)}</b>` : n.m & 0o111 ? `<b class="c-g">${esc(name)}</b>` : /\.(pem|key)$/.test(name) ? `<span class="c-y">${esc(name)}</span>` : esc(name);
  const readText = (ctx, file, cmd) => {
    const n = getNode(ctx.h, ctx.p(file));
    if (!n) { ctx.err(`${cmd}: ${file}: No such file or directory`); return null; }
    if (n.t === 'd') { ctx.err(`${cmd}: ${file}: Is a directory`); return null; }
    if (!canRead(n, ctx)) { ctx.err(`${cmd}: ${file}: Permission denied`); return null; }
    return n.d;
  };
  const inputOf = (ctx, files, cmd) => files.length ? files.map(f => readText(ctx, f, cmd)).filter(x => x != null).join('') : (ctx.stdin || '');
  const lines = t => { const a = t.split('\n'); if (a[a.length - 1] === '') a.pop(); return a; };

  function svcName(ctx, n) {
    n = n.replace(/\.service$/, '');
    if (n === 'ssh' && fam(ctx) === 'rhel') return 'sshd';
    if (n === 'sshd' && fam(ctx) === 'debian') return 'ssh';
    return n;
  }

  // ---------- comandos ----------
  const CMDS = {
    help(args, ctx) {
      ctx.html(`<b>Comandos disponíveis no Cloud Lab</b>
<span class="c-y">Navegação</span>     pwd  ls [-la]  cd  tree  find
<span class="c-y">Arquivos</span>      cat  less  head  tail  touch  mkdir [-p]  rm [-r]  rmdir  cp [-r]  mv  nano  echo  grep  wc  sort  uniq
<span class="c-y">Permissões</span>    chmod  chown  whoami  id  groups  sudo  su  useradd  passwd
<span class="c-y">Sistema</span>       uname -a  hostname  uptime  date  df -h  free -h  ps aux  top  kill  history  clear  env  export  which  man
<span class="c-y">Pacotes</span>       apt update / apt install (Ubuntu/Debian)   dnf install (Amazon Linux/RHEL/Oracle)
<span class="c-y">Serviços</span>      systemctl status|start|stop|restart|enable|disable &lt;serviço&gt;   service
<span class="c-y">Rede</span>          ip a  ping  curl  wget  ss -tulpn  ssh  ssh-keygen  exit
<span class="c-y">Nuvem</span>         aws (configure, sts, s3, ec2, iam)   gcloud (projects, compute, storage)   gsutil
Também funcionam: pipes (|), redirecionamento (&gt;, &gt;&gt;), &amp;&amp;, ;, variáveis ($HOME) e curingas (*.txt).
Use <b>Tab</b> para completar e <b>↑/↓</b> para o histórico.`, 'help');
    },
    man(args, ctx) {
      const M = { ls: 'ls - list directory contents', cd: 'cd - change the shell working directory', chmod: 'chmod - change file mode bits.\n  Ex.: chmod 400 chave.pem  (somente o dono lê)\n       chmod +x script.sh   (torna executável)\n  Números: 4=r 2=w 1=x, na ordem dono/grupo/outros', ssh: 'ssh - OpenSSH remote login client.\n  Ex.: ssh -i chave.pem ec2-user@1.2.3.4', grep: 'grep - print lines that match patterns', apt: 'apt - command-line interface (Debian/Ubuntu)\n  sudo apt update && sudo apt install nginx', systemctl: 'systemctl - Control the systemd system and service manager', curl: 'curl - transfer a URL', sudo: 'sudo - execute a command as another user (root)' };
      if (!args[0]) { ctx.out('What manual page do you want?\nFor example, try \'man man\'.'); return 1; }
      ctx.out(M[args[0]] || (CMDS[args[0]] ? `${args[0]} - (manual resumido não disponível no laboratório)` : `No manual entry for ${args[0]}`));
    },
    pwd(a, ctx) { ctx.out(ctx.cwd); },
    cd(a, ctx) {
      const target = ctx.p(a[0] || '~');
      const n = getNode(ctx.h, target);
      if (!n) { ctx.err(`-bash: cd: ${a[0]}: No such file or directory`); return 1; }
      if (n.t !== 'd') { ctx.err(`-bash: cd: ${a[0]}: Not a directory`); return 1; }
      if (!canEnter(n, ctx)) { ctx.err(`-bash: cd: ${a[0]}: Permission denied`); return 1; }
      sess().cwd = target;
    },
    ls(a, ctx) {
      const { f, pos } = flags(a);
      const all = f.has('a') || f.has('A'), long = f.has('l'), human = f.has('h');
      const paths = pos.length ? pos : ['.'];
      let code = 0;
      paths.forEach((p, idx) => {
        const n = getNode(ctx.h, ctx.p(p));
        if (!n) { ctx.err(`ls: cannot access '${p}': No such file or directory`); code = 2; return; }
        if (n.t === 'd' && !canRead(n, ctx)) { ctx.err(`ls: cannot open directory '${p}': Permission denied`); code = 2; return; }
        let entries = n.t === 'd' ? Object.entries(n.c).sort(([x], [y]) => x.localeCompare(y)) : [[p, n]];
        if (!all) entries = entries.filter(([k]) => !k.startsWith('.'));
        else if (n.t === 'd' && f.has('a')) entries = [['.', n], ['..', n], ...entries];
        if (paths.length > 1 && n.t === 'd') ctx.out((idx ? '\n' : '') + p + ':');
        if (long) {
          if (n.t === 'd') ctx.out(`total ${entries.length * 4}`);
          for (const [k, x] of entries) {
            const sz = human && x.t === 'f' ? UI.bytes(sizeOf(x)).replace(' B', '').replace(/\.0 /, '').replace(' ', '') : sizeOf(x);
            const pre = `${modeStr(x)} ${x.t === 'd' ? 2 : 1} ${x.o.padEnd(8)} ${x.o.padEnd(8)} ${String(sz).padStart(5)} ${fdate(x.mt)} `;
            ctx.html(esc(pre) + colorName(k, x), pre + k);
          }
        } else if (entries.length) ctx.html(entries.map(([k, x]) => colorName(k, x)).join('  '), entries.map(([k]) => k).join('\n'));
      });
      return code;
    },
    tree(a, ctx) {
      const start = a.find(x => !x.startsWith('-')) || '.';
      const n = getNode(ctx.h, ctx.p(start));
      if (!n || n.t !== 'd') { ctx.out(`${start}  [error opening dir]`); return 2; }
      let dirs = 0, files = 0;
      const walk = (node, pre) => {
        const es = Object.entries(node.c).filter(([k]) => !k.startsWith('.')).sort(([x], [y]) => x.localeCompare(y));
        es.forEach(([k, x], i) => {
          const last = i === es.length - 1;
          ctx.html(esc(pre + (last ? '└── ' : '├── ')) + colorName(k, x), pre + (last ? '└── ' : '├── ') + k);
          if (x.t === 'd') { dirs++; walk(x, pre + (last ? '    ' : '│   ')); } else files++;
        });
      };
      ctx.html(`<b class="c-b">${esc(start)}</b>`, start);
      walk(n, '');
      ctx.out(`\n${dirs} director${dirs === 1 ? 'y' : 'ies'}, ${files} file${files === 1 ? '' : 's'}`);
    },
    mkdir(a, ctx) {
      const { f, pos } = flags(a);
      if (!pos.length) { ctx.err('mkdir: missing operand'); return 1; }
      let code = 0;
      for (const p of pos) {
        const abs = ctx.p(p);
        if (getNode(ctx.h, abs)) { if (!f.has('p')) { ctx.err(`mkdir: cannot create directory '${p}': File exists`); code = 1; } continue; }
        const parts = abs.split('/').filter(Boolean);
        let n = ctx.h.fs;
        for (let i = 0; i < parts.length; i++) {
          let next = n.c[parts[i]];
          if (!next) {
            if (i < parts.length - 1 && !f.has('p')) { ctx.err(`mkdir: cannot create directory '${p}': No such file or directory`); code = 1; break; }
            if (!canWrite(n, ctx)) { ctx.err(`mkdir: cannot create directory '${p}': Permission denied`); code = 1; break; }
            next = n.c[parts[i]] = D(ctx.root ? 'root' : ctx.user, 0o755);
          }
          if (next.t !== 'd') { ctx.err(`mkdir: cannot create directory '${p}': Not a directory`); code = 1; break; }
          n = next;
        }
      }
      return code;
    },
    rmdir(a, ctx) {
      for (const p of a) {
        const abs = ctx.p(p); const n = getNode(ctx.h, abs); const [dir, name] = split(abs);
        if (!n) { ctx.err(`rmdir: failed to remove '${p}': No such file or directory`); return 1; }
        if (n.t !== 'd') { ctx.err(`rmdir: failed to remove '${p}': Not a directory`); return 1; }
        if (Object.keys(n.c).length) { ctx.err(`rmdir: failed to remove '${p}': Directory not empty`); return 1; }
        const dn = getNode(ctx.h, dir);
        if (!canWrite(dn, ctx)) { ctx.err(`rmdir: failed to remove '${p}': Permission denied`); return 1; }
        delete dn.c[name];
      }
    },
    touch(a, ctx) {
      if (!a.length) { ctx.err('touch: missing file operand'); return 1; }
      for (const p of a) {
        const abs = ctx.p(p); const n = getNode(ctx.h, abs);
        if (n) { n.mt = Date.now(); continue; }
        const e = writeFile(ctx.h, abs, '', ctx);
        if (e) { ctx.err(`touch: cannot touch '${p}': ${e.split(': ').pop()}`); return 1; }
      }
    },
    cat(a, ctx) {
      const files = a.filter(x => x !== '-n');
      if (!files.length) { if (ctx.stdin != null) ctx.out(ctx.stdin.replace(/\n$/, '')); return 0; }
      let code = 0;
      for (const p of files) { const t = readText(ctx, p, 'cat'); if (t == null) { code = 1; continue; } if (t) ctx.out(a.includes('-n') ? lines(t).map((l, i) => String(i + 1).padStart(6) + '  ' + l).join('\n') : t.replace(/\n$/, '')); }
      return code;
    },
    less(a, ctx) { return CMDS.cat(a, ctx); },
    more(a, ctx) { return CMDS.cat(a, ctx); },
    head(a, ctx) { const n = a.includes('-n') ? +a[a.indexOf('-n') + 1] : 10; const files = a.filter((x, i) => x !== '-n' && a[i - 1] !== '-n'); const t = inputOf(ctx, files, 'head'); ctx.out(lines(t).slice(0, n).join('\n')); },
    tail(a, ctx) { const n = a.includes('-n') ? +a[a.indexOf('-n') + 1] : 10; const files = a.filter((x, i) => x !== '-n' && x !== '-f' && a[i - 1] !== '-n'); const t = inputOf(ctx, files, 'tail'); ctx.out(lines(t).slice(-n).join('\n')); },
    wc(a, ctx) {
      const { f, pos } = flags(a); const t = inputOf(ctx, pos, 'wc');
      const l = lines(t).length, w = t.split(/\s+/).filter(Boolean).length, c = t.length;
      const parts = f.size ? [f.has('l') && l, f.has('w') && w, f.has('c') && c].filter(x => x !== false) : [l, w, c];
      ctx.out(parts.map(x => String(x).padStart(f.size === 1 ? 0 : 4)).join(' ') + (pos[0] ? ' ' + pos[0] : ''));
    },
    sort(a, ctx) { const { f, pos } = flags(a); let ls = lines(inputOf(ctx, pos, 'sort')).sort((x, y) => f.has('n') ? parseFloat(x) - parseFloat(y) : x.localeCompare(y)); if (f.has('r')) ls.reverse(); ctx.out(ls.join('\n')); },
    uniq(a, ctx) { const { f, pos } = flags(a); const ls = lines(inputOf(ctx, pos, 'uniq')); const outp = []; for (const l of ls) { const last = outp[outp.length - 1]; if (last && last.l === l) last.n++; else outp.push({ l, n: 1 }); } ctx.out(outp.map(o => f.has('c') ? String(o.n).padStart(7) + ' ' + o.l : o.l).join('\n')); },
    grep(a, ctx) {
      const { f, pos } = flags(a);
      const [pat, ...files] = pos;
      if (pat == null) { ctx.err('Usage: grep [OPTION]... PATTERNS [FILE]...'); return 2; }
      let re;
      try { re = new RegExp(pat, f.has('i') ? 'i' : ''); } catch (e) { re = new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), f.has('i') ? 'i' : ''); }
      let found = false;
      const src = files.length ? files.map(p => ({ p, t: readText(ctx, p, 'grep') })).filter(x => x.t != null) : [{ p: null, t: ctx.stdin || '' }];
      for (const { p, t } of src) lines(t).forEach((l, i) => {
        if (re.test(l) === !f.has('v')) {
          found = true;
          const pre = (files.length > 1 ? p + ':' : '') + (f.has('n') ? (i + 1) + ':' : '');
          ctx.html(`<span class="c-m">${esc(pre)}</span>` + (f.has('v') ? esc(l) : esc(l).replace(new RegExp(esc(pat).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g' + (f.has('i') ? 'i' : '')), m => `<b class="c-r">${m}</b>`)), pre + l);
        }
      });
      return found ? 0 : 1;
    },
    find(a, ctx) {
      const start = a[0] && !a[0].startsWith('-') ? a[0] : '.';
      const nameI = a.indexOf('-name'), typeI = a.indexOf('-type');
      const re = nameI >= 0 ? new RegExp('^' + a[nameI + 1].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null;
      const type = typeI >= 0 ? a[typeI + 1] : null;
      const n = getNode(ctx.h, ctx.p(start));
      if (!n) { ctx.err(`find: '${start}': No such file or directory`); return 1; }
      const walk = (node, path, name) => {
        if ((!re || re.test(name)) && (!type || (type === 'd') === (node.t === 'd'))) ctx.out(path);
        if (node.t === 'd') { if (!canRead(node, ctx)) { ctx.err(`find: '${path}': Permission denied`); return; } Object.entries(node.c).sort().forEach(([k, x]) => walk(x, path === '/' ? '/' + k : path + '/' + k, k)); }
      };
      walk(n, start, start.split('/').pop());
    },
    echo(a, ctx) { const nl = a[0] === '-n'; const e = a[0] === '-e'; let t = (nl || e ? a.slice(1) : a).join(' '); if (e) t = t.replace(/\\n/g, '\n').replace(/\\t/g, '\t'); ctx.out(t); },
    rm(a, ctx) {
      const { f, pos } = flags(a);
      if (!pos.length) { ctx.err('rm: missing operand'); return 1; }
      let code = 0;
      for (const p of pos) {
        const abs = ctx.p(p); const n = getNode(ctx.h, abs); const [dir, name] = split(abs);
        if (abs === '/' ) { ctx.err("rm: it is dangerous to operate recursively on '/'\nrm: use --no-preserve-root to override this failsafe"); return 1; }
        if (!n) { if (!f.has('f')) { ctx.err(`rm: cannot remove '${p}': No such file or directory`); code = 1; } continue; }
        if (n.t === 'd' && !f.has('r') && !f.has('R')) { ctx.err(`rm: cannot remove '${p}': Is a directory`); code = 1; continue; }
        const dn = getNode(ctx.h, dir);
        if (!canWrite(dn, ctx)) { ctx.err(`rm: cannot remove '${p}': Permission denied`); code = 1; continue; }
        delete dn.c[name];
      }
      return code;
    },
    cp(a, ctx) {
      const { f, pos } = flags(a);
      if (pos.length < 2) { ctx.err('cp: missing destination file operand'); return 1; }
      const dest = pos.pop();
      const dabs = ctx.p(dest); const dn = getNode(ctx.h, dabs);
      for (const p of pos) {
        const sn = getNode(ctx.h, ctx.p(p));
        if (!sn) { ctx.err(`cp: cannot stat '${p}': No such file or directory`); return 1; }
        if (sn.t === 'd' && !f.has('r') && !f.has('R')) { ctx.err(`cp: -r not specified; omitting directory '${p}'`); return 1; }
        const target = dn && dn.t === 'd' ? dabs + '/' + split(ctx.p(p))[1] : dabs;
        const [tdir, tname] = split(target); const tdn = getNode(ctx.h, tdir);
        if (!tdn || tdn.t !== 'd') { ctx.err(`cp: cannot create regular file '${dest}': No such file or directory`); return 1; }
        if (!canWrite(tdn, ctx)) { ctx.err(`cp: cannot create regular file '${dest}': Permission denied`); return 1; }
        const copy = JSON.parse(JSON.stringify(sn)); copy.o = ctx.root ? 'root' : ctx.user; copy.mt = Date.now();
        tdn.c[tname] = copy;
      }
    },
    mv(a, ctx) {
      if (a.length < 2) { ctx.err('mv: missing destination file operand'); return 1; }
      const pos = [...a]; const dest = pos.pop(); const dabs = ctx.p(dest); const dn = getNode(ctx.h, dabs);
      for (const p of pos) {
        const sabs = ctx.p(p); const sn = getNode(ctx.h, sabs); const [sdir, sname] = split(sabs);
        if (!sn) { ctx.err(`mv: cannot stat '${p}': No such file or directory`); return 1; }
        const target = dn && dn.t === 'd' ? dabs + '/' + sname : dabs;
        const [tdir, tname] = split(target); const tdn = getNode(ctx.h, tdir); const sdn = getNode(ctx.h, sdir);
        if (!tdn || tdn.t !== 'd') { ctx.err(`mv: cannot move '${p}' to '${dest}': No such file or directory`); return 1; }
        if (!canWrite(tdn, ctx) || !canWrite(sdn, ctx)) { ctx.err(`mv: cannot move '${p}' to '${dest}': Permission denied`); return 1; }
        delete sdn.c[sname]; tdn.c[tname] = sn;
      }
    },
    chmod(a, ctx) {
      const [mode, ...files] = a.filter(x => x !== '-R');
      if (!mode || !files.length) { ctx.err("chmod: missing operand"); return 1; }
      for (const p of files) {
        const n = getNode(ctx.h, ctx.p(p));
        if (!n) { ctx.err(`chmod: cannot access '${p}': No such file or directory`); return 1; }
        if (!ctx.root && n.o !== ctx.user) { ctx.err(`chmod: changing permissions of '${p}': Operation not permitted`); return 1; }
        if (/^[0-7]{3,4}$/.test(mode)) n.m = parseInt(mode.slice(-3), 8);
        else {
          for (const part of mode.split(',')) {
            const m = part.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
            if (!m) { ctx.err(`chmod: invalid mode: '${mode}'`); return 1; }
            const who = m[1] || 'a'; let bits = 0;
            for (const ch of m[3]) bits |= ch === 'r' ? 4 : ch === 'w' ? 2 : 1;
            let mask = 0;
            if (who.includes('u') || who.includes('a')) mask |= bits << 6;
            if (who.includes('g') || who.includes('a')) mask |= bits << 3;
            if (who.includes('o') || who.includes('a')) mask |= bits;
            if (m[2] === '+') n.m |= mask; else if (m[2] === '-') n.m &= ~mask; else n.m = mask;
          }
        }
      }
    },
    chown(a, ctx) {
      const [owner, ...files] = a.filter(x => x !== '-R');
      if (!ctx.root) { ctx.err(`chown: changing ownership of '${files[0] || ''}': Operation not permitted`); return 1; }
      const u = owner.split(':')[0];
      if (!ctx.h.users[u]) { ctx.err(`chown: invalid user: '${owner}'`); return 1; }
      for (const p of files) { const n = getNode(ctx.h, ctx.p(p)); if (!n) { ctx.err(`chown: cannot access '${p}': No such file or directory`); return 1; } n.o = u; }
    },
    whoami(a, ctx) { ctx.out(ctx.root ? 'root' : ctx.user); },
    id(a, ctx) { const u = ctx.root ? 'root' : ctx.user; const uid = ctx.h.users[u] ? ctx.h.users[u].uid : 1000; ctx.out(u === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : `uid=${uid}(${u}) gid=${uid}(${u}) groups=${uid}(${u}),27(sudo)`); },
    groups(a, ctx) { ctx.out(ctx.root ? 'root' : `${ctx.user} sudo`); },
    hostname(a, ctx) { ctx.out(a[0] === '-I' ? ctx.h.privateIp : ctx.h.hostname); },
    uname(a, ctx) { const d = DISTROS[ctx.h.distro]; ctx.out(a.includes('-a') ? `Linux ${ctx.h.hostname} ${d.kernel} #1 SMP PREEMPT_DYNAMIC x86_64 x86_64 x86_64 GNU/Linux` : a.includes('-r') ? d.kernel : 'Linux'); },
    date(a, ctx) { ctx.out(new Date().toUTCString().replace('GMT', 'UTC')); },
    uptime(a, ctx) { const m = Math.max(1, Math.round((Date.now() - ctx.h.boot) / 60000)); ctx.out(` ${new Date().toTimeString().slice(0, 8)} up ${m < 60 ? m + ' min' : Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0')},  1 user,  load average: 0.08, 0.03, 0.01`); },
    df(a, ctx) { ctx.out('Filesystem      Size  Used Avail Use% Mounted on\n/dev/root       7.6G  1.9G  5.7G  25% /\ntmpfs           479M     0  479M   0% /dev/shm\ntmpfs           192M  880K  191M   1% /run\n/dev/xvda15     105M  6.1M   99M   6% /boot/efi'); },
    du(a, ctx) { const p = a.find(x => !x.startsWith('-')) || '.'; const n = getNode(ctx.h, ctx.p(p)); if (!n) { ctx.err(`du: cannot access '${p}': No such file or directory`); return 1; } const tot = x => x.t === 'd' ? 4096 + Object.values(x.c).reduce((s, y) => s + tot(y), 0) : sizeOf(x); ctx.out(`${Math.ceil(tot(n) / 1024)}K\t${p}`); },
    free(a, ctx) { ctx.out('               total        used        free      shared  buff/cache   available\nMem:           957Mi       312Mi       284Mi       0.0Ki       361Mi       496Mi\nSwap:             0B          0B          0B'); },
    ps(a, ctx) {
      const procs = [['root', 1, '/sbin/init'], ['root', 412, 'sshd: /usr/sbin/sshd -D [listener]'], ['root', 455, '/usr/sbin/cron -f'], ['syslog', 470, '/usr/sbin/rsyslogd -n']];
      let pid = 1200;
      for (const [s, st] of Object.entries(ctx.h.svcs)) if (st.active && !['ssh', 'sshd', 'cron', 'crond'].includes(s)) { procs.push(['root', pid++, s === 'nginx' ? 'nginx: master process /usr/sbin/nginx' : `/usr/sbin/${s}`]); if (s === 'nginx') procs.push(['www-data', pid++, 'nginx: worker process']); }
      procs.push([ctx.user, 2001, '-bash'], [ctx.user, 2050, 'ps ' + a.join(' ')]);
      ctx.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\n' + procs.map(([u, p, c]) => `${u.padEnd(10)} ${String(p).padStart(5)}  0.0  0.${UI.int(1, 9)}  ${UI.int(10000, 99999)}  ${UI.int(1000, 9999)} ?        Ss   10:00   0:00 ${c}`).join('\n'));
    },
    top(a, ctx) { ctx.out(`top - ${new Date().toTimeString().slice(0, 8)} up 5 min,  1 user,  load average: 0.08, 0.03, 0.01\nTasks:  98 total,   1 running,  97 sleeping,   0 stopped,   0 zombie\n%Cpu(s):  0.3 us,  0.3 sy,  0.0 ni, 99.3 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\nMiB Mem :    957.4 total,    284.1 free,    312.0 used,    361.3 buff/cache\n\n    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n      1 root      20   0  167732  12936   8336 S   0.0   1.3   0:01.21 systemd\n    412 root      20   0   15432   8960   7680 S   0.0   0.9   0:00.02 sshd\n   2001 ${ctx.user.padEnd(8)}  20   0    8952   5376   3584 S   0.0   0.5   0:00.01 bash\n\n(no laboratório o top mostra apenas uma foto; no Linux real, pressione q para sair)`); },
    htop(a, ctx) { return CMDS.top(a, ctx); },
    kill(a, ctx) { const pid = a.find(x => /^\d+$/.test(x)); if (!pid) { ctx.err('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid'); return 1; } if (+pid === 1) { ctx.err('kill: (1) - Operation not permitted'); return 1; } },
    history(a, ctx) { L().history.slice(-50).forEach((c, i, arr) => ctx.out(`${String(L().history.length - arr.length + i + 1).padStart(5)}  ${c}`)); },
    clear() { out.innerHTML = ''; },
    env(a, ctx) { ctx.out(Object.entries(ctx.env).filter(([k]) => k !== '?').map(([k, x]) => `${k}=${x}`).join('\n')); },
    export(a, ctx) { for (const x of a) { const [k, ...vv] = x.split('='); if (vv.length) ctx.h.env[k] = vv.join('='); } },
    which(a, ctx) { let code = 0; for (const c of a) { if (CMDS[c] && (!BIN_PKG[c] || ctx.h.pkgs[BIN_PKG[c]])) ctx.out(`/usr/bin/${c}`); else code = 1; } return code; },
    sleep: async (a, ctx) => { const end = Date.now() + (parseFloat(a[0]) || 0) * 1000; while (Date.now() < end && !abort) await sleep(100); },
    true: () => 0, false: () => 1,
    exit(a, ctx) {
      if (stack.length > 1) {
        const s = stack.pop();
        if (s.via === 'sudo') { ctx.out('logout'); }
        else ctx.out(`logout\nConnection to ${s.target} closed.`);
        return 0;
      }
      ctx.out('logout');
      ctx.html('<span class="c-dim">(este é o terminal local do laboratório — ele continua aberto)</span>', '');
    },
    logout(a, ctx) { return CMDS.exit(a, ctx); },
    su(a, ctx) {
      const u = a.filter(x => x !== '-')[0] || 'root';
      if (!ctx.root) { ctx.out('Password: '); ctx.err('su: Authentication failure'); ctx.html('<span class="c-dim">dica: use <b>sudo su</b> ou <b>sudo -i</b> (a conta root não tem senha nas imagens de nuvem)</span>', ''); return 1; }
      if (!ctx.h.users[u]) { ctx.err(`su: user ${u} does not exist or the user entry does not contain all the required fields`); return 1; }
      stack.push({ key: sess().key, user: u, cwd: ctx.h.users[u].home, via: 'sudo' });
    },
    useradd(a, ctx) {
      const name = a.filter(x => !x.startsWith('-')).pop();
      if (!ctx.root) { ctx.err('useradd: Permission denied.\nuseradd: cannot lock /etc/passwd; try again later.'); return 1; }
      if (!name) { ctx.err('Usage: useradd [options] LOGIN'); return 2; }
      if (ctx.h.users[name]) { ctx.err(`useradd: user '${name}' already exists`); return 9; }
      const uid = 1000 + Object.keys(ctx.h.users).length;
      ctx.h.users[name] = { uid, home: `/home/${name}` };
      if (a.includes('-m') || a.includes('adduser')) ctx.h.fs.c.home.c[name] = D(name, 0o750, { '.bashrc': F(name, 0o644, '') });
      getNode(ctx.h, '/etc/passwd').d += `${name}:x:${uid}:${uid}::/home/${name}:/bin/bash\n`;
    },
    async adduser(a, ctx) {
      const name = a[0];
      if (!ctx.root) { ctx.err('fatal: Only root may add a user or group to the system.'); return 1; }
      if (!name) { ctx.err('fatal: Specify a username'); return 1; }
      const r = CMDS.useradd(['-m', name], ctx); if (r) return r;
      ctx.out(`info: Adding user \`${name}' ...\ninfo: Creating home directory \`/home/${name}' ...\ninfo: Copying files from \`/etc/skel' ...`);
      await ask('New password: ', { secret: true }); await ask('Retype new password: ', { secret: true });
      ctx.out('passwd: password updated successfully\ninfo: Adding new user `' + name + "' to supplemental / extra groups `users' ...");
    },
    async passwd(a, ctx) {
      const u = a[0] || ctx.user;
      if (a[0] && !ctx.root) { ctx.err(`passwd: You may not view or modify password information for ${u}.`); return 1; }
      if (!ctx.h.users[u]) { ctx.err(`passwd: user '${u}' does not exist`); return 1; }
      ctx.out(`Changing password for ${u}.`);
      await ask('New password: ', { secret: true }); await ask('Retype new password: ', { secret: true });
      ctx.out('passwd: password updated successfully');
    },
    ip(a, ctx) {
      if (!a[0] || !/^(a|addr|address)$/.test(a[0])) { ctx.out('Usage: ip [ OPTIONS ] OBJECT { COMMAND | help }\n  tente: ip a'); return a[0] ? 1 : 255; }
      const ifn = ctx.h.key === 'local' ? 'wlp2s0' : ctx.h.key.startsWith('aws') ? 'ens5' : 'ens3';
      ctx.out(`1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000\n    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00\n    inet 127.0.0.1/8 scope host lo\n2: ${ifn}: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc mq state UP group default qlen 1000\n    link/ether 0a:${UI.rand(2)}:${UI.rand(2)}:${UI.rand(2)}:${UI.rand(2)}:${UI.rand(2)} brd ff:ff:ff:ff:ff:ff\n    inet ${ctx.h.privateIp}/${ctx.h.key === 'local' ? 24 : 20} brd ${ctx.h.privateIp.split('.').slice(0, 3).join('.')}.255 scope global dynamic ${ifn}`);
      if (ctx.h.key !== 'local') ctx.html('<span class="c-dim">(repare: a VM só conhece o IP privado; o IP público é um NAT feito pela nuvem)</span>', '');
    },
    ifconfig(a, ctx) { return CMDS.ip(['a'], ctx); },
    ss(a, ctx) {
      const rows = [['0.0.0.0:22', 'sshd']];
      for (const [s, st] of Object.entries(ctx.h.svcs)) if (st.active) { if (['nginx', 'apache2', 'httpd'].includes(s)) rows.push(['0.0.0.0:80', s]); if (s === 'mariadb') rows.push(['127.0.0.1:3306', 'mariadbd']); }
      ctx.out('Netid State  Recv-Q Send-Q Local Address:Port  Peer Address:Port Process\n' + rows.map(([adr, p]) => `tcp   LISTEN 0      511    ${adr.padEnd(19)} 0.0.0.0:*         users:(("${p}",pid=${UI.int(400, 1300)},fd=6))`).join('\n'));
    },
    netstat(a, ctx) { return CMDS.ss(a, ctx); },
    async ping(a, ctx) {
      const hostArg = a.find(x => !x.startsWith('-') && !/^\d+$/.test(x) || /^\d+\.\d+\.\d+\.\d+$/.test(x));
      const count = a.includes('-c') ? +a[a.indexOf('-c') + 1] : 4;
      if (!hostArg) { ctx.err('ping: usage error: Destination address required'); return 1; }
      const r = resolve(hostArg, ctx);
      if (!r) { ctx.err(`ping: ${hostArg}: Name or service not known`); return 2; }
      ctx.out(`PING ${hostArg} (${r.ip}) 56(84) bytes of data.`);
      const ok = r.kind === 'self' || r.kind === 'internet' || (r.kind === 'target' && r.t.running && r.t.allows('ICMP', 0));
      let got = 0;
      for (let i = 1; i <= count && !abort; i++) {
        await sleep(700);
        if (ok) { got++; ctx.out(`64 bytes from ${r.ip}: icmp_seq=${i} ttl=${r.kind === 'self' ? 64 : 52} time=${r.kind === 'self' ? '0.0' + UI.int(10, 60) : (UI.int(80, 240) / 10).toFixed(1)} ms`); }
      }
      ctx.out(`\n--- ${hostArg} ping statistics ---\n${count} packets transmitted, ${got} received, ${Math.round(100 - got / count * 100)}% packet loss, time ${count * 1000}ms`);
      if (!ok && r.kind === 'target') ctx.html(`<span class="c-dim">dica do lab: ${r.t.running ? 'o firewall da nuvem (security group / security list / firewall rule) não libera ICMP para esta instância.' : 'a instância não está em execução.'}</span>`, '');
      return got ? 0 : 1;
    },
    curl: async (a, ctx) => httpCmd(a, ctx, 'curl'),
    wget: async (a, ctx) => httpCmd(a, ctx, 'wget'),
    async ssh(a, ctx) { return sshCmd(a, ctx); },
    async 'ssh-keygen'(a, ctx) {
      const t = a.includes('-t') ? a[a.indexOf('-t') + 1] : 'ed25519';
      ctx.out(`Generating public/private ${t} key pair.`);
      const def = `${ctx.home}/.ssh/id_${t}`;
      const f = (await ask(`Enter file in which to save the key (${def}): `)).trim() || def;
      await ask('Enter passphrase (empty for no passphrase): ', { secret: true }); await ask('Enter same passphrase again: ', { secret: true });
      const abs = ctx.p(f);
      if (!getNode(ctx.h, split(abs)[0])) CMDS.mkdir(['-p', split(abs)[0]], ctx);
      const AN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const mat = UI.rand(43, AN); // o mesmo trecho vai na chave pública, para o lab casar as duas
      const e = writeFile(ctx.h, abs, `-----BEGIN OPENSSH PRIVATE KEY-----\n${mat}${UI.rand(21, AN)}\n-----END OPENSSH PRIVATE KEY-----\n`, ctx);
      if (e) { ctx.err(`Saving key "${f}" failed: ${e}`); return 1; }
      getNode(ctx.h, abs).m = 0o600;
      writeFile(ctx.h, abs + '.pub', `ssh-${t} AAAAC3NzaC1lZDI1NTE5AAAAI${mat} ${ctx.user}@${ctx.h.hostname}\n`, ctx);
      ctx.out(`Your identification has been saved in ${f}\nYour public key has been saved in ${f}.pub\nThe key fingerprint is:\nSHA256:${UI.rand(43, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789')} ${ctx.user}@${ctx.h.hostname}`);
    },
    async nano(a, ctx) {
      const f = a.find(x => !x.startsWith('-'));
      if (!f) { ctx.err('nano: informe o nome do arquivo (ex.: nano notas.txt)'); return 1; }
      const abs = ctx.p(f);
      const n = getNode(ctx.h, abs);
      if (n && n.t === 'd') { ctx.err(`nano: ${f} is a directory`); return 1; }
      if (n && !canRead(n, ctx)) { ctx.err(`nano: ${f}: Permission denied`); return 1; }
      await openNano(f, abs, n ? n.d : '', ctx);
    },
    vi(a, ctx) { ctx.html('<span class="c-dim">vim não está disponível no laboratório — abrindo no <b>nano</b> (Ctrl+O salva, Ctrl+X sai).</span>', ''); return CMDS.nano(a, ctx); },
    vim(a, ctx) { return CMDS.vi(a, ctx); },
    python3(a, ctx) { if (a[0] === '--version' || a[0] === '-V') { ctx.out('Python 3.12.3'); return 0; } ctx.out('Python 3.12.3 (main, Sep 11 2024, 14:17:37) [GCC 13.2.0] on linux\n(o interpretador interativo não está disponível no laboratório)'); },
    python(a, ctx) { if (ctx.h.pkgs.python3 && fam(ctx) === 'rhel') return CMDS.python3(a, ctx); ctx.out("Command 'python' not found, did you mean:\n  command 'python3' from deb python3"); return 127; },
    node(a, ctx) { ctx.out(a[0] === '-v' || a[0] === '--version' ? 'v18.19.1' : 'Welcome to Node.js v18.19.1.\n(o REPL não está disponível no laboratório)'); },
    npm(a, ctx) { ctx.out(a[0] === '-v' ? '9.2.0' : 'npm não acessa a internet no laboratório.'); },
    git(a, ctx) {
      const sub = a[0];
      if (sub === '--version') return ctx.out('git version 2.43.0');
      if (sub === 'init') { CMDS.mkdir(['-p', '.git'], ctx); ctx.out(`Initialized empty Git repository in ${ctx.cwd}/.git/`); return 0; }
      if (sub === 'status') { if (!getNode(ctx.h, ctx.p('.git'))) { ctx.err('fatal: not a git repository (or any of the parent directories): .git'); return 128; } ctx.out('On branch master\n\nNo commits yet\n\nnothing to commit (create/copy files and use "git add" to track)'); return 0; }
      if (sub === 'clone') { ctx.out(`Cloning into '${(a[1] || 'repo').split('/').pop().replace(/\.git$/, '')}'...`); ctx.err(`fatal: unable to access '${a[1]}': Could not resolve host (o laboratório não tem acesso à internet real)`); return 128; }
      ctx.out('usage: git [--version] <command> [<args>]\n(no laboratório: git --version, git init, git status, git clone)');
    },
    neofetch(a, ctx) {
      const d = DISTROS[ctx.h.distro];
      ctx.html(`<span class="c-r">        .-/+oossssoo+/-.        </span><b class="c-g">${esc(ctx.user)}@${esc(ctx.h.hostname)}</b>
<span class="c-r">    \`:+ssssssssssssssssss+:\`    </span>-----------------
<span class="c-r">  -+ssssssssssssssssssyyssss+-  </span><b class="c-r">OS</b>: ${esc(d.name)} x86_64
<span class="c-r"> .ossssssssssssssssssdMMMNysssso. </span><b class="c-r">Kernel</b>: ${esc(d.kernel)}
<span class="c-r">/ssssssssssshdmmNNmmyNMMMMhssssss/</span><b class="c-r">Shell</b>: bash 5.2.21
<span class="c-r">+ssssssssshmydMMMMMMMNddddyssssssss+</span><b class="c-r">CPU</b>: Intel Xeon (2) @ 2.499GHz
<span class="c-r">/sssssssshNMMMyhhyyyyhmNMMMNhssssssss/</span><b class="c-r">Memory</b>: 312MiB / 957MiB`, 'neofetch');
    },
    unzip(a, ctx) { ctx.out(`unzip:  cannot find or open ${a[0] || ''}.`); return 9; },
    async apt(a, ctx) { return aptCmd(a, ctx); },
    async 'apt-get'(a, ctx) { return aptCmd(a, ctx); },
    async dnf(a, ctx) { return dnfCmd(a, ctx); },
    async yum(a, ctx) { return dnfCmd(a, ctx); },
    systemctl(a, ctx) { return systemctlCmd(a, ctx); },
    service(a, ctx) { const [svc, act] = a; if (!svc || !act) { ctx.out('Usage: service < option > | --status-all | [ service_name [ command | --full-restart ] ]'); return 1; } return systemctlCmd([act, svc], ctx); },
    nginx(a, ctx) { if (a.includes('-v') || a.includes('-V')) { ctx.err('nginx version: nginx/1.24.0 (Ubuntu)'); return 0; } if (a.includes('-t')) { if (!ctx.root) { ctx.err('nginx: [alert] could not open error log file: open() "/var/log/nginx/error.log" failed (13: Permission denied)'); return 1; } ctx.err('nginx: the configuration file /etc/nginx/nginx.conf syntax is ok\nnginx: configuration file /etc/nginx/nginx.conf test is successful'); return 0; } ctx.out('use: sudo systemctl start nginx'); },
    aws: async (a, ctx) => awsCmd(a, ctx),
    gcloud: async (a, ctx) => GCP.cli.gcloud(a, ctx, api),
    gsutil: async (a, ctx) => GCP.cli.gsutil(a, ctx, api),
  };

  // ---------- pacotes ----------
  async function aptCmd(a, ctx) {
    const sub = a.find(x => !x.startsWith('-'));
    const yes = a.includes('-y') || a.includes('--yes');
    const names = a.filter(x => !x.startsWith('-')).slice(1);
    if (!sub) { ctx.out('apt 2.7.14 (amd64)\nUsage: apt [options] command\n\nMost used commands:\n  list - list packages based on package names\n  search - search in package descriptions\n  install - install packages\n  remove - remove packages\n  update - update list of available packages\n  upgrade - upgrade the system by installing/upgrading packages'); return 0; }
    if (sub === 'list') { ctx.out('Listing... Done'); Object.keys(ctx.h.pkgs).sort().forEach(p => ctx.out(`${p}/${DISTROS[ctx.h.distro].code || 'stable'},now ${(PKGS[p] && PKGS[p].ver.debian) || '1.0'} amd64 [installed]`)); return 0; }
    if (sub === 'search') { const q = names[0] || ''; ctx.out('Sorting... Done\nFull Text Search... Done'); Object.keys(PKGS).filter(p => PKGS[p].deb && p.includes(q)).forEach(p => ctx.html(`<b class="c-g">${p}</b>/${DISTROS[ctx.h.distro].code} ${PKGS[p].ver.debian} amd64`, p)); return 0; }
    const lockErr = () => { ctx.err('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)\nE: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?'); return 100; };
    if (sub === 'update') {
      if (!ctx.root) { ctx.err('Reading package lists... Done\nE: Could not open lock file /var/lib/apt/lists/lock - open (13: Permission denied)\nE: Unable to lock directory /var/lib/apt/lists/'); return 100; }
      const code = DISTROS[ctx.h.distro].code;
      const deb = DISTROS[ctx.h.distro].id === 'debian';
      const mirror = deb ? 'http://deb.debian.org/debian' : 'http://archive.ubuntu.com/ubuntu', sec = deb ? 'http://deb.debian.org/debian-security' : 'http://security.ubuntu.com/ubuntu';
      const lines2 = [`Hit:1 ${mirror} ${code} InRelease`, `Get:2 ${mirror} ${code}-updates InRelease [126 kB]`, `Get:3 ${sec} ${code}-security InRelease [126 kB]`, `Get:4 ${mirror} ${code}-updates/main amd64 Packages [557 kB]`, 'Fetched 809 kB in 2s (412 kB/s)', 'Reading package lists... Done', 'Building dependency tree... Done', 'Reading state information... Done', '12 packages can be upgraded. Run \'apt list --upgradable\' to see them.'];
      for (const l of lines2) { if (abort) return 130; ctx.out(l); await sleep(220); }
      ctx.h.aptUpdated = true; return 0;
    }
    if (sub === 'upgrade') { if (!ctx.root) return lockErr(); ctx.out('Reading package lists... Done\nBuilding dependency tree... Done\nCalculating upgrade... Done\n0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.'); return 0; }
    if (sub === 'install' || sub === 'remove' || sub === 'purge') {
      if (!names.length) { ctx.err(`E: No packages specified`); return 100; }
      if (!ctx.root) return lockErr();
      ctx.out('Reading package lists... Done\nBuilding dependency tree... Done\nReading state information... Done');
      await sleep(300);
      if (sub !== 'install') {
        const has = names.filter(n => ctx.h.pkgs[n]);
        if (!has.length) { ctx.out(`Package '${names[0]}' is not installed, so not removed\n0 upgraded, 0 newly installed, 0 to remove and 12 not upgraded.`); return 0; }
        ctx.out(`The following packages will be REMOVED:\n  ${has.join(' ')}\n0 upgraded, 0 newly installed, ${has.length} to remove and 12 not upgraded.`);
        if (!yes && !/^y?$/i.test((await ask('Do you want to continue? [Y/n] ')).trim())) { ctx.out('Abort.'); return 1; }
        for (const n of has) { delete ctx.h.pkgs[n]; ctx.out(`Removing ${n} (${PKGS[n] ? PKGS[n].ver.debian : ''}) ...`); if (PKGS[n] && PKGS[n].svc) delete ctx.h.svcs[PKGS[n].svc]; await sleep(200); }
        return 0;
      }
      const unknown = names.find(n => !PKGS[n] || !PKGS[n].deb);
      if (unknown || !ctx.h.aptUpdated) { ctx.err(`E: Unable to locate package ${unknown || names[0]}`); if (!ctx.h.aptUpdated) ctx.html('<span class="c-dim">dica do lab: em uma VM recém-criada a lista de pacotes está vazia. Rode <b>sudo apt update</b> primeiro.</span>', ''); return 100; }
      const todo = names.filter(n => !ctx.h.pkgs[n]);
      names.filter(n => ctx.h.pkgs[n]).forEach(n => ctx.out(`${n} is already the newest version (${PKGS[n].ver.debian}).`));
      if (!todo.length) { ctx.out('0 upgraded, 0 newly installed, 0 to remove and 12 not upgraded.'); return 0; }
      const extra = todo.flatMap(n => n === 'nginx' ? ['nginx-common'] : n === 'apache2' ? ['apache2-bin', 'apache2-data', 'apache2-utils'] : []);
      if (extra.length) ctx.out(`The following additional packages will be installed:\n  ${extra.join(' ')}`);
      ctx.out(`The following NEW packages will be installed:\n  ${[...todo, ...extra].join(' ')}\n0 upgraded, ${todo.length + extra.length} newly installed, 0 to remove and 12 not upgraded.\nNeed to get ${todo.map(n => PKGS[n].size).join(' + ')} of archives.\nAfter this operation, ${UI.int(1, 9)},${UI.int(100, 999)} kB of additional disk space will be used.`);
      if (!yes) { const r = (await ask('Do you want to continue? [Y/n] ')).trim(); if (!/^(y|yes|)$/i.test(r)) { ctx.out('Abort.'); return 1; } }
      let k = 1;
      for (const n of [...todo, ...extra]) { if (abort) return 130; ctx.out(`Get:${k++} ${DISTROS[ctx.h.distro].id === 'debian' ? 'http://deb.debian.org/debian' : 'http://archive.ubuntu.com/ubuntu'} ${DISTROS[ctx.h.distro].code}/main amd64 ${n} amd64 ${PKGS[n] ? PKGS[n].ver.debian : '1.0'} [${PKGS[n] ? PKGS[n].size : '40 kB'}]`); await sleep(250); }
      for (const n of [...extra, ...todo]) { ctx.out(`Selecting previously unselected package ${n}.\nUnpacking ${n} ...`); await sleep(150); }
      for (const n of [...extra, ...todo]) { ctx.out(`Setting up ${n} (${PKGS[n] ? PKGS[n].ver.debian : '1.0'}) ...`); if (PKGS[n]) installPkg(ctx.h, n, true); await sleep(200); }
      ctx.out('Processing triggers for man-db (2.12.0-4build2) ...');
      if (todo.some(n => PKGS[n].svc)) ctx.html('<span class="c-dim">(no Ubuntu/Debian o serviço já é iniciado e habilitado automaticamente após instalar)</span>', '');
      L().events.pkg = true;
      return 0;
    }
    ctx.err(`E: Invalid operation ${sub}`); return 100;
  }

  async function dnfCmd(a, ctx) {
    const sub = a.find(x => !x.startsWith('-'));
    const yes = a.includes('-y');
    const names = a.filter(x => !x.startsWith('-')).slice(1);
    const repo = DISTROS[ctx.h.distro].repo;
    if (!sub) { ctx.out('usage: dnf [options] COMMAND\n\nList of Main Commands:\n\ninstall      Install a package or packages on your system\nremove       Remove a package or packages from your system\nlist         List a package or groups of packages\nsearch       Search package details for the given string\nupdate       Upgrade a package or packages on your system'); return 0; }
    if (sub === 'list') { ctx.out('Installed Packages'); Object.keys(ctx.h.pkgs).sort().forEach(p => ctx.out(`${(p + '.x86_64').padEnd(32)} ${((PKGS[p] && PKGS[p].ver.rhel) || '1.0-1').padEnd(28)} @${repo}`)); return 0; }
    if (sub === 'search') { ctx.out('Last metadata expiration check: 0:03:12 ago.\n======================== Name Matched: ' + (names[0] || '') + ' ========================'); Object.keys(PKGS).filter(p => PKGS[p].rpm && p.includes(names[0] || '')).forEach(p => ctx.out(`${p}.x86_64 : ${SVC_DESC[PKGS[p].svc] || p}`)); return 0; }
    if (['install', 'remove', 'erase', 'update', 'upgrade', 'makecache'].includes(sub)) {
      if (!ctx.root) { ctx.err('Error: This command has to be run with superuser privileges (under the root user on most systems).'); return 1; }
      ctx.out(`Last metadata expiration check: 0:0${UI.int(1, 9)}:${UI.int(10, 59)} ago on ${new Date().toString().slice(0, 24)}.`);
      await sleep(400);
      if (sub === 'update' || sub === 'upgrade' || sub === 'makecache') { ctx.out('Dependencies resolved.\nNothing to do.\nComplete!'); return 0; }
      if (sub === 'remove' || sub === 'erase') { const has = names.filter(n => ctx.h.pkgs[n]); if (!has.length) { ctx.out('No match for argument: ' + names[0] + '\nNo packages marked for removal.\nDependencies resolved.\nNothing to do.\nComplete!'); return 0; } if (!yes && !/^y/i.test(await ask('Is this ok [y/N]: '))) { ctx.out('Operation aborted.'); return 1; } has.forEach(n => { delete ctx.h.pkgs[n]; if (PKGS[n].svc) delete ctx.h.svcs[PKGS[n].svc]; ctx.out(`  Erasing          : ${n}`); }); ctx.out('Complete!'); return 0; }
      if (!names.length) { ctx.err('Error: Need to pass a list of pkgs to install'); return 1; }
      const unknown = names.find(n => !PKGS[n] || !PKGS[n].rpm);
      if (unknown) { ctx.out(`No match for argument: ${unknown}`); ctx.err(`Error: Unable to find a match: ${unknown}`); if (unknown === 'apache2') ctx.html('<span class="c-dim">dica do lab: no Amazon Linux / RHEL / Oracle Linux o Apache se chama <b>httpd</b>.</span>', ''); return 1; }
      const todo = names.filter(n => !ctx.h.pkgs[n]);
      names.filter(n => ctx.h.pkgs[n]).forEach(n => ctx.out(`Package ${n}-${rpmVer(ctx, n)}.x86_64 is already installed.`));
      if (!todo.length) { ctx.out('Dependencies resolved.\nNothing to do.\nComplete!'); return 0; }
      const bar = '='.repeat(80);
      ctx.out(`Dependencies resolved.\n${bar}\n Package             Architecture   Version                         Repository           Size\n${bar}\nInstalling:\n${todo.map(n => ` ${n.padEnd(20)}x86_64         ${rpmVer(ctx, n).padEnd(32)}${repo.padEnd(21)}${PKGS[n].size}`).join('\n')}\n\nTransaction Summary\n${bar}\nInstall  ${todo.length} Package${todo.length > 1 ? 's' : ''}\n\nTotal download size: ${PKGS[todo[0]].size}\nInstalled size: ${UI.int(2, 9)}.${UI.int(1, 9)} M`);
      if (!yes && !/^y/i.test((await ask('Is this ok [y/N]: ')).trim())) { ctx.out('Operation aborted.'); return 1; }
      ctx.out('Downloading Packages:');
      for (const n of todo) { ctx.out(`(1/${todo.length}): ${n}-${rpmVer(ctx, n)}.x86_64.rpm          ${UI.int(1, 9)}.${UI.int(0, 9)} MB/s | ${PKGS[n].size}     00:00`); await sleep(300); }
      ctx.out('Running transaction check\nTransaction check succeeded.\nRunning transaction test\nTransaction test succeeded.\nRunning transaction');
      for (const n of todo) { ctx.out(`  Installing       : ${n}-${rpmVer(ctx, n)}.x86_64`); installPkg(ctx.h, n, false); await sleep(250); ctx.out(`  Verifying        : ${n}-${rpmVer(ctx, n)}.x86_64`); }
      ctx.out(`\nInstalled:\n  ${todo.map(n => `${n}-${rpmVer(ctx, n)}.x86_64`).join('  ')}\n\nComplete!`);
      if (todo.some(n => PKGS[n].svc)) ctx.html(`<span class="c-dim">(no Amazon Linux/RHEL o serviço NÃO inicia sozinho: use <b>sudo systemctl enable --now ${PKGS[todo.find(n => PKGS[n].svc)].svc}</b>)</span>`, '');
      L().events.pkg = true;
      return 0;
    }
    ctx.err(`No such command: ${sub}. Please use /usr/bin/dnf --help`); return 1;
  }

  const rpmVer = (ctx, n) => ctx.h.distro === 'amzn' ? PKGS[n].ver.rhel.replace('el9', 'amzn2023.0.4') : PKGS[n].ver.rhel;

  function installPkg(h, n, autostart) {
    h.pkgs[n] = true;
    const p = PKGS[n];
    if (p.svc) h.svcs[p.svc] = { active: autostart, enabled: autostart, since: Date.now() };
    const mk = (path, data) => { const [dir, name] = split(path); ensureDir(h, dir); const dn = getNode(h, dir); if (!dn.c[name]) dn.c[name] = F('root', 0o644, data); };
    const deb = DISTROS[h.distro].family === 'debian';
    if (n === 'nginx') {
      mk('/etc/nginx/nginx.conf', `user ${deb ? 'www-data' : 'nginx'};\nworker_processes auto;\n\nevents {\n    worker_connections 768;\n}\n\nhttp {\n    include /etc/nginx/mime.types;\n    server {\n        listen 80 default_server;\n        root ${deb ? '/var/www/html' : '/usr/share/nginx/html'};\n        index index.html index.nginx-debian.html;\n    }\n}\n`);
      if (deb) mk('/var/www/html/index.nginx-debian.html', NGINX_PAGE); else mk('/usr/share/nginx/html/index.html', NGINX_PAGE);
    }
    if (n === 'apache2') mk('/var/www/html/index.html', '<html><body><h1>Apache2 Default Page</h1><p>It works!</p></body></html>\n');
    if (n === 'httpd') mk('/var/www/html/index.html', '<html><body><h1>It works!</h1><p>Apache HTTP Server Test Page</p></body></html>\n');
  }
  function ensureDir(h, abs) {
    let n = h.fs;
    for (const x of abs.split('/').filter(Boolean)) { if (!n.c[x]) n.c[x] = D('root', 0o755); n = n.c[x]; }
  }
  const NGINX_PAGE = '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and\nworking. Further configuration is required.</p>\n\n<p><em>Thank you for using nginx.</em></p>\n</body>\n</html>\n';

  function systemctlCmd(a, ctx) {
    const args = a.filter(x => !x.startsWith('-'));
    const now = a.includes('--now');
    const [act, raw] = args;
    if (!act) { ctx.out('  UNIT                    LOAD   ACTIVE SUB     DESCRIPTION\n' + Object.entries(ctx.h.svcs).map(([s, st]) => `  ${(s + '.service').padEnd(23)} loaded ${st.active ? 'active   running' : 'inactive dead   '} ${SVC_DESC[s] || s}`).join('\n')); return 0; }
    if (act === 'list-units') return systemctlCmd([], ctx);
    if (!raw) { ctx.err(`Too few arguments.`); return 1; }
    const name = svcName(ctx, raw);
    const st = ctx.h.svcs[name];
    if (!st) { ctx.err(act === 'status' ? `Unit ${name}.service could not be found.` : `Failed to ${act} ${name}.service: Unit ${name}.service not found.`); return act === 'status' ? 4 : 5; }
    if (act === 'status') {
      const ago = Math.max(1, Math.round((Date.now() - st.since) / 60000));
      const dot = st.active ? '<b class="c-g">●</b>' : '○';
      const preset = DISTROS[ctx.h.distro].family === 'debian' ? 'enabled' : 'disabled';
      ctx.html(`${dot} ${name}.service - ${esc(SVC_DESC[name] || name)}
     Loaded: loaded (/usr/lib/systemd/system/${name}.service; ${st.enabled ? 'enabled' : 'disabled'}; preset: ${preset})
     Active: ${st.active ? `<b class="c-g">active (running)</b> since ${new Date(st.since).toUTCString().replace('GMT', 'UTC')}; ${ago}min ago` : 'inactive (dead)'}
${st.active ? `   Main PID: ${UI.int(400, 1300)} (${name})
      Tasks: ${UI.int(2, 5)} (limit: 1130)
     Memory: ${UI.int(2, 9)}.${UI.int(1, 9)}M
     CGroup: /system.slice/${name}.service` : ''}`, `${name}.service ${st.active ? 'active (running)' : 'inactive (dead)'}`);
      return st.active ? 0 : 3;
    }
    if (act === 'is-active') { ctx.out(st.active ? 'active' : 'inactive'); return st.active ? 0 : 3; }
    if (act === 'is-enabled') { ctx.out(st.enabled ? 'enabled' : 'disabled'); return st.enabled ? 0 : 1; }
    if (!ctx.root) { ctx.err(`Failed to ${act} ${name}.service: Interactive authentication required.\nSee system logs and 'systemctl status ${name}.service' for details.`); ctx.html('<span class="c-dim">dica do lab: gerenciar serviços exige root — use <b>sudo</b>.</span>', ''); return 1; }
    if (act === 'start' || act === 'restart' || act === 'reload') { st.active = true; st.since = Date.now(); }
    else if (act === 'stop') st.active = false;
    else if (act === 'enable') { st.enabled = true; ctx.out(`Created symlink /etc/systemd/system/multi-user.target.wants/${name}.service → /usr/lib/systemd/system/${name}.service.`); if (now) { st.active = true; st.since = Date.now(); } }
    else if (act === 'disable') { st.enabled = false; ctx.out(`Removed "/etc/systemd/system/multi-user.target.wants/${name}.service".`); if (now) st.active = false; }
    else { ctx.err(`Unknown command verb ${act}.`); return 1; }
    return 0;
  }

  // ---------- rede ----------
  const INTERNET = { 'google.com': '142.250.79.46', 'www.google.com': '142.250.79.46', 'amazon.com': '52.94.236.248', 'aws.amazon.com': '18.238.4.84', 'oracle.com': '138.1.33.162', 'github.com': '20.201.28.151', 'cloudflare.com': '104.16.132.229', '8.8.8.8': '8.8.8.8', '1.1.1.1': '1.1.1.1', 'example.com': '93.184.215.14' };
  function allTargets() { return [...AWS.targets(), ...OCI.targets(), ...GCP.targets()]; }
  function resolve(name, ctx) {
    if (['localhost', '127.0.0.1', '::1', ctx.h.hostname].includes(name)) return { kind: 'self', ip: '127.0.0.1', key: ctx.h.key };
    const t = allTargets().find(x => x.ip && (x.ip === name || x.dns === name));
    if (t) return { kind: 'target', ip: t.ip, t, key: `${t.provider}:${t.id}` };
    if (INTERNET[name]) return { kind: 'internet', ip: INTERNET[name] };
    if (/^\d+\.\d+\.\d+\.\d+$/.test(name)) return { kind: 'void', ip: name };
    return null;
  }

  function serveHttp(h, path) {
    if (!h) return { refused: true };
    const web = ['nginx', 'apache2', 'httpd'].find(s => h.svcs[s] && h.svcs[s].active);
    if (!web) return { refused: true };
    const roots = web === 'nginx' && DISTROS[h.distro].family !== 'debian' ? ['/usr/share/nginx/html'] : ['/var/www/html'];
    const p = path === '/' || !path ? null : path;
    for (const r of roots) {
      const files = p ? [r + p] : [r + '/index.html', r + '/index.nginx-debian.html'];
      for (const f of files) { const n = getNode(h, f); if (n && n.t === 'f') return { status: 200, body: n.d, server: web, ubuntu: DISTROS[h.distro].id === 'ubuntu' }; }
    }
    return { status: 404, body: `<html>\n<head><title>404 Not Found</title></head>\n<body>\n<center><h1>404 Not Found</h1></center>\n<hr><center>${web}</center>\n</body>\n</html>\n`, server: web };
  }

  async function httpCmd(a, ctx, tool) {
    const head = a.includes('-I') || a.includes('--head');
    const outFile = a.includes('-o') ? a[a.indexOf('-o') + 1] : null;
    const raw = a.find((x, i) => !x.startsWith('-') && a[i - 1] !== '-o');
    if (!raw) { ctx.err(tool === 'curl' ? "curl: try 'curl --help' or 'curl --manual' for more information" : 'wget: missing URL'); return 2; }
    let url;
    try { url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'http://' + raw); } catch (e) { ctx.err(`curl: (3) URL rejected: Malformed input to a URL function`); return 3; }
    const hostName = url.hostname;
    const port = url.port ? +url.port : url.protocol === 'https:' ? 443 : 80;
    let res;
    if (hostName === 'checkip.amazonaws.com' || hostName === 'ifconfig.me' || hostName === 'api.ipify.org') res = { status: 200, body: (ctx.h.ip || MY_IP) + '\n' };
    else if (/\.s3-website[.-]/.test(hostName) || /\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(hostName) || hostName === 'storage.googleapis.com' || /objectstorage\./.test(hostName)) res = cloudObject(url);
    else {
      const r = resolve(hostName, ctx);
      if (!r) { ctx.err(`curl: (6) Could not resolve host: ${hostName}`); return 6; }
      if (r.kind === 'internet') res = { status: 200, body: `<!doctype html><html><head><title>${hostName}</title></head><body>(página simulada de ${hostName} — o laboratório não acessa a internet real)</body></html>\n` };
      else if (r.kind === 'void' || (r.kind === 'target' && (!r.t.running || !r.t.allows('TCP', port)))) {
        await sleep(2500);
        ctx.err(`curl: (28) Failed to connect to ${hostName} port ${port} after 21003 ms: Timeout was reached`);
        if (r.kind === 'target') ctx.html(`<span class="c-dim">dica do lab: ${r.t.running ? `a porta ${port} não está liberada no firewall da nuvem (security group / security list / firewall rule).` : 'a instância não está em execução.'}</span>`, '');
        return 28;
      } else {
        const h = r.kind === 'self' ? ctx.h : L().hosts[r.key];
        res = port === 80 || port === 8080 ? serveHttp(h, url.pathname) : { refused: true };
        if (res.refused) {
          ctx.err(`curl: (7) Failed to connect to ${hostName} port ${port} after 0 ms: Couldn't connect to server`);
          ctx.html(`<span class="c-dim">dica do lab: nada está escutando na porta ${port}. Instale/inicie um servidor web (nginx) ${r.kind === 'self' ? 'nesta máquina' : 'na instância'}.</span>`, '');
          return 7;
        }
        if (r.kind === 'self' && res.status === 200) L().events.curlLocal = true;
        if (r.kind === 'target' && res.status === 200) L().events.curlRemote = true;
      }
    }
    if (tool === 'wget' || outFile) {
      const name = outFile || (url.pathname.split('/').pop() || 'index.html');
      ctx.out(`--${new Date().toISOString().slice(0, 19).replace('T', ' ')}--  ${url.href}\nConnecting to ${hostName}... connected.\nHTTP request sent, awaiting response... ${res.status} ${res.status === 200 ? 'OK' : res.status === 403 ? 'Forbidden' : 'Not Found'}`);
      if (res.status !== 200) { ctx.out(`${new Date().toISOString().slice(0, 19).replace('T', ' ')} ERROR ${res.status}.`); return 8; }
      const e = writeFile(ctx.h, ctx.p(name), res.body, ctx);
      if (e) { ctx.err(`${name}: Permission denied`); return 3; }
      ctx.out(`Saving to: '${name}'\n\n'${name}' saved [${res.body.length}/${res.body.length}]`);
      return 0;
    }
    if (head) { ctx.out(`HTTP/1.1 ${res.status} ${res.status === 200 ? 'OK' : res.status === 403 ? 'Forbidden' : 'Not Found'}\nServer: ${res.server === 'nginx' ? `nginx/1.24.0${res.ubuntu ? ' (Ubuntu)' : ''}` : res.server || 'AmazonS3'}\nDate: ${new Date().toUTCString()}\nContent-Type: text/html\nContent-Length: ${res.body.length}\nConnection: keep-alive`); return 0; }
    ctx.out(res.body.replace(/\n$/, ''));
    return 0;
  }

  function cloudObject(url) {
    const h = url.hostname;
    const xmlErr = (code, msg) => ({ status: 403, body: `<?xml version="1.0" encoding="UTF-8"?>\n<Error><Code>${code}</Code><Message>${msg}</Message></Error>` });
    if (/\.s3-website[.-]/.test(h) || /\.s3\.[a-z0-9-]+\.amazonaws\.com$/.test(h)) {
      const name = h.split(/\.s3[.-]/)[0];
      const b = AWS.cli.bucket(name);
      if (!b) return { status: 404, body: `<html><body><h1>404 Not Found</h1><ul><li>Code: NoSuchBucket</li><li>BucketName: ${name}</li></ul></body></html>` };
      const website = /s3-website/.test(h);
      if (website && !b.website) return { status: 404, body: `<html><body><h1>404 Not Found</h1><ul><li>Code: NoSuchWebsiteConfiguration</li><li>BucketName: ${name}</li></ul></body></html>` };
      if (!AWS.cli.bucketPublic(b)) return website ? { status: 403, body: `<html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><ul><li>Code: AccessDenied</li><li>Message: Access Denied</li></ul></body></html>` } : xmlErr('AccessDenied', 'Access Denied');
      let key = decodeURIComponent(url.pathname.slice(1));
      if (website && (!key || key.endsWith('/'))) key += b.website.index;
      const o = b.objects.find(x => x.key === key);
      if (!o) return { status: 404, body: website ? '<html><body><h1>404 Not Found</h1><ul><li>Code: NoSuchKey</li></ul></body></html>' : xmlErr('NoSuchKey', 'The specified key does not exist.') };
      return { status: 200, body: o.content != null ? o.content : `(conteúdo binário de ${o.key}, ${o.size} bytes)` };
    }
    if (h === 'storage.googleapis.com') return GCP.cli.publicObject(url);
    return OCI.cli.publicObject(url);
  }

  async function sshCmd(a, ctx) {
    let key = null, port = 22, dest = null;
    for (let i = 0; i < a.length; i++) {
      if (a[i] === '-i') key = a[++i];
      else if (a[i] === '-p') port = +a[++i];
      else if (a[i] === '-o') i++;
      else if (!a[i].startsWith('-')) { dest = a[i]; break; }
    }
    if (!dest) { ctx.out('usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] [-i identity_file] [-p port]\n           destination [command]'); return 255; }
    const [u, hostName] = dest.includes('@') ? dest.split('@') : [ctx.user, dest];
    const r = resolve(hostName, ctx);
    if (!r) { ctx.err(`ssh: Could not resolve hostname ${hostName}: Name or service not known`); return 255; }
    if (r.kind === 'self') { ctx.err(`ssh: connect to host ${hostName} port ${port}: Connection refused`); return 255; }
    if (r.kind !== 'target') { await sleep(2500); ctx.err(`ssh: connect to host ${hostName} port ${port}: Connection timed out`); return 255; }
    const t = r.t;
    if (!t.running || !t.allows('TCP', port) || t.distro === 'windows') {
      for (let i = 0; i < 25 && !abort; i++) await sleep(100);
      ctx.err(`ssh: connect to host ${hostName} port ${port}: Connection timed out`);
      ctx.html(`<span class="c-dim">dica do lab: ${!t.running ? 'a instância não está em execução (Running).' : t.distro === 'windows' ? 'instâncias Windows não aceitam SSH por padrão — use RDP.' : `o firewall da nuvem não libera a porta ${port} para o seu IP (${MY_IP}).`}</span>`, '');
      return 255;
    }
    // known_hosts
    const kh = ctx.home + '/.ssh/known_hosts';
    const khNode = getNode(ctx.h, kh);
    if (!khNode || !khNode.d.includes(t.ip)) {
      ctx.out(`The authenticity of host '${hostName} (${t.ip})' can't be established.\nED25519 key fingerprint is SHA256:${UI.rand(43, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')}.\nThis key is not known by any other names.`);
      let ans = (await ask('Are you sure you want to continue connecting (yes/no/[fingerprint])? ')).trim().toLowerCase();
      while (ans !== 'yes' && ans !== 'no') ans = (await ask("Please type 'yes', 'no' or the fingerprint: ")).trim().toLowerCase();
      if (ans === 'no') { ctx.err('Host key verification failed.'); return 255; }
      if (!getNode(ctx.h, ctx.home + '/.ssh')) CMDS.mkdir(['-p', ctx.home + '/.ssh'], ctx);
      writeFile(ctx.h, kh, `${t.ip} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${UI.rand(30, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz')}\n`, ctx, true);
      ctx.out(`Warning: Permanently added '${hostName}' (ED25519) to the list of known hosts.`);
    }
    const denied = () => { ctx.err(`${u}@${hostName}: Permission denied (publickey${t.provider === 'aws' ? ',gssapi-keyex,gssapi-with-mic' : ''}).`); return 255; };
    if (t.provider === 'gcp') {
      denied();
      ctx.html('<span class="c-dim">dica do lab: no Google Cloud a chave precisa estar nos metadados da VM. Use <b>gcloud compute ssh NOME --zone ZONA</b> ou o botão SSH do console.</span>', '');
      return 255;
    }
    if (!key) {
      denied();
      ctx.html(`<span class="c-dim">dica do lab: informe a chave privada com <b>-i</b>, ex.: <b>ssh -i ~/Downloads/${esc(t.keyName || 'chave')}.pem ${esc(t.users[0])}@${esc(t.ip)}</b></span>`, '');
      return 255;
    }
    const kn = getNode(ctx.h, ctx.p(key));
    if (!kn || kn.t !== 'f') { ctx.out(`Warning: Identity file ${key} not accessible: No such file or directory.`); return denied(); }
    if (kn.m & 0o077) {
      ctx.html(`<span class="c-err">@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@</span>
Permissions 0${(kn.m & 0o777).toString(8)} for '${esc(key)}' are too open.
It is required that your private key files are NOT accessible by others.
This private key will be ignored.
Load key "${esc(key)}": bad permissions`, 'UNPROTECTED PRIVATE KEY FILE');
      denied();
      ctx.html(`<span class="c-dim">dica do lab: proteja a chave com <b>chmod 400 ${esc(key)}</b></span>`, '');
      return 255;
    }
    if (!t.keyMaterial || !kn.d.includes(t.keyMaterial)) { denied(); ctx.html('<span class="c-dim">dica do lab: esta não é a chave usada para criar a instância.</span>', ''); return 255; }
    if (!t.users.includes(u)) { denied(); ctx.html(`<span class="c-dim">dica do lab: o usuário padrão desta imagem é <b>${esc(t.users[0])}</b>.</span>`, ''); return 255; }
    connectTo(t, u, ctx);
    return 0;
  }

  function hostFor(t, u) {
    const key = `${t.provider}:${t.id}`;
    const h = L().hosts[key] || makeHost(key, {
      distro: t.distro, user: u, hostname: t.hostname, ip: t.ip, privateIp: t.privateIp,
      authorized: 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ' + UI.rand(40, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz') + ' ' + (t.keyName || 'key'),
      pkgs: t.provider === 'aws' && t.distro === 'amzn' ? ['awscli'] : t.provider === 'gcp' ? ['gcloud'] : [],
    });
    h.ip = t.ip;
    if (!h.users[u]) { h.users[u] = { uid: 1001, home: `/home/${u}` }; h.fs.c.home.c[u] = D(u, 0o750, { '.ssh': D(u, 0o700) }); }
    return h;
  }

  function banner(t, h) {
    const d = DISTROS[h.distro];
    const last = `Last login: ${new Date(Date.now() - 3e5).toString().slice(0, 24)} from ${MY_IP}`;
    if (h.distro === 'amzn') return `   ,     #_\n   ~\\_  ####_        Amazon Linux 2023\n  ~~  \\_#####\\\n  ~~     \\###|\n  ~~       \\#/ ___   https://aws.amazon.com/linux/amazon-linux-2023\n   ~~       V~' '->\n    ~~~         /\n      ~~._.   _/\n         _/ _/\n       _/m/'\n${last}`;
    if (d.id === 'debian') return `Linux ${h.hostname} ${d.kernel} #1 SMP PREEMPT_DYNAMIC Debian x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
${last}`;
    if (d.family === 'debian') return `Welcome to ${d.name} (GNU/Linux ${d.kernel} x86_64)\n\n * Documentation:  https://help.ubuntu.com\n * Management:     https://landscape.canonical.com\n\n  System information as of ${new Date().toUTCString()}\n\n  System load:  0.08              Processes:             104\n  Usage of /:   24.9% of 6.71GB   Users logged in:       0\n  Memory usage: 21%               IPv4 address for ens5: ${t.privateIp}\n\n${last}`;
    return `${last}\n[${d.name}]`;
  }

  function connectTo(t, u, ctx, via) {
    const h = hostFor(t, u);
    if (via) printHtml(`<span class="c-dim">— ${esc(via)}: conectado a ${esc(t.name)} (${esc(t.ip || '')}) como ${esc(u)} —</span>`);
    const text = banner(t, h);
    if (ctx) ctx.out(text); else print(text);
    stack.push({ key: h.key, user: u, cwd: h.users[u].home, via: via || 'ssh', target: t.ip, tid: t.id, provider: t.provider });
    L().events['ssh_' + t.provider] = true;
    Store.commit();
  }

  /** Conexão direta pelo navegador (EC2 Instance Connect / SSH-in-browser do GCP) */
  function connect({ provider, id, user, via }) {
    const t = allTargets().find(x => x.provider === provider && x.id === id);
    if (!t) return;
    App.switchTab('linux');
    while (stack.length > 1) stack.pop();
    connectTo(t, user, null, via);
    updatePrompt();
    input.focus();
  }

  // ---------- AWS CLI ----------
  async function awsCmd(a, ctx) {
    const C = AWS.cli;
    const [svc, op, ...rest] = a.filter(x => x !== '--no-cli-pager');
    if (!svc || svc === 'help') { ctx.out('usage: aws [options] <command> <subcommand> [<subcommand> ...] [parameters]\n\nNo laboratório:\n  aws configure | aws configure list\n  aws sts get-caller-identity\n  aws s3 ls | mb | rb | cp | rm\n  aws ec2 describe-instances | start-instances | stop-instances\n  aws iam list-users'); return 0; }
    if (svc === '--version') { ctx.out('aws-cli/2.17.18 Python/3.11.9 Linux/6.8.0 exe/x86_64.ubuntu.24'); return 0; }
    const credPath = ctx.home + '/.aws/credentials', cfgPath = ctx.home + '/.aws/config';
    const ini = path => { const n = getNode(ctx.h, path); const o = {}; if (!n) return o; let sec = null; for (const l of n.d.split('\n')) { const m = l.match(/^\[(.+)\]$/); if (m) { sec = m[1].replace(/^profile /, ''); o[sec] = {}; } else if (sec && l.includes('=')) { const [k, ...vv] = l.split('='); o[sec][k.trim()] = vv.join('=').trim(); } } return o; };
    if (svc === 'configure') {
      const cur = (ini(credPath).default) || {};
      const cfg = (ini(cfgPath).default) || {};
      if (op === 'list') { ctx.out(`      Name                    Value             Type    Location\n      ----                    -----             ----    --------\n   profile                <not set>             None    None\naccess_key     ${cur.aws_access_key_id ? '****************' + cur.aws_access_key_id.slice(-4) : '<not set>'}  ${cur.aws_access_key_id ? 'shared-credentials-file' : 'None'}\nsecret_key     ${cur.aws_secret_access_key ? '****************' + cur.aws_secret_access_key.slice(-4) : '<not set>'}  ${cur.aws_secret_access_key ? 'shared-credentials-file' : 'None'}\n    region                ${cfg.region || '<not set>'}      ${cfg.region ? 'config-file' : 'None'}    ${cfg.region ? '~/.aws/config' : ''}`); return 0; }
      const mask = s => s ? '****************' + s.slice(-4) : 'None';
      const id = (await ask(`AWS Access Key ID [${mask(cur.aws_access_key_id)}]: `)).trim() || cur.aws_access_key_id || '';
      const sec = (await ask(`AWS Secret Access Key [${mask(cur.aws_secret_access_key)}]: `)).trim() || cur.aws_secret_access_key || '';
      const reg = (await ask(`Default region name [${cfg.region || 'None'}]: `)).trim() || cfg.region || '';
      const fmt = (await ask(`Default output format [${cfg.output || 'None'}]: `)).trim() || cfg.output || '';
      if (!getNode(ctx.h, ctx.home + '/.aws')) CMDS.mkdir(['-p', ctx.home + '/.aws'], { ...ctx, root: true });
      getNode(ctx.h, ctx.home + '/.aws').o = ctx.user;
      writeFile(ctx.h, credPath, `[default]\naws_access_key_id = ${id}\naws_secret_access_key = ${sec}\n`, ctx);
      writeFile(ctx.h, cfgPath, `[default]\n${reg ? `region = ${reg}\n` : ''}${fmt ? `output = ${fmt}\n` : ''}`, ctx);
      getNode(ctx.h, credPath).m = 0o600;
      return 0;
    }
    const creds = ini(credPath).default || {};
    const region = (a.includes('--region') ? a[a.indexOf('--region') + 1] : (ini(cfgPath).default || {}).region) || 'us-east-1';
    if (!creds.aws_access_key_id) { ctx.err('\nUnable to locate credentials. You can configure credentials by running "aws configure".'); return 253; }
    const found = C.findKey(creds.aws_access_key_id);
    const opName = { 'get-caller-identity': 'GetCallerIdentity', ls: 'ListObjectsV2', mb: 'CreateBucket', rb: 'DeleteBucket', cp: 'PutObject', rm: 'DeleteObject', 'describe-instances': 'DescribeInstances', 'start-instances': 'StartInstances', 'stop-instances': 'StopInstances', 'terminate-instances': 'TerminateInstances', 'list-users': 'ListUsers' }[op] || op;
    if (!found || found.key.status !== 'Active') { ctx.err(`\nAn error occurred (InvalidClientTokenId) when calling the ${opName} operation: The security token included in the request is invalid.`); return 254; }
    if (found.key.secret !== creds.aws_secret_access_key) { ctx.err(`\nAn error occurred (SignatureDoesNotMatch) when calling the ${opName} operation: The request signature we calculated does not match the signature you provided. Check your AWS Secret Access Key and signing method.`); return 254; }
    const u = found.user;
    found.key.lastUsed = Date.now(); u.lastActivity = Date.now();
    const arn = `arn:aws:iam::${C.acct()}:user/${u.name}`;
    const can = (action, resource, apiName, ec2) => {
      const r = C.authorize(u.name, action, resource);
      if (r.decision === 'allowed') return true;
      const why = r.decision === 'explicitDeny' ? `with an explicit deny in an identity-based policy` : `because no identity-based policy allows the ${action} action`;
      ctx.err(ec2 ? `\nAn error occurred (UnauthorizedOperation) when calling the ${apiName} operation: You are not authorized to perform this operation. User: ${arn} is not authorized to perform: ${action} ${why}` : `\nAn error occurred (AccessDenied) when calling the ${apiName} operation: User: ${arn} is not authorized to perform: ${action} on resource: "${resource}" ${why}`);
      ctx.html(`<span class="c-dim">dica do lab: anexe uma política ao usuário <b>${esc(u.name)}</b> no IAM (ou teste no Policy simulator).</span>`, '');
      return false;
    };
    const json = o => ctx.out(JSON.stringify(o, null, 4));
    if (svc === 'sts' && op === 'get-caller-identity') { json({ UserId: 'AIDA' + creds.aws_access_key_id.slice(4, 20), Account: C.acct(), Arn: arn }); return 0; }
    if (svc === 's3') {
      const s3p = x => { const m = /^s3:\/\/([^/]+)\/?(.*)$/.exec(x || ''); return m ? { b: m[1], k: m[2] } : null; };
      if (op === 'ls') {
        const p = s3p(rest[0]);
        if (!p) { if (!can('s3:ListAllMyBuckets', '*', 'ListBuckets')) return 254; C.s().buckets.forEach(b => ctx.out(`${UI.iso(b.created)} ${b.name}`)); L().events.awsCli = true; return 0; }
        const b = C.bucket(p.b);
        if (!b) { ctx.err(`\nAn error occurred (NoSuchBucket) when calling the ListObjectsV2 operation: The specified bucket does not exist`); return 254; }
        if (!can('s3:ListBucket', `arn:aws:s3:::${b.name}`, 'ListObjectsV2')) return 254;
        const prefix = p.k && !p.k.endsWith('/') ? p.k + '/' : p.k;
        C.listPrefix(b, prefix).forEach(r => ctx.out(r.folder ? `                           PRE ${r.name}` : `${UI.iso(r.o.modified)} ${String(r.o.size).padStart(10)} ${r.name}`));
        L().events.awsCli = true;
        return 0;
      }
      if (op === 'mb') {
        const p = s3p(rest[0]);
        if (!p) { ctx.err('\naws: error: the following arguments are required: path'); return 252; }
        if (!can('s3:CreateBucket', `arn:aws:s3:::${p.b}`, 'CreateBucket')) return 254;
        const e = C.bucketNameError(p.b);
        if (e) { ctx.err(`make_bucket failed: s3://${p.b} An error occurred (${/exists/.test(e) ? 'BucketAlreadyExists' : 'InvalidBucketName'}) when calling the CreateBucket operation: ${/exists/.test(e) ? 'The requested bucket name is not available. The bucket namespace is shared by all users of the system. Please select a different name and try again.' : 'The specified bucket is not valid.'}`); return 1; }
        C.createBucket(p.b, region); Store.commit(); ctx.out(`make_bucket: ${p.b}`); return 0;
      }
      if (op === 'rb') {
        const p = s3p(rest[0]); const b = p && C.bucket(p.b);
        if (!b) { ctx.err(`remove_bucket failed: ${rest[0]} An error occurred (NoSuchBucket) when calling the DeleteBucket operation: The specified bucket does not exist`); return 1; }
        if (!can('s3:DeleteBucket', `arn:aws:s3:::${b.name}`, 'DeleteBucket')) return 254;
        if (b.objects.length && !rest.includes('--force')) { ctx.err(`remove_bucket failed: s3://${b.name} An error occurred (BucketNotEmpty) when calling the DeleteBucket operation: The bucket you tried to delete is not empty`); return 1; }
        C.s().buckets = C.s().buckets.filter(x => x !== b); Store.commit(); ctx.out(`remove_bucket: ${b.name}`); return 0;
      }
      if (op === 'cp') {
        const [src, dst] = rest.filter(x => !x.startsWith('--'));
        const ps = s3p(src), pd = s3p(dst);
        if (!src || !dst) { ctx.err('\naws: error: the following arguments are required: paths'); return 252; }
        if (!ps && pd) {
          const n = getNode(ctx.h, ctx.p(src));
          if (!n || n.t !== 'f') { ctx.err(`\nThe user-provided path ${src} does not exist.`); return 255; }
          const b = C.bucket(pd.b);
          if (!b) { ctx.err(`upload failed: ${src} to ${dst} An error occurred (NoSuchBucket) when calling the PutObject operation: The specified bucket does not exist`); return 1; }
          const key = !pd.k || pd.k.endsWith('/') ? pd.k + split(ctx.p(src))[1] : pd.k;
          if (!can('s3:PutObject', `arn:aws:s3:::${b.name}/${key}`, 'PutObject')) return 1;
          C.putObject(b, key, n.d, n.d.length); Store.commit();
          ctx.out(`upload: ${src} to s3://${b.name}/${key}`); return 0;
        }
        if (ps && !pd) {
          const b = C.bucket(ps.b); const o = b && b.objects.find(x => x.key === ps.k);
          if (!o) { ctx.err(`fatal error: An error occurred (404) when calling the HeadObject operation: Key "${ps.k}" does not exist`); return 1; }
          if (!can('s3:GetObject', `arn:aws:s3:::${b.name}/${o.key}`, 'GetObject')) return 1;
          let target = ctx.p(dst);
          const dn = getNode(ctx.h, target); if (dn && dn.t === 'd') target += '/' + o.key.split('/').pop();
          const e = writeFile(ctx.h, target, o.content != null ? o.content : '', ctx);
          if (e) { ctx.err(`download failed: ${e}`); return 1; }
          ctx.out(`download: s3://${b.name}/${o.key} to ${dst}`); return 0;
        }
        ctx.err('\nNo laboratório, use cp entre arquivo local e s3:// (upload ou download).'); return 252;
      }
      if (op === 'rm') {
        const p = s3p(rest[0]); const b = p && C.bucket(p.b);
        if (!b) { ctx.err('delete failed: bucket does not exist'); return 1; }
        if (!can('s3:DeleteObject', `arn:aws:s3:::${b.name}/${p.k}`, 'DeleteObject')) return 1;
        b.objects = b.objects.filter(o => o.key !== p.k); Store.commit(); ctx.out(`delete: s3://${b.name}/${p.k}`); return 0;
      }
      ctx.err(`\naws s3: comando '${op}' não suportado no laboratório (use ls, mb, rb, cp, rm).`); return 252;
    }
    if (svc === 'ec2') {
      const ids = rest.includes('--instance-ids') ? rest.slice(rest.indexOf('--instance-ids') + 1).filter(x => !x.startsWith('--')) : [];
      if (op === 'describe-instances') {
        if (!can('ec2:DescribeInstances', '*', 'DescribeInstances', true)) return 254;
        const list = C.instances().filter(i => i.region === region && (!ids.length || ids.includes(i.id)));
        json({ Reservations: list.map(i => ({ ReservationId: 'r-0' + i.id.slice(3, 19), OwnerId: C.acct(), Instances: [{ InstanceId: i.id, ImageId: i.ami, InstanceType: i.type, KeyName: i.key || undefined, LaunchTime: new Date(i.launched).toISOString(), Placement: { AvailabilityZone: i.az }, PrivateIpAddress: i.privateIp, PublicIpAddress: i.publicIp || undefined, State: { Code: { pending: 0, running: 16, 'shutting-down': 32, terminated: 48, stopping: 64, stopped: 80 }[i.state], Name: i.state }, Tags: i.name ? [{ Key: 'Name', Value: i.name }] : [] }] })) });
        if (!list.length) ctx.html(`<span class="c-dim">(nenhuma instância na região ${esc(region)} — confira a região com aws configure list)</span>`, '');
        return 0;
      }
      const act = { 'start-instances': ['ec2:StartInstances', 'start', 'StartingInstances'], 'stop-instances': ['ec2:StopInstances', 'stop', 'StoppingInstances'], 'terminate-instances': ['ec2:TerminateInstances', 'terminate', 'TerminatingInstances'] }[op];
      if (act) {
        if (!ids.length) { ctx.err('\naws: error: the following arguments are required: --instance-ids'); return 252; }
        if (!can(act[0], `arn:aws:ec2:${region}:${C.acct()}:instance/${ids[0]}`, opName, true)) return 254;
        const list = C.instances().filter(i => ids.includes(i.id));
        const bad = ids.find(id => !list.some(i => i.id === id));
        if (bad) { ctx.err(`\nAn error occurred (InvalidInstanceID.NotFound) when calling the ${opName} operation: The instance ID '${bad}' does not exist`); return 254; }
        const prev = list.map(i => i.state);
        C.setInstState(ids, act[1]);
        json({ [act[2]]: list.map((i, k) => ({ InstanceId: i.id, CurrentState: { Name: i.state }, PreviousState: { Name: prev[k] } })) });
        return 0;
      }
    }
    if (svc === 'iam' && op === 'list-users') {
      if (!can('iam:ListUsers', `arn:aws:iam::${C.acct()}:user/`, 'ListUsers')) return 254;
      json({ Users: C.s().iam.users.map(x => ({ Path: '/', UserName: x.name, UserId: 'AIDA' + UI.rand(16, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'), Arn: `arn:aws:iam::${C.acct()}:user/${x.name}`, CreateDate: new Date(x.created).toISOString() })) });
      return 0;
    }
    ctx.err(`\naws: comando '${svc} ${op || ''}' não suportado no laboratório. Digite "aws help".`); return 252;
  }

  // ---------- nano ----------
  function openNano(name, abs, content, ctx) {
    return new Promise(res => {
      nanoHost.innerHTML = `<div class="nano"><div class="nano-top"><span>GNU nano 7.2</span><span class="nano-f">${esc(name)}</span><span class="nano-mod"></span></div><textarea spellcheck="false"></textarea><div class="nano-msg"></div><div class="nano-keys"><span><b>^G</b> Help</span><span><b>^O</b> Write Out</span><span><b>^F</b> Where Is</span><span><b>^K</b> Cut</span><span><b>^X</b> Exit</span><span><b>^R</b> Read File</span><span><b>^\\</b> Replace</span><span><b>^U</b> Paste</span></div></div>`;
      const ta = nanoHost.querySelector('textarea'), msg = nanoHost.querySelector('.nano-msg'), mod = nanoHost.querySelector('.nano-mod');
      ta.value = content; ta.focus();
      let modified = false, confirmExit = false;
      const save = () => {
        const e = writeFile(ctx.h, abs, ta.value.endsWith('\n') || !ta.value ? ta.value : ta.value + '\n', ctx);
        if (e) { msg.textContent = `[ Error writing ${abs}: ${e.split(': ').pop()} ]`; return false; }
        modified = false; mod.textContent = '';
        msg.textContent = `[ Wrote ${ta.value.split('\n').length} line${ta.value.split('\n').length === 1 ? '' : 's'} ]`;
        Store.save();
        return true;
      };
      const close = () => { nanoHost.innerHTML = ''; res(); };
      ta.addEventListener('input', () => { modified = true; mod.textContent = 'Modified'; });
      ta.addEventListener('keydown', e => {
        if (confirmExit) {
          e.preventDefault();
          if (/^[yYsS]$/.test(e.key)) { if (save()) close(); }
          else if (/^[nN]$/.test(e.key)) close();
          else if (e.key === 'Escape' || (e.ctrlKey && e.key === 'c')) { confirmExit = false; msg.textContent = '[ Cancelled ]'; }
          return;
        }
        if (!e.ctrlKey) return;
        const k = e.key.toLowerCase();
        if (k === 'o' || k === 's') { e.preventDefault(); save(); }
        else if (k === 'x') { e.preventDefault(); if (modified) { confirmExit = true; msg.innerHTML = 'Save modified buffer?  <b>Y</b> Yes  <b>N</b> No  <b>^C</b> Cancel'; } else close(); }
        else if (k === 'g') { e.preventDefault(); msg.textContent = 'Ctrl+O salva · Ctrl+X sai · o restante é um editor de texto normal'; }
      });
    });
  }

  // ---------- interface ----------
  const GUIDE = [
    ['Primeiros passos', ['help', 'ls -la', 'cat LEIA-ME.txt', 'pwd', 'cd Documentos', 'cd ~']],
    ['Arquivos', ['mkdir -p ~/projetos/site', 'touch ~/projetos/notas.txt', 'echo "Olá nuvem" > ~/projetos/notas.txt', 'nano ~/projetos/notas.txt', 'tree ~', 'rm -r ~/projetos/site']],
    ['Permissões', ['ls -l ~/Downloads', 'chmod 400 ~/Downloads/*.pem', 'chmod +x script.sh', 'sudo whoami']],
    ['Pacotes e serviços', ['sudo apt update', 'sudo apt install -y nginx', 'systemctl status nginx', 'sudo systemctl restart nginx', 'curl localhost', 'ss -tulpn']],
    ['Rede e SSH', ['ip a', 'ping -c 3 google.com', 'curl checkip.amazonaws.com', 'ssh -i ~/Downloads/CHAVE.pem ec2-user@IP', 'exit']],
    ['AWS CLI', ['aws configure', 'aws sts get-caller-identity', 'aws s3 ls', 'aws s3 mb s3://meu-bucket-unico-123', 'aws s3 cp ~/LEIA-ME.txt s3://BUCKET/', 'aws ec2 describe-instances']],
    ['Google Cloud CLI', ['gcloud projects list', 'gcloud compute instances list', 'gcloud compute ssh NOME --zone ZONA', 'gcloud storage ls']],
  ];

  function renderGuide() {
    guide.innerHTML = `<h3>Guia rápido</h3><p>Clique para colar o comando no terminal.</p>${GUIDE.map(([t, cmds]) => `<h4>${t}</h4>${cmds.map(c => `<button data-cmd="${esc(c)}"><code>${esc(c)}</code></button>`).join('')}`).join('')}
      <div class="lx-sess"><h4>Sessão atual</h4>${stack.map((s, i) => `<div>${i ? '↳ ' : ''}${esc(s.user)}@${esc(L().hosts[s.key].hostname)} <small>${esc(s.via || 'local')}</small></div>`).join('')}</div>`;
  }

  function complete() {
    const val = input.value;
    const pos = input.selectionStart;
    const before = val.slice(0, pos);
    const m = before.match(/(\S*)$/);
    const word = m[1];
    const isCmd = !before.slice(0, before.length - word.length).trim() || /[|;&]\s*$/.test(before.slice(0, before.length - word.length));
    let opts;
    if (isCmd && !word.includes('/')) opts = Object.keys(CMDS).filter(c => c.startsWith(word) && (!BIN_PKG[c] || host().pkgs[BIN_PKG[c]]));
    else {
      const s = sess(); const h = host();
      const home = h.users[s.user] ? h.users[s.user].home : '/home/' + s.user;
      const k = word.lastIndexOf('/');
      const dirPart = k >= 0 ? word.slice(0, k + 1) : '';
      const base = k >= 0 ? word.slice(k + 1) : word;
      const dn = getNode(h, norm(dirPart || '.', s.cwd, home));
      opts = dn && dn.t === 'd' ? Object.entries(dn.c).filter(([n]) => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.'))).map(([n, x]) => dirPart + n + (x.t === 'd' ? '/' : '')) : [];
    }
    if (!opts.length) return;
    if (opts.length === 1) {
      const rep = opts[0] + (isCmd || !opts[0].endsWith('/') ? ' ' : '');
      input.value = before.slice(0, before.length - word.length) + rep + val.slice(pos);
      const np = before.length - word.length + rep.length; input.setSelectionRange(np, np);
      return;
    }
    let pre = opts[0];
    for (const o of opts) while (!o.startsWith(pre)) pre = pre.slice(0, -1);
    if (pre.length > word.length) { input.value = before.slice(0, before.length - word.length) + pre + val.slice(pos); return; }
    printHtml(promptText().html + esc(val));
    print(opts.map(o => o.split('/').filter(Boolean).pop() + (o.endsWith('/') ? '/' : '')).join('  '));
  }

  async function submit() {
    const line = input.value;
    if (asking) {
      const { res, secret } = asking;
      printHtml(promptEl.innerHTML + (secret ? '' : esc(line)));
      asking = null; input.type = 'text'; input.value = '';
      inputLine.style.display = 'none';
      res(line);
      return;
    }
    if (busy) return;
    printHtml(promptText().html + esc(line));
    input.value = ''; histPos = -1;
    if (!line.trim()) return;
    const hist = L().history;
    if (hist[hist.length - 1] !== line) { hist.push(line); if (hist.length > 300) hist.shift(); }
    busy = true; abort = false;
    inputLine.style.display = 'none';
    try { await runLine(line); }
    finally {
      busy = false; abort = false; asking = null;
      inputLine.style.display = '';
      updatePrompt(); renderGuide();
      Store.commit();
      input.focus();
      term.scrollTop = term.scrollHeight;
    }
  }

  function onKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); return; }
    if (e.key === 'Tab') { e.preventDefault(); if (!asking) complete(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'l') { e.preventDefault(); out.innerHTML = ''; return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'c' && !window.getSelection().toString()) {
      e.preventDefault();
      if (busy) { abort = true; print('^C'); if (asking) { const r = asking.res; asking = null; input.type = 'text'; input.value = ''; inputLine.style.display = 'none'; r(''); } }
      else { printHtml(promptText().html + esc(input.value) + '^C'); input.value = ''; }
      return;
    }
    if (asking) return;
    const hist = L().history;
    if (e.key === 'ArrowUp') { e.preventDefault(); if (!hist.length) return; if (histPos === -1) { draft = input.value; histPos = hist.length; } histPos = Math.max(0, histPos - 1); input.value = hist[histPos]; }
    if (e.key === 'ArrowDown') { e.preventDefault(); if (histPos === -1) return; histPos++; if (histPos >= hist.length) { histPos = -1; input.value = draft; } else input.value = hist[histPos]; }
  }

  /** Chamado pelos consoles quando o usuário "baixa" um arquivo (chave .pem, .csv...) */
  function saveDownload(name, content) {
    const h = localHost();
    const dl = getNode(h, '/home/aluno/Downloads') || (h.fs.c.home.c.aluno.c.Downloads = D('aluno', 0o755));
    dl.c[name] = F('aluno', 0o644, content);
    Store.save();
  }

  function tick() {
    // derruba sessões SSH de instâncias que pararam/terminaram
    if (!stack.length) return false;
    const live = allTargets();
    for (let i = 1; i < stack.length; i++) {
      const s = stack[i];
      if (!s.tid) continue;
      const t = live.find(x => x.id === s.tid);
      if (!t || !t.running) {
        const gone = stack.splice(i);
        printHtml(`<span class="c-err">Connection to ${esc(gone[0].target || '')} closed by remote host.</span>\nConnection to ${esc(gone[0].target || '')} closed.`);
        updatePrompt(); renderGuide();
        break;
      }
    }
    return false;
  }

  const api = { ask, sleep, connectTo, getNode, writeFile, split, events: () => L().events, isAbort: () => abort };

  function init(el) {
    root = el;
    root.innerHTML = `<div class="lx-wrap"><div class="lx-window"><div class="lx-titlebar"><div class="lx-tabs"><span class="lx-title"></span></div><div class="lx-btns"><i>–</i><i>□</i><i class="x">×</i></div></div>
      <div class="lx-term" tabindex="-1"><div class="lx-out"></div><div class="lx-line"><span class="lx-prompt"></span><input class="lx-in" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Terminal"></div></div><div class="lx-nano"></div></div>
      <aside class="lx-guide"></aside></div>`;
    out = root.querySelector('.lx-out'); term = root.querySelector('.lx-term'); inputLine = root.querySelector('.lx-line');
    promptEl = root.querySelector('.lx-prompt'); input = root.querySelector('.lx-in'); guide = root.querySelector('.lx-guide');
    titleEl = root.querySelector('.lx-title'); nanoHost = root.querySelector('.lx-nano');
    localHost();
    stack = [{ key: 'local', user: 'aluno', cwd: '/home/aluno', via: 'local' }];
    input.addEventListener('keydown', onKey);
    term.addEventListener('mouseup', () => { if (!window.getSelection().toString()) input.focus(); });
    guide.addEventListener('click', e => { const b = e.target.closest('[data-cmd]'); if (b && !busy) { input.value = b.dataset.cmd; input.focus(); } });
    const d = DISTROS.local;
    printHtml(`Welcome to ${esc(d.name)} (GNU/Linux ${esc(d.kernel)} x86_64) — <b>Cloud Lab</b>\n\n Este é um terminal Linux <b>simulado</b> no seu navegador. Digite <b class="c-y">help</b> para ver os comandos\n ou use o guia ao lado. Leia o arquivo de boas-vindas com <b class="c-y">cat LEIA-ME.txt</b>.\n`);
    updatePrompt(); renderGuide();
  }

  return { init, connect, saveDownload, tick, refresh() { }, onShow() { setTimeout(() => input && input.focus(), 30); renderGuide(); }, DISTROS, api };
})();
