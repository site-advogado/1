// ============================================================
// tema.js — Sistema de temas server-side
// Versão: 2026-final
//
// COMO FUNCIONA:
//   1. Toda página chama carregarTemaEBio()
//   2. Busca bio no servidor (Google Sheets via Worker)
//   3. bio.tema define qual tema aplicar via CSS variables
//   4. localStorage guarda o último tema como fallback
//      para evitar flash visual antes da resposta do servidor
//   5. Advogada muda o tema → salva no Sheets → todas as
//      páginas verão o novo tema na próxima chamada ao bio
//
// NÃO há redirecionamento por arquivo.
// Um único index.html, linha-tempo.html, etc. serve todos os temas.
// ============================================================

// ── URLs centralizadas (definidas aqui, não em app.js) ────
// Remova qualquer declaração de URL_API em outros arquivos
const URL_API    = 'https://api-advogada.siterefrigeracaoeliezer.workers.dev/api/v1';
const URL_SESSAO = 'https://api-advogada.siterefrigeracaoeliezer.workers.dev/api/verificar-sessao';
const URL_BASE   = 'https://api-advogada.siterefrigeracaoeliezer.workers.dev';

// ── Paletas dos 4 temas ───────────────────────────────────
// Cada tema define variáveis CSS que são aplicadas em :root
// Todas as páginas usam var(--t-*) para seus estilos

