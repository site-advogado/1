// URL_API, URL_BASE, URL_SESSAO vêm de tema.js (carregado antes deste arquivo)
// Fallbacks para o caso de tema.js não estar disponível
if (typeof URL_API    === 'undefined') window.URL_API    = 'https://api-advogada.siterefrigeracaoeliezer.workers.dev/api/v1';
if (typeof URL_BASE   === 'undefined') window.URL_BASE   = 'https://api-advogada.siterefrigeracaoeliezer.workers.dev';

// ── Estado ────────────────────────────────────────────────
let _primeiroAcesso   = false;
let _contadorInterval = null;
// _deferredPrompt é gerenciado pelo script inline de PWA no index.html

// ── Loading ───────────────────────────────────────────────
function showLoading() {
  const el = document.getElementById('globalLoader');
  // CORRIGIDO: index.html usa classe 'active', não 'show' nem style inline
  if (el) el.classList.add('active');
}
function hideLoading() {
  const el = document.getElementById('globalLoader');
  if (el) el.classList.remove('active');
}

// ── Modais ─────────────────────────────────────────────────
function showErrorModal(msg) {
  const el = document.getElementById('errorMessage');
  if (el) el.textContent = msg; // textContent — XSS safe
  const m = document.getElementById('modalError');
  if (m) m.style.display = 'flex';
}
function closeErrorModal() {
  const m = document.getElementById('modalError');
  if (m) m.style.display = 'none';
}

function openOtpModal() {
  const inp = document.getElementById('inputOtp');
  if (inp) inp.value = '';
  const m = document.getElementById('modalCode');
  if (m) m.style.display = 'flex';
  startTimer(180);
}
function closeOtpModal() {
  const m = document.getElementById('modalCode');
  if (m) m.style.display = 'none';
  clearInterval(_contadorInterval);
}

// ── Timer OTP ─────────────────────────────────────────────
function startTimer(duration) {
  let remaining = duration;
  clearInterval(_contadorInterval);
  _contadorInterval = setInterval(() => {
    remaining--;
    const timerEl = document.getElementById('timer');
    // CORRIGIDO: timerLabel não existe no HTML do index.html.
    // A expiração é indicada apenas no elemento #timer.
    if (remaining <= 0) {
      clearInterval(_contadorInterval);
      if (timerEl) timerEl.textContent = 'EXPIRADO';
      return;
    }
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    if (timerEl) timerEl.textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
  }, 1000);
}

// ── Banners ────────────────────────────────────────────────
function exibirBannerPrimeiroAcesso(msg) {
  const banner = document.getElementById('primeiroAcessoBanner');
  const texto  = document.getElementById('primeiroAcessoTexto');
  if (!banner) return;
  if (texto) texto.textContent = msg ||
    'Para configurar o sistema, acesse a manutenção digitando "admin" no campo abaixo.';
  banner.style.display = 'flex';
}

function exibirBannerNotificacao(mensagem) {
  const banner = document.getElementById('notifBanner');
  const texto  = document.getElementById('notifBannerTexto');
  if (!banner || !texto) return;
  texto.textContent = mensagem;
  banner.style.display = 'flex';
  banner.style.opacity = '0';
  setTimeout(() => { banner.style.transition = 'opacity 0.4s'; banner.style.opacity = '1'; }, 10);
}

function ocultarBannerNotificacao() {
  const banner = document.getElementById('notifBanner');
  if (banner) banner.style.display = 'none';
}

// ── Preencher bio na página ────────────────────────────────
function preencherBio(data) {
  if (!data) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || '';
  };
  set('bio-name', data.name);
  set('bio-oab',  data.oab);
  set('bio-desc', data.desc);

  const img = document.getElementById('bio-img');
  if (img && data.img && data.img.startsWith('https://'))
    img.src = data.img;

  if (data.phone) {
    const a = document.getElementById('bio-phone');
    if (a) a.href = `https://wa.me/55${String(data.phone).replace(/\D/g,'')}`;
  }
  // email_advogada não é retornado pelo bio por segurança
  // Ocultar botão de e-mail — contato principal via WhatsApp
  const emailBtn = document.getElementById('bio-email');
  if (emailBtn) emailBtn.style.display = 'none';
}

