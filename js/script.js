import { addSurveyResponse, initFirebase } from "./firebase.js";

const CONFIG = window.DATAVOTO_CONFIG || {};
const firebase = initFirebase();

const formularioPesquisa = document.querySelector("#formulario-pesquisa");
const formularioVotacao = document.querySelector("#formulario-votacao");
const secaoVotacao = document.querySelector("#votacao");
const camposPrioridades = [
  ...formularioPesquisa.querySelectorAll('input[name="prioridades"]'),
];
const botaoEnviarPesquisa = document.querySelector("#botao-enviar-pesquisa");
const mensagemPesquisa = document.querySelector("#mensagem-pesquisa");
const estadoBackend = document.querySelector("#estado-backend");
const botaoRegistrarVoto = formularioVotacao.querySelector('button[type="submit"]');
const mensagemVotacao = document.querySelector("#mensagem-votacao");

let pesquisaEnviada = false;
let enviandoPesquisa = false;

function validarPrioridades() {
  const selecionouTema = camposPrioridades.some((opcao) => opcao.checked);
  camposPrioridades[0].setCustomValidity(
    selecionouTema ? "" : "Selecione pelo menos um tema.",
  );
}

function validarNumeroCampo(valorBruto, nomeCampo, minimo, maximo) {
  const texto = String(valorBruto ?? "").trim();

  if (texto === "") {
    throw new Error(`Informe ${nomeCampo}.`);
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero < minimo || numero > maximo) {
    throw new Error(`${nomeCampo} deve estar entre ${minimo} e ${maximo}.`);
  }

  return numero;
}

function criarDadosPesquisa() {
  const campos = new FormData(formularioPesquisa);

  const numeroMoradores = validarNumeroCampo(
    campos.get("numeroMoradores"),
    "o número de moradores da residência",
    1,
    30,
  );
  const numeroTrabalhadores = validarNumeroCampo(
    campos.get("numeroTrabalhadores"),
    "o número de trabalhadores da residência",
    0,
    30,
  );

  return {
    faixaEtaria: String(campos.get("faixaEtaria") ?? "").trim(),
    estuda: String(campos.get("estuda") ?? "").trim(),
    trabalha: String(campos.get("trabalha") ?? "").trim(),
    rendaFamiliar: String(campos.get("rendaFamiliar") ?? "").trim(),
    numeroMoradores,
    numeroTrabalhadores,
    intencaoVoto: String(campos.get("intencaoVoto") ?? "").trim(),
    prioridades: campos.getAll("prioridades").filter(Boolean),
    consentimento: document.querySelector("#consentimento").checked,
    versaoAvisoPrivacidade: CONFIG.privacyNoticeVersion || "1",
  };
}

function setarMensagem(elemento, texto, tipo = "info") {
  elemento.textContent = texto;
  elemento.dataset.tipo = tipo;
}

async function enviarPesquisa(evento) {
  evento.preventDefault();
  validarPrioridades();

  if (!formularioPesquisa.reportValidity()) {
    return;
  }

  if (!firebase.ready || !firebase.db) {
    setarMensagem(mensagemPesquisa, "Configure o Firebase para ativar o envio das respostas.", "error");
    return;
  }

  if (pesquisaEnviada || enviandoPesquisa) {
    return;
  }

  try {
    const dados = criarDadosPesquisa();

    if (!dados.consentimento) {
      setarMensagem(mensagemPesquisa, "Confirme o consentimento antes de enviar a pesquisa.", "error");
      return;
    }

    if (!dados.prioridades.length) {
      setarMensagem(mensagemPesquisa, "Selecione pelo menos um tema prioritário.", "error");
      return;
    }

    enviandoPesquisa = true;
    botaoEnviarPesquisa.disabled = true;
    setarMensagem(mensagemPesquisa, "Enviando sua pesquisa...", "info");

    await addSurveyResponse(dados);

    pesquisaEnviada = true;
    formularioPesquisa.reset();
    validarPrioridades();
    botaoEnviarPesquisa.textContent = "Pesquisa enviada";
    setarMensagem(mensagemPesquisa, "Pesquisa registrada com sucesso. Agora você pode seguir para a etapa da urna.", "success");
    if (mensagemVotacao) {
      mensagemVotacao.textContent = "A urna ficará disponível após a confirmação do servidor e da pesquisa.";
    }
    if (secaoVotacao) {
      secaoVotacao.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  } catch (erro) {
    setarMensagem(
      mensagemPesquisa,
      erro instanceof Error
        ? `Não foi possível salvar a pesquisa. ${erro.message}`
        : "Não foi possível salvar a pesquisa. Tente novamente.",
      "error",
    );
  } finally {
    enviandoPesquisa = false;
    botaoEnviarPesquisa.disabled = false;
  }
}

function inicializarPublico() {
  if (!firebase.ready) {
    estadoBackend.textContent = "Firebase não configurado";
    setarMensagem(
      mensagemPesquisa,
      "A aplicação ainda não está conectada ao Firebase. Copie a configuração do Firebase Console para js/config.js.",
      "error",
    );
    botaoEnviarPesquisa.disabled = true;
    return;
  }

  estadoBackend.textContent = "Conectado ao Firebase";
  estadoBackend.classList.add("conectado");
  botaoEnviarPesquisa.disabled = false;
  setarMensagem(mensagemPesquisa, "", "info");
}

camposPrioridades.forEach((opcao) => {
  opcao.addEventListener("change", validarPrioridades);
});

formularioPesquisa.addEventListener("submit", enviarPesquisa);
validarPrioridades();
inicializarPublico();
