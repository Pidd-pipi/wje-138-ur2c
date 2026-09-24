from rest_framework import serializers


class ScheduleMaintenanceSerializer(serializers.Serializer):
    vehicleId = serializers.IntegerField()
    maintenanceType = serializers.ChoiceField(choices=['Routine', 'Repair', 'Emergency', 'Inspection'])
    items = serializers.ListField(child=serializers.CharField(), allow_empty=False)
    cost = serializers.FloatField(min_value=0)
    vendor = serializers.CharField(max_length=120)
    date = serializers.DateField()
    nextMileage = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    nextDate = serializers.DateField(required=False, allow_null=True, default=None)


class CompleteMaintenanceSerializer(serializers.Serializer):
    actualMileage = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    finalCost = serializers.FloatField(required=False, allow_null=True, min_value=0)
