from rest_framework.decorators import api_view
from rest_framework.response import Response

from fleet_app.models import FuelRecord


def list_fuel_records(vehicle_id=None):
    queryset = FuelRecord.objects.select_related('vehicle').order_by('-date', '-id')
    if vehicle_id:
        queryset = queryset.filter(vehicle_id=vehicle_id)
    return [
        {
            'id': record.id,
            'vehicleId': record.vehicle_id,
            'date': record.date.isoformat() if record.date else '',
            'liters': record.liters,
            'unitPrice': record.unit_price,
            'totalAmount': record.total_amount,
            'mileage': record.mileage,
            'station': record.station,
            'paymentMethod': record.payment_method,
        }
        for record in queryset
    ]
