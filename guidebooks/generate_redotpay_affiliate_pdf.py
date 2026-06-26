#!/usr/bin/env python3
"""Generate a compact 3-page RedotPay Affiliate guide PDF.

The deck is designed to stay concise while preserving the key product
screenshots from the original guidebook. If screenshots are missing, the PDF
still renders with clearly labeled placeholders and prints the missing files.
"""

from pathlib import Path
import shutil
from urllib.parse import unquote

import fitz


ROOT = Path(__file__).resolve().parent
LOGO = ROOT / "redotpay_logo_full.png"
LOGO_SVG = ROOT / "affliate guidebook" / "redotpay_logo_full.svg"
OUT_REPO = ROOT / "RedotPay_Affiliate_v2.pdf"
OUT_DOWNLOADS = Path.home() / "Downloads" / "RedotPay_Affiliate.pdf"

W, H = fitz.paper_size("a4")
M = 42

RED = (0.894, 0.106, 0.22)
BLACK = (0.09, 0.08, 0.08)
TEXT = (0.22, 0.25, 0.31)
MUTED = (0.42, 0.45, 0.50)
LIGHT = (0.965, 0.969, 0.976)
BORDER = (0.88, 0.90, 0.93)
WHITE = (1, 1, 1)

SCREENSHOT_PATHS = {
    "entry": "affliate%20guidebook/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260624162730_152_30.png",
    "signup": "affliate%20guidebook/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260624162758_153_30.png",
    "center": "affliate%20guidebook/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260624162828_154_30.png",
    "links": "affliate%20guidebook/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260624162835_155_30.png",
    "reports": "affliate%20guidebook/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260624162843_156_30.png",
    "payment": "affliate%20guidebook/%E5%BE%AE%E4%BF%A1%E5%9B%BE%E7%89%87_20260624162849_157_30.png",
}
SCREENSHOTS = {key: ROOT / unquote(path) for key, path in SCREENSHOT_PATHS.items()}


def rect(x, y, w, h):
    return fitz.Rect(x, y, x + w, y + h)


def text(page, value, box, size=10, color=TEXT, align=0):
    page.insert_textbox(box, value, fontsize=size, fontname="helv", color=color, align=align)


def at(page, x, y, value, size=10, color=TEXT):
    page.insert_text((x, y), value, fontsize=size, fontname="helv", color=color)


def card(page, box, fill=WHITE, border=BORDER):
    page.draw_rect(box, color=border, fill=fill, width=0.6)


def prepare_logo():
    if LOGO.exists():
        return
    if not LOGO_SVG.exists():
        return
    try:
        svg_doc = fitz.open(str(LOGO_SVG))
        pix = svg_doc[0].get_pixmap(matrix=fitz.Matrix(3, 3), alpha=True)
        pix.save(str(LOGO))
        svg_doc.close()
    except Exception:
        pass


def header(page, label):
    if LOGO.exists():
        page.insert_image(rect(M, 28, 152, 30), filename=str(LOGO))
    else:
        at(page, M, 50, "RedotPay", 18, RED)
    text(page, label.upper(), rect(W - 245, 34, 200, 18), 8.5, RED, 2)
    page.draw_line((M, 70), (W - M, 70), color=BORDER, width=0.8)


def footer(page, page_no):
    page.draw_line((M, H - 42), (W - M, H - 42), color=BORDER, width=0.6)
    text(page, "RedotPay Affiliate Guide", rect(M, H - 32, 220, 14), 7.5, MUTED)
    text(page, str(page_no), rect(W - M - 20, H - 32, 20, 14), 7.5, MUTED, 2)


def pill(page, x, y, label, width=145):
    page.draw_rect(rect(x, y, width, 20), fill=RED, color=RED)
    at(page, x + 8, y + 14, label.upper(), 7.2, WHITE)


def small_card(page, x, y, w, h, title, body):
    card(page, rect(x, y, w, h), LIGHT)
    at(page, x + 12, y + 22, title.upper(), 8.5, RED)
    text(page, body, rect(x + 12, y + 31, w - 24, h - 38), 9.2, TEXT)


def bullet_card(page, x, y, w, h, title, body):
    card(page, rect(x, y, w, h), WHITE)
    page.draw_rect(rect(x, y, 5, h), fill=RED, color=RED)
    at(page, x + 16, y + 24, title, 10.2, BLACK)
    text(page, body, rect(x + 16, y + 32, w - 28, h - 39), 8.8, MUTED)


