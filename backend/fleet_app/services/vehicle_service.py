from fleet_app.models import Vehicle


def _serialize(vehicle):
    return {
        'id': vehicle.id,
        'plateNo': vehicle.plate_no,
        'type': vehicle.vehicle_type,
        'brandModel': vehicle.brand_model,
        'purchaseDate': vehicle.purchase_date.isoformat() if vehicle.purchase_date else '',
        'insuranceExpireDate': vehicle.insurance_expire_date.isoformat() if vehicle.insurance_expire_date else '',
        'inspectionExpireDate': vehicle.inspection_expire_date.isoformat() if vehicle.inspection_expire_date else '',
        'status': vehicle.status,
        'mileage': vehicle.mileage,
        'tankCapacity': vehicle.tank_capacity,
        'fuelConsumption': vehicle.fuel_consumption,
    }


def list_vehicles(status=None):
    queryset = Vehicle.objects.all().order_by('id')
    if status:
        # 支持逗号分隔的多状态过滤，例如 status=Available
        statuses = [item.strip() for item in status.split(',') if item.strip()]
        if statuses:
            queryset = queryset.filter(status__in=statuses)
    return [_serialize(vehicle) for vehicle in queryset]