const TEMAS = {

  // ── Ateliê (padrão): feminino quadrado, Playfair, cream/gold ──
  'feminino-q': {
    nome: 'Ateliê',
    fonte_url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Jost:wght@300;400;500&display=swap',
    light: {
      '--t-bg':           '#FAF8F3',
      '--t-bg-card':      'rgba(255,255,255,0.82)',
      '--t-bg-input':     'rgba(255,255,255,0.7)',
      '--t-bg-header':    'rgba(250,248,243,0.88)',
      '--t-accent':       '#C5A059',
      '--t-accent-dk':    '#9A7535',
      '--t-accent-dim':   'rgba(197,160,89,0.09)',
      '--t-accent-brd':   'rgba(197,160,89,0.28)',
      '--t-text':         '#1C1917',
      '--t-text-soft':    '#44403C',
      '--t-text-muted':   '#A8A29E',
      '--t-border':       'rgba(197,160,89,0.22)',
      '--t-shadow':       '0 2px 24px rgba(28,25,23,0.07)',
      '--t-radius':       '4px',
      '--t-radius-lg':    '4px',
      '--t-radius-xl':    '4px',
      '--t-font-serif':   "'Playfair Display', Georgia, serif",
      '--t-font-sans':    "'Jost', sans-serif",
      '--t-danger-bg':    'rgba(200,80,60,0.08)',
      '--t-danger':       '#E08070',
      '--t-success-bg':   'rgba(58,120,80,0.08)',
      '--t-success':      '#60B080',
    },
    dark: {
      '--t-bg':           '#0F0E0C',
      '--t-bg-card':      'rgba(20,18,14,0.92)',
      '--t-bg-input':     'rgba(28,26,22,0.9)',
      '--t-bg-header':    'rgba(15,14,12,0.92)',
      '--t-text':         '#EAE2D8',
      '--t-text-soft':    '#8A847E',
      '--t-text-muted':   '#5A5550',
      '--t-border':       'rgba(197,160,89,0.16)',
      '--t-shadow':       '0 4px 30px rgba(0,0,0,0.4)',
    },
  },

  // ── Élite: feminino arredondado, Cormorant, pearl/gold escuro ──
  'feminino-r': {
    nome: 'Élite',
    fonte_url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Montserrat:wght@300;400;500&display=swap',
    light: {
      '--t-bg':           '#FDFCF8',
      '--t-bg-card':      'rgba(255,255,255,0.92)',
      '--t-bg-input':     'rgba(255,255,255,0.8)',
      '--t-bg-header':    'rgba(253,252,248,0.88)',
      '--t-accent':       '#C5A059',
      '--t-accent-dk':    '#A37E3B',
      '--t-accent-dim':   'rgba(197,160,89,0.08)',
      '--t-accent-brd':   'rgba(197,160,89,0.3)',
      '--t-text':         '#1A1A1A',
      '--t-text-soft':    '#4A4A4A',
      '--t-text-muted':   '#9A9A8A',
      '--t-border':       'rgba(197,160,89,0.2)',
      '--t-shadow':       '0 8px 40px rgba(0,0,0,0.06)',
      '--t-radius':       '20px',
      '--t-radius-lg':    '30px',
      '--t-radius-xl':    '40px',
      '--t-font-serif':   "'Cormorant Garamond', Georgia, serif",
      '--t-font-sans':    "'Montserrat', sans-serif",
      '--t-danger-bg':    'rgba(192,74,58,0.08)',
      '--t-danger':       '#C04A3A',
      '--t-success-bg':   'rgba(58,122,90,0.08)',
      '--t-success':      '#3A7A5A',
    },
    dark: {
      '--t-bg':           '#1A1A1A',
      '--t-bg-card':      '#141414',
      '--t-bg-input':     '#222222',
      '--t-bg-header':    'rgba(26,26,26,0.92)',
      '--t-text':         '#E8E0D0',
      '--t-text-soft':    '#A09890',
      '--t-text-muted':   '#7A7468',
      '--t-border':       'rgba(197,160,89,0.18)',
      '--t-shadow':       '0 8px 40px rgba(0,0,0,0.5)',
    },
  },

  // ── Gestão: masculino, navy/steel azul ──
  'masculino': {
    nome: 'Gestão',
    fonte_url: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap',
    light: {
      '--t-bg':           '#F0F4F8',
      '--t-bg-card':      '#FFFFFF',
      '--t-bg-input':     '#F0F4F8',
      '--t-bg-header':    'rgba(240,244,248,0.92)',
      '--t-accent':       '#2E6DA4',
      '--t-accent-dk':    '#1A4A72',
      '--t-accent-dim':   'rgba(46,109,164,0.08)',
      '--t-accent-brd':   'rgba(46,109,164,0.22)',
      '--t-text':         '#0A1628',
      '--t-text-soft':    '#2C3344',
      '--t-text-muted':   '#9AADC4',
      '--t-border':       'rgba(46,109,164,0.18)',
      '--t-shadow':       '0 2px 20px rgba(10,22,40,0.08)',
      '--t-radius':       '8px',
      '--t-radius-lg':    '12px',
      '--t-radius-xl':    '16px',
      '--t-font-serif':   "'Cormorant Garamond', Georgia, serif",
      '--t-font-sans':    "'Inter', sans-serif",
      '--t-danger-bg':    'rgba(192,58,58,0.08)',
      '--t-danger':       '#C03A3A',
      '--t-success-bg':   'rgba(46,109,100,0.08)',
      '--t-success':      '#2E6D64',
    },
    dark: {
      '--t-bg':           '#0A1628',
      '--t-bg-card':      '#111E35',
      '--t-bg-input':     '#1C2D4A',
      '--t-bg-header':    'rgba(10,22,40,0.94)',
      '--t-text':         '#E8EDF4',
      '--t-text-soft':    '#9AADC4',
      '--t-text-muted':   '#4A6080',
      '--t-border':       'rgba(46,109,164,0.25)',
      '--t-shadow':       '0 4px 30px rgba(0,0,0,0.4)',
    },
  },

  // ── Clássico: obsidian, escuro dourado (sempre escuro) ──
  'obsidian': {
    nome: 'Clássico',
    fonte_url: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Montserrat:wght@300;400;600&display=swap',
    light: {
      // obsidian é sempre escuro — light e dark são iguais
      '--t-bg':           '#0D0D0D',
      '--t-bg-card':      '#141414',
      '--t-bg-input':     '#1A1A1A',
      '--t-bg-header':    'rgba(13,13,13,0.94)',
      '--t-accent':       '#C5A059',
      '--t-accent-dk':    '#A37E3B',
      '--t-accent-dim':   'rgba(197,160,89,0.08)',
      '--t-accent-brd':   'rgba(197,160,89,0.25)',
      '--t-text':         '#E8E0D0',
      '--t-text-soft':    '#A09890',
      '--t-text-muted':   '#7A7468',
      '--t-border':       'rgba(197,160,89,0.18)',
      '--t-shadow':       '0 4px 30px rgba(0,0,0,0.5)',
      '--t-radius':       '16px',
      '--t-radius-lg':    '24px',
      '--t-radius-xl':    '32px',
      '--t-font-serif':   "'Cinzel', serif",
      '--t-font-sans':    "'Montserrat', sans-serif",
      '--t-danger-bg':    'rgba(192,74,58,0.12)',
      '--t-danger':       '#E07060',
      '--t-success-bg':   'rgba(58,122,90,0.12)',
      '--t-success':      '#60B080',
    },
    dark: {}, // obsidian já é sempre escuro — dark não sobrescreve nada
  },
};

