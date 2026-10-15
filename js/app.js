/* Cloud Lab — abas, missões e o "relógio" que avança os estados dos recursos */
'use strict';

const MISSIONS = [
  // AWS
  { tab: 'aws', title: 'Crie um par de chaves (key pair) no EC2', hint: 'EC2 › Key Pairs › Create key pair. O arquivo .pem vai para ~/Downloads no terminal.', check: s => s.aws.keyPairs.length > 0 },
  { tab: 'aws', title: 'Lance uma instância EC2 do Free Tier (t2.micro ou t3.micro)', hint: 'EC2 › Launch instance. Escolha Amazon Linux ou Ubuntu.', check: s => s.aws.instances.some(i => ['t2.micro', 't3.micro'].includes(i.type) && i.state === 'running') },
  { tab: 'aws', title: 'Pare (stop) uma instância e inicie de novo', hint: 'Instance state › Stop, depois Start. Repare que o IP público muda!', check: s => s.aws.instances.some(i => i.restarted) },
  { tab: 'aws', title: 'Crie um bucket S3', hint: 'S3 › Create bucket. O nome precisa ser único no mundo todo.', check: s => s.aws.buckets.length > 0 },
  { tab: 'aws', title: 'Envie (upload) um arquivo para um bucket', hint: 'Abra o bucket › Upload.', check: s => s.aws.buckets.some(b => b.objects.some(o => !o.key.endsWith('/'))) },
  { tab: 'aws', title: 'Crie um usuário IAM dentro de um grupo', hint: 'IAM › User groups › Create group; depois Users › Create user › Add user to group.', check: s => s.aws.iam.users.some(u => u.groups.length > 0) },
  { tab: 'aws', title: 'Dê ao usuário a política AmazonS3ReadOnlyAccess (direto ou via grupo)', hint: 'Use o Policy simulator para confirmar que s3:GetObject é allowed.', check: s => s.aws.iam.users.some(u => u.policies.includes('AmazonS3ReadOnlyAccess') || u.groups.some(g => (s.aws.iam.groups.find(x => x.name === g) || { policies: [] }).policies.includes('AmazonS3ReadOnlyAccess'))) },
  { tab: 'aws', title: 'Crie uma access key e rode "aws s3 ls" no terminal', hint: 'IAM › Users › Security credentials › Create access key; no terminal: aws configure.', check: s => !!s.linux.events.awsCli },
  // Linux
  { tab: 'linux', title: 'Crie a pasta ~/projetos com um arquivo dentro', hint: 'mkdir ~/projetos && echo "oi" > ~/projetos/nota.txt', check: s => { const h = s.linux.hosts.local; const d = h && h.fs.c.home.c.aluno.c.projetos; return !!(d && d.t === 'd' && Object.keys(d.c).length); } },
  { tab: 'linux', title: 'Instale o nginx e acesse com curl localhost', hint: 'sudo apt update && sudo apt install -y nginx && curl localhost', check: s => !!s.linux.events.curlLocal },
  { tab: 'linux', title: 'Conecte via SSH em uma instância EC2', hint: 'cd ~/Downloads; chmod 400 chave.pem; ssh -i chave.pem ec2-user@IP', check: s => !!s.linux.events.ssh_aws },
  { tab: 'linux', title: 'Publique um site: nginx na nuvem + curl pelo IP público', hint: 'Instale o nginx dentro da VM, libere a porta 80 no firewall da nuvem e rode curl http://IP a partir da sua máquina.', check: s => !!s.linux.events.curlRemote },
  // OCI
  { tab: 'oci', title: 'Crie um compartimento', hint: 'Identity › Compartments › Create Compartment', check: s => s.oci.compartments.length > 1 },
  { tab: 'oci', title: 'Crie uma VCN (dica: use o VCN Wizard)', hint: 'Networking › Virtual cloud networks › Start VCN Wizard', check: s => s.oci.vcns.length > 0 },
  { tab: 'oci', title: 'Crie uma instância Always Free', hint: 'Compute › Instances › Create instance com VM.Standard.E2.1.Micro ou A1.Flex', check: s => s.oci.instances.some(i => ['VM.Standard.E2.1.Micro', 'VM.Standard.A1.Flex'].includes(i.shape) && i.state === 'RUNNING') },
  { tab: 'oci', title: 'Conecte via SSH na instância OCI', hint: 'Salve a chave privada ao criar a instância. Usuário: opc (Oracle Linux) ou ubuntu.', check: s => !!s.linux.events.ssh_oci },
  { tab: 'oci', title: 'Crie um bucket e envie um objeto', hint: 'Storage › Buckets › Create Bucket › Upload', check: s => s.oci.buckets.some(b => b.objects.length) },
  { tab: 'oci', title: 'Escreva uma policy para um grupo novo', hint: 'Crie um grupo e depois: Allow group MeuGrupo to read buckets in tenancy', check: s => s.oci.policies.length > 1 },
  // GCP
  { tab: 'gcp', title: 'Crie um novo projeto', hint: 'Clique no seletor de projeto › NEW PROJECT', check: s => s.gcp.projects.length > 1 },
  { tab: 'gcp', title: 'Ative a Compute Engine API', hint: 'Compute Engine › Enable', check: s => s.gcp.projects.some(p => p.apis.compute) },
  { tab: 'gcp', title: 'Crie uma VM e2-micro', hint: 'VM instances › Create instance', check: s => s.gcp.projects.some(p => p.instances.some(i => i.machine === 'e2-micro')) },
  { tab: 'gcp', title: 'Abra o SSH da VM (botão SSH ou gcloud compute ssh)', hint: 'O status precisa estar verde (Running).', check: s => !!s.linux.events.ssh_gcp },
  { tab: 'gcp', title: 'Crie um bucket no Cloud Storage', hint: 'Cloud Storage › Buckets › Create', check: s => s.gcp.projects.some(p => p.buckets.length) },
  { tab: 'gcp', title: 'Conceda um papel IAM a outro principal', hint: 'IAM & Admin › IAM › Grant access', check: s => s.gcp.projects.some(p => p.iam.some(x => x.principal.startsWith('user:') && !x.principal.endsWith('aluno@example.com'))) },
];

