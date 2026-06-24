import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import get_settings

settings = get_settings()
print(f"TMN: '{settings.VNPAY_TMN_CODE}'")
print(f"URL: '{settings.VNPAY_URL}'")
print(f"RAPID: '{settings.RAPIDAPI_KEY}'")
