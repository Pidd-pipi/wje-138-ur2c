from rest_framework import serializers


class CreateDispatchSerializer(serializers.Serializer):
    vehicleId = serializers.IntegerField()
    driverId = serializers.IntegerField()
    origin = serializers.CharField(max_length=120)
    destination = serializers.CharField(max_length=120)
    planDepartAt = serializers.DateTimeField(required=False, allow_null=True)
    planArriveAt = serializers.DateTimeField(required=False, allow_null=True)
    cargo = serializers.CharField(required=False, allow_blank=True, default='')
    weight = serializers.FloatField(required=False, default=0, min_value=0)
    freight = serializers.FloatField(required=False, default=0, min_value=0)
    note = serializers.CharField(required=False, allow_blank=True, default='')