def step(page, num, x, y, body):
    page.draw_oval(rect(x, y, 24, 24), fill=RED, color=RED)
    at(page, x + 8, y + 16, str(num), 8.5, WHITE)
    text(page, body, rect(x + 38, y + 3, 430, 22), 10, TEXT)


def mini_step(page, num, x, y, w, title, body):
    page.draw_oval(rect(x, y + 2, 20, 20), fill=RED, color=RED)
    at(page, x + 6.5, y + 16, str(num), 7.5, WHITE)
    at(page, x + 30, y + 14, title, 9.3, BLACK)
    text(page, body, rect(x + 30, y + 19, w - 34, 34), 7.6, MUTED)


def screenshot_card(page, key, x, y, w, h, title, caption):
    box = rect(x, y, w, h)
    card(page, box, WHITE, BORDER)
    image_box = rect(x + 8, y + 8, w - 16, h - 42)
    image_path = SCREENSHOTS[key]
    if image_path.exists():
        page.insert_image(image_box, filename=str(image_path), keep_proportion=True)
    else:
        page.draw_rect(image_box, color=BORDER, fill=LIGHT, width=0.6)
        text(page, "Screenshot placeholder", image_box + (0, 24, 0, 0), 9, MUTED, 1)
        text(page, image_path.name, image_box + (10, 44, -10, 0), 6.8, MUTED, 1)
    at(page, x + 10, y + h - 24, title, 8.5, BLACK)
    text(page, caption, rect(x + 10, y + h - 20, w - 20, 15), 6.9, MUTED)


def metric_card(page, x, y, w, h, number, label, body):
    card(page, rect(x, y, w, h))
    at(page, x + 14, y + 34, number, 23, RED)
    at(page, x + 14, y + 58, label, 10.5, BLACK)
    text(page, body, rect(x + 14, y + 66, w - 28, h - 72), 8.5, MUTED)


def page_one(doc):
    page = doc.new_page(width=W, height=H)
    header(page, "Quick Start")
    pill(page, M, 96, "Affiliate guide", 124)
    at(page, M, 145, "RedotPay Affiliates", 29, BLACK)
    at(page, M, 180, "Quick Start", 29, BLACK)
    text(
        page,
        "For affiliates who are ready to register, create links, track results, and withdraw commission.",
        rect(M, 210, 430, 40),
        11.5,
        TEXT,
    )

    at(page, M, 282, "Start in 3 actions", 15, BLACK)
    gap = 12
    col = (W - 2 * M - gap) / 2
    mini_step(page, 1, M, 316, col, "Open Affiliates", "Go to redotpay.com/affiliates or enter from the RedotPay homepage.")
    mini_step(page, 2, M, 370, col, "Register", "Prepare name, email, RedotPay ID, and preferred contact method.")
    mini_step(page, 3, M, 424, col, "Enter Affiliate Center", "Use the dashboard to create links, read reports, and manage payment.")
    small_card(page, M, 505, col, 92, "Use Affiliates for", "Multi-channel links, Media / Placement tracking, reports, commissions, and withdrawals.")
    small_card(page, M, 610, col, 92, "Use App referral for", "Simple personal invites when advanced reports are not needed.")

    screenshot_card(page, "entry", M + col + gap, 286, col, 190, "Affiliate entry", "Where users find the Affiliate Program.")
    screenshot_card(page, "signup", M + col + gap, 498, col, 204, "Registration page", "Submit affiliate profile information.")

    card(page, rect(M, 724, W - 2 * M, 42), (1, 0.985, 0.988), RED)
    at(page, M + 18, 749, "Main rule: create separate links for each channel from day one, so reports stay useful later.", 8.8, TEXT)
    footer(page, 1)


def commission_table(page, x, y, w):
    row_h = 34
    headers = ["Level", "Activation", "Spending", "Tier 2"]
    widths = [0.24, 0.25, 0.26, 0.25]
    page.draw_rect(rect(x, y, w, row_h), fill=RED, color=RED)
    cx = x
    for h, frac in zip(headers, widths):
        at(page, cx + 10, y + 21, h, 9.2, WHITE)
        cx += w * frac
    rows = [
        ("LV1", "20%", "0.05%", "10%"),
        ("LV2", "25%", "0.10%", "10%"),
        ("LV3", "30%", "0.20%", "10%"),
        ("Exclusive", "40%", "0.25%", "10%"),
    ]
    for i, row in enumerate(rows):
        ry = y + row_h * (i + 1)
        fill = LIGHT if i % 2 == 0 else WHITE
        card(page, rect(x, ry, w, row_h), fill, BORDER)
        cx = x
        for val, frac in zip(row, widths):
            at(page, cx + 10, ry + 21, val, 9.5, BLACK)
            cx += w * frac


