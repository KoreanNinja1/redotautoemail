#!/usr/bin/env python3
"""Generate the 3-page RedotPay KOL partner PDF.

The source text lives in RedotPay_KOL_v2.md; this script controls the visual
deck layout so the exported PDF keeps a clean brand style.
"""

from pathlib import Path
import shutil

import fitz


ROOT = Path(__file__).resolve().parent
LOGO = ROOT / "redotpay_logo_full.png"
OUT_REPO = ROOT / "RedotPay_KOL_v2.pdf"
OUT_DOWNLOADS = Path.home() / "Downloads" / "RedotPay_KOL.pdf"

W, H = fitz.paper_size("a4")
M = 42

RED = (0.894, 0.106, 0.22)
BLACK = (0.09, 0.08, 0.08)
DARK = (0.14, 0.16, 0.20)
TEXT = (0.22, 0.25, 0.31)
MUTED = (0.42, 0.45, 0.50)
LIGHT = (0.965, 0.969, 0.976)
BORDER = (0.88, 0.90, 0.93)
WHITE = (1, 1, 1)


def rect(x, y, w, h):
    return fitz.Rect(x, y, x + w, y + h)


def text(page, value, box, size=10, font="helv", color=TEXT, align=0):
    page.insert_textbox(box, value, fontsize=size, fontname=font, color=color, align=align)


def at(page, x, y, value, size=10, font="helv", color=TEXT):
    page.insert_text((x, y), value, fontsize=size, fontname=font, color=color)


def line(page, x1, y1, x2, y2, color=RED, width=1):
    page.draw_line((x1, y1), (x2, y2), color=color, width=width)


def card(page, box, fill=WHITE, border=BORDER):
    page.draw_rect(box, color=border, fill=fill, width=0.6)


def header(page, eyebrow):
    page.insert_image(rect(M, 28, 152, 30), filename=str(LOGO))
    text(page, eyebrow.upper(), rect(W - 245, 34, 200, 18), 8.5, "helv", RED, 2)
    line(page, M, 70, W - M, 70, BORDER, 0.8)


def footer(page, page_no):
    line(page, M, H - 42, W - M, H - 42, BORDER, 0.6)
    text(page, "RedotPay Partner-Level Referral Program", rect(M, H - 32, 260, 14), 7.5, "helv", MUTED)
    text(page, str(page_no), rect(W - M - 20, H - 32, 20, 14), 7.5, "helv", MUTED, 2)


def pill(page, x, y, label, width=150):
    page.draw_rect(rect(x, y, width, 20), fill=RED, color=RED)
    at(page, x + 8, y + 14, label.upper(), 7.2, "helv", WHITE)


def metric_card(page, x, y, w, h, number, label, body):
    card(page, rect(x, y, w, h))
    at(page, x + 14, y + 34, number, 23, "helv", RED)
    at(page, x + 14, y + 58, label, 10.5, "helv", BLACK)
    text(page, body, rect(x + 14, y + 64, w - 28, h - 72), 8.4, "helv", MUTED)


def small_card(page, x, y, w, h, title, body):
    card(page, rect(x, y, w, h), LIGHT)
    at(page, x + 12, y + 22, title.upper(), 8.5, "helv", RED)
    text(page, body, rect(x + 12, y + 31, w - 24, h - 38), 9.2, "helv", TEXT)


def bullet_card(page, x, y, w, h, title, body):
    card(page, rect(x, y, w, h), WHITE)
    page.draw_rect(rect(x, y, 5, h), fill=RED, color=RED)
    at(page, x + 16, y + 24, title, 10, "helv", BLACK)
    text(page, body, rect(x + 16, y + 31, w - 28, h - 38), 8.7, "helv", MUTED)


def page_one(doc):
    page = doc.new_page(width=W, height=H)
    header(page, "Product + Creator Benefits")
    pill(page, M, 95, "KOL partner deck", 132)
    at(page, M, 145, "Partner-Level", 29, "helv", BLACK)
    at(page, M, 180, "Referral Program", 29, "helv", BLACK)
    text(
        page,
        "Where crypto meets real life. Help your audience spend stablecoins on everyday needs while you earn from activations and lifetime spending.",
        rect(M, 205, 410, 46),
        11.5,
        "helv",
        TEXT,
    )
    at(page, M, 298, "What your audience can use the card for", 15, "helv", BLACK)
    gap = 12
    cw = (W - 2 * M - 2 * gap) / 3
    y = 318
    small_card(page, M, y, cw, 104, "FX & trading", "Cross-border payments, platform payouts, and multi-currency spending.")
    small_card(page, M + cw + gap, y, cw, 104, "AI & SaaS", "ChatGPT, Claude, Midjourney, and subscriptions that reject local cards.")
    small_card(page, M + 2 * (cw + gap), y, cw, 104, "Everyday life", "Online shopping, dining, travel, and ATM cash - online and offline.")

    at(page, M, 490, "Why creators care", 15, "helv", BLACK)
    bw = (W - 2 * M - gap) / 2
    bullet_card(page, M, 508, bw, 82, "Lifetime commission", "Keep earning while referred users keep using their cards, even if you pause promotion.")
    bullet_card(page, M + bw + gap, 508, bw, 82, "Try before content", "Free card after registration, KYC, and RedotPay ID confirmation. Test before publishing.")
    bullet_card(page, M, 606, bw, 82, "Audience discount", "Exclusive 20% off card activation for your audience.")
    bullet_card(page, M + bw + gap, 606, bw, 82, "Performance support", "We track real activations and support creators who bring quality users.")

    footer(page, 1)


