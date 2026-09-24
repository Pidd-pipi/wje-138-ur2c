from fleet_app.services import state
from fleet_app.services.errors import BusinessError


def list_vehicles(available_only=False):
    if available_only:
        return [v for v in state.VEHICLES if v['status'] == 'Available']
    return list(state.VEHICLES)


def get_vehicle(vehicle_id):
    vehicle = state.find_vehicle(vehicle_id)
    if vehicle is None:
        raise BusinessError('车辆不存在', code='vehicle_not_found')
    return vehicle


def is_vehicle_on_trip(vehicle_id):
    """车辆正在运输：存在进行中、尚未完成的调度单。"""
    return any(
        order['vehicleId'] == vehicle_id
        and order['status'] in state.TRIP_DISPATCH_STATUSES
        for order in state.DISPATCH_ORDERS
    )


def set_status(vehicle_id, status):
    get_vehicle(vehicle_id)['status'] = status


def update_mileage(vehicle_id, mileage):
    vehicle = get_vehicle(vehicle_id)
    vehicle['mileage'] = max(vehicle['mileage'], mileage)
