# Integração do backend

Este projeto contém somente a interface estática. O envio da pesquisa e o
registro do voto **ainda não estão conectados**: a tela informa isso ao
participante e não simula confirmação. Este guia descreve o trabalho esperado
para conectar o front-end a um backend Firebase.

## Fluxo esperado

1. A pessoa responde à pesquisa pré-voto.
2. O front envia as respostas ao serviço de pesquisa e só avança depois da
   confirmação do serviço.
3. O front carrega as opções da eleição.
4. A pessoa escolhe uma opção e o front envia o voto ao serviço da urna.
5. A aplicação exibe uma confirmação genérica, sem repetir ou revelar a opção
   escolhida.

Pesquisa e voto são dados diferentes e devem ser armazenados sem identificador
comum. A ordem visual da página, sozinha, **não prova** ao backend que alguém
respondeu à pesquisa. Se a regra exigir comprovação de participação e um voto
por pessoa, a equipe deve projetar credenciais anônimas que não revelem a
resposta da pesquisa nem possam ser associadas ao voto. Um identificador de
usuário salvo junto da cédula quebra o sigilo.

## Estrutura atual do front-end

- `index.html`: textos e campos da pesquisa e da votação.
  `#formulario-pesquisa` e `#formulario-votacao` são formulários separados.
- `css/style.css`: aparência, cores, estados dos controles e layout responsivo.
- `js/script.js`: validação, carregamento da eleição, montagem das opções,
  envio dos formulários e mensagens de conexão/erro. As funções HTTP centrais
  são `chamarApi`, `carregarEleicao`, `enviarPesquisa` e `registrarVoto`.
- `#opcoes-voto`: opções de votação criadas a partir da resposta do backend.
- `#mensagem-pesquisa`, `#mensagem-votacao` e `#estado-backend`: estados
  acessíveis de conexão, sucesso e erro.

### Configuração do cliente

No arquivo `js/config.js`, preencher os valores de configuração:

```js
window.DATAVOTO_CONFIG = Object.freeze({
  apiBaseUrl: "https://api.seu-dominio.org",
  electionId: "id-da-eleicao",
  privacyNoticeVersion: "1",
});
```

`apiBaseUrl` deve ser somente a origem HTTPS da API (sem caminho, consulta ou
credenciais; por exemplo, `https://api.seu-dominio.org`, sem `/api`) e
`electionId` deve ser o identificador fornecido pelo backend. Para testar
localmente, `http://localhost` e `http://127.0.0.1` também são aceitos. Com
qualquer valor vazio, o cliente mantém os envios desabilitados e não finge
sucesso.

Depois de configurar, a página consulta `GET /api/elections/{electionId}` ao
iniciar. Se a eleição estiver aberta e a resposta válida, libera o envio da
pesquisa. Após confirmação `{ "accepted": true }` em
`POST /api/elections/{electionId}/surveys`, libera as opções da urna. O envio
`POST /api/elections/{electionId}/votes` contém apenas `choiceId`; cada
formulário é enviado separadamente e por HTTPS. O serviço deve responder JSON
com `{ "accepted": true }` somente depois de confirmar a gravação.

O JavaScript impede cliques/submit duplicados enquanto uma solicitação está
pendente, mas isso **não substitui idempotência no backend**: conexões podem
cair depois de a gravação ocorrer. Defina no servidor uma forma de lidar com
tentativas repetidas sem duplicar respostas ou votos. Não retorne dados
individuais à página.

Mantenha a interface estática e sem credenciais administrativas. O GitHub Pages
publica os arquivos do front-end; Cloud Functions for Firebase (ou um backend
Firebase equivalente) recebe as operações privadas. O Firebase Web config pode
ser usado no front-end, pois não é uma credencial secreta. Chaves de service
account, Admin SDK e segredos devem ficar somente no servidor.

## Contrato HTTP sugerido

Use HTTPS e configure CORS somente para os domínios publicados autorizados.
Como a página envia JSON entre domínios, a API também precisa responder ao
preflight `OPTIONS` e permitir os métodos `GET` e `POST` e o cabeçalho
`Content-Type`. Os nomes abaixo são uma proposta simples; se o backend escolher
Firebase callable functions, preserve os mesmos dados, validações e separação.

### `GET /api/elections/{electionId}`

Retorna a eleição aberta e suas opções públicas:

```json
{
  "id": "eleicao-atual",
  "status": "open",
  "title": "Votação",
  "choices": [
    { "id": "opcao-1", "label": "Opção 1" },
    { "id": "opcao-2", "label": "Opção 2" }
  ]
}
```

O front cria controles `radio` a partir de `choices`. Os identificadores devem
ser estáveis e a validação final deve ocorrer novamente no backend.

### `POST /api/elections/{electionId}/surveys`

Exemplo do corpo permitido, baseado nos campos atuais:

