"""Business-level exceptions, rendered as JSON by the error handler middleware."""


class BusinessError(Exception):
    """A rule violation that should be surfaced to the user with a clear reason."""

    status_code = 400
    code = 'BUSINESS_ERROR'

    def __init__(self, message: str, code: str | None = None, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(BusinessError):
    status_code = 404
    code = 'NOT_FOUND'


class ConflictError(BusinessError):
    status_code = 409
    code = 'CONFLICT'
