from fleet_app.services import state, vehicle_service
from fleet_app.services.errors import BusinessError


def list_orders():
    return [dict(order) for order in state.DISPATCH_ORDERS]


def _has_open_order(vehicle_id):
    """车辆已有待发车或在途的调度单，不能重复派单。"""
    return any(
        order['vehicleId'] == vehicle_id and order['status'] in ('Assigned', 'InProgress')
        for order in state.DISPATCH_ORDERS
    )


def create_order(payload):
    vehicle = vehicle_service.get_vehicle(payload['vehicleId'])
    if vehicle['status'] == 'Maintenance':
        raise BusinessError(
            f'{vehicle["plateNo"]} 正在维修保养，调度中心暂不可选',
            code='vehicle_in_maintenance',
        )
    if vehicle['status'] == 'Retired':
        raise BusinessError(f'{vehicle["plateNo"]} 已报废，无法派单', code='vehicle_retired')
    if vehicle['status'] == 'OnTrip' or vehicle_service.is_vehicle_on_trip(payload['vehicleId']):
        raise BusinessError(f'{vehicle["plateNo"]} 正在运输中，无法重复派单', code='vehicle_on_trip')
    if _has_open_order(payload['vehicleId']):
        raise BusinessError(
            f'{vehicle["plateNo"]} 已有待发车的调度单，完成后才能再次派单',
            code='vehicle_already_assigned',
        )
    order = {
        'id': state.next_id(state.DISPATCH_ORDERS),
        'orderNo': f'DSP-{state.next_id(state.DISPATCH_ORDERS):04d}',
        'vehicleId': payload['vehicleId'],
        'driverId': payload['driverId'],
        'origin': payload.get('origin', ''),
        'destination': payload.get('destination', ''),
        'planDepartAt': payload.get('planDepartAt'),
        'planArriveAt': payload.get('planArriveAt'),
        'actualDepartAt': None,
        'actualArriveAt': None,
        'cargo': payload.get('cargo', ''),
        'weight': payload.get('weight', 0),
        'freight': payload.get('freight', 0),
        'status': 'Assigned',
        'creatorId': payload.get('creatorId', 1),
        'note': payload.get('note', ''),
    }
    state.DISPATCH_ORDERS.append(order)
    return dict(order)
