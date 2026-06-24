import aiosmtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
from app.core.config import get_settings
from app.models.trip import Trip
from app.models.itinerary import ItineraryItem

logger = logging.getLogger(__name__)

async def send_email(to: str, subject: str, html_body: str) -> bool:
    settings = get_settings()
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        logger.warning(f"SMTP configuration is missing (SMTP_USER or SMTP_PASSWORD). Skipping email to {to}. Subject: {subject}")
        return False
    
    try:
        message = MIMEMultipart("alternative")
        message["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_USER}>"
        message["To"] = to
        message["Subject"] = subject
        
        part = MIMEText(html_body, "html", "utf-8")
        message.attach(part)
        
        await aiosmtplib.send(
            message,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            use_tls=False,
            start_tls=True,
            timeout=10,
        )
        logger.info(f"Successfully sent email to {to} with subject: {subject}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}", exc_info=True)
        return False

def _get_base_template(content_html: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            -webkit-font-smoothing: antialiased;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: #ffffff;
            padding: 32px 24px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0;
            font-size: 24px;
            font-weight: 800;
            letter-spacing: -0.5px;
        }}
        .content {{
            padding: 32px 24px;
            line-height: 1.6;
        }}
        .card {{
            background: #f1f5f9;
            border-left: 4px solid #6366f1;
            border-radius: 4px 8px 8px 4px;
            padding: 20px;
            margin-bottom: 24px;
        }}
        .card-row {{
            margin-bottom: 8px;
            font-size: 14px;
        }}
        .card-row:last-child {{
            margin-bottom: 0;
        }}
        .label {{
            color: #64748b;
            font-weight: 500;
            display: inline-block;
            width: 130px;
        }}
        .value {{
            color: #0f172a;
            font-weight: 600;
        }}
        .button {{
            display: inline-block;
            background: #6366f1;
            color: #ffffff !important;
            padding: 12px 24px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            text-align: center;
            margin-top: 10px;
        }}
        .footer {{
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            background: #f8fafc;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>TravelAI Assistant</h1>
        </div>
        <div class="content">
            {content_html}
        </div>
        <div class="footer">
            &copy; 2026 TravelAI. Mọi quyền được bảo lưu.
        </div>
    </div>
</body>
</html>
"""

async def send_trip_reminder_email(user_email: str, trip: Trip) -> bool:
    content = f"""
    <p>Xin chào,</p>
    <p>Đây là thông báo nhắc nhở rằng chuyến đi của bạn <strong>sắp bắt đầu vào ngày mai!</strong></p>
    <div class="card">
        <div class="card-row">
            <span class="label">Chuyến đi:</span>
            <span class="value">{trip.title}</span>
        </div>
        <div class="card-row">
            <span class="label">Điểm đến:</span>
            <span class="value">{trip.destination}</span>
        </div>
        <div class="card-row">
            <span class="label">Ngày bắt đầu:</span>
            <span class="value">{trip.start_date.strftime('%d/%m/%Y')}</span>
        </div>
        <div class="card-row">
            <span class="label">Ngày kết thúc:</span>
            <span class="value">{trip.end_date.strftime('%d/%m/%Y')}</span>
        </div>
        <div class="card-row">
            <span class="label">Ngân sách:</span>
            <span class="value">{trip.total_budget:,.2f} {trip.currency}</span>
        </div>
    </div>
    <p>Hãy chuẩn bị hành lý và xem chi tiết lịch trình của bạn trên ứng dụng TravelAI.</p>
    <div style="text-align: center;">
        <a href="http://localhost:3000/trips/{trip.id}" class="button">Xem chi tiết Chuyến đi</a>
    </div>
    """
    subject = f"🎒 Chuyến đi {trip.destination} của bạn bắt đầu ngày mai!"
    body = _get_base_template(content)
    return await send_email(user_email, subject, body)

async def send_activity_reminder_email(user_email: str, trip: Trip, activity: ItineraryItem) -> bool:
    details = activity.activity_details or {}
    name = details.get("name", "Hoạt động chưa đặt tên")
    address = details.get("address", "N/A")
    cost = details.get("cost", 0)
    
    start_time_str = activity.start_time.strftime("%H:%M") if activity.start_time else "N/A"
    
    content = f"""
    <p>Xin chào,</p>
    <p>Bạn có một hoạt động sắp diễn ra trong <strong>3 giờ tới</strong>:</p>
    <div class="card">
        <div class="card-row">
            <span class="label">Hoạt động:</span>
            <span class="value">{name}</span>
        </div>
        <div class="card-row">
            <span class="label">Loại hoạt động:</span>
            <span class="value">{activity.type.value}</span>
        </div>
        <div class="card-row">
            <span class="label">Thời gian bắt đầu:</span>
            <span class="value">{start_time_str}</span>
        </div>
        <div class="card-row">
            <span class="label">Địa điểm:</span>
            <span class="value">{address}</span>
        </div>
        <div class="card-row">
            <span class="label">Chi phí:</span>
            <span class="value">{cost:,.2f} {trip.currency}</span>
        </div>
    </div>
    <p>Chúc bạn có một trải nghiệm tuyệt vời!</p>
    <div style="text-align: center;">
        <a href="http://localhost:3000/trips/{trip.id}" class="button">Mở Lịch trình chuyến đi</a>
    </div>
    """
    subject = f"⏰ Nhắc nhở hoạt động: {name} lúc {start_time_str}"
    body = _get_base_template(content)
    return await send_email(user_email, subject, body)

async def send_booking_reminder_email(user_email: str, trip: Trip, unbooked_items: list[ItineraryItem]) -> bool:
    items_list_html = ""
    for item in unbooked_items:
        details = item.activity_details or {}
        name = details.get("name", "Hoạt động chưa đặt tên")
        items_list_html += f"<li><strong>{name}</strong> ({item.type.value}) - Ngày thứ {item.day_number}</li>"
        
    content = f"""
    <p>Xin chào,</p>
    <p>Chuyến đi <strong>{trip.title}</strong> của bạn sẽ bắt đầu trong <strong>3 ngày tới</strong>. Tuy nhiên, hệ thống nhận thấy bạn có một số dịch vụ (di chuyển, lưu trú) vẫn đang ở trạng thái gợi ý và chưa được đặt vé hoặc phòng:</p>
    <div class="card">
        <ul style="margin: 0; padding-left: 20px;">
            {items_list_html}
        </ul>
    </div>
    <p>Để chuyến đi được diễn ra suôn sẻ nhất, bạn nên kiểm tra và hoàn tất việc đặt chỗ cho các dịch vụ này.</p>
    <div style="text-align: center;">
        <a href="http://localhost:3000/trips/{trip.id}" class="button">Đặt chỗ ngay</a>
    </div>
    """
    subject = f"✈️ Đừng quên đặt vé/phòng cho chuyến đi {trip.destination}!"
    body = _get_base_template(content)
    return await send_email(user_email, subject, body)
