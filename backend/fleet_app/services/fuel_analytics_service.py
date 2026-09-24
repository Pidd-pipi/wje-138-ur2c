from fleet_app.services import state


def list_fuel_records():
    return [dict(record) for record in state.FUEL_RECORDS]
