from functools import partial
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "out"


class PreviewHandler(SimpleHTTPRequestHandler):
    def send_error(self, code, message=None, explain=None):
        error_page = ROOT / "404.html"
        if code != HTTPStatus.NOT_FOUND or not error_page.is_file():
            return super().send_error(code, message, explain)

        content = error_page.read_bytes()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(content)


if __name__ == "__main__":
    if not (ROOT / "index.html").is_file():
        raise SystemExit("Сначала выполните npm run build.")
    handler = partial(PreviewHandler, directory=str(ROOT))
    with ThreadingHTTPServer(("127.0.0.1", 4173), handler) as server:
        print("http://127.0.0.1:4173", flush=True)
        server.serve_forever()