// ── Checar notificação (ao sair do campo email) ────────────
async function checarNotificacao(email) {
  if (!email || !email.includes('@')) return;
  try {
    const res  = await fetch(URL_API, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checar_notificacao', email }),
    });
    const data = await res.json();
    if (data.tem_novidade && data.mensagem) {
      exibirBannerNotificacao(data.mensagem);
    } else {
      ocultarBannerNotificacao();
    }
  } catch { /* silencioso — não quebra o fluxo */ }
}

// ── Inicialização ──────────────────────────────────────────
async function init() {
  showLoading();
  try {
    // 1. Carregar bio + aplicar tema do servidor
    // carregarTemaEBio() vem de tema.js
    const bioData = (typeof carregarTemaEBio === 'function')
      ? await carregarTemaEBio()
      : null;
    if (bioData) preencherBio(bioData);

    // 2. Verificar se é primeiro acesso (sem configuração no KV)
    try {
      const res  = await fetch(URL_BASE + '/api/verificar-setup', {
        method: 'GET', credentials: 'include',
      });
      const data = await res.json();
      if (data.primeiro_acesso) {
        _primeiroAcesso = true;
        const msg = bioData?.msg_index ||
          'Para configurar o sistema, acesse a manutenção digitando "admin" no campo abaixo.';
        exibirBannerPrimeiroAcesso(msg);
      }
    } catch { /* não bloqueia a página */ }

  } catch (err) {
    const el = document.getElementById('bio-name');
    if (el) el.textContent = 'Sistema temporariamente indisponível';
  } finally {
    hideLoading();
  }
}

// ── Passo 1: Solicitar OTP ─────────────────────────────────
async function handleClientSearch() {
  const emailInput = document.getElementById('searchCpf');
  const email      = emailInput?.value.trim();
  if (!email) return showErrorModal('Por favor, preencha o campo com seu e-mail.');

  ocultarBannerNotificacao();
  showLoading();

  try {
    const res  = await fetch(URL_API, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', usuario: email, passo: 'solicitar' }),
    });
    const data = await res.json();

    // [ID-011] Removido: redirecionamento para admin via campo público
    // O painel admin é acessado diretamente via URL /manutencao.html
    if (data.status === 'codigo_enviado') {
      openOtpModal();
    } else {
      // [ID-006] Mensagem genérica — não confirmar/negar existência de e-mail
      showErrorModal('Se este e-mail estiver cadastrado, você receberá um código em breve.');
    }
  } catch {
    showErrorModal('Erro na comunicação. Verifique sua conexão e tente novamente.');
  } finally {
    hideLoading();
  }
}

// ── Passo 2: Confirmar OTP ─────────────────────────────────
async function confirmCode() {
  const email  = document.getElementById('searchCpf')?.value.trim();
  const codigo = document.getElementById('inputOtp')?.value.trim();
  if (!codigo) return showErrorModal('Digite o código recebido por e-mail.');

  showLoading();
  try {
    const res  = await fetch(URL_API, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', usuario: email, codigo, passo: 'verificar' }),
    });
    const data = await res.json();

    if (data.status === 'ok') {
      closeOtpModal();
      // Cookie HttpOnly setado pelo Worker — apenas redireciona
      window.location.href = 'linha-tempo.html';
    } else {
      showErrorModal(data.message || 'Código inválido ou expirado.');
    }
  } catch {
    showErrorModal('Erro na conexão. Tente novamente.');
  } finally {
    hideLoading();
  }
}

// ── DOMContentLoaded ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Listener blur no campo email → checar notificação
  const searchInput = document.getElementById('searchCpf');
  if (searchInput) {
    // [ID-006] Removido: blur → checarNotificacao sem autenticação (enumeração)
    // A notificação será verificada após login bem-sucedido (cookie JWT)
    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') handleClientSearch();
    });
  }

  // Botão buscar
  document.getElementById('btnSearch')?.addEventListener('click', handleClientSearch);

  // Fechar modais com ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeOtpModal(); closeErrorModal(); }
  });

  // Inicializar
  init();
});
