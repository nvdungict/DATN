from app.core.config import get_settings
from app.services.vnpay_service import VNPayService

print("Settings TMN:", get_settings().VNPAY_TMN_CODE)
svc = VNPayService()
url = svc.generate_payment_url("123", 10000, "test", "127.0.0.1")
print("Generated URL:", url)
