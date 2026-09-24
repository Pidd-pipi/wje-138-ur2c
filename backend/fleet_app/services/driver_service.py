from fleet_app.services import state


def list_drivers():
    return [dict(driver) for driver in state.DRIVERS]
