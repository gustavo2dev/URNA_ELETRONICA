import { listarRespostas } from "./dados.js";

const SENHA = "cesf2026";

const areaLogin = document.getElementById("area-login");
const areaPainel = document.getElementById("area-painel");
const formLogin = document.getElementById("form-login");
const erroLogin = document.getElementById("erro-login");

const nomes = {
  certezaVoto: {
    "decidido-firme": "Decidido (firme)",
    "decidido-pode-mudar": "Decidido (pode mudar)",
    "indeciso": "Indeciso",
    "branco-nulo": "Branco ou nulo",
    "nao-votar": "Não pretende votar",
  },
  renda: {
    "ate-1": "Até 1 SM",
    "1-2": "1 a 2 SM",
    "2-3": "2 a 3 SM",
    "3-5": "3 a 5 SM",
    "5-10": "5 a 10 SM",
    "10+": "Mais de 10 SM",
    "nao-informar": "Não informou",
  },
  pautas: {
    "saude": "Saúde",
    "educacao": "Educação",
    "seguranca": "Segurança",
    "emprego-renda": "Emprego e renda",
    "transporte": "Transporte",
    "saneamento-ambiente": "Saneamento e ambiente",
    "moradia": "Moradia",
    "esporte-cultura": "Esporte e cultura",
    "corrupcao": "Combate à corrupção",
  },
  voto: {
    "13": "13 - Lula (PT)",
    "22": "22 - Flávio Bolsonaro (PL)",
    "branco": "Branco",
  },
};

const cores = ["#2a3fd8", "#e8782a", "#17935a", "#8995ff", "#b00020", "#f2b705", "#667085", "#5c2ad8", "#1b2340"];
let graficos = [];

function contar(respostas, campo) {
  const contagem = {};
  respostas.forEach((r) => {
    const valores = Array.isArray(r[campo]) ? r[campo] : [r[campo]];
    valores.forEach((v) => {
      if (v) contagem[v] = (contagem[v] || 0) + 1;
    });
  });
  return contagem;
}

function media(respostas, campo) {
  if (respostas.length === 0) return 0;
  const soma = respostas.reduce((acc, r) => acc + Number(r[campo] || 0), 0);
  return soma / respostas.length;
}

function criarGrafico(id, tipo, contagem, mapa = {}, ordem = null) {
  const chaves = ordem ? ordem.filter((k) => k in contagem) : Object.keys(contagem);
  const grafico = new Chart(document.getElementById(id), {
    type: tipo,
    data: {
      labels: chaves.map((k) => mapa[k] || k),
      datasets: [{
        data: chaves.map((k) => contagem[k]),
        backgroundColor: tipo === "doughnut" ? cores : "#2a3fd8",
      }],
    },
    options: {
      indexAxis: tipo === "bar-h" ? "y" : "x",
      plugins: { legend: { display: tipo === "doughnut" } },
      scales: tipo === "doughnut" ? {} : { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
  graficos.push(grafico);
}

async function mostrarPainel() {
  const respostas = await listarRespostas();

  document.getElementById("total").textContent = respostas.length;
  document.getElementById("media-moradores").textContent = media(respostas, "moradores").toFixed(1);
  document.getElementById("media-trabalhadores").textContent = media(respostas, "trabalhadores").toFixed(1);

  graficos.forEach((g) => g.destroy());
  graficos = [];

  criarGrafico("grafico-faixa", "bar", contar(respostas, "faixaEtaria"), {}, ["16-17", "18-24", "25-34", "35-44", "45-59", "60+"]);
  criarGrafico("grafico-bairro", "bar", contar(respostas, "bairro"));
  criarGrafico("grafico-certeza", "doughnut", contar(respostas, "certezaVoto"), nomes.certezaVoto);
  criarGrafico("grafico-renda", "bar", contar(respostas, "rendaFamiliar"), nomes.renda, Object.keys(nomes.renda));
  criarGrafico("grafico-pautas", "bar", contar(respostas, "pautas"), nomes.pautas);
  criarGrafico("grafico-votos", "doughnut", contar(respostas, "voto"), nomes.voto);

  const linhas = document.getElementById("linhas");
  if (respostas.length === 0) return;

  linhas.innerHTML = "";
  respostas.slice(-10).reverse().forEach((r) => {
    const tr = document.createElement("tr");
    [r.faixaEtaria, r.bairro, r.moradores, r.trabalhadores, nomes.certezaVoto[r.certezaVoto] || r.certezaVoto]
      .forEach((valor) => {
        const td = document.createElement("td");
        td.textContent = valor;
        tr.appendChild(td);
      });
    linhas.appendChild(tr);
  });
}

function entrar() {
  areaLogin.hidden = true;
  areaPainel.hidden = false;
  mostrarPainel();
}

formLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();
  if (document.getElementById("senha").value === SENHA) {
    sessionStorage.setItem("datavoto_admin", "1");
    erroLogin.style.display = "none";
    entrar();
  } else {
    erroLogin.style.display = "block";
  }
});

if (sessionStorage.getItem("datavoto_admin") === "1") entrar();
