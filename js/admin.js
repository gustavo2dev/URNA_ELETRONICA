import {
  fetchSurveyDocuments,
  initFirebase,
  isAuthorizedAdmin,
  observeAdminStatus,
  signInAdmin,
  signOutAdmin,
} from "./firebase.js";

const page = document.body.dataset.page;
const loginView = document.getElementById("admin-login-view");
const dashboardView = document.getElementById("admin-dashboard");
const loginForm = document.getElementById("admin-login-form");
const loginStatus = document.getElementById("admin-login-status");
const refreshButton = document.getElementById("refresh-data");
const signOutButton = document.getElementById("logout-admin");
const metricsContainer = document.getElementById("dashboard-metrics");
const emptyState = document.getElementById("empty-state");
const chartConfigs = {
  faixaEtaria: document.getElementById("chart-faixa-etaria"),
  estudoTrabalho: document.getElementById("chart-estudo-trabalho"),
  renda: document.getElementById("chart-renda"),
  moradorTrabalhador: document.getElementById("chart-morador-trabalhador"),
  intencaoVoto: document.getElementById("chart-intencao-voto"),
  prioridades: document.getElementById("chart-prioridades"),
};
const chartInstances = {};

function setStatus(elemento, mensagem, tipo = "info") {
  if (!elemento) return;
  elemento.textContent = mensagem;
  elemento.dataset.tipo = tipo;
}

function getDocsValidos(dados) {
  if (!Array.isArray(dados)) return [];
  return dados.filter((documento) => documento && typeof documento === "object");
}

function contadorPorChave(documentos, chave) {
  const contagem = new Map();
  documentos.forEach((documento) => {
    const valor = documento[chave];
    const chaveNormalizada = String(valor ?? "").trim();
    if (!chaveNormalizada) return;
    contagem.set(chaveNormalizada, (contagem.get(chaveNormalizada) || 0) + 1);
  });
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
}

function contadorDePrioridades(documentos) {
  const contagem = new Map();
  documentos.forEach((documento) => {
    const prioridades = Array.isArray(documento.prioridades) ? documento.prioridades : [];
    prioridades.forEach((prioridade) => {
      const nome = String(prioridade ?? "").trim();
      if (!nome) return;
      contagem.set(nome, (contagem.get(nome) || 0) + 1);
    });
  });
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
}

function gerarMetricas(documentos) {
  const total = documentos.length;
  const moradores = documentos.map((doc) => Number(doc.numeroMoradores)).filter((valor) => Number.isFinite(valor) && valor > 0);
  const trabalhadores = documentos.map((doc) => Number(doc.numeroTrabalhadores)).filter((valor) => Number.isFinite(valor) && valor >= 0);
  const mediaMoradores = moradores.length ? moradores.reduce((soma, valor) => soma + valor, 0) / moradores.length : 0;
  const mediaTrabalhadores = trabalhadores.length ? trabalhadores.reduce((soma, valor) => soma + valor, 0) / trabalhadores.length : 0;

  return [
    { titulo: "Total de respostas", valor: total },
    { titulo: "Média de moradores por residência", valor: `${mediaMoradores.toFixed(1)}` },
    { titulo: "Média de trabalhadores por residência", valor: `${mediaTrabalhadores.toFixed(1)}` },
    { titulo: "Respostas com dados válidos", valor: total },
  ];
}

function renderMetricas(documentos) {
  if (!metricsContainer) return;
  const metricas = gerarMetricas(documentos);
  metricsContainer.innerHTML = metricas.map((card) => `
    <article class="metric-card">
      <span>${card.titulo}</span>
      <strong>${card.valor}</strong>
    </article>
  `).join("");
}

function destruirGraficos() {
  Object.entries(chartInstances).forEach(([key, chart]) => {
    if (chart) chart.destroy();
    delete chartInstances[key];
  });
}