def page_two(doc):
    page = doc.new_page(width=W, height=H)
    header(page, "Commission + Links")
    at(page, M, 122, "Commission", 24, BLACK)
    text(page, "Exact eligibility and rules follow the level shown in your Affiliate Center.", rect(M, 140, 410, 28), 10.2, TEXT)

    commission_table(page, M, 184, W - 2 * M)

    at(page, M, 382, "Card application fees", 15, BLACK)
    gap = 14
    cw = (W - 2 * M - gap) / 2
    metric_card(page, M, 412, cw, 88, "$10", "Virtual card", "Eligible activation commission can be calculated from this fee.")
    metric_card(page, M + cw + gap, 412, cw, 88, "$100", "Physical card", "Eligible activation commission can be calculated from this fee.")

    card(page, rect(M, 526, W - 2 * M, 62), (1, 0.985, 0.988), RED)
    at(page, M + 18, 552, "Tier 2: 10% for 365 days", 17, RED)
    text(page, "Invite other affiliates and earn 10% of their total commission for 365 days.", rect(M + 18, 562, W - 2 * M - 36, 18), 8.4, TEXT)

    screenshot_card(page, "center", M, 620, cw, 112, "Affiliate Center", "Manage promotions, reports, commissions, and payment.")
    screenshot_card(page, "links", M + cw + gap, 620, cw, 112, "Promotion Links", "Create separate links by channel, campaign, Media, and Placement.")

    footer(page, 2)


def page_three(doc):
    page = doc.new_page(width=W, height=H)
    header(page, "Reports + Payment")
    at(page, M, 122, "Operate weekly", 25, BLACK)
    text(page, "The workflow is simple: promote with clean links, check reports, then claim commission when eligible.", rect(M, 148, 430, 28), 10.2, TEXT)

    gap = 14
    col = (W - 2 * M - gap) / 2
    screenshot_card(page, "reports", M, 210, col, 190, "Reports", "Review clicks, registrations, conversions, and performance by placement.")
    screenshot_card(page, "payment", M + col + gap, 210, col, 190, "Payment", "Claim commissions and submit withdrawal requests.")

    at(page, M, 446, "Weekly operating checklist", 16, BLACK)
    mini_step(page, 1, M, 480, col, "One link per channel", "Separate YouTube, Telegram, WhatsApp, Instagram, website, and paid traffic.")
    mini_step(page, 2, M, 535, col, "Clean names", "Use clear Media and Placement names so reports can be compared later.")
    mini_step(page, 3, M, 590, col, "Review reports", "Check clicks, registrations, conversions, and real activation quality weekly.")
    mini_step(page, 4, M, 645, col, "Double down", "Keep traffic on the correct link and push placements that convert.")

    bullet_card(page, M + col + gap, 470, col, 90, "What to send your BD contact", "Affiliate account email, RedotPay ID, main promotion channels, and any campaign or commission questions.")
    bullet_card(page, M + col + gap, 578, col, 90, "Reminder", "Withdrawal methods and minimum requirements follow the current rules shown inside the Affiliate Center.")

    card(page, rect(M, 724, W - 2 * M, 42), LIGHT, BORDER)
    at(page, M + 16, 749, "Need help? Contact your RedotPay BD contact for setup, campaign rules, or commission questions.", 8.8, TEXT)
    footer(page, 3)


def main():
    prepare_logo()
    doc = fitz.open()
    page_one(doc)
    page_two(doc)
    page_three(doc)
    doc.save(OUT_REPO)
    doc.close()
    shutil.copy2(OUT_REPO, OUT_DOWNLOADS)
    print(f"saved {OUT_REPO}")
    print(f"copied {OUT_DOWNLOADS}")
    missing = [str(path) for path in SCREENSHOTS.values() if not path.exists()]
    if missing:
        print("missing screenshots:")
        for path in missing:
            print(f"- {path}")


if __name__ == "__main__":
    main()