def page_two(doc):
    page = doc.new_page(width=W, height=H)
    header(page, "Commission + Monthly Challenge")
    at(page, M, 124, "Earnings structure", 25, "helv", BLACK)
    text(page, "Standard commissions plus extra monthly activation bonuses.", rect(M, 134, 380, 24), 10.5, "helv", TEXT)

    gap = 14
    cw = (W - 2 * M - gap) / 2
    metric_card(page, M, 180, cw, 112, "40%", "Card activation commission", "Earn per card activated through your referral link, referral code, or eligible discount code.")
    metric_card(page, M + cw + gap, 180, cw, 112, "0.25%", "Spending commission", "Earn ongoing passive income on every dollar your referred users spend.")
    metric_card(page, M, 308, cw, 112, "10%", "Tier 2 commission", "Earn from sub-partners you introduce.")
    metric_card(page, M + cw + gap, 308, cw, 112, "20%", "Custom discount code", "Exclusive activation discount for your audience.")

    at(page, M, 493, "Monthly challenge", 20, "helv", BLACK)
    text(page, "Extra bonus based on new user activations in the active campaign period.", rect(M, 500, 390, 22), 10, "helv", TEXT)

    table_x, table_y, table_w = M, 540, W - 2 * M
    row_h = 28
    page.draw_rect(rect(table_x, table_y, table_w, row_h), fill=RED, color=RED)
    at(page, table_x + 14, table_y + 18, "Activations", 9.5, "helv", WHITE)
    at(page, table_x + table_w / 2 + 14, table_y + 18, "Bonus", 9.5, "helv", WHITE)
    rows = [("10+", "$50"), ("30+", "$100"), ("100+", "$300"), ("200+", "$600"), ("300+", "$900"), ("400+", "$1,200")]
    for i, (a, b) in enumerate(rows):
        y = table_y + row_h * (i + 1)
        fill = LIGHT if i % 2 == 0 else WHITE
        card(page, rect(table_x, y, table_w, row_h), fill, BORDER)
        at(page, table_x + 14, y + 18, a, 9.5, "helv", BLACK)
        at(page, table_x + table_w / 2 + 14, y + 18, b, 9.5, "helv", BLACK)

    text(page, "Campaign details may change by period. Final terms follow the active rules shared by the RedotPay team.", rect(M, 732, W - 2 * M, 24), 8.2, "helv", MUTED)
    footer(page, 2)


def step(page, num, x, y, title):
    page.draw_oval(rect(x, y, 22, 22), fill=RED, color=RED)
    at(page, x + 7, y + 15, str(num), 8.5, "helv", WHITE)
    text(page, title, rect(x + 34, y + 3, 430, 18), 9.4, "helv", TEXT)


def page_three(doc):
    page = doc.new_page(width=W, height=H)
    header(page, "Onboard + Paid Collaboration")
    at(page, M, 124, "Onboard, test,", 25, "helv", BLACK)
    at(page, M, 154, "then scale", 25, "helv", BLACK)
    text(page, "Free card and referral setup first, performance review next.", rect(M, 164, 330, 26), 10.5, "helv", TEXT)

    at(page, M, 240, "How to onboard", 17, "helv", BLACK)
    steps = [
        "Register a RedotPay account.",
        "Complete KYC verification in the RedotPay app.",
        "Send us your RedotPay ID for confirmation.",
        "We arrange a free card so you can test the product first.",
        "We set up your referral link, referral code, and custom discount code.",
        "Create content in your own style and include referral information.",
        "We track activations, user spending, and campaign performance.",
    ]
    y = 262
    for i, s in enumerate(steps, 1):
        step(page, i, M, y, s)
        y += 35

    card(page, rect(M, 535, W - 2 * M, 94), (1, 0.985, 0.988), RED)
    at(page, M + 18, 570, "Paid collaboration policy", 13, "helv", BLACK)
    text(
        page,
        "We are open to paid deals, but new partners usually start with a trial. Review performance within 2-4 weeks after the first video or private group post. Strong results can lead to a long-term contract or upfront budget discussion.",
        rect(M + 18, 578, W - 2 * M - 36, 38),
        9.2,
        "helv",
        TEXT,
    )

    at(page, M, 688, "Contact", 16, "helv", BLACK)
    contact_w = (W - 2 * M - 16) / 2
    card(page, rect(M, 704, contact_w, 58), LIGHT, BORDER)
    at(page, M + 16, 727, "Telegram", 8.5, "helv", MUTED)
    at(page, M + 16, 750, "@Kenny_RedotPay", 12, "helv", BLACK)
    card(page, rect(M + contact_w + 16, 704, contact_w, 58), LIGHT, BORDER)
    at(page, M + contact_w + 32, 727, "WhatsApp", 8.5, "helv", MUTED)
    at(page, M + contact_w + 32, 750, "+852 53017076", 12, "helv", BLACK)

    footer(page, 3)


def main():
    if not LOGO.exists():
        raise SystemExit(f"Missing logo: {LOGO}")

    doc = fitz.open()
    page_one(doc)
    page_two(doc)
    page_three(doc)
    doc.save(OUT_REPO)
    doc.close()
    shutil.copy2(OUT_REPO, OUT_DOWNLOADS)
    print(f"saved {OUT_REPO}")
    print(f"copied {OUT_DOWNLOADS}")


if __name__ == "__main__":
    main()