function criarGrafico(canvas, config) {
  if (!canvas) return null;
  if (chartInstances[canvas.id]) chartInstances[canvas.id].destroy();
  const grafico = new Chart(canvas, config);
  chartInstances[canvas.id] = grafico;
  return grafico;
}

function renderizarGraficos(documentos) {
  if (!emptyState || !chartConfigs) return;
  destruirGraficos();

  if (!documentos.length) {
    emptyState.hidden = false;
    Object.values(chartConfigs).forEach((canvas) => {
      if (canvas && canvas.parentElement) canvas.parentElement.hidden = true;
    });
    return;
  }

  emptyState.hidden = true;
  Object.values(chartConfigs).forEach((canvas) => {
    if (canvas && canvas.parentElement) canvas.parentElement.hidden = false;
  });

  const faixaEtaria = contadorPorChave(documentos, "faixaEtaria");
  const estudo = contadorPorChave(documentos, "estuda");
  const trabalho = contadorPorChave(documentos, "trabalha");
  const renda = contadorPorChave(documentos, "rendaFamiliar");
  const intencaoVoto = contadorPorChave(documentos, "intencaoVoto");
  const prioridades = contadorDePrioridades(documentos);

  const labelsEstudoTrabalho = [...new Set([...estudo.map(([label]) => label), ...trabalho.map(([label]) => label)])];
  const valoresEstudoTrabalho = labelsEstudoTrabalho.map((label) => {
    const estudaValor = estudo.find(([nome]) => nome === label)?.[1] || 0;
    const trabalhaValor = trabalho.find(([nome]) => nome === label)?.[1] || 0;
    return estudaValor + trabalhaValor;
  });

  const valoresMoradores = [
    documentos.filter((doc) => Number(doc.numeroMoradores) === 1).length,
    documentos.filter((doc) => Number(doc.numeroMoradores) === 2).length,
    documentos.filter((doc) => Number(doc.numeroMoradores) === 3).length,
    documentos.filter((doc) => Number(doc.numeroMoradores) === 4).length,
    documentos.filter((doc) => Number(doc.numeroMoradores) >= 5).length,
  ];

  const valoresTrabalhadores = [
    documentos.filter((doc) => Number(doc.numeroTrabalhadores) === 0).length,
    documentos.filter((doc) => Number(doc.numeroTrabalhadores) === 1).length,
    documentos.filter((doc) => Number(doc.numeroTrabalhadores) === 2).length,
    documentos.filter((doc) => Number(doc.numeroTrabalhadores) === 3).length,
    documentos.filter((doc) => Number(doc.numeroTrabalhadores) >= 4).length,
  ];

  criarGrafico(chartConfigs.faixaEtaria, {
    type: "bar",
    data: {
      labels: faixaEtaria.map(([label]) => label),
      datasets: [{
        label: "Faixa etária",
        data: faixaEtaria.map(([, total]) => total),
        backgroundColor: ["#183b56", "#55c6b3", "#f2bc72", "#188577", "#7ec8d2", "#dba9ff", "#c6d0da"],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });

  criarGrafico(chartConfigs.estudoTrabalho, {
    type: "bar",
    data: {
      labels: labelsEstudoTrabalho.length ? labelsEstudoTrabalho : ["Sem dados"],
      datasets: [{
        label: "Estudo e trabalho",
        data: valoresEstudoTrabalho.length ? valoresEstudoTrabalho : [0],
        backgroundColor: "#55c6b3",
      }],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  criarGrafico(chartConfigs.renda, {
    type: "doughnut",
    data: {
      labels: renda.map(([label]) => label),
      datasets: [{
        data: renda.map(([, total]) => total),
        backgroundColor: ["#183b56", "#55c6b3", "#f2bc72", "#188577", "#dba9ff", "#7ec8d2"],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
  });

  criarGrafico(chartConfigs.moradorTrabalhador, {
    type: "bar",
    data: {
      labels: ["1", "2", "3", "4", "5+"],
      datasets: [
        { label: "Moradores", data: valoresMoradores, backgroundColor: "#183b56" },
        { label: "Trabalhadores", data: valoresTrabalhadores, backgroundColor: "#55c6b3" },
      ],
    },
    options: { responsive: true, maintainAspectRatio: false },
  });

  criarGrafico(chartConfigs.intencaoVoto, {
    type: "doughnut",
    data: {
      labels: intencaoVoto.map(([label]) => label),
      datasets: [{
        data: intencaoVoto.map(([, total]) => total),
        backgroundColor: ["#183b56", "#55c6b3", "#f2bc72", "#7ec8d2"],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } },
  });

  criarGrafico(chartConfigs.prioridades, {
    type: "bar",
    data: {
      labels: prioridades.slice(0, 8).map(([label]) => label),
      datasets: [{
        label: "Pautas prioritárias",
        data: prioridades.slice(0, 8).map(([, total]) => total),
        backgroundColor: "#188577",
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
  });
}

async function carregarDados() {
  if (!fetchSurveyDocuments) return;
  try {
    const dados = await fetchSurveyDocuments();
    const documentos = getDocsValidos(dados);
    renderMetricas(documentos);
    renderizarGraficos(documentos);
  } catch (erro) {
    if (loginStatus) setStatus(loginStatus, erro instanceof Error ? erro.message : "Não foi possível carregar os dados.", "error");
    renderMetricas([]);
    renderizarGraficos([]);
  }
}

async function autenticar(evento) {
  evento.preventDefault();
  const email = document.getElementById("admin-email")?.value.trim();
  const senha = document.getElementById("admin-password")?.value;

  if (!email || !senha) {
    setStatus(loginStatus, "Informe e-mail e senha de acesso administrativo.", "error");
    return;
  }

  try {
    setStatus(loginStatus, "Validando acesso...");
    const usuario = await signInAdmin(email, senha);

    if (!isAuthorizedAdmin(usuario)) {
      await signOutAdmin();
      setStatus(loginStatus, "Este usuário não está autorizado para acessar o painel administrativo.", "error");
      return;
    }

    window.location.href = "admin-dashboard.html";
  } catch (erro) {
    setStatus(loginStatus, erro instanceof Error ? erro.message : "Falha ao autenticar.", "error");
  }
}

async function sair() {
  try {
    await signOutAdmin();
    window.location.href = "admin-login.html";
  } catch (erro) {
    setStatus(loginStatus, erro instanceof Error ? erro.message : "Não foi possível sair.", "error");
  }
}

function mostrarPainelAutorizado() {
  if (loginView) loginView.hidden = true;
  if (dashboardView) dashboardView.hidden = false;
}

function mostrarLogin() {
  if (loginView) loginView.hidden = false;
  if (dashboardView) dashboardView.hidden = true;
}

const firebase = initFirebase();

if (page === "dashboard") {
  if (!firebase.ready) {
    setStatus(loginStatus, "Configure o Firebase em js/config.js para ativar o painel administrativo.", "error");
    if (document.getElementById("refresh-data")) document.getElementById("refresh-data").disabled = true;
    return;
  }

  observeAdminStatus((usuario) => {
    if (!usuario) {
      window.location.href = "admin-login.html";
      return;
    }

    mostrarPainelAutorizado();
    carregarDados();
  });

  if (refreshButton) refreshButton.addEventListener("click", carregarDados);
  if (signOutButton) signOutButton.addEventListener("click", sair);
}

if (page === "login") {
  if (!firebase.ready) {
    setStatus(loginStatus, "Configure o Firebase em js/config.js para ativar o painel administrativo.", "error");
    if (loginForm) loginForm.querySelector("button").disabled = true;
    return;
  }

  observeAdminStatus((usuario) => {
    if (usuario) {
      window.location.href = "admin-dashboard.html";
      return;
    }

    mostrarLogin();
    setStatus(loginStatus, "Acesso administrativo restrito. Faça login com uma conta autorizada.", "info");
  });

  if (loginForm) loginForm.addEventListener("submit", autenticar);
}
