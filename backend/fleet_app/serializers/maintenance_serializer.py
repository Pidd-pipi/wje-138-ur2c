from rest_framework import serializers

from fleet_app.constants import MaintenanceStatus, MaintenanceType
from fleet_app.models import MaintenanceRecord, Vehicle


class VehicleBriefSerializer(serializers.ModelSerializer):
    plateNo = serializers.CharField(source='plate_no', read_only=True)

    class Meta:
        model = Vehicle
        fields = ['id', 'plateNo', 'status']


class MaintenanceScheduleSerializer(serializers.Serializer):
    vehicleId = serializers.IntegerField()
    maintenanceType = serializers.ChoiceField(
        choices=MaintenanceType.CHOICES, default=MaintenanceType.ROUTINE
    )
    # 兼容旧字段名 type
    type = serializers.ChoiceField(choices=MaintenanceType.CHOICES, required=False)
    items = serializers.ListField(child=serializers.CharField(), required=False)
    estimatedCost = serializers.FloatField(min_value=0, default=0)
    vendor = serializers.CharField(allow_blank=True, default='')
    date = serializers.DateField()
    nextMileage = serializers.IntegerField(min_value=0, required=False, default=0)
    nextDate = serializers.DateField(required=False, allow_null=True, default=None)

    def validate(self, attrs):
        if not attrs.get('maintenanceType') and attrs.get('type'):
            attrs['maintenanceType'] = attrs['type']
        return attrs


class MaintenanceCompleteSerializer(serializers.Serializer):
    actualMileage = serializers.IntegerField(min_value=0)
    finalCost = serializers.FloatField(min_value=0)


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicleId = serializers.IntegerField(source='vehicle_id')
    vehiclePlateNo = serializers.CharField(source='vehicle.plate_no', read_only=True)
    vehicleStatus = serializers.CharField(source='vehicle.status', read_only=True)
    maintenanceType = serializers.CharField(source='maintenance_type')
    type = serializers.CharField(source='maintenance_type', read_only=True)
    estimatedCost = serializers.FloatField(source='estimated_cost')
    actualMileage = serializers.IntegerField(source='actual_mileage')
    nextMileage = serializers.IntegerField(source='next_mileage')
    nextDate = serializers.DateField(source='next_date', format='%Y-%m-%d')
    startedAt = serializers.DateTimeField(source='started_at', format='%Y-%m-%d %H:%M', allow_null=True)
    completedAt = serializers.DateTimeField(source='completed_at', format='%Y-%m-%d %H:%M', allow_null=True)

    class Meta:
        model = MaintenanceRecord
        fields = [
            'id', 'vehicleId', 'vehiclePlateNo', 'vehicleStatus',
            'maintenanceType', 'type', 'items', 'cost', 'estimatedCost',
            'actualMileage', 'vendor', 'date', 'nextMileage', 'nextDate',
            'status', 'startedAt', 'completedAt',
        ]
