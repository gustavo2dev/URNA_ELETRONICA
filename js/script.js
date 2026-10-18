// Lê a configuração carregada antes deste arquivo pelo index.html.
const CONFIG = window.DATAVOTO_CONFIG;

// Reúne referências dos formulários e dos avisos usados ao integrar a API.
const formularioPesquisa = document.querySelector("#formulario-pesquisa");
const formularioVotacao = document.querySelector("#formulario-votacao");
const camposPrioridades = [
  ...formularioPesquisa.querySelectorAll('input[name="prioridades"]'),
];
const opcoesVoto = document.querySelector("#opcoes-voto");
const grupoOpcoesVoto = document.querySelector(".opcoes-votacao");
const botaoEnviarPesquisa = document.querySelector("#botao-enviar-pesquisa");
const botaoRegistrarVoto = formularioVotacao.querySelector(
  'button[type="submit"]',
);
const mensagemPesquisa = document.querySelector("#mensagem-pesquisa");
const mensagemVotacao = document.querySelector("#mensagem-votacao");
const estadoBackend = document.querySelector("#estado-backend");

let eleicao = null;
let pesquisaEnviada = false;
let enviandoPesquisa = false;
let enviandoVoto = false;

// A pesquisa exige ao menos um tema; a validação é repetida no servidor.
function validarPrioridades() {
  const selecionouTema = camposPrioridades.some((opcao) => opcao.checked);
  camposPrioridades[0].setCustomValidity(
    selecionouTema ? "" : "Selecione pelo menos um tema.",
  );
}

// Monta as opções com nós de texto para não interpretar rótulos como HTML.
function mostrarOpcoesVoto(opcoes) {
  opcoesVoto.replaceChildren();

  opcoes.forEach((opcao) => {
    const linha = document.createElement("label");
    const radio = document.createElement("input");

    radio.type = "radio";
    radio.name = "voto";
    radio.value = opcao.id;
    radio.required = true;

    linha.append(radio, document.createTextNode(` ${opcao.label}`));
    opcoesVoto.append(linha);
  });

  grupoOpcoesVoto.disabled = false;
  botaoRegistrarVoto.disabled = false;
}

// Padroniza as chamadas HTTP e mostra erros de conexão ou de resposta da API.
async function chamarApi(caminho, opcoes = {}) {
  const cabecalhos = { Accept: "application/json" };

  if (opcoes.body) {
    cabecalhos["Content-Type"] = "application/json";
  }

  const urlBase = new URL(CONFIG.apiBaseUrl);

  if (
    urlBase.protocol !== "https:" &&
    !["localhost", "127.0.0.1"].includes(urlBase.hostname)
  ) {
    throw new Error("O backend deve usar uma conexão HTTPS segura.");
  }

  if (
    urlBase.pathname !== "/" ||
    urlBase.search ||
    urlBase.hash ||
    urlBase.username ||
    urlBase.password
  ) {
    throw new Error("Informe somente a origem do backend, sem caminhos ou dados extras.");
  }

  const resposta = await fetch(`${urlBase.origin}${caminho}`, {
    ...opcoes,
    headers: { ...cabecalhos, ...opcoes.headers },
  });

  if (!resposta.ok) {
    throw new Error(`O servidor respondeu com o código ${resposta.status}.`);
  }

  try {
    return await resposta.json();
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }
}

// Busca uma eleição aberta antes de habilitar o envio da pesquisa.
async function carregarEleicao() {
  const idEleicao = encodeURIComponent(CONFIG.electionId);
  const dados = await chamarApi(`/api/elections/${idEleicao}`);

  if (
    dados.id !== CONFIG.electionId ||
    dados.status !== "open" ||
    !Array.isArray(dados.choices) ||
    dados.choices.length === 0 ||
    dados.choices.some(
      (opcao) =>
        typeof opcao.id !== "string" ||
        !opcao.id ||
        typeof opcao.label !== "string" ||
        !opcao.label,
    )
  ) {
    throw new Error("A eleição não está aberta ou não possui opções válidas.");
  }

  eleicao = dados;
  mostrarOpcoesVoto(dados.choices);

  // A pessoa só pode votar depois do envio confirmado da pesquisa.
  grupoOpcoesVoto.disabled = true;
  botaoRegistrarVoto.disabled = true;
}

// Converte os dados do formulário para o formato documentado da API.
function criarDadosPesquisa() {
  const campos = new FormData(formularioPesquisa);

  return {
    faixaEtaria: campos.get("faixaEtaria"),
    estuda: campos.get("estuda"),
    trabalha: campos.get("trabalha"),
    rendaFamiliar: campos.get("rendaFamiliar"),
    numeroMoradores: Number(campos.get("numeroMoradores")),
    numeroTrabalhadores: Number(campos.get("numeroTrabalhadores")),
    intencaoVoto: campos.get("intencaoVoto"),
    prioridades: campos.getAll("prioridades"),
    consentimento: document.querySelector("#consentimento").checked,
    versaoAvisoPrivacidade: CONFIG.privacyNoticeVersion,
  };
}

