"""Shared enum / status constants (mirrors frontend/src/types/enums.ts)."""


class VehicleStatus:
    AVAILABLE = 'Available'
    ON_TRIP = 'OnTrip'
    MAINTENANCE = 'Maintenance'
    RETIRED = 'Retired'

    CHOICES = [
        (AVAILABLE, 'Available'),
        (ON_TRIP, 'OnTrip'),
        (MAINTENANCE, 'Maintenance'),
        (RETIRED, 'Retired'),
    ]


class DispatchStatus:
    PENDING = 'Pending'
    ASSIGNED = 'Assigned'
    IN_PROGRESS = 'InProgress'
    COMPLETED = 'Completed'
    CANCELLED = 'Cancelled'

    # 车辆处于"正在运输"的调度单状态（Assigned 仅为已排期、尚未发车，不算运输中）
    ACTIVE_ORDER_STATUSES = (IN_PROGRESS,)


class MaintenanceType:
    ROUTINE = 'Routine'
    REPAIR = 'Repair'
    EMERGENCY = 'Emergency'
    INSPECTION = 'Inspection'

    CHOICES = [
        (ROUTINE, 'Routine'),
        (REPAIR, 'Repair'),
        (EMERGENCY, 'Emergency'),
        (INSPECTION, 'Inspection'),
    ]


class MaintenanceStatus:
    SCHEDULED = 'Scheduled'
    IN_PROGRESS = 'InProgress'
    COMPLETED = 'Completed'

    CHOICES = [
        (SCHEDULED, 'Scheduled'),
        (IN_PROGRESS, 'InProgress'),
        (COMPLETED, 'Completed'),
    ]