// ── Aplicar tema via CSS variables ────────────────────────
function aplicarTema(temaId) {
  const tema   = TEMAS[temaId] || TEMAS['feminino-q'];
  const isDark = document.documentElement.classList.contains('dark') || temaId === 'obsidian';
  const root   = document.documentElement;

  // Aplicar variáveis light (base)
  Object.entries(tema.light).forEach(([k, v]) => root.style.setProperty(k, v));

  // Sobrescrever com variáveis dark se necessário
  if (isDark && tema.dark && Object.keys(tema.dark).length > 0) {
    Object.entries(tema.dark).forEach(([k, v]) => root.style.setProperty(k, v));
  }

  // Marcar tema atual no elemento root (para CSS condicional se necessário)
  root.dataset.tema = temaId;

  // Carregar fonte do Google se ainda não carregada
  _carregarFonte(tema.fonte_url);

  // Persistir localmente como fallback (apenas evita flash visual)
  try { localStorage.setItem('ADV_TEMA_LOCAL', temaId); } catch {}
}

// Cache de fontes já carregadas
const _fontesCarregadas = new Set();
function _carregarFonte(url) {
  if (!url || _fontesCarregadas.has(url)) return;
  _fontesCarregadas.add(url);
  const link = document.createElement('link');
  link.rel   = 'stylesheet';
  link.href  = url;
  document.head.appendChild(link);
}

// ── Cache do bio (sessionStorage — APENAS dados públicos) ─
// NUNCA armazena email/senha/palavra secreta
const _BIO_KEY = 'ADV_BIO_v2';
const _BIO_TTL = 4 * 60 * 1000; // 4 minutos

function _getBioCache() {
  try {
    const raw = sessionStorage.getItem(_BIO_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (Date.now() - obj.ts > _BIO_TTL) { sessionStorage.removeItem(_BIO_KEY); return null; }
    return obj.data;
  } catch { return null; }
}

function _setBioCache(data) {
  try {
    // Salva APENAS campos públicos — NUNCA credenciais
    const seguro = {
      name:           data.name,
      oab:            data.oab,
      desc:           data.desc,
      phone:          data.phone,
      img:            data.img,
      areas_visiveis: data.areas_visiveis,
      tema:           data.tema,
      msg_index:      data.msg_index,
      // email_advogada → OMITIDO propositalmente
    };
    sessionStorage.setItem(_BIO_KEY, JSON.stringify({ data: seguro, ts: Date.now() }));
  } catch {}
}

function _invalidarBioCache() {
  try { sessionStorage.removeItem(_BIO_KEY); } catch {}
}

// ── Carregar bio + aplicar tema do servidor ───────────────
// Esta é a função principal. Toda página pública chama ela.
// Retorna os dados do bio para uso imediato.
async function carregarTemaEBio() {
  // 1. Tentar cache para resposta instantânea
  const cached = _getBioCache();
  if (cached) {
    aplicarTema(cached.tema || 'feminino-q');
    return cached;
  }

  // 2. Buscar no servidor
  try {
    const res = await fetch(URL_API, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ action: 'bio' }),
    });
    if (!res.ok) return null;

    const data   = await res.json();
    const temaId = data.tema || 'feminino-q';

    // Aplicar tema vindo do servidor (fonte da verdade)
    aplicarTema(temaId);
    _setBioCache(data);
    return data;

  } catch { return null; }
}

