from fleet_app.models import DispatchOrder


def _parse_dt(value):
    if not value:
        return None
    return value


def _serialize(order):
    return {
        'id': order.id,
        'orderNo': order.order_no,
        'vehicleId': order.vehicle_id,
        'driverId': order.driver_id,
        'origin': order.origin,
        'destination': order.destination,
        'planDepartAt': order.plan_depart_at.strftime('%Y-%m-%d %H:%M') if order.plan_depart_at else '',
        'planArriveAt': order.plan_arrive_at.strftime('%Y-%m-%d %H:%M') if order.plan_arrive_at else '',
        'actualDepartAt': order.actual_depart_at.strftime('%Y-%m-%d %H:%M') if order.actual_depart_at else None,
        'actualArriveAt': order.actual_arrive_at.strftime('%Y-%m-%d %H:%M') if order.actual_arrive_at else None,
        'cargo': order.cargo,
        'weight': order.weight,
        'freight': order.freight,
        'status': order.status,
        'creatorId': order.creator_id,
        'note': order.note,
    }


def list_orders(status=None):
    queryset = DispatchOrder.objects.select_related('vehicle', 'driver').order_by('-id')
    if status:
        statuses = [item.strip() for item in status.split(',') if item.strip()]
        if statuses:
            queryset = queryset.filter(status__in=statuses)
    return [_serialize(order) for order in queryset]


def create_order(payload):
    vehicle_id = payload.get('vehicleId')
    driver_id = payload.get('driverId')
    order = DispatchOrder.objects.create(
        order_no=payload.get('orderNo') or f"DSP-{DispatchOrder.objects.count() + 1:04d}",
        vehicle_id=vehicle_id or None,
        driver_id=driver_id or None,
        origin=payload.get('origin', ''),
        destination=payload.get('destination', ''),
        plan_depart_at=_parse_dt(payload.get('planDepartAt')),
        plan_arrive_at=_parse_dt(payload.get('planArriveAt')),
        cargo=payload.get('cargo', ''),
        weight=payload.get('weight', 0) or 0,
        freight=payload.get('freight', 0) or 0,
        status=payload.get('status', 'Pending'),
        creator_id=payload.get('creatorId', 1),
        note=payload.get('note', '') or '',
    )
    return _serialize(order)
