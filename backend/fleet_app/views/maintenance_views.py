from rest_framework.decorators import api_view
from rest_framework.response import Response
from fleet_app.services import maintenance_service
from fleet_app.services.errors import BusinessError
from fleet_app.serializers.maintenance_serializer import (
    CompleteMaintenanceSerializer,
    ScheduleMaintenanceSerializer,
)


@api_view(['GET', 'POST'])
def maintenance_records(request):
    if request.method == 'POST':
        serializer = ScheduleMaintenanceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            record = maintenance_service.schedule_record(serializer.validated_data)
        except BusinessError as exc:
            return Response({'detail': exc.message, 'code': exc.code}, status=400)
        return Response(record, status=201)
    active_only = request.query_params.get('active') in ('true', '1')
    return Response(maintenance_service.list_records(active_only=active_only))


@api_view(['POST'])
def start_maintenance(request, record_id):
    try:
        record = maintenance_service.start_record(record_id)
    except BusinessError as exc:
        return Response({'detail': exc.message, 'code': exc.code}, status=400)
    return Response(record)


@api_view(['POST'])
def complete_maintenance(request, record_id):
    serializer = CompleteMaintenanceSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        record = maintenance_service.complete_record(record_id, serializer.validated_data)
    except BusinessError as exc:
        return Response({'detail': exc.message, 'code': exc.code}, status=400)
    return Response(record)
