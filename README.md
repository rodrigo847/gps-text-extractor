# Sinaliza

**Um registro pode ajudar. Sua seguranca vem primeiro.**

Prototipo para organizar relatos de possiveis avistamentos de veiculos:
extrair campos de texto, revisar placas por OCR e visualizar coordenadas.
A proposta social e apoiar, no futuro, a triagem de informacoes por autoridades,
sem incentivar abordagens, perseguicoes ou exposicao publica de pessoas.
O escopo ainda precisa ser validado com o autor do projeto e potenciais parceiros.

## Escopo e seguranca

- Projeto independente, sem vinculo oficial com autoridades.
- Nao envia denuncias, consulta registros de roubo/furto ou identifica proprietarios.
- Uma placa reconhecida ou um ponto no mapa nao comprovam crime ou avistamento.
- Nao se aproxime para fotografar, nao siga veiculos e nao confronte ninguem.
  Nao divulgue placas e localizacoes como acusacoes; use os canais oficiais.
- Em risco imediato no Brasil, procure um local seguro e ligue 190.
- Teste a camera com placas ficticias ou capturas autorizadas.
- Integracoes oficiais exigiriam parceria formal, base legal, controle de acesso,
  protecao de dados, medidas contra relatos falsos e revisao humana.

Sinaliza e um nome de trabalho, sem verificacao de marca ou dominio.
O nome tecnico do pacote (`gps-text-extractor`) e os links existentes foram
preservados para nao interromper a instalacao e o acesso a demonstracao.

## Demonstracao

A interface publicada no GitHub Pages esta disponivel em:
https://rodrigo847.github.io/gps-text-extractor/

## Fluxograma para apresentacao