// Envia a pesquisa somente após validar os campos e conectar à API.
async function enviarPesquisa(evento) {
  evento.preventDefault();
  validarPrioridades();

  if (
    !formularioPesquisa.reportValidity() ||
    !eleicao ||
    pesquisaEnviada ||
    enviandoPesquisa
  ) {
    return;
  }

  enviandoPesquisa = true;
  botaoEnviarPesquisa.disabled = true;
  mensagemPesquisa.textContent = "Enviando sua pesquisa...";

  try {
    const idEleicao = encodeURIComponent(CONFIG.electionId);
    const resultado = await chamarApi(
      `/api/elections/${idEleicao}/surveys`,
      {
        method: "POST",
        body: JSON.stringify(criarDadosPesquisa()),
      },
    );

    if (resultado.accepted !== true) {
      throw new Error("O servidor não confirmou o recebimento da pesquisa.");
    }

    pesquisaEnviada = true;
    formularioPesquisa.reset();
    botaoEnviarPesquisa.textContent = "Pesquisa enviada";
    mensagemPesquisa.textContent =
      "Pesquisa registrada. Agora você pode participar da votação secreta.";
    grupoOpcoesVoto.disabled = false;
    botaoRegistrarVoto.disabled = false;
    document.querySelector("#votacao").scrollIntoView({ behavior: "smooth" });
  } catch (erro) {
    enviandoPesquisa = false;
    mensagemPesquisa.textContent =
      erro instanceof Error
        ? `Não foi possível confirmar o envio. ${erro.message}`
        : "Não foi possível confirmar o envio. Tente novamente.";
    botaoEnviarPesquisa.disabled = false;
  }
}

// Registra somente a opção no serviço da urna, separada da pesquisa.
async function registrarVoto(evento) {
  evento.preventDefault();

  if (
    !pesquisaEnviada ||
    !eleicao ||
    enviandoVoto ||
    !formularioVotacao.reportValidity()
  ) {
    return;
  }

  enviandoVoto = true;
  botaoRegistrarVoto.disabled = true;
  mensagemVotacao.textContent = "Registrando seu voto...";

  try {
    const idEleicao = encodeURIComponent(CONFIG.electionId);
    const escolha = new FormData(formularioVotacao).get("voto");
    const resultado = await chamarApi(
      `/api/elections/${idEleicao}/votes`,
      {
        method: "POST",
        body: JSON.stringify({ choiceId: escolha }),
      },
    );

    if (resultado.accepted !== true) {
      throw new Error("O servidor não confirmou o registro do voto.");
    }

    grupoOpcoesVoto.disabled = true;
    mensagemVotacao.textContent =
      "Voto registrado. Obrigado por participar.";
    botaoRegistrarVoto.textContent = "Voto registrado";
  } catch (erro) {
    enviandoVoto = false;
    mensagemVotacao.textContent =
      erro instanceof Error
        ? `Não foi possível confirmar o voto. ${erro.message}`
        : "Não foi possível confirmar o voto. Tente novamente.";
    botaoRegistrarVoto.disabled = false;
  }
}

// Sem URL e eleição configuradas, não habilita envio nem finge sucesso.
async function iniciarIntegracao() {
  if (!CONFIG.apiBaseUrl || !CONFIG.electionId) {
    estadoBackend.textContent = "Conexão não configurada";
    mensagemPesquisa.textContent =
      "O envio será habilitado quando a URL do backend e a eleição forem configuradas.";
    return;
  }

  estadoBackend.textContent = "Conectando...";

  try {
    await carregarEleicao();
    estadoBackend.textContent = "Conectado";
    estadoBackend.classList.add("conectado");
    botaoEnviarPesquisa.disabled = false;
    mensagemPesquisa.textContent = "";
  } catch (erro) {
    estadoBackend.textContent = "Indisponível";
    estadoBackend.classList.remove("conectado");
    mensagemPesquisa.textContent =
      erro instanceof Error
        ? `Não foi possível preparar a pesquisa. ${erro.message}`
        : "Não foi possível conectar ao backend.";
  }
}

camposPrioridades.forEach((opcao) => {
  opcao.addEventListener("change", validarPrioridades);
});

formularioPesquisa.addEventListener("submit", enviarPesquisa);
formularioVotacao.addEventListener("submit", registrarVoto);
validarPrioridades();
iniciarIntegracao();
