import hashlib
import hmac
import urllib.parse
from datetime import datetime
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class VNPayService:
    def __init__(self):
        # We fetch settings at init, which is fine, but to be 100% safe against caching 
        # we can fetch them from get_settings() every time, or just let them be properties.
        pass

    @property
    def tmn_code(self):
        return get_settings().VNPAY_TMN_CODE
        
    @property
    def hash_secret(self):
        return get_settings().VNPAY_HASH_SECRET
        
    @property
    def vnp_url(self):
        return get_settings().VNPAY_URL
        
    @property
    def return_url(self):
        return get_settings().VNPAY_RETURN_URL

    def generate_payment_url(self, order_id: str, amount_vnd: int, order_desc: str, ip_address: str) -> str:
        """
        Generate VNPay payment URL.
        :param amount_vnd: Must be in VND (not multiplied by 100 yet)
        """
        if not self.tmn_code or not self.hash_secret:
            logger.warning("VNPay credentials missing. Returning empty URL.")
            return ""

        vnp_Params = {
            "vnp_Version": "2.1.0",
            "vnp_Command": "pay",
            "vnp_TmnCode": self.tmn_code,
            "vnp_Amount": str(int(amount_vnd) * 100), # VNPay requires amount * 100
            "vnp_CurrCode": "VND",
            "vnp_TxnRef": str(order_id),
            "vnp_OrderInfo": order_desc,
            "vnp_OrderType": "billpayment",
            "vnp_Locale": "vn",
            "vnp_ReturnUrl": self.return_url,
            "vnp_IpAddr": ip_address,
            "vnp_CreateDate": datetime.now().strftime('%Y%m%d%H%M%S')
        }

        # Sort params by key
        sorted_keys = sorted(vnp_Params.keys())
        hash_data = []
        query_data = []

        for key in sorted_keys:
            val = vnp_Params[key]
            # urlencode the values
            encoded_val = urllib.parse.quote_plus(str(val))
            hash_data.append(f"{key}={encoded_val}")
            query_data.append(f"{key}={encoded_val}")

        hash_str = "&".join(hash_data)
        query_str = "&".join(query_data)

        # Create HMAC SHA512 signature
        h = hmac.new(self.hash_secret.encode('utf-8'), hash_str.encode('utf-8'), hashlib.sha512)
        vnp_SecureHash = h.hexdigest()

        payment_url = f"{self.vnp_url}?{query_str}&vnp_SecureHash={vnp_SecureHash}"
        return payment_url

    def verify_payment(self, query_params: dict) -> bool:
        """
        Verify the signature of the return request from VNPay.
        """
        if not self.hash_secret:
            return False

        vnp_SecureHash = query_params.get("vnp_SecureHash")
        if not vnp_SecureHash:
            return False

        # Remove hash params for recalculation
        if "vnp_SecureHash" in query_params:
            query_params.pop("vnp_SecureHash")
        if "vnp_SecureHashType" in query_params:
            query_params.pop("vnp_SecureHashType")

        sorted_keys = sorted(query_params.keys())
        hash_data = []

        for key in sorted_keys:
            val = query_params[key]
            encoded_val = urllib.parse.quote_plus(str(val))
            hash_data.append(f"{key}={encoded_val}")

        hash_str = "&".join(hash_data)
        h = hmac.new(self.hash_secret.encode('utf-8'), hash_str.encode('utf-8'), hashlib.sha512)
        expected_hash = h.hexdigest()

        return expected_hash == vnp_SecureHash
