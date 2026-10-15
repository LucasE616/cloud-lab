# ☁️ Cloud Lab

Laboratório **simulado** para aprender a usar **AWS (EC2, S3, IAM)**, **Oracle Cloud**, **Google Cloud** e **servidores Linux** sem gastar nada e sem risco.

Tudo roda no navegador: cada aba imita o visual do console real, e as ações têm as mesmas regras e mensagens de erro que você vai encontrar nas nuvens de verdade. Nenhum recurso real é criado.

> Primeiro protótipo. Ainda há telas marcadas como "não disponível no laboratório".

## Como usar

Não precisa instalar nada. Baixe o repositório e abra o `index.html` no navegador.

Se preferir, sirva a pasta com um servidor local:

```bash
python -m http.server 8000
```

Depois acesse http://localhost:8000.

O progresso fica salvo no `localStorage` do navegador. O botão **Resetar** apaga tudo e recomeça do zero.

## O que tem em cada aba

### AWS
- **EC2**: assistente *Launch instance* (AMI, tipo de instância, key pair, security group, armazenamento), estados `pending → running`, stop/start (o IP público muda), reboot, terminate, *Connect* (EC2 Instance Connect e cliente SSH), key pairs, security groups com edição de inbound rules e volumes.
- **S3**: buckets com nome único no mundo todo e as regras de nome reais, upload de arquivos, pastas (prefixos), Block Public Access, bucket policy em JSON, versionamento, hospedagem de site estático e exclusão com confirmação.
- **IAM**: usuários (assistente de criação), grupos, roles, políticas gerenciadas e personalizadas (editor JSON validado), access keys e um **Policy simulator** que segue a lógica real: *Deny* explícito > *Allow* > *Deny* implícito.

### Oracle Cloud (OCI)
- **Compartments**, **VCN** (manual ou *VCN Wizard* com subnets pública e privada), **Security Lists** com regras de entrada.
- **Compute**: shapes Always Free (E2.1.Micro, A1.Flex) com os limites do plano gratuito, chaves SSH geradas ou coladas, start/stop/terminate.
- **Object Storage**: buckets por namespace, upload e visibilidade pública ou privada.
- **Identity**: usuários, grupos e **policies** com validação da sintaxe `Allow group X to <verbo> <recurso> in <compartment|tenancy>`.

### Google Cloud
- **Projetos** (seletor e criação) e **ativação da Compute Engine API**.
- **Compute Engine**: criação de VM com estimativa de custo mensal, *Equivalent code* (comando `gcloud`), botão **SSH** no navegador, stop/start/reset/delete.
- **VPC / Firewall**: regras padrão (`default-allow-ssh`, `default-allow-icmp`...), criação de regras com tags e prioridade.
- **Cloud Storage**: buckets com classe e local de armazenamento, *public access prevention* e acesso público via `allUsers`.
- **IAM & Admin**: conceder e remover papéis, contas de serviço.

### Linux
Terminal Ubuntu simulado, com sistema de arquivos, usuários e permissões:
- `ls, cd, cat, nano, mkdir, rm, cp, mv, grep, find, tree, chmod, chown, sudo, ps, df, free, ip a, ss`… com pipes (`|`), redirecionamento (`>`, `>>`), `&&` e curingas.
- `apt` (Ubuntu/Debian) e `dnf/yum` (Amazon Linux, RHEL, Oracle Linux), `systemctl` e serviços como **nginx**.
- `ssh -i chave.pem usuario@IP` para as instâncias criadas nas abas de nuvem, com checagem de permissão da chave (`chmod 400`), usuário padrão da imagem e regras de firewall.
- `curl` e `ping` respeitando security groups, security lists e regras de firewall.
- **AWS CLI** (`aws configure`, `aws s3 ...`, `aws ec2 ...`) usando as access keys e as políticas do IAM do laboratório.
- **gcloud** (`gcloud compute instances list/create`, `gcloud compute ssh`, `gcloud storage ...`).

## 🎯 Missões

O botão **Missões** mostra desafios que são marcados sozinhos conforme você pratica. Exemplo de trilha completa:

1. Crie um key pair e lance uma instância EC2 `t2.micro`.
2. No terminal: `cd ~/Downloads`, `chmod 400 chave.pem` e `ssh -i chave.pem ec2-user@IP`.
3. Na instância: `sudo dnf install -y nginx` e `sudo systemctl enable --now nginx`.
4. Libere a porta 80 no security group e rode `curl http://IP` na sua máquina.
5. Crie um usuário IAM com `AmazonS3ReadOnlyAccess`, gere uma access key e rode `aws configure` e `aws s3 ls`.

## Estrutura

```
index.html        abas do laboratório
css/              um arquivo de estilo por console (aws, oci, gcp, linux)
js/ui.js          utilitários e componentes compartilhados
js/store.js       estado salvo no localStorage e transições de estado
js/aws.js         console AWS (EC2, S3, IAM) e subset do AWS CLI
js/oci.js         console Oracle Cloud
js/gcp.js         console Google Cloud e subset do gcloud
js/linux.js       terminal Linux, SSH, pacotes e serviços
js/app.js         abas, missões e o relógio que avança os estados
```

HTML, CSS e JavaScript puros, sem dependências e sem build.

## Próximos passos (ideias)

- OCI CLI (`oci os bucket list`...) e Cloud Shell em cada console.
- EBS volumes e snapshots, Elastic IPs, Load Balancers.
- Roles do IAM anexadas à instância (credenciais temporárias no `aws` dentro da EC2).
- `scp`, `crontab`, `journalctl`, `docker`.
- Modo "desafio guiado" com passo a passo dentro de cada console.

## Aviso

Projeto educacional e independente. **Não é afiliado, patrocinado nem endossado pela Amazon Web Services, Oracle ou Google.** Os nomes AWS, Amazon EC2, Amazon S3, Oracle Cloud Infrastructure, Google Cloud e afins são marcas dos seus donos e aparecem só para identificar o que está sendo simulado. Nenhum dado sai do seu navegador, e nenhuma credencial real deve ser digitada aqui.
