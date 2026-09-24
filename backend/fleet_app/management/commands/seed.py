from datetime import date, datetime

from django.core.management.base import BaseCommand

from fleet_app.models import (
    DispatchOrder,
    Driver,
    FuelRecord,
    MaintenanceRecord,
    Vehicle,
)


class Command(BaseCommand):
    help = 'Seed demo vehicles, drivers, dispatch orders and maintenance records'

    def handle(self, *args, **options):
        if Vehicle.objects.exists():
            self.stdout.write('Seed data already exists, skipping.')
            return

        v1 = Vehicle.objects.create(
            plate_no='沪A-7821', vehicle_type='冷链车', brand_model='东风天锦 KR',
            purchase_date=date(2023, 3, 12), insurance_expire_date=date(2026, 9, 30),
            inspection_expire_date=date(2026, 11, 20), status='Available',
            mileage=88210, tank_capacity=380, fuel_consumption=24.6,
        )
        v2 = Vehicle.objects.create(
            plate_no='苏E-5520', vehicle_type='重卡', brand_model='解放 J6P',
            purchase_date=date(2021, 8, 6), insurance_expire_date=date(2026, 7, 15),
            inspection_expire_date=date(2026, 8, 22), status='OnTrip',
            mileage=210430, tank_capacity=520, fuel_consumption=31.2,
        )

        d1 = Driver.objects.create(
            name='赵强', phone='13800000001', license_type='B2',
            license_expire_date=date(2028, 5, 1), hire_date=date(2022, 1, 10),
            status='Available', driving_hours=3200, violation_count=1,
        )
        Driver.objects.create(
            name='孙晨', phone='13800000002', license_type='A2',
            license_expire_date=date(2029, 4, 18), hire_date=date(2021, 11, 16),
            status='OnTrip', driving_hours=4810, violation_count=0,
        )

        DispatchOrder.objects.create(
            order_no='DSP-20260612-0001', vehicle=v1, driver=d1,
            origin='上海青浦仓', destination='杭州萧山仓',
            plan_depart_at=datetime(2026, 6, 12, 9, 0),
            plan_arrive_at=datetime(2026, 6, 12, 13, 30),
            cargo='冷链食品', weight=8200, freight=7200,
            status='Pending', creator_id=1, note='优先发车',
        )
        DispatchOrder.objects.create(
            order_no='DSP-20260612-0002', vehicle=v2,
            origin='苏州园区', destination='宁波北仑',
            plan_depart_at=datetime(2026, 6, 12, 14, 0),
            plan_arrive_at=datetime(2026, 6, 12, 20, 30),
            cargo='建筑材料', weight=16000, freight=9800,
            status='InProgress', creator_id=1, note='',
        )

        MaintenanceRecord.objects.create(
            vehicle=v1, maintenance_type='Routine', items=['机油', '轮胎检查'],
            cost=2100, vendor='青浦维保站', date=date(2026, 6, 6),
            next_mileage=93000, next_date=date(2026, 9, 6),
            status='Completed', estimated_cost=2000, actual_mileage=88150,
            started_at=datetime(2026, 6, 6, 9, 0), completed_at=datetime(2026, 6, 6, 16, 0),
        )
        MaintenanceRecord.objects.create(
            vehicle=v1, maintenance_type='Inspection', items=['年检准备'],
            cost=0, estimated_cost=980, vendor='苏州车检中心',
            date=date(2026, 9, 28), next_mileage=95000, next_date=date(2026, 12, 28),
            status='Scheduled',
        )

        FuelRecord.objects.create(
            vehicle=v1, date=date(2026, 6, 5), liters=240, unit_price=7.4,
            total_amount=1776, mileage=88120, station='青浦服务区', payment_method='Company',
        )
        FuelRecord.objects.create(
            vehicle=v2, date=date(2026, 6, 9), liters=360, unit_price=7.35,
            total_amount=2646, mileage=210100, station='苏州东站', payment_method='Card',
        )

        self.stdout.write(self.style.SUCCESS('Seed data created.'))
