from rest_framework.decorators import api_view
from rest_framework.response import Response

from fleet_app.services.driver_service import list_drivers


@api_view(['GET'])
def drivers(request):
    return Response(list_drivers(status=request.GET.get('status') or None))
