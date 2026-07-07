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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f1f5f9;
            color: #1e293b;
            margin: 0;
            padding: 40px 20px;
            -webkit-font-smoothing: antialiased;
        }}
        .container {{
            max-width: 580px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
        }}
        .header {{
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            padding: 40px 32px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }}
        .header::after {{
            content: '';
            position: absolute;
            top: 0; right: 0; bottom: 0; left: 0;
            background: linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, transparent 100%);
            pointer-events: none;
        }}
        .header h1 {{
            margin: 0;
            font-size: 28px;
            font-weight: 800;
            letter-spacing: -0.025em;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            position: relative;
            z-index: 10;
        }}
        .logo-icon {{
            background: linear-gradient(135deg, #6366f1, #a855f7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 32px;
        }}
        .content {{
            padding: 40px 32px;
            line-height: 1.7;
            font-size: 16px;
            color: #334155;
        }}
        .content p {{
            margin-top: 0;
            margin-bottom: 20px;
        }}
        .content strong {{
            color: #0f172a;
            font-weight: 600;
        }}
        .card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #6366f1;
            border-radius: 12px;
            padding: 24px;
            margin-top: 32px;
            margin-bottom: 32px;
        }}
        .card-row {{
            margin-bottom: 12px;
            font-size: 15px;
            display: flex;
            align-items: flex-start;
        }}
        .card-row:last-child {{
            margin-bottom: 0;
        }}
        .label {{
            color: #64748b;
            font-weight: 500;
            display: inline-block;
            width: 140px;
            flex-shrink: 0;
        }}
        .value {{
            color: #0f172a;
            font-weight: 600;
        }}
        .button-wrapper {{
            text-align: center;
            margin-top: 40px;
            margin-bottom: 10px;
        }}
        .button {{
            display: inline-block;
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            color: #ffffff !important;
            padding: 16px 36px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            letter-spacing: 0.025em;
            box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);
            transition: all 0.2s ease;
        }}
        .button:hover {{
            box-shadow: 0 6px 15px -2px rgba(99, 102, 241, 0.5);
            transform: translateY(-1px);
        }}
        .footer {{
            padding: 24px 32px;
            text-align: center;
            font-size: 13px;
            color: #94a3b8;
            border-top: 1px solid #f1f5f9;
            background: #ffffff;
            line-height: 1.5;
        }}
        .footer a {{
            color: #6366f1;
            text-decoration: none;
        }}
        
        @media only screen and (max-width: 480px) {{
            .container {{ border-radius: 0; border: none; }}
            body {{ padding: 0; background: #ffffff; }}
            .card-row {{ flex-direction: column; }}
            .label {{ margin-bottom: 4px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><span class="logo-icon">✈️</span> TravelAI</h1>
        </div>
        <div class="content">
            {content_html}
        </div>
        <div class="footer">
            Bạn nhận được email này vì bạn là thành viên của TravelAI.<br>
            <span style="margin-top: 8px; display: inline-block;">&copy; 2026 TravelAI. Mọi quyền được bảo lưu.</span>
        </div>
    </div>
</body>
</html>
"""

async def send_trip_reminder_email(user_email: str, trip: Trip) -> bool:
    user_name = user_email.split('@')[0].capitalize()
    content = f"""
    <p>Xin chào <strong>{user_name}</strong>,</p>
    <p>Đây là thông báo nhắc nhở rằng chuyến đi của bạn <strong>sắp bắt đầu vào ngày mai!</strong></p>
    
    <div class="card" style="border-left-color: #10b981;">
        <h3 style="margin-top: 0; color: #0f172a; font-size: 16px;">✨ Thông tin tổng quan</h3>
        <div class="card-row">
            <span class="label">Chuyến đi:</span>
            <span class="value">{trip.title}</span>
        </div>
        <div class="card-row">
            <span class="label">Điểm đến:</span>
            <span class="value">{trip.destination}</span>
        </div>
        <div class="card-row">
            <span class="label">Thời gian:</span>
            <span class="value">{trip.start_date.strftime('%d/%m/%Y')} - {trip.end_date.strftime('%d/%m/%Y')}</span>
        </div>
    </div>
    
    <div class="card" style="border-left-color: #f59e0b; background: #fffbeb;">
        <h3 style="margin-top: 0; color: #b45309; font-size: 16px;">🎒 Mẹo nhỏ trước giờ G (Checklist)</h3>
        <ul style="margin: 0; padding-left: 20px; color: #92400e; line-height: 1.5;">
            <li style="margin-bottom: 8px;"><strong>Giấy tờ:</strong> Kiểm tra kỹ CCCD/Hộ chiếu và Visa (nếu có).</li>
            <li style="margin-bottom: 8px;"><strong>Vé & Phòng:</strong> Đừng quên Check-in chuyến bay online sớm để có chỗ ngồi tốt.</li>
            <li><strong>Hành trang:</strong> Nhớ mang sạc dự phòng và kiểm tra thời tiết điểm đến nhé.</li>
        </ul>
    </div>

    <p>Hãy chuẩn bị hành lý và xem chi tiết toàn bộ lịch trình trên hệ thống TravelAI.</p>
    <div class="button-wrapper">
        <a href="http://localhost:3000/trips/{trip.id}" class="button">Mở không gian làm việc</a>
    </div>
    """
    subject = f"🎒 Chuyến đi {trip.destination} của bạn bắt đầu ngày mai!"
    body = _get_base_template(content)
    return await send_email(user_email, subject, body)

async def send_activity_reminder_email(user_email: str, trip: Trip, activity: ItineraryItem) -> bool:
    import urllib.parse
    user_name = user_email.split('@')[0].capitalize()
    details = activity.activity_details or {}
    name = details.get("name", "Hoạt động chưa đặt tên")
    address = details.get("address", "Không có địa chỉ")
    note = details.get("note", "")
    
    start_time_str = activity.start_time.strftime("%H:%M") if activity.start_time else "N/A"
    
    map_url = f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(address)}" if address and address != "Không có địa chỉ" else "#"
    map_link_html = f'<a href="{map_url}" target="_blank" style="color: #6366f1; text-decoration: none; font-weight: 600;">📍 Mở Bản Đồ</a>' if map_url != "#" else address

    note_html = f"""
    <div style="margin-top: 16px; padding: 12px; background: #e0e7ff; border-radius: 8px; color: #3730a3; font-size: 14px; border-left: 3px solid #6366f1;">
        <strong>📝 Ghi chú:</strong> {note}
    </div>
    """ if note else ""

    content = f"""
    <p>Xin chào <strong>{user_name}</strong>,</p>
    <p>Hoạt động tiếp theo trong lịch trình của bạn sắp diễn ra trong <strong>3 giờ tới</strong>:</p>
    <div class="card" style="border-left-color: #8b5cf6;">
        <div class="card-row">
            <span class="label">Hoạt động:</span>
            <span class="value">{name}</span>
        </div>
        <div class="card-row">
            <span class="label">Thời gian:</span>
            <span class="value" style="color: #e11d48;">{start_time_str}</span>
        </div>
        <div class="card-row">
            <span class="label">Địa điểm:</span>
            <span class="value">{address}</span>
        </div>
        <div class="card-row">
            <span class="label">Chỉ đường:</span>
            <span class="value">{map_link_html}</span>
        </div>
        {note_html}
    </div>
    
    <p style="color: #64748b; font-size: 14px; font-style: italic; background: #f8fafc; padding: 12px; border-radius: 8px;">
        💡 <strong>Lưu ý di chuyển:</strong> Vui lòng sắp xếp thời gian đi sớm trước 15-30 phút để hạn chế rủi ro tắc đường hoặc tìm chỗ đỗ xe nhé.
    </p>

    <div class="button-wrapper">
        <a href="http://localhost:3000/trips/{trip.id}" class="button">Xem chi tiết hoạt động</a>
    </div>
    """
    subject = f"⏰ Nhắc nhở: {name} lúc {start_time_str}"
    body = _get_base_template(content)
    return await send_email(user_email, subject, body)

async def send_booking_reminder_email(user_email: str, trip: Trip, unbooked_items: list[ItineraryItem]) -> bool:
    user_name = user_email.split('@')[0].capitalize()
    flights_html = ""
    hotels_html = ""
    
    for item in unbooked_items:
        details = item.activity_details or {}
        name = details.get("name", "Dịch vụ chưa đặt tên")
        cost = float(details.get("estimated_cost", 0))
        cost_str = f" <span style='color: #64748b; font-weight: 400;'>(~{cost:,.0f} {trip.currency})</span>" if cost > 0 else ""
        
        item_html = f"<li style='margin-bottom: 6px;'><strong>{name}</strong>{cost_str} - Ngày thứ {item.day_number}</li>"
        if item.type.value == "TRANSPORT":
            flights_html += item_html
        elif item.type.value == "LODGING":
            hotels_html += item_html
            
    sections_html = ""
    if flights_html:
        sections_html += f"<div style='margin-bottom: 16px;'><h4 style='margin: 0 0 8px 0; color: #0284c7; font-size: 15px;'>✈️ Chuyến bay chưa đặt:</h4><ul style='margin: 0; padding-left: 20px;'>{flights_html}</ul></div>"
    if hotels_html:
        sections_html += f"<div><h4 style='margin: 0 0 8px 0; color: #059669; font-size: 15px;'>🏨 Khách sạn chưa đặt:</h4><ul style='margin: 0; padding-left: 20px;'>{hotels_html}</ul></div>"

    content = f"""
    <p>Xin chào <strong>{user_name}</strong>,</p>
    <p>Chuyến đi <strong>{trip.title}</strong> của bạn sẽ khởi hành trong <strong>3 ngày tới</strong>.</p>
    
    <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
        <strong style="color: #b91c1c;">⚠️ Cảnh báo rủi ro:</strong>
        <p style="margin: 8px 0 0 0; color: #991b1b; font-size: 14px; line-height: 1.5;">
            Giá vé máy bay và phòng khách sạn thường <strong>tăng đột biến (20% - 50%)</strong> hoặc thậm chí <strong>hết chỗ</strong> khi sát ngày khởi hành. Hệ thống nhận thấy bạn vẫn còn các dịch vụ sau ở trạng thái Gợi ý (Chưa thanh toán):
        </p>
    </div>

    <div class="card" style="border-left-color: #ef4444; margin-top: 0;">
        {sections_html}
    </div>
    
    <p style="color: #475569; font-size: 15px;">Hệ thống TravelAI đã quét và lưu giữ sẵn các lựa chọn tốt nhất dành cho bạn trong lịch trình. Hãy chốt đặt chỗ ngay để giữ mức giá lý tưởng!</p>
    
    <div class="button-wrapper">
        <a href="http://localhost:3000/trips/{trip.id}" class="button" style="background: linear-gradient(135deg, #ef4444, #f43f5e); box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.4);">Hoàn tất đặt chỗ ngay</a>
    </div>
    """
    subject = f"⚠️ Khẩn cấp: Đừng quên chốt vé/phòng cho chuyến đi {trip.destination}!"
    body = _get_base_template(content)
    return await send_email(user_email, subject, body)
