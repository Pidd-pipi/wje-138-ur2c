"""进程内共享数据仓储。

当前各 service 以内存种子数据提供接口；维保流程会同时改写
维保记录与车辆状态，因此所有实体集中在此维护，保证跨 service
读到的是同一份状态（与生产环境数据库的行为一致）。
"""

VEHICLES = [
    {'id': 1, 'plateNo': '沪A-7821', 'type': '冷链车', 'brandModel': '东风天锦 KR', 'purchaseDate': '2023-03-12', 'insuranceExpireDate': '2026-09-30', 'inspectionExpireDate': '2026-11-20', 'status': 'Available', 'mileage': 88210, 'tankCapacity': 380, 'fuelConsumption': 24.6},
    {'id': 2, 'plateNo': '苏E-5520', 'type': '重卡', 'brandModel': '解放 J6P', 'purchaseDate': '2021-08-06', 'insuranceExpireDate': '2026-07-15', 'inspectionExpireDate': '2026-08-22', 'status': 'OnTrip', 'mileage': 210430, 'tankCapacity': 520, 'fuelConsumption': 31.2},
    {'id': 3, 'plateNo': '浙B-3098', 'type': '轻卡', 'brandModel': '江淮帅铃 Q6', 'purchaseDate': '2024-01-18', 'insuranceExpireDate': '2027-01-17', 'inspectionExpireDate': '2027-02-10', 'status': 'Available', 'mileage': 46200, 'tankCapacity': 200, 'fuelConsumption': 16.8},
]

DRIVERS = [
    {'id': 1, 'name': '赵强', 'phone': '13800000001', 'licenseType': 'B2', 'licenseExpireDate': '2028-05-01', 'hireDate': '2022-01-10', 'status': 'Available', 'drivingHours': 3200, 'violationCount': 1},
    {'id': 2, 'name': '孙晨', 'phone': '13800000002', 'licenseType': 'A2', 'licenseExpireDate': '2029-04-18', 'hireDate': '2021-11-16', 'status': 'OnTrip', 'drivingHours': 4810, 'violationCount': 0},
]

DISPATCH_ORDERS = [
    {'id': 1, 'orderNo': 'DSP-20260612-0001', 'vehicleId': 1, 'driverId': 1, 'origin': '上海青浦仓', 'destination': '杭州萧山仓', 'planDepartAt': '2026-06-12 09:00', 'planArriveAt': '2026-06-12 13:30', 'actualDepartAt': None, 'actualArriveAt': None, 'cargo': '冷链食品', 'weight': 8200, 'freight': 7200, 'status': 'Assigned', 'creatorId': 1, 'note': '优先发车'},
    {'id': 2, 'orderNo': 'DSP-20260612-0002', 'vehicleId': 2, 'driverId': 2, 'origin': '苏州园区', 'destination': '宁波北仑', 'planDepartAt': '2026-06-12 14:00', 'planArriveAt': '2026-06-12 20:30', 'actualDepartAt': '2026-06-12 14:10', 'actualArriveAt': None, 'cargo': '建筑材料', 'weight': 16000, 'freight': 9800, 'status': 'InProgress', 'creatorId': 1, 'note': ''},
]

MAINTENANCE_RECORDS = [
    {'id': 1, 'vehicleId': 1, 'type': 'Routine', 'items': ['机油', '轮胎检查'], 'cost': 2100, 'actualMileage': 88050, 'finalCost': 2100, 'vendor': '青浦维保站', 'date': '2026-06-06', 'nextMileage': 93000, 'nextDate': '2026-09-06', 'status': 'Completed'},
    {'id': 2, 'vehicleId': 2, 'type': 'Inspection', 'items': ['年检准备'], 'cost': 980, 'actualMileage': None, 'finalCost': None, 'vendor': '苏州车检中心', 'date': '2026-09-20', 'nextMileage': 215000, 'nextDate': '2026-08-22', 'status': 'Scheduled'},
    {'id': 3, 'vehicleId': 3, 'type': 'Routine', 'items': ['机油机滤'], 'cost': 860, 'actualMileage': None, 'finalCost': None, 'vendor': '宁波城东保养点', 'date': '2026-09-25', 'nextMileage': 52000, 'nextDate': '2026-12-25', 'status': 'Scheduled'},
]

FUEL_RECORDS = [
    {'id': 1, 'vehicleId': 1, 'date': '2026-06-05', 'liters': 240, 'unitPrice': 7.4, 'totalAmount': 1776, 'mileage': 88120, 'station': '青浦服务区', 'paymentMethod': 'Company'},
    {'id': 2, 'vehicleId': 2, 'date': '2026-06-09', 'liters': 360, 'unitPrice': 7.35, 'totalAmount': 2646, 'mileage': 210100, 'station': '苏州东站', 'paymentMethod': 'Card'},
]

# 车辆正在运输：已实际发车、尚未到达；仅 Assigned（待发车）不算在途
TRIP_DISPATCH_STATUSES = ('InProgress',)
ACTIVE_MAINTENANCE_STATUSES = ('Scheduled', 'InProgress')


def next_id(rows):
    return max((row['id'] for row in rows), default=0) + 1


def find_vehicle(vehicle_id):
    return next((v for v in VEHICLES if v['id'] == vehicle_id), None)
