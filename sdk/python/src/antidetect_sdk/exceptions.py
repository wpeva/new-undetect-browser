"""
Exceptions for UndetectBrowser SDK
"""

from typing import Optional


class AntidetectError(Exception):
    """Base exception for SDK errors"""

    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code

    def __str__(self) -> str:
        if self.code:
            return f"[{self.code}] {self.message}"
        return self.message


class AuthenticationError(AntidetectError):
    """Raised when authentication fails"""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, code="AUTH_ERROR", status_code=401)


class NotFoundError(AntidetectError):
    """Raised when a resource is not found"""

    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", code="NOT_FOUND", status_code=404)


class ValidationError(AntidetectError):
    """Raised when validation fails"""

    def __init__(self, message: str):
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)


class ConnectionError(AntidetectError):
    """Raised when connection to server fails"""

    def __init__(self, message: str = "Failed to connect to server"):
        super().__init__(message, code="CONNECTION_ERROR")


class RateLimitError(AntidetectError):
    """Raised when rate limit is exceeded"""

    def __init__(self, retry_after: Optional[int] = None):
        message = "Rate limit exceeded"
        if retry_after:
            message += f". Retry after {retry_after} seconds"
        super().__init__(message, code="RATE_LIMIT", status_code=429)
        self.retry_after = retry_after


class ServerError(AntidetectError):
    """Raised when server returns 5xx error"""

    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, code="SERVER_ERROR", status_code=500)
