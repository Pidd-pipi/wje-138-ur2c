from fleet_app.models import Driver


def list_drivers(status=None):
    queryset = Driver.objects.all().order_by('id')
    if status:
        statuses = [item.strip() for item in status.split(',') if item.strip()]
        if statuses:
            queryset = queryset.filter(status__in=statuses)
    return [
        {
            'id': driver.id,
            'name': driver.name,
            'phone': driver.phone,
            'licenseType': driver.license_type,
            'licenseExpireDate': driver.license_expire_date.isoformat() if driver.license_expire_date else '',
            'hireDate': driver.hire_date.isoformat() if driver.hire_date else '',
            'status': driver.status,
            'drivingHours': driver.driving_hours,
            'violationCount': driver.violation_count,
        }
        for driver in queryset
    ]
