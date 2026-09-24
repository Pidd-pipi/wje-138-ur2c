from rest_framework.decorators import api_view
from rest_framework.response import Response
from fleet_app.services.vehicle_service import list_vehicles


@api_view(['GET'])
def vehicles(request):
    available_only = request.query_params.get('available') in ('true', '1')
    return Response(list_vehicles(available_only=available_only))
