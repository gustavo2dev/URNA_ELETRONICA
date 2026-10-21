# Inventário do projeto e prompt de integração

## O que já existe

O projeto contém três páginas HTML com estilos incorporados nos próprios arquivos:

- `index.html`: pesquisa anônima sobre voto e vida em Campo Largo. O formulário `form-pesquisa` reúne faixa etária, bairro, rotina, renda familiar, moradores, trabalhadores, opiniões sobre voto, rejeições, fontes de informação, avaliação de serviços, pautas e uma resposta aberta opcional.
- `voto.html`: votação simulada no formulário `form-voto`, com opções de candidatos, voto em branco e voto nulo. O texto da página deixa claro que não é uma votação oficial.
- `admin.html`: tela de entrada e painel com indicadores, seis espaços para gráficos e uma tabela de respostas recentes. O painel começa oculto no HTML e deve ser mostrado somente após uma autenticação válida.

As páginas têm navegação entre si e adaptam seus elementos a telas menores. Os campos de texto, seleção e número usam fundo claro, texto escuro legível, placeholders acessíveis e destaque de foco. Os comentários de código foram removidos.

## O que ainda não existe

Não há arquivos JavaScript, conexão com banco de dados, configuração de serviços, autenticação funcional nem biblioteca de gráficos no projeto. Portanto, os formulários e a área administrativa ainda são apenas a interface: não salvam, carregam ou autenticam dados por conta própria. Nenhuma senha, chave privada ou credencial deve ser colocada no HTML ou em JavaScript público.

## Prompt para a IA que fará a integração

```text
Analise todos os arquivos do projeto antes de alterar qualquer coisa. Este projeto é somente o front-end de uma pesquisa escolar e votação simulada, feito atualmente com três páginas HTML: index.html, voto.html e admin.html. A tarefa é integrar scripts e serviços ao front existente, sem refazer o design ou mudar os campos, rótulos, IDs, names e values dos formulários sem necessidade comprovada.

Contrato da interface:
- index.html: formulário id="form-pesquisa". Os campos incluem faixaEtaria, bairro, rotina, rendaFamiliar, moradores, trabalhadores, interessePolitica, certezaVoto, fatorDecisao, rejeicao (múltipla escolha), fontesInformacao (múltipla escolha), avaliacaoBairro, pautas (até três escolhas) e mudancaBairro (texto opcional).
- voto.html: formulário id="form-voto", com escolha única name="voto" e values "01", "02", "03", "branco" ou "nulo". A página é uma simulação escolar, não uma votação oficial.
- admin.html: formulário de entrada id="form-login", campo de senha id="senha", mensagem id="erro-login", painel id="area-painel" (começa com o atributo hidden), indicadores id="total", id="media-moradores" e id="media-trabalhadores", canvases id="grafico-faixa", id="grafico-bairro", id="grafico-certeza", id="grafico-renda", id="grafico-pautas", id="grafico-votos" e corpo da tabela id="linhas".

Implemente a integração necessária em arquivos de script separados e atualize os HTMLs apenas para carregar esses arquivos corretamente. Antes de escolher um serviço de dados, procure configuração ou documentação existente; hoje não há backend nem configuração de Firebase no projeto. Se a integração exigir credenciais, regras ou infraestrutura ainda não fornecidas, não invente valores nem exponha segredos no front: implemente apenas o que pode ser feito com segurança, documente claramente a configuração necessária e pergunte pelos dados ausentes.

Requisitos:
1. Validar formulários e fornecer mensagens de sucesso e erro acessíveis, sem perder os valores em caso de falha.
2. Salvar respostas da pesquisa e votos usando o serviço de dados configurado, com tratamento explícito de erros.
3. Aplicar o limite de até três opções no campo pautas e validar que trabalhadores não exceda moradores.
4. Implementar autenticação administrativa real pelo backend/serviço escolhido. Não tratar senha verificada somente no navegador como proteção. Manter area-painel oculta até a autenticação ser confirmada e proteger a leitura dos dados no servidor.
5. Carregar dados agregados para indicadores, tabela e gráficos sem expor dados pessoais. A pesquisa deve continuar anônima; não coletar nomes, CPF ou telefone.
6. Usar uma biblioteca de gráficos apropriada somente se necessário e evitar duplicar handlers ou códigos de ligação.
7. Preservar responsividade, acessibilidade, textos em português e o funcionamento dos formulários quando houver falhas de rede.
8. Não incluir chaves privadas, credenciais administrativas ou segredos nos arquivos públicos. Não realizar mudanças destrutivas ou apagar dados existentes.
9. Adicionar ou atualizar documentação de configuração, estrutura de dados, regras de segurança e instruções locais de execução.
10. Executar as verificações disponíveis e resumir os arquivos alterados, as configurações externas ainda necessárias e os testes realizados.
```
