import unittest

from gps_extractor import extract_fields


class ExtractFieldsTests(unittest.TestCase):
    def test_extracts_valid_fields(self):
        text = (
            "Ocorrencia em 18/10/2026 09:55 nas coordenadas "
            "-25.428470, -49.273460 placa ABC1D23"
        )
        self.assertEqual(
            extract_fields(text),
            {
                "data": "18/10/2026",
                "hora": "09:55",
                "latitude": "-25.428470",
                "longitude": "-49.273460",
                "placa": "ABC1D23",
            },
        )

    def test_accepts_hyphenated_date_and_legacy_plate(self):
        self.assertEqual(
            extract_fields("12-05-2024 8:03 ABC-1234"),
            {"data": "12-05-2024", "hora": "8:03", "placa": "ABC-1234"},
        )

    def test_ignores_invalid_date_and_coordinates(self):
        self.assertEqual(
            extract_fields("35/19/2024 28:90 coordenadas 91.2, 181.5"),
            {},
        )

    def test_rejects_invalid_plate_shape(self):
        self.assertEqual(extract_fields("ABC12D34"), {})


if __name__ == "__main__":
    unittest.main()
