import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from gps_extractor import extract_fields

_STATIC_DIR = Path(__file__).with_name("static")
_ASSETS = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/parser.mjs": ("parser.mjs", "text/javascript; charset=utf-8"),
}
_MAX_BODY_SIZE = 1_048_576


class _AppHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        asset = _ASSETS.get(self.path)
        if asset is None:
            self.send_error(404)
            return

        filename, content_type = asset
        content = (_STATIC_DIR / filename).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        if self.path != "/api/extract":
            self._send_json(404, {"error": "Rota nao encontrada."})
            return

        content_length = self.headers.get("Content-Length")
        if content_length is None:
            self._send_json(400, {"error": "Corpo da requisicao ausente."})
            return

        try:
            body_size = int(content_length)
        except ValueError:
            self._send_json(400, {"error": "Tamanho da requisicao invalido."})
            return

        if body_size < 0 or body_size > _MAX_BODY_SIZE:
            self._send_json(413, {"error": "Texto excede o limite de 1 MB."})
            return

        try:
            payload = json.loads(self.rfile.read(body_size))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": "Envie um JSON valido."})
            return

        if not isinstance(payload, dict) or not isinstance(payload.get("text"), str):
            self._send_json(400, {"error": "O campo 'text' deve ser um texto."})
            return

        self._send_json(200, {"fields": extract_fields(payload["text"])})

    def _send_json(self, status: int, payload: dict[str, object]) -> None:
        content = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)


def create_server(host: str = "127.0.0.1", port: int = 8000) -> ThreadingHTTPServer:
    """Create the local prototype server, bound to loopback by default."""
    return ThreadingHTTPServer((host, port), _AppHandler)