```json
{
  "faixaEtaria": "18 a 24 anos",
  "estuda": "Sim",
  "trabalha": "Sim",
  "rendaFamiliar": "Prefiro não responder",
  "numeroMoradores": 3,
  "numeroTrabalhadores": 2,
  "intencaoVoto": "Ainda estou em dúvida",
  "prioridades": ["Saúde", "Educação"],
  "consentimento": true,
  "versaoAvisoPrivacidade": "1"
}
```

Não inclua nome, e-mail, telefone, documento, endereço, bairro, coordenadas,
identificador de usuário, escolha do voto ou token da urna neste registro.
Rejeite campos inesperados e valores fora das opções permitidas. Em sucesso,
retorne apenas uma confirmação sem ecoar as respostas; por exemplo,
`{ "accepted": true }`.

### `POST /api/elections/{electionId}/votes`

Exemplo de corpo:

```json
{
  "choiceId": "opcao-1",
  "anonymousCredential": "credencial-de-uso-unico"
}
```

O cliente atual envia `choiceId`. O backend deve validar que a eleição está
aberta e que a opção existe. Em sucesso, responda somente com confirmação
genérica; não devolva o voto nem o associe à pesquisa.

O cliente ainda não implementa emissão/entrega de credenciais anônimas. Se o
requisito for limitar cada pessoa a um voto, combine antes com quem fará o
backend um protocolo de credencial de uso único, independente da resposta da
pesquisa, e conecte-o ao fluxo da urna antes de publicar. O backend deve
consumir essa credencial atomicamente junto com o voto.

Se o projeto precisar de credencial anônima, defina também um fluxo separado
para obtê-la, por exemplo `POST /api/elections/{electionId}/credentials/redeem`.
Esse fluxo pode trocar um código de uso único distribuído separadamente por
uma credencial curta para a urna. Não derive o código da resposta da pesquisa,
não armazene a credencial na coleção de respostas e mantenha-a somente em
memória no navegador até enviar o voto.

Sem credencial anônima, o backend não consegue garantir um voto por pessoa
apenas com código no navegador. Não use autenticação identificável junto ao
registro da cédula. Credenciais emitidas para controle de participação devem
ser armazenadas separadamente e projetadas para não criar um vínculo entre
identidade, pesquisa e voto; revise também logs e metadados de acesso, que
podem permitir correlação por horário.

## Armazenamento e segurança no Firebase

- Separe coleções/documentos de respostas da pesquisa, credenciais de
  elegibilidade já utilizadas e cédulas. A cédula guarda somente a eleição e
  a opção escolhida, sem referência à resposta da pesquisa ou à identidade.
- Não habilite gravação ou leitura direta dessas coleções pelo navegador.
  Firestore Security Rules devem negar acesso direto; Cloud Functions validam
  os dados e usam Admin SDK no servidor.
- Valide formato, limites numéricos, opções, estado/horário da eleição e
  tamanho dos pedidos no servidor. Use operação atômica para impedir reutilizar
  uma credencial de voto.
- Não registre corpos de requisição, respostas, escolhas, credenciais ou
  tokens nos logs. Desative Analytics e ferramentas de replay/telemetria que
  capturem respostas; evite salvar dados em `localStorage` ou `sessionStorage`.
- Ative Firebase App Check e controles de abuso, mas não trate App Check, CORS
  ou código do navegador como prova de identidade ou garantia de voto único.
- Não exponha resultados individuais. A apuração pública deve retornar somente
  totais agregados, após verificar o estado da eleição. Não publique recortes
  de respostas com grupos tão pequenos que possam revelar participantes.
- Antes de publicar, revise o aviso de privacidade, prazo de retenção, acesso
  administrativo e requisitos legais aplicáveis. Opinião política é dado
  sensível; a pesquisa atual também permite participantes menores de idade.
  A equipe responsável deve revisar a base legal e o tratamento desses dados.

## Configuração e publicação

1. Criar o projeto Firebase e habilitar Firestore, Cloud Functions e App Check.
2. Implementar o contrato acima no servidor e configurar regras que neguem
   operações diretas do cliente.
3. Popular a eleição e suas opções no backend; não inventar candidatos ou
   opções no front-end.
4. Preencher `window.DATAVOTO_CONFIG` em `js/config.js`, confirmar que as rotas implementadas
   correspondem ao contrato e testar cada envio. Se forem usadas funções
   callable em vez dos endpoints HTTP, adaptar `chamarApi` preservando as
   respostas e a separação entre pesquisa e voto.
5. Testar pesquisa, transição para a urna, voto duplicado, eleição fechada,
   erros de rede, regras do Firestore e ausência de vínculo entre os registros.
6. Publicar a interface no GitHub Pages e autorizar o domínio nas configurações
   de CORS/App Check do backend.

Enquanto essa integração não for concluída, a pesquisa informa que não foi
enviada e a urna permanece desabilitada.