// ── Verificar sessão (páginas protegidas) ─────────────────
async function verificarSessaoComTema(roleNecessario = 'cliente') {
  try {
    const res = await fetch(URL_SESSAO, {
      method: 'GET', credentials: 'include',
    });
    if (!res.ok) { _mostrarSessaoExpirada(); return null; }

    const sessao = await res.json();

    if (!sessao.autenticado) {
      _mostrarSessaoExpirada();
      return null;
    }
    if (roleNecessario === 'admin' && sessao.role !== 'admin') {
      _mostrarSessaoExpirada('acesso');
      return null;
    }

    // Aplicar tema do servidor em segundo plano
    carregarTemaEBio().catch(() => {});

    // Agendar silent refresh se Worker retornar expiresAt
    if (sessao.expiresAt) _agendarSilentRefresh(sessao.expiresAt);

    return sessao;

  } catch {
    _mostrarSessaoExpirada();
    return null;
  }
}

// ── Modal de sessão expirada (elegante, temático) ─────────
function _mostrarSessaoExpirada(tipo = 'expirada') {
  document.getElementById('__sessaoModal')?.remove();

  const msgs = {
    expirada: {
      icon:  'fa-clock',
      title: 'Sessão Encerrada',
      desc:  'Sua sessão expirou por inatividade. Clique abaixo para fazer login novamente.',
      btn:   'Fazer Login',
    },
    acesso: {
      icon:  'fa-shield-halved',
      title: 'Acesso Restrito',
      desc:  'Você não tem permissão para acessar esta área. Faça login como administrador.',
      btn:   'Ir para o Login',
    },
  };
  const m = msgs[tipo] || msgs.expirada;

  const overlay = document.createElement('div');
  overlay.id    = '__sessaoModal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.65);backdrop-filter:blur(12px);';

  overlay.innerHTML = `
    <div style="
      background:var(--t-bg-card,#fff);
      border:1px solid var(--t-accent-brd,rgba(197,160,89,0.28));
      border-radius:var(--t-radius-lg,8px);
      max-width:360px;width:100%;padding:36px 28px;text-align:center;
      box-shadow:var(--t-shadow,0 8px 32px rgba(0,0,0,0.15));
      position:relative;animation:__sessaoFade 0.3s ease both;
    ">
      <style>@keyframes __sessaoFade{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}</style>
      <div style="
        width:54px;height:54px;border-radius:50%;
        background:var(--t-accent-dim,rgba(197,160,89,0.1));
        border:1px solid var(--t-accent-brd,rgba(197,160,89,0.25));
        display:inline-flex;align-items:center;justify-content:center;margin-bottom:18px;
      ">
        <i class="fas ${m.icon}" style="color:var(--t-accent,#C5A059);font-size:20px;"></i>
      </div>
      <h3 style="
        font-family:var(--t-font-serif,'Georgia',serif);
        font-size:20px;font-weight:400;color:var(--t-text,#1C1917);margin-bottom:10px;
      ">${m.title}</h3>
      <p style="font-size:13px;color:var(--t-text-muted,#A8A29E);line-height:1.7;margin-bottom:26px;">${m.desc}</p>
      <button onclick="window.location.href='index.html'" style="
        width:100%;padding:13px;
        background:linear-gradient(135deg,var(--t-accent,#C5A059),var(--t-accent-dk,#9A7535));
        border:none;border-radius:var(--t-radius,4px);
        font-family:var(--t-font-sans,'sans-serif');
        font-size:10px;font-weight:500;letter-spacing:0.22em;
        color:#fff;text-transform:uppercase;cursor:pointer;
        transition:opacity 0.2s;
      " onmouseover="this.style.opacity='0.87'" onmouseout="this.style.opacity='1'">
        <i class="fas fa-right-to-bracket" style="margin-right:8px;opacity:0.8;"></i>${m.btn}
      </button>
      <p style="font-size:10px;color:var(--t-text-muted,#A8A29E);margin-top:14px;opacity:0.6;">
        Redirecionando automaticamente em <span id="__sessaoCount">10</span>s...
      </p>
    </div>`;

  document.body.appendChild(overlay);

  // Contagem regressiva
  let count = 10;
  const interval = setInterval(() => {
    count--;
    const el = document.getElementById('__sessaoCount');
    if (el) el.textContent = count;
    if (count <= 0) { clearInterval(interval); window.location.href = 'index.html'; }
  }, 1000);
}

