import json

from fleet_app.exceptions import BusinessError


class ErrorHandlerMiddleware:
    """Turn BusinessError raised inside views into a uniform JSON response."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except BusinessError as exc:
            return self._render(exc)

    def process_exception(self, request, exception):
        if isinstance(exception, BusinessError):
            return self._render(exception)
        return None

    @staticmethod
    def _render(exc: BusinessError):
        from django.http import JsonResponse

        return JsonResponse(
            {'code': exc.code, 'message': exc.message},
            status=exc.status_code,
        )
