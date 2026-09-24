from rest_framework.decorators import api_view
from rest_framework.response import Response

from fleet_app.serializers.maintenance_serializer import (
    MaintenanceCompleteSerializer,
    MaintenanceRecordSerializer,
    MaintenanceScheduleSerializer,
)
from fleet_app.services import maintenance_service


@api_view(['GET', 'POST'])
def maintenance_records(request):
    if request.method == 'POST':
        payload = MaintenanceScheduleSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        record = maintenance_service.schedule_maintenance(payload.validated_data)
        return Response(MaintenanceRecordSerializer(record).data, status=201)

    records = maintenance_service.list_records(
        status=request.GET.get('status') or None,
        vehicle_id=request.GET.get('vehicleId') or None,
    )
    return Response(MaintenanceRecordSerializer(records, many=True).data)


@api_view(['POST'])
def maintenance_start(request, record_id):
    record = maintenance_service.start_maintenance(record_id)
    return Response(MaintenanceRecordSerializer(record).data)


@api_view(['POST'])
def maintenance_complete(request, record_id):
    payload = MaintenanceCompleteSerializer(data=request.data)
    payload.is_valid(raise_exception=True)
    record = maintenance_service.complete_maintenance(record_id, payload.validated_data)
    return Response(MaintenanceRecordSerializer(record).data)