// ── Silent refresh do JWT ─────────────────────────────────
let _refreshTimer = null;

function _agendarSilentRefresh(expiresAt) {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  const agora         = Math.floor(Date.now() / 1000);
  const exp           = parseInt(expiresAt, 10);
  const msAteRefresh  = (exp - agora - 600) * 1000; // 10 min antes
  if (msAteRefresh <= 0) return;

  _refreshTimer = setTimeout(async () => {
    try {
      const res  = await fetch(URL_BASE + '/api/refresh-token', {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.expiresAt) _agendarSilentRefresh(data.expiresAt);
    } catch { /* silencioso */ }
  }, msAteRefresh);
}

// ── Logout universal ──────────────────────────────────────
async function logout() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _invalidarBioCache();
  try {
    await fetch(URL_API, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
  } catch {}
  window.location.href = 'index.html';
}

// ── Toggle dark mode ──────────────────────────────────────
function toggleDarkMode() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('ADV_GLOBAL_THEME', isDark ? 'dark' : 'light');
  const icon = document.getElementById('themeIcon');
  if (icon) icon.classList.replace(isDark ? 'fa-moon' : 'fa-sun', isDark ? 'fa-sun' : 'fa-moon');
  // Re-aplicar o tema atual com o novo modo
  const temaAtual = document.documentElement.dataset.tema ||
    localStorage.getItem('ADV_TEMA_LOCAL') || 'feminino-q';
  aplicarTema(temaAtual);
}

// ── Utilitários de data ───────────────────────────────────
function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  } catch { return iso; }
}

function diasParaPrazo(isoDate) {
  if (!isoDate) return null;
  try {
    const hoje  = new Date(); hoje.setHours(0,0,0,0);
    const prazo = new Date(isoDate); prazo.setHours(0,0,0,0);
    return Math.round((prazo - hoje) / 86400000);
  } catch { return null; }
}

function labelPrazo(isoDate) {
  const dias = diasParaPrazo(isoDate);
  if (dias === null) return null;
  if (dias < 0)   return { texto: `Prazo vencido há ${Math.abs(dias)} dia${Math.abs(dias)!==1?'s':''}`, urgencia: 'vencido' };
  if (dias === 0) return { texto: 'Prazo é hoje!',                                                       urgencia: 'hoje'    };
  if (dias <= 5)  return { texto: `Prazo em ${dias} dia${dias!==1?'s':''}`,                              urgencia: 'urgente' };
  if (dias <= 15) return { texto: `Prazo em ${dias} dias`,                                               urgencia: 'proximo' };
  return              { texto: `Próximo prazo: ${formatDate(isoDate)}`,                                  urgencia: 'normal'  };
}

