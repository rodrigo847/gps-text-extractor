# GPS Text Extractor

Projeto em fase de descoberta. O primeiro prototipo tenta extrair data/hora,
coordenadas e placas brasileiras de um texto livre. Isso e apenas uma hipotese
inicial baseada no trecho de codigo recebido; o objetivo real do projeto ainda
precisa ser confirmado com seu autor.

## Demonstracao

A interface publicada no GitHub Pages esta disponivel em:
https://rodrigo847.github.io/gps-text-extractor/

## Fluxograma para apresentacao

[Abrir o fluxograma online](https://rodrigo847.github.io/gps-text-extractor/fluxograma.svg).
O [arquivo original](docs/fluxograma-projeto.svg) tambem esta no repositorio.
O diagrama separa a demonstracao online, a integracao HTTP local e a futura
integracao com um GPS real pela internet. Pode ser aberto no navegador ou
inserido em uma apresentacao como imagem vetorial.

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
Nao ha geolocalizacao do aparelho, armazenamento de historico ou rastreamento.
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
