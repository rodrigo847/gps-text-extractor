import re
from datetime import datetime

_DATE_TIME = re.compile(
    r"\b(?P<date>\d{2}(?P<separator>[/-])\d{2}(?P=separator)\d{4})"
    r"\D+(?P<time>\d{1,2}:\d{2})\b"
)
_COORDINATES = re.compile(
    r"(?<![\w.])(?P<latitude>[+-]?\d+\.\d+)[,;/ ]+"
    r"(?P<longitude>[+-]?\d+\.\d+)(?![\w.])"
)
_PLATE = re.compile(
    r"\b(?:[A-Z]{3}-?\d{4}|[A-Z]{3}\d[A-Z]\d{2})\b",
    re.IGNORECASE,
)


def extract_fields(text: str) -> dict[str, str]:
    """Extract the first valid date/time, coordinate pair, and Brazilian plate."""
    fields: dict[str, str] = {}

    for match in _DATE_TIME.finditer(text):
        date_text = match.group("date")
        time_text = match.group("time")
        date_format = "%d/%m/%Y" if "/" in date_text else "%d-%m-%Y"
        try:
            datetime.strptime(f"{date_text} {time_text}", f"{date_format} %H:%M")
        except ValueError:
            continue
        fields["data"] = date_text
        fields["hora"] = time_text
        break

    for match in _COORDINATES.finditer(text):
        latitude = float(match.group("latitude"))
        longitude = float(match.group("longitude"))
        if -90 <= latitude <= 90 and -180 <= longitude <= 180:
            fields["latitude"] = match.group("latitude")
            fields["longitude"] = match.group("longitude")
            break

    plate_match = _PLATE.search(text)
    if plate_match:
        fields["placa"] = plate_match.group(0).upper()

    return fields