// ── Glossário jurídico ────────────────────────────────────
const GLOSSARIO = {
  'Petição Inicial Protocolada':        { titulo:'Petição Inicial',          texto:'Documento que dá início ao processo. Nele o advogado apresenta os fatos, fundamentos e pedidos ao juiz.' },
  'Aguardando Citação':                 { titulo:'Citação',                  texto:'Ato oficial pelo qual a parte contrária é comunicada e convocada a se defender.' },
  'Audiência de Conciliação Designada': { titulo:'Audiência de Conciliação', texto:'Reunião formal onde um mediador tenta aproximar as partes para um acordo sem julgamento.' },
  'Audiência de Instrução e Julgamento':{ titulo:'Audiência de Instrução',   texto:'Sessão onde testemunhas são ouvidas, provas apresentadas e o juiz colhe elementos para a sentença.' },
  'Sentença Proferida':                 { titulo:'Sentença',                 texto:'Decisão final do juiz. Pode ser favorável ou desfavorável, e pode ser objeto de recurso.' },
  'Fase de Execução / Cálculos':        { titulo:'Fase de Execução',         texto:'Após a sentença definitiva, esta fase efetiva a decisão — faz com que a parte vencedora receba o que lhe é devido.' },
  'Processo Finalizado / Arquivado':    { titulo:'Processo Finalizado',      texto:'O processo chegou ao fim. Todas as obrigações foram cumpridas e foi arquivado pelo juízo.' },
};

function abrirGlossario(statusEncoded) {
  const status = decodeURIComponent(statusEncoded);
  const entry  = GLOSSARIO[status];
  if (!entry) return;

  let modal = document.getElementById('__glossarioModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = '__glossarioModal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9998;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,0.55);backdrop-filter:blur(10px);';
    modal.onclick = e => { if (e.target === modal) fecharGlossario(); };
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div style="
      background:var(--t-bg-card,#fff);
      border:1px solid var(--t-accent-brd,rgba(197,160,89,0.25));
      border-radius:var(--t-radius-lg,8px);
      max-width:360px;width:100%;padding:28px 24px;
      animation:__sessaoFade 0.25s ease both;
    ">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--t-accent-dim);border:1px solid var(--t-accent-brd);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-scale-balanced" style="color:var(--t-accent,#C5A059);font-size:13px;"></i>
        </div>
        <div>
          <p style="font-size:9px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:var(--t-accent,#C5A059);opacity:0.8;margin-bottom:2px;">Glossário Jurídico</p>
          <h3 style="font-family:var(--t-font-serif,'Georgia',serif);font-size:17px;font-weight:400;color:var(--t-text,#1C1917);">${entry.titulo}</h3>
        </div>
      </div>
      <p style="font-size:13px;line-height:1.75;color:var(--t-text-soft,#44403C);margin-bottom:20px;">${entry.texto}</p>
      <button onclick="fecharGlossario()" style="width:100%;padding:11px;background:linear-gradient(135deg,var(--t-accent,#C5A059),var(--t-accent-dk,#9A7535));border:none;border-radius:var(--t-radius,4px);color:#fff;font-family:var(--t-font-sans,sans-serif);font-size:10px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;cursor:pointer;">
        Entendido
      </button>
    </div>`;

  modal.style.display = 'flex';
}

function fecharGlossario() {
  const m = document.getElementById('__glossarioModal');
  if (m) m.style.display = 'none';
}

// ── Fase label ────────────────────────────────────────────
const FASE_LABELS = {
  0:'Não iniciado', 10:'Petição Inicial', 30:'Fase de Conhecimento',
  60:'Sentença / Recursos', 90:'Execução / Cálculos', 100:'Finalizado',
};
function getFaseLabel(pct) { return FASE_LABELS[pct] || 'Em andamento'; }

// ── Inicialização imediata (executa ao carregar o script) ─
// Aplica o tema local salvo para evitar flash ANTES da resposta do servidor
(function _initImediato() {
  // Aplicar dark mode salvo
  const isDark = localStorage.getItem('ADV_GLOBAL_THEME') === 'dark';
  if (isDark) document.documentElement.classList.add('dark');
  else         document.documentElement.classList.remove('dark');

  // Aplicar último tema conhecido (fallback visual apenas)
  const temaLocal = localStorage.getItem('ADV_TEMA_LOCAL') || 'feminino-q';
  aplicarTema(temaLocal);

  // Atualizar ícone de tema
  document.addEventListener('DOMContentLoaded', () => {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.classList.remove('fa-moon', 'fa-sun');
      icon.classList.add(isDark ? 'fa-sun' : 'fa-moon');
    }
  });
})();
