import json
import threading
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from gps_extractor.server import create_server


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = create_server(port=0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        host, port = cls.server.server_address
        cls.base_url = f"http://{host}:{port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_home_page_is_served(self):
        with urlopen(self.base_url) as response:
            self.assertEqual(response.status, 200)
            self.assertIn(b"lang=\"pt-BR\"", response.read())

    def test_extract_endpoint_returns_fields(self):
        request = Request(
            f"{self.base_url}/api/extract",
            data=json.dumps(
                {"text": "18/10/2026 09:55 -25.428470, -49.273460 ABC1D23"}
            ).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request) as response:
            payload = json.loads(response.read())

        self.assertEqual(
            payload["fields"],
            {
                "data": "18/10/2026",
                "hora": "09:55",
                "latitude": "-25.428470",
                "longitude": "-49.273460",
                "placa": "ABC1D23",
            },
        )

    def test_extract_endpoint_rejects_invalid_payload(self):
        request = Request(
            f"{self.base_url}/api/extract",
            data=b'{"text": 123}',
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with self.assertRaises(HTTPError) as error:
            urlopen(request)

        self.assertEqual(error.exception.code, 400)


if __name__ == "__main__":
    unittest.main()
