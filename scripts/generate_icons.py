import os
from PIL import Image, ImageDraw, ImageFont

def create_master_icon(size=1024, is_maskable=False):
    # Master high-res image
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # For Apple Touch Icons and PWA icons:
    # Apple automatically clips to squircle, so base should be solid/opaque background
    bg_color = (13, 15, 20, 255) # Deep Dark Slate #0D0F14
    
    # Draw full background
    draw.rectangle([0, 0, size, size], fill=bg_color)
    
    # Subtle radial/linear glow in center
    glow_color = (255, 89, 0, 28) # Subtle Action Orange glow
    draw.ellipse([size * 0.15, size * 0.15, size * 0.85, size * 0.85], fill=glow_color)

    # Safe zone factor for maskable vs standard
    scale = 0.72 if is_maskable else 0.88
    center = size / 2

    # Emblem container (Rounded square in center)
    card_size = size * 0.62 * (scale / 0.88)
    card_x0 = center - card_size / 2
    card_y0 = center - card_size / 2 - (size * 0.02)
    card_x1 = card_x0 + card_size
    card_y1 = card_y0 + card_size
    corner_radius = card_size * 0.22

    # Draw emblem background (Vibrant Action Orange #FF5900 with subtle gradient imitation)
    draw.rounded_rectangle(
        [card_x0, card_y0, card_x1, card_y1],
        radius=corner_radius,
        fill=(255, 89, 0, 255), # #FF5900
        outline=(255, 128, 51, 200),
        width=int(size * 0.008)
    )

    # Inner cue ring accent
    ring_inset = card_size * 0.12
    draw.ellipse(
        [card_x0 + ring_inset, card_y0 + ring_inset, card_x1 - ring_inset, card_y1 - ring_inset],
        outline=(255, 255, 255, 35),
        width=int(size * 0.006)
    )

    # Load font for TCN
    font_path = "C:/Windows/Fonts/segoeuib.ttf"
    if not os.path.exists(font_path):
        font_path = "C:/Windows/Fonts/arialbd.ttf"
    
    font_size_tcn = int(card_size * 0.36)
    tcn_font = ImageFont.truetype(font_path, font_size_tcn)

    # Draw "TCN" text centered
    text = "TCN"
    bbox = draw.textbbox((0, 0), text, font=tcn_font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    text_x = center - text_w / 2 - bbox[0]
    text_y = (card_y0 + card_size / 2) - text_h / 2 - bbox[1] - (size * 0.015)
    
    # Subtle drop shadow for text
    draw.text((text_x, text_y + size * 0.004), text, font=tcn_font, fill=(180, 50, 0, 180))
    draw.text((text_x, text_y), text, font=tcn_font, fill=(255, 255, 255, 255))

    # Active emerald green status badge (Upper-right corner of card)
    dot_radius = card_size * 0.09
    dot_cx = card_x1 - (card_size * 0.12)
    dot_cy = card_y0 + (card_size * 0.12)
    
    # Outer white ring around dot
    draw.ellipse(
        [dot_cx - dot_radius * 1.3, dot_cy - dot_radius * 1.3, dot_cx + dot_radius * 1.3, dot_cy + dot_radius * 1.3],
        fill=(13, 15, 20, 255)
    )
    # Emerald green dot (#0D9926 / #10B981)
    draw.ellipse(
        [dot_cx - dot_radius, dot_cy - dot_radius, dot_cx + dot_radius, dot_cy + dot_radius],
        fill=(16, 185, 129, 255) # Emerald Green #10B981
    )

    # Subtitle "OPERATIONS" under card
    sub_font_size = int(size * 0.048 * (scale / 0.88))
    sub_font = ImageFont.truetype(font_path, sub_font_size)
    sub_text = "OPERATIONS SUITE"
    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    sub_w = sub_bbox[2] - sub_bbox[0]
    sub_h = sub_bbox[3] - sub_bbox[1]
    sub_x = center - sub_w / 2 - sub_bbox[0]
    sub_y = card_y1 + (size * 0.045)
    
    draw.text((sub_x, sub_y), sub_text, font=sub_font, fill=(185, 187, 198, 240)) # #B9BBC6

    return img

def main():
    icons_dir = "e:/The-Q-Nation/public/icons"
    public_dir = "e:/The-Q-Nation/public"
    os.makedirs(icons_dir, exist_ok=True)

    print("Generating master icons...")
    master_std = create_master_icon(size=1024, is_maskable=False)
    master_maskable = create_master_icon(size=1024, is_maskable=True)

    sizes = [
        ("apple-touch-icon.png", 180, public_dir, master_std),
        ("apple-touch-icon-180x180.png", 180, icons_dir, master_std),
        ("apple-touch-icon-167x167.png", 167, icons_dir, master_std),
        ("apple-touch-icon-152x152.png", 152, icons_dir, master_std),
        ("apple-touch-icon-120x120.png", 120, icons_dir, master_std),
        ("icon-192.png", 192, icons_dir, master_std),
        ("icon-512.png", 512, icons_dir, master_std),
        ("icon-maskable-512.png", 512, icons_dir, master_maskable),
    ]

    for name, sz, folder, source_img in sizes:
        resized = source_img.resize((sz, sz), Image.Resampling.LANCZOS)
        out_path = os.path.join(folder, name)
        resized.save(out_path, "PNG", optimize=True)
        print(f"Generated {out_path} ({sz}x{sz})")

if __name__ == "__main__":
    main()
