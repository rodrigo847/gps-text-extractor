# Pesquisa: leitura de placas e uso de cameras no Sinaliza

Data da consulta: 18/10/2026.

Registro preliminar para consultas e pesquisas futuras. Nao representa uma
integracao implementada, autorizacao de acesso a cameras ou parecer juridico.
Links, disponibilidade e termos das fontes devem ser conferidos novamente antes
de qualquer uso.

## Objetivo

Entender como equipamentos de fiscalizacao reconhecem placas e avaliar caminhos
autorizados para testar o Sinaliza com imagens de outras cameras.

## Como funciona o reconhecimento

A medicao de velocidade e a leitura da placa sao funcoes diferentes, embora
possam estar integradas no mesmo equipamento de fiscalizacao.

O reconhecimento automatico de placas, conhecido como LPR ou ANPR, geralmente
segue este fluxo:

1. Capturar imagens do veiculo.
2. Detectar a regiao da placa.
3. Recortar e, quando necessario, corrigir a perspectiva.
4. Reconhecer os caracteres por OCR.
5. Validar o resultado e registrar o evento.

Sistemas especializados podem combinar lentes adequadas, enquadramento da faixa,
exposicao curta para reduzir borroes e iluminacao infravermelha. A configuracao
depende do equipamento, da velocidade e das condicoes de instalacao.

Como exemplo especifico, o manual do AXIS License Plate Verifier recomenda
largura minima de 130 pixels para placas de uma linha e 70 pixels para placas
de duas linhas. Esses valores pertencem aquele produto: nao sao uma regra
universal nem garantia de reconhecimento no Sinaliza.

Fonte: [manual do AXIS License Plate Verifier](https://help.axis.com/en-us/axis-license-plate-verifier).

## Diferenca para o prototipo atual

O Sinaliza usa a faixa enquadrada pela pessoa e o Tesseract.js, um OCR generico.
Ainda nao possui detector automatico especializado de placas, processamento
continuo de video ou integracao com cameras externas.

O zoom disponivel no aparelho pode ajudar no enquadramento, mas pode ser digital
e nao recupera detalhes ausentes. Placas pequenas, desfocadas, inclinadas ou com
reflexos podem nao ser reconhecidas.

## Possibilidade de usar cameras publicas

E tecnicamente possivel processar imagens de uma fonte externa, desde que haja
acesso autorizado, permissao de uso e qualidade suficiente.

| Fonte | Condicoes para avaliar |
| --- | --- |
| Camera propria ou de parceiro | Autorizacao, ambiente controlado e cuidados com terceiros filmados. |
| Imagens publicadas com licenca de reutilizacao | Conferir finalidade permitida, licenca e limites de acesso. |
| Transmissao visivel em um site | Visualizacao publica nao significa permissao para coletar imagens e placas. |
| Camera de prefeitura, concessionaria ou seguranca publica | Consultar o responsavel sobre autorizacao formal e interfaces de integracao. |

Nesta pesquisa nao foi confirmada uma API publica brasileira de leituras de
placas, aberta e com uso autorizado para o nosso teste. Isso nao demonstra que
nenhuma exista; a verificacao deve ser feita com cada operador.

Uma camera panoramica de transito pode mostrar congestionamentos sem oferecer
detalhes suficientes para reconhecer placas. Tambem sera preciso verificar
resolucao, compressao, angulo, horario das imagens, autenticacao, formato de
acesso e limites de requisicoes. Nao se deve contornar controles de acesso.

## Localizacao no mapa

Na captura pelo celular, o prototipo associa a localizacao recente do aparelho
a imagem. Nao extrai coordenadas da placa ou do conteudo visual da foto.

Para uma camera fixa, uma futura integracao deve usar a localizacao cadastrada
da camera, o identificador da fonte e a data/hora da observacao, com sua origem
explicitada. Esse ponto nao determina a posicao exata do veiculo nem constitui
rastreamento.

## Base brasileira encontrada: UFPR-ALPR

A base UFPR-ALPR informa:

- 4.500 imagens anotadas de 150 veiculos.
- Resolucao de 1920 x 1080 pixels.
- Cenarios com movimento do veiculo e da camera.
- Anotacoes da placa e de sua posicao na imagem.

Os responsaveis restringem a disponibilizacao a pesquisa academica e uso nao
comercial, conforme suas condicoes de acesso. Nao devemos presumir que o
Sinaliza se enquadra nem incorporar a base ao projeto sem verificar os termos.
A composicao descrita inclui placas brasileiras antigas; nao devemos presumir
cobertura suficiente de placas Mercosul.

Fontes:

- [Pagina da UFPR](https://web.inf.ufpr.br/vri/databases/ufpr-alpr/).
- [Repositorio atualizado](https://github.com/raysonlaroca/ufpr-alpr-dataset).
- [Condicoes de acesso](https://github.com/raysonlaroca/ufpr-alpr-dataset/blob/master/license-agreement.md).

## Privacidade e seguranca

Placa associada a local e horario pode permitir identificar pessoas e seus
deslocamentos. O tratamento exige avaliar a finalidade e a base legal aplicavel,
alem das permissoes da fonte. A mera disponibilidade na internet nao elimina
esses cuidados.

Antes de um piloto com dados reais, definir:

- Quais dados sao realmente necessarios.
- Quem pode acessar imagens e resultados.
- Prazo de retencao e procedimento de exclusao.
- Protecao do armazenamento e do transporte.
- Revisao humana e tratamento de erros.
- Proibicao de exposicao publica de placas e trajetos.

Nao publicar imagens reais, placas ou coordenadas pessoais no repositorio de
testes. Uma leitura de placa nao comprova crime, roubo/furto ou identidade do
proprietario. Integracoes oficiais dependem de acordo e autorizacao.

Referencia institucional para consulta complementar:
[perguntas frequentes da ANPD](https://www.gov.br/anpd/pt-br/acesso-a-informacao/perguntas-frequentes/perguntas-frequentes).
Essa pagina nao constitui autorizacao especifica para o projeto.

## Proximas etapas sugeridas

1. Montar um teste controlado com camera propria, placas ficticias ou imagens
   autorizadas, sem expor terceiros.
2. Avaliar detectores de placas e suas licencas antes de escolher tecnologia.
3. Comparar o detector mais OCR com o recorte manual atual.
4. Medir acerto da placa completa, placas nao detectadas, falsos positivos e
   tempo de processamento, separando dia/noite, movimento e tipos de placa.
5. Usar dados separados para ajuste e avaliacao, evitando que imagens quase
   identicas do mesmo veiculo aparecam nos dois conjuntos.
6. Definir criterios de aceitacao a partir dos resultados medidos, sem prometer
   distancia de leitura ou precisao antes dos testes.
7. Somente depois procurar um operador de cameras para piloto autorizado.

## Questoes para uma futura parceria

- Qual cidade e qual orgao ou empresa administra as cameras?
- Existe API ou fornecimento autorizado de imagens de teste?
- A permissao inclui reconhecimento de placas e armazenamento dos resultados?
- Quais sao as restricoes de finalidade, acesso, retencao e compartilhamento?
- As imagens tem qualidade suficiente e horario confiavel?
- Como sera cadastrada e validada a localizacao de cada camera?
- Quem fara a revisao humana e recebera eventuais relatos?

## Conclusao

O caminho inicial recomendado e evoluir do OCR de recorte manual para deteccao
e leitura especializada, usando material autorizado e resultados mensuraveis.
O acesso a cameras externas deve ser tratado como uma etapa posterior, nao como
uma funcionalidade ja disponivel no prototipo.
