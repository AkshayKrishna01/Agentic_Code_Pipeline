"""Email validation utilities."""

import re
from typing import Final

_EMAIL_REGEX: Final[re.Pattern] = re.compile(
    r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)"
)


def is_valid_email(email: str) -> bool: 

    Args:
        email (str): The email address to validate.

    Returns:
        bool: True if the email address matches the pattern, False otherwise.

    Raises:
        TypeError: If the provided argument is not a string.
    """
    if not isinstance(email, str):
        raise TypeError("Email must be a string")

    return bool(_EMAIL_REGEX.fullmatch(email))