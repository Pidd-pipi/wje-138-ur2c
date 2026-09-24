from django.db import transaction
from django.utils import timezone

from fleet_app.constants import (
    DispatchStatus,
    MaintenanceStatus,
    VehicleStatus,
)
from fleet_app.exceptions import ConflictError, NotFoundError
from fleet_app.models import DispatchOrder, MaintenanceRecord, Vehicle


def list_records(status=None, vehicle_id=None):
    queryset = MaintenanceRecord.objects.select_related('vehicle').order_by('-date', '-id')
    if status:
        queryset = queryset.filter(status=status)
    if vehicle_id:
        queryset = queryset.filter(vehicle_id=vehicle_id)
    return queryset


def _get_vehicle(vehicle_id):
    vehicle = Vehicle.objects.filter(id=vehicle_id).first()
    if vehicle is None:
        raise NotFoundError(f'车辆不存在：id={vehicle_id}', code='VEHICLE_NOT_FOUND')
    return vehicle


def _active_dispatch(vehicle_id):
    """车辆正在运输的调度单（InProgress）；无在途单时返回 None。"""
    return DispatchOrder.objects.filter(
        vehicle_id=vehicle_id,
        status__in=DispatchStatus.ACTIVE_ORDER_STATUSES,
    ).first()


def _ensure_vehicle_not_on_trip(vehicle):
    """车辆正在运输时拒绝维保：优先给出调度单细节，其次给出车辆状态原因。"""
    active_order = _active_dispatch(vehicle.id)
    if active_order:
        raise ConflictError(
            f'车辆 {vehicle.plate_no} 正在运输（调度单 {active_order.order_no}，'
            f'{active_order.origin} → {active_order.destination}），无法安排维保',
            code='VEHICLE_ON_TRIP',
        )
    if vehicle.status == VehicleStatus.ON_TRIP:
        raise ConflictError(
            f'车辆 {vehicle.plate_no} 当前状态为 OnTrip（运输中），无法安排维保',
            code='VEHICLE_ON_TRIP',
        )


def _has_maintenance_on_date(vehicle_id, date, exclude_id=None):
    """同一天是否已安排尚未完工的维保。"""
    queryset = MaintenanceRecord.objects.filter(
        vehicle_id=vehicle_id,
        date=date,
    ).exclude(status=MaintenanceStatus.COMPLETED)
    if exclude_id is not None:
        queryset = queryset.exclude(id=exclude_id)
    return queryset.first()


def schedule_maintenance(payload):
    """管理员为车辆预约维保，冲突时把原因通过 ConflictError 说清楚。"""
    vehicle = _get_vehicle(payload.get('vehicleId'))
    date = payload.get('date')
    if not date:
        raise ConflictError('请选择维保日期', code='DATE_REQUIRED')

    if vehicle.status == VehicleStatus.RETIRED:
        raise ConflictError(
            f'车辆 {vehicle.plate_no} 已报废，无法预约维保',
            code='VEHICLE_RETIRED',
        )

    _ensure_vehicle_not_on_trip(vehicle)

    same_day = _has_maintenance_on_date(vehicle.id, date)
    if same_day:
        type_label = same_day.maintenance_type
        raise ConflictError(
            f'车辆 {vehicle.plate_no} 在 {date} 已安排维保（{type_label}，'
            f'维修厂：{same_day.vendor}），同一天不能重复预约',
            code='MAINTENANCE_SAME_DAY',
        )

    if vehicle.status == VehicleStatus.MAINTENANCE:
        in_progress = MaintenanceRecord.objects.filter(
            vehicle=vehicle, status=MaintenanceStatus.IN_PROGRESS
        ).first()
        if in_progress:
            raise ConflictError(
                f'车辆 {vehicle.plate_no} 已有正在进行的维保（{in_progress.maintenance_type}），'
                f'请先完工后再预约',
                code='MAINTENANCE_IN_PROGRESS',
            )

    items = payload.get('items') or []
    if isinstance(items, str):
        items = [item.strip() for item in items.split(',') if item.strip()]

    record = MaintenanceRecord.objects.create(
        vehicle=vehicle,
        maintenance_type=payload.get('maintenanceType', payload.get('type', 'Routine')),
        items=items,
        cost=0,
        estimated_cost=payload.get('estimatedCost', 0) or 0,
        vendor=payload.get('vendor', ''),
        date=date,
        next_mileage=payload.get('nextMileage', 0) or 0,
        next_date=payload.get('nextDate') or None,
        status=MaintenanceStatus.SCHEDULED,
    )
    return record


def start_maintenance(record_id):
    """开始维修：记录置为 InProgress，车辆置为 Maintenance（调度中心随即不可选）。"""
    record = MaintenanceRecord.objects.select_related('vehicle').filter(id=record_id).first()
    if record is None:
        raise NotFoundError(f'维保记录不存在：id={record_id}', code='MAINTENANCE_NOT_FOUND')
    if record.status == MaintenanceStatus.IN_PROGRESS:
        raise ConflictError('该维保已经开始，请勿重复操作', code='STATUS_INVALID')
    if record.status == MaintenanceStatus.COMPLETED:
        raise ConflictError('该维保已完工，不能再次开始', code='STATUS_INVALID')

    _ensure_vehicle_not_on_trip(record.vehicle)

    with transaction.atomic():
        record.status = MaintenanceStatus.IN_PROGRESS
        record.started_at = timezone.now()
        record.save(update_fields=['status', 'started_at'])
        if record.vehicle.status != VehicleStatus.MAINTENANCE:
            record.vehicle.status = VehicleStatus.MAINTENANCE
            record.vehicle.save(update_fields=['status'])
    return record


def complete_maintenance(record_id, payload=None):
    """完工：记录置为 Completed，登记实际里程和最终费用，车辆恢复 Available。"""
    payload = payload or {}
    record = MaintenanceRecord.objects.select_related('vehicle').filter(id=record_id).first()
    if record is None:
        raise NotFoundError(f'维保记录不存在：id={record_id}', code='MAINTENANCE_NOT_FOUND')
    if record.status == MaintenanceStatus.COMPLETED:
        raise ConflictError('该维保已完工，请勿重复操作', code='STATUS_INVALID')
    if record.status != MaintenanceStatus.IN_PROGRESS:
        raise ConflictError('只有进行中的维保才能完工，请先开始维修', code='STATUS_INVALID')

    actual_mileage = payload.get('actualMileage')
    final_cost = payload.get('finalCost')
    if actual_mileage is None:
        raise ConflictError('请填写完工时的实际里程', code='ACTUAL_MILEAGE_REQUIRED')
    try:
        actual_mileage = int(actual_mileage)
    except (TypeError, ValueError):
        raise ConflictError('实际里程必须是数字', code='ACTUAL_MILEAGE_INVALID')
    if actual_mileage < 0:
        raise ConflictError('实际里程不能为负数', code='ACTUAL_MILEAGE_INVALID')
    if final_cost is None:
        raise ConflictError('请填写最终费用', code='FINAL_COST_REQUIRED')
    try:
        final_cost = float(final_cost)
    except (TypeError, ValueError):
        raise ConflictError('最终费用必须是数字', code='FINAL_COST_INVALID')
    if final_cost < 0:
        raise ConflictError('最终费用不能为负数', code='FINAL_COST_INVALID')

    with transaction.atomic():
        record.status = MaintenanceStatus.COMPLETED
        record.actual_mileage = actual_mileage
        record.cost = final_cost
        record.completed_at = timezone.now()
        record.save(update_fields=['status', 'actual_mileage', 'cost', 'completed_at'])

        vehicle = record.vehicle
        if vehicle.status == VehicleStatus.MAINTENANCE:
            vehicle.status = VehicleStatus.AVAILABLE
        # 实际里程同步为车辆累计里程（只增不减）
        if actual_mileage > vehicle.mileage:
            vehicle.mileage = actual_mileage
        vehicle.save(update_fields=['status', 'mileage'])
    return record