[Abrir o fluxograma online](https://rodrigo847.github.io/gps-text-extractor/fluxograma.svg).
O [arquivo original](docs/fluxograma-projeto.svg) tambem esta no repositorio.
O diagrama separa a demonstracao online, a integracao HTTP local e a futura
integracao com um GPS externo pela internet, alem do novo fluxo de camera com
GPS e OCR no navegador. Pode ser aberto no navegador ou
inserido em uma apresentacao como imagem vetorial.

## Pesquisas para evolucao

[Leitura de placas e uso autorizado de cameras](docs/pesquisa-leitura-placas-cameras.md):
pesquisa de 18/10/2026 com fontes, limitacoes, base UFPR-ALPR e proximas etapas
para avaliar deteccao especializada e futuras integracoes.

## Requisitos

- Python 3.10 ou superior
- Nenhuma dependencia externa para executar o prototipo

## Comecar

Na raiz do projeto, instale o pacote em modo editavel e execute os testes:

```powershell
python -m pip install -e .
python -m unittest discover -s tests -v
```

## Testar a interface web localmente

Inicie o servidor local para testar a interface:

```powershell
python -m gps_extractor
```

Abra `http://127.0.0.1:8000` no navegador do computador. Para simular uma tela
de celular, no Chrome ou Edge abra as ferramentas do desenvolvedor (`F12`) e
ative o modo de dispositivo (`Ctrl+Shift+M`). O texto de exemplo ja vem
preenchido. Para encerrar o servidor, volte ao terminal e pressione `Ctrl+C`.

Esse modo testa a interface em tamanhos de celular, mas nao simula recursos
nativos como camera, GPS do aparelho ou notificacoes. **Analisar texto** executa
a extracao no navegador. **Testar envio HTTP** envia o texto ao servidor Python
local e mostra a resposta da API.

## Visualizar um ponto no mapa

Depois de analisar um texto com coordenadas validas, a interface oferece
**Carregar mapa online**. O mapa OpenStreetMap mostra um marcador no primeiro
par de coordenadas reconhecido. A placa, data e hora extraidas aparecem como
identificacao ao lado do mapa, quando presentes. Tambem funciona com coordenadas
sem placa, tanto na analise do navegador quanto na resposta HTTP local.

O mapa so e consultado apos clicar no botao. O provedor recebe o IP e as
coordenadas/regiao consultada, mas nao recebe a placa nem o texto do relato.
Na analise de texto nao ha geolocalizacao do aparelho. O fluxo de camera abaixo
solicita essa permissao explicitamente. Nao ha historico ou rastreamento.
Ao editar o texto, o mapa anterior e removido ate uma nova analise.

**Importante:** encontrar placa e coordenadas no mesmo texto nao comprova que
o veiculo esteve naquele ponto. Este prototipo usa a primeira ocorrencia de
cada campo independentemente e e destinado a um relato de uma ocorrencia por
vez. Textos com varias placas ou locais podem produzir uma associacao incorreta.
O mapa exige internet; se nao carregar, existe um link para abrir o mesmo ponto
diretamente no OpenStreetMap.

Para validar a parte do navegador (Node.js instalado), execute:

```powershell
node --test tests/test_static_parser.mjs
```

## Capturar foto da placa com GPS e OCR

Na interface simplificada, a camera e a acao principal. Um unico menu
**Mais opções**, fechado inicialmente, guarda **Privacidade e uso seguro**,
**Sobre o Sinaliza** e **Colar texto ou coordenadas**. Esses itens tambem
comecam fechados. O envio HTTP fica em
**Teste tecnico da API local**. Os avisos essenciais e a revisao da captura
continuam visiveis no momento de uso.

Na nova secao **Ler placa pela camera**, siga este fluxo:

1. Abra a pagina em um celular por HTTPS (ou use localhost no computador).
2. Clique em **Abrir camera** e permita o acesso. A camera traseira e preferida,
   mas o navegador pode oferecer outra camera.
3. Use uma placa ficticia ou captura autorizada. Enquadre a placa na faixa
   apenas se ja estiver legivel sem se aproximar. Nunca siga veiculos,
   confronte pessoas ou utilize a camera enquanto dirige.
   A previa e uma janela compacta horizontal, sem abrir em tela cheia.
   Se a camera disponibilizar zoom ao navegador, um controle aparece no painel;
   caso contrario, o app informa que ele nao esta disponivel. O zoom pode ser
   digital e nao garante novos detalhes nem leitura a distancia.
4. A tela acompanha a abertura da camera. Toque em **Tirar foto**, no painel
   junto da previa, e permita a localizacao. O botao fica desativado e mostra
   **Obtendo GPS...** durante a espera para evitar capturas duplicadas.
   O app solicita uma posicao nova e so captura a imagem depois de recebe-la.
   Se o aparelho retornar uma posicao antiga, o app aguarda atualizacoes do GPS
   por ate 25 segundos, sem usar o ponto antigo. A observacao e encerrada ao
   obter uma posicao recente, negar permissao, sair da pagina ou atingir o prazo.
   Posicoes com mais de 15 segundos de diferenca da captura continuam recusadas.
5. O recorte da placa e processado por Tesseract.js 6.0.1 no navegador.
   O app solicita video de ate 3840 x 2160 como preferencia, nao como garantia:
   a resolucao efetiva depende do aparelho/navegador. O recorte acompanha a faixa
   visivel, inclusive com camera em retrato, e preserva ate 2400 pixels de largura.
   Tesseract e OCR generico, nao um detector especializado de placas distantes;
   imagens desfocadas, pequenas, inclinadas ou com reflexo podem nao ser lidas.
   A camera e desligada apos capturar. Revise a foto e o texto reconhecido.
6. Confira ou corrija a placa, confira as coordenadas e a precisao estimada,
   marque a confirmacao e clique em **Confirmar dados para o mapa**.
7. Clique em **Carregar mapa online** para consultar o ponto do aparelho.

A foto nao recebe coordenadas EXIF: a imagem recortada e as coordenadas ficam
associadas em memoria nesta sessao. Nao ha upload da imagem, envio automatico
para API, banco de dados ou exportacao persistente desse registro.
**Descartar foto e dados** limpa a captura; sair da pagina desliga a camera.
Este fluxo nao le fotos antigas da galeria nem seus metadados.

O ponto representa a posicao do aparelho que capturou a foto, nao a posicao
comprovada do veiculo. GPS pode ser impreciso ou adulterado. A tela informa
a precisao estimada em metros; nao aplica um limite automatico de precisao.
O OCR pode trocar caracteres ou nao encontrar placa: sem resultado unico,
e preciso digitar/revisar a placa. Falhas de OCR permitem revisao manual da
foto capturada; falhas de GPS impedem associar a foto ao mapa.

O motor, o worker e os dados de idioma do OCR sao baixados de CDNs externos
no primeiro uso, podendo exigir novos downloads depois. Esses provedores
recebem dados de conexao (como IP), mas a aplicacao nao envia a foto, placa ou
coordenadas a eles para reconhecimento. O mapa consulta outro provedor, apenas
apos clique, conforme descrito acima. Camera e GPS dependem das permissoes do
usuario e do suporte do navegador. Nao ha reconhecimento especializado de
veiculos, consulta a cadastros, alertas de veiculo procurado ou rastreamento.

Teste os modulos do navegador com Node.js:

```powershell
node --test tests/test_static_parser.mjs tests/test_capture_data.mjs
```

## Receber texto de um GPS/app por HTTP

Com o servidor rodando, outro programa pode enviar um POST para
`http://127.0.0.1:8000/api/ingest` com JSON:

```json
{
  "device_id": "gps-demo-01",
  "text": "Ocorrencia em 18/10/2026 09:55 nas coordenadas -25.428470, -49.273460 placa ABC1D23"
}
```

O campo `text` e obrigatorio. `device_id` e opcional. A resposta contem `ok`,
uma mensagem e os campos que o extrator reconheceu:

```json
{
  "ok": true,
  "message": "Texto recebido e processado.",
  "fields": {
    "data": "18/10/2026",
    "hora": "09:55",
    "latitude": "-25.428470",
    "longitude": "-49.273460",
    "placa": "ABC1D23"
  },
  "device_id": "gps-demo-01"
}
```

Teste pelo PowerShell enquanto o servidor estiver rodando:

```powershell
$body = @{
  device_id = "gps-demo-01"
  text = "Ocorrencia em 18/10/2026 09:55 nas coordenadas -25.428470, -49.273460 placa ABC1D23"
} | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/ingest" -Method Post -ContentType "application/json" -Body $body
```

O botao **Testar envio HTTP** na interface faz a mesma chamada e exibe os
campos retornados. O botao **Analisar texto** continua funcionando sem API.
Este prototipo nao grava os relatos. O servidor aceita conexoes somente do
proprio computador; nao o exponha a internet ou a outros dispositivos sem
definir autenticacao, protecao de dados e hospedagem adequada. O GitHub Pages
publica somente a interface estatica e nao oferece essa API; para um GPS real
enviar dados pela internet, ainda sera necessario hospedar um backend.

## Publicar no GitHub Pages

O site e estatico e pode ser hospedado gratuitamente pelo GitHub Pages. Crie um
repositorio e envie o projeto para a branch `main`. O workflow em
`.github/workflows/pages.yml` publica automaticamente o conteudo de
`src/gps_extractor/static` quando habilitado em **Settings > Pages > Build and
deployment > Source: GitHub Actions**. Depois do primeiro deploy, o GitHub mostra
a URL publica nessa mesma pagina. A URL costuma ser
`https://<usuario>.github.io/<repositorio>/`.

O GitHub Pages hospeda apenas a interface estatica; nao executa o servidor Python.
Por isso, a extracao na pagina e feita no proprio navegador.

Para experimentar a funcao com um texto:

```powershell
python -c "from gps_extractor import extract_fields; print(extract_fields('Ocorrencia em 18/10/2026 09:55 nas coordenadas -25.428470, -49.273460 placa ABC1D23'))"
```

A funcao retorna somente os campos encontrados. Datas e horas sao validadas;
coordenadas precisam estar dentro dos limites geograficos; placas sao
normalizadas para maiusculas.

## Estrutura

```text
src/gps_extractor/  codigo da biblioteca
src/gps_extractor/static/ interface web do prototipo
tests/              testes automatizados
```

## Proximos passos para definir a direcao

Antes de crescer o escopo, converse com o autor e descubra:

1. Quem vai usar o projeto e qual problema concreto ele resolve?
2. De onde vem o texto: digitacao, OCR de imagens, documentos ou outra fonte?
3. Quais campos e formatos sao obrigatorios? Pode haver mais de uma ocorrencia?
4. O resultado deve ser uma biblioteca, ferramenta de linha de comando, API ou interface?
5. Ha requisitos de privacidade, armazenamento, auditoria ou integracao com mapas?

As respostas devem orientar o proximo incremento. Evite assumir que placas ou
dados de ocorrencias fazem parte do produto ate confirmar o contexto e o uso
pretendido.
