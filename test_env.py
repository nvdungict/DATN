import os
from dotenv import load_dotenv
load_dotenv('.env')
print("TMN:", os.getenv("VNPAY_TMN_CODE"))
print("HASH:", os.getenv("VNPAY_HASH_SECRET"))
