class BusinessError(Exception):
    """业务规则异常，message 直接面向前端展示具体原因。"""

    def __init__(self, message, code='business_error'):
        self.message = message
        self.code = code
        super().__init__(message)
