import { salvarResposta } from "./dados.js";

const form = document.getElementById("form-pesquisa");
const mensagem = document.getElementById("mensagem");
const botaoCorrigir = document.getElementById("corrigir-voto");

function mostrarMensagem(texto, tipo) {
  mensagem.textContent = texto;
  mensagem.className = "mensagem " + tipo;
  mensagem.hidden = false;
  mensagem.scrollIntoView({ behavior: "smooth", block: "center" });
}

document.querySelectorAll('input[name="pautas"]').forEach((caixa) => {
  caixa.addEventListener("change", () => {
    const marcadas = document.querySelectorAll('input[name="pautas"]:checked');
    if (marcadas.length > 3) {
      caixa.checked = false;
      mostrarMensagem("Escolha no máximo 3 pautas.", "erro");
    }
  });
});

const rejeicoes = document.querySelectorAll('input[name="rejeicao"]');
rejeicoes.forEach((caixa) => {
  caixa.addEventListener("change", () => {
    if (!caixa.checked) return;
    rejeicoes.forEach((outra) => {
      if (outra === caixa) return;
      if (caixa.value === "nenhum" || outra.value === "nenhum") outra.checked = false;
    });
  });
});

botaoCorrigir.addEventListener("click", () => {
  document.querySelectorAll('input[name="voto"]').forEach((r) => (r.checked = false));
});

form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dados = new FormData(form);

  const moradores = Number(dados.get("moradores"));
  const trabalhadores = Number(dados.get("trabalhadores"));

  if (trabalhadores > moradores) {
    mostrarMensagem("O número de pessoas que trabalham não pode ser maior que o de moradores.", "erro");
    return;
  }

  const resposta = {
    faixaEtaria: dados.get("faixaEtaria"),
    bairro: dados.get("bairro"),
    rotina: dados.get("rotina"),
    rendaFamiliar: dados.get("rendaFamiliar"),
    moradores: moradores,
    trabalhadores: trabalhadores,
    interessePolitica: Number(dados.get("interessePolitica")),
    certezaVoto: dados.get("certezaVoto"),
    fatorDecisao: dados.get("fatorDecisao"),
    rejeicao: dados.getAll("rejeicao"),
    fontesInformacao: dados.getAll("fontesInformacao"),
    avaliacaoBairro: Number(dados.get("avaliacaoBairro")),
    pautas: dados.getAll("pautas"),
    mudancaBairro: (dados.get("mudancaBairro") || "").trim(),
    voto: dados.get("voto"),
  };

  try {
    await salvarResposta(resposta);
    form.reset();
    mostrarMensagem("Respostas enviadas. Obrigado por participar!", "ok");
  } catch (erro) {
    mostrarMensagem("Não foi possível salvar. Tente novamente.", "erro");
  }
});