const App = (() => {
  const TABS = { aws: AWS, oci: OCI, gcp: GCP, linux: Linux };
  const NAMES = { aws: 'AWS', oci: 'Oracle Cloud', gcp: 'Google Cloud', linux: 'Linux' };
  let active = null;
  let drawerOpen = false;

  function switchTab(t) {
    if (!TABS[t]) t = 'aws';
    active = t;
    document.querySelectorAll('#labbar [data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    document.querySelectorAll('#stage > .console').forEach(sec => sec.classList.toggle('active', sec.id === 'tab-' + t));
    Store.s.tab = t;
    Store.save();
    TABS[t].onShow && TABS[t].onShow();
    if (drawerOpen) renderMissions();
  }

  function checkMissions(silent) {
    const s = Store.s;
    let done = 0;
    MISSIONS.forEach((m, i) => {
      let ok = false;
      try { ok = !!m.check(s); } catch (e) { ok = false; }
      m.ok = ok;
      if (ok) done++;
      if (ok && !s.done.includes(i)) {
        s.done.push(i);
        if (!silent) UI.toast(document.getElementById('lab-toasts'), `🎯 Missão concluída: <b>${UI.esc(m.title)}</b>`, 'mission', 6000);
      }
    });
    document.getElementById('mission-count').textContent = `${done}/${MISSIONS.length}`;
    if (drawerOpen) renderMissions();
  }

  function renderMissions() {
    const el = document.getElementById('missions');
    const order = [active, ...Object.keys(NAMES).filter(k => k !== active)];
    el.innerHTML = `<div class="ms-h"><b>🎯 Missões</b><button id="ms-close" aria-label="Fechar">×</button></div>
      <p class="ms-d">Complete os desafios abaixo. Elas são marcadas automaticamente quando você faz a tarefa.</p>
      ${order.map(t => { const list = MISSIONS.filter(m => m.tab === t); const ok = list.filter(m => m.ok).length; return `<h4>${NAMES[t]} <small>${ok}/${list.length}</small></h4>${list.map(m => `<div class="ms ${m.ok ? 'ok' : ''}"><span>${m.ok ? '✔' : '○'}</span><div><b>${UI.esc(m.title)}</b><small>${UI.esc(m.hint)}</small></div></div>`).join('')}`; }).join('')}`;
    el.querySelector('#ms-close').onclick = () => toggleDrawer(false);
  }
  function toggleDrawer(open = !drawerOpen) {
    drawerOpen = open;
    document.getElementById('missions').hidden = !open;
    document.getElementById('btn-missions').classList.toggle('on', open);
    if (open) renderMissions();
  }

  function tick() {
    let changed = false;
    for (const m of Object.values(TABS)) if (m.tick && m.tick()) changed = true;
    if (changed) Store.commit();
  }

  function init() {
    Store.load();
    for (const [k, m] of Object.entries(TABS)) m.init(document.getElementById('tab-' + k));
    Store.on(() => { if (active && TABS[active].refresh) TABS[active].refresh(); checkMissions(); });
    document.querySelectorAll('#labbar [data-tab]').forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));
    document.getElementById('btn-missions').addEventListener('click', () => toggleDrawer());
    document.getElementById('btn-reset').addEventListener('click', () => {
      if (confirm('Apagar tudo o que você criou no laboratório (instâncias, buckets, usuários, arquivos do terminal) e começar do zero?')) Store.reset();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') document.querySelectorAll('.console.active .modal-host').forEach(m => { m.innerHTML = ''; });
      if (e.altKey && !e.ctrlKey && /^[1-4]$/.test(e.key)) { e.preventDefault(); switchTab(Object.keys(TABS)[+e.key - 1]); }
    });
    checkMissions(true);
    switchTab(Store.s.tab || 'aws');
    setInterval(tick, 500);
  }

  return { init, switchTab };
})();

document.addEventListener('DOMContentLoaded', App.init);
