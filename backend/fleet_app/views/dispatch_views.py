from rest_framework.decorators import api_view
from rest_framework.response import Response
from fleet_app.services import dispatch_service
from fleet_app.services.errors import BusinessError
from fleet_app.serializers.dispatch_serializer import CreateDispatchSerializer


@api_view(['GET', 'POST'])
def dispatch_orders(request):
    if request.method == 'POST':
        serializer = CreateDispatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            order = dispatch_service.create_order(serializer.validated_data)
        except BusinessError as exc:
            return Response({'detail': exc.message, 'code': exc.code}, status=400)
        return Response(order, status=201)
    return Response(dispatch_service.list_orders())
