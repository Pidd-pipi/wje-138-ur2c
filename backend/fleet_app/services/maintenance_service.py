from fleet_app.services import state, vehicle_service
from fleet_app.services.errors import BusinessError

VEHICLE_ON_TRIP_MESSAGE = '车辆正在运输中，需完成当前运输任务后才能预约维保'
VEHICLE_MAINTENANCE_MESSAGE = '车辆已有进行中的维保，完工后才能再次安排'
VEHICLE_RETIRED_MESSAGE = '车辆已报废，无法预约维保'
SAME_DAY_MESSAGE = '该车辆在 {date} 已安排维保（{vendor}），同一天不能重复预约'


def list_records(active_only=False):
    if active_only:
        return [
            dict(record)
            for record in state.MAINTENANCE_RECORDS
            if record['status'] in state.ACTIVE_MAINTENANCE_STATUSES
        ]
    return [dict(record) for record in state.MAINTENANCE_RECORDS]


def _same_day_scheduled(vehicle_id, date, exclude_id=None):
    return next(
        (
            record
            for record in state.MAINTENANCE_RECORDS
            if record['id'] != exclude_id
            and record['vehicleId'] == vehicle_id
            and record['date'] == date
            and record['status'] in state.ACTIVE_MAINTENANCE_STATUSES
        ),
        None,
    )


def _ensure_schedulable(vehicle_id, date):
    """预约校验：车辆必须可安排，且同一天没有其他维保。"""
    vehicle = vehicle_service.get_vehicle(vehicle_id)
    if vehicle_service.is_vehicle_on_trip(vehicle_id):
        raise BusinessError(VEHICLE_ON_TRIP_MESSAGE, code='vehicle_on_trip')
    if vehicle['status'] == 'Maintenance':
        raise BusinessError(VEHICLE_MAINTENANCE_MESSAGE, code='vehicle_in_maintenance')
    if vehicle['status'] == 'Retired':
        raise BusinessError(VEHICLE_RETIRED_MESSAGE, code='vehicle_retired')
    conflict = _same_day_scheduled(vehicle_id, date)
    if conflict is not None:
        raise BusinessError(
            SAME_DAY_MESSAGE.format(date=date, vendor=conflict['vendor']),
            code='maintenance_same_day',
        )
    return vehicle


def schedule_record(payload):
    date = payload['date'].isoformat()
    _ensure_schedulable(payload['vehicleId'], date)
    record = {
        'id': state.next_id(state.MAINTENANCE_RECORDS),
        'vehicleId': payload['vehicleId'],
        'type': payload['maintenanceType'],
        'items': payload['items'],
        'cost': payload['cost'],
        'actualMileage': None,
        'finalCost': None,
        'vendor': payload['vendor'],
        'date': date,
        'nextMileage': payload.get('nextMileage') or 0,
        'nextDate': payload['nextDate'].isoformat() if payload.get('nextDate') else None,
        'status': 'Scheduled',
    }
    state.MAINTENANCE_RECORDS.append(record)
    return dict(record)


def _get_record(record_id):
    record = next((r for r in state.MAINTENANCE_RECORDS if r['id'] == record_id), None)
    if record is None:
        raise BusinessError('维保记录不存在', code='maintenance_not_found')
    return record


def start_record(record_id):
    record = _get_record(record_id)
    if record['status'] != 'Scheduled':
        raise BusinessError(
            f'当前状态为 {record["status"]}，只有已预约（Scheduled）的维保才能开始维修',
            code='invalid_status',
        )
    vehicle = vehicle_service.get_vehicle(record['vehicleId'])
    if vehicle_service.is_vehicle_on_trip(record['vehicleId']):
        raise BusinessError(VEHICLE_ON_TRIP_MESSAGE, code='vehicle_on_trip')
    record['status'] = 'InProgress'
    vehicle_service.set_status(record['vehicleId'], 'Maintenance')
    return dict(record)


def complete_record(record_id, payload):
    record = _get_record(record_id)
    if record['status'] != 'InProgress':
        raise BusinessError(
            f'当前状态为 {record["status"]}，只有进行中（InProgress）的维保才能完工',
            code='invalid_status',
        )
    actual_mileage = payload.get('actualMileage')
    final_cost = payload.get('finalCost')
    if actual_mileage is not None:
        record['actualMileage'] = actual_mileage
        vehicle_service.update_mileage(record['vehicleId'], actual_mileage)
    if final_cost is not None:
        record['finalCost'] = final_cost
    record['status'] = 'Completed'
    vehicle_service.set_status(record['vehicleId'], 'Available')
    return dict(record)
