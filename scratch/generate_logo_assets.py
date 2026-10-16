import os
import math
from PIL import Image, ImageFilter, ImageDraw

src_path = r"C:\Users\flean\.gemini\antigravity-ide\brain\f97ee201-6f4a-4858-8621-b61b03236231\.user_uploaded\media_1791984555914.jpg"
orig = Image.open(src_path).convert("RGBA")
w, h = orig.size
print(f"Loaded source image: {w}x{h}")

os.makedirs("public", exist_ok=True)

# ---------------------------------------------------------
# Asset 1: Clean Full Logo (1024x1024)
# Remove the phone chassis/bezels at left (x < 185) and right (x > 840)
# Replace them with the clean dark background color (13, 18, 22)
# ---------------------------------------------------------
full_clean = Image.new("RGBA", (1024, 1024), (13, 18, 22, 255))

# We take the center slice from x=185 to x=840 (width 655px), centered at 512.
# Let's feather the left and right transitions smoothly between x=185..230 and x=795..840
slice_left = 188
slice_right = 836

# Create an alpha mask for the screen region with soft horizontal feathering on left/right
mask = Image.new("L", (w, h), 0)
mask_draw = ImageDraw.Draw(mask)

# For each x column, calculate opacity
mask_bytes = bytearray(w * h)
for y in range(h):
    row_offset = y * w
    for x in range(w):
        if x < slice_left or x > slice_right:
            val = 0
        elif x < slice_left + 35:
            # smooth step from 0 to 255
            t = (x - slice_left) / 35.0
            val = int(255 * (t * t * (3 - 2 * t)))
        elif x > slice_right - 35:
            t = (slice_right - x) / 35.0
            val = int(255 * (t * t * (3 - 2 * t)))
        else:
            val = 255
        mask_bytes[row_offset + x] = val

screen_mask = Image.frombytes("L", (w, h), bytes(mask_bytes))

# Composite screen onto dark background
full_clean.paste(orig, (0, 0), screen_mask)

# Center vertically:
# The emblem center is at cy=464, text goes down to y=925.
# Total visual content height is from y=189 to y=925 = 736px.
# Middle of content is (189 + 925)/2 = 557.
# To center at y=512, we shift up by (557 - 512) = 45px.
shift_y = 512 - 557
full_centered = Image.new("RGBA", (1024, 1024), (13, 18, 22, 255))
full_centered.paste(full_clean, (0, shift_y))
full_centered.save("public/logo-full.png", "PNG", optimize=True)
print("Saved public/logo-full.png")

# ---------------------------------------------------------
# Asset 2: Circular Shield Emblem with Transparent Background (512x512)
# Center: cx = 512, cy = 464, radius = 275
# ---------------------------------------------------------
cx, cy = 512, 464
r_inner = 272
r_outer = 286

# Crop a square around (cx, cy) with size 620x620
crop_size = 620
half = crop_size // 2
crop_box = (cx - half, cy - half, cx + half, cy + half)
cropped_emblem = orig.crop(crop_box)
cw, ch = cropped_emblem.size

# Build smooth radial alpha mask
emblem_mask = Image.new("L", (cw, ch), 0)
emblem_bytes = bytearray(cw * ch)
em_cx, em_cy = cw / 2.0, ch / 2.0

for y in range(ch):
    row_offset = y * cw
    dy = y - em_cy
    for x in range(cw):
        dx = x - em_cx
        dist = math.sqrt(dx * dx + dy * dy)
        if dist <= r_inner:
            val = 255
        elif dist >= r_outer:
            val = 0
        else:
            t = (r_outer - dist) / (r_outer - r_inner)
            # smoothstep
            val = int(255 * (t * t * (3 - 2 * t)))
        emblem_bytes[row_offset + x] = val

radial_mask = Image.frombytes("L", (cw, ch), bytes(emblem_bytes))
cropped_emblem.putalpha(radial_mask)

# Resize to standard 512x512
logo_transparent_512 = cropped_emblem.resize((512, 512), Image.Resampling.LANCZOS)
logo_transparent_512.save("public/logo.png", "PNG", optimize=True)
print("Saved public/logo.png (512x512 transparent)")

# Also save 256, 128, 64, 32 versions
logo_transparent_256 = cropped_emblem.resize((256, 256), Image.Resampling.LANCZOS)
logo_transparent_256.save("public/logo-256.png", "PNG", optimize=True)

logo_transparent_64 = cropped_emblem.resize((64, 64), Image.Resampling.LANCZOS)
logo_transparent_64.save("public/favicon-64.png", "PNG", optimize=True)

logo_transparent_32 = cropped_emblem.resize((32, 32), Image.Resampling.LANCZOS)
logo_transparent_32.save("public/favicon-32.png", "PNG", optimize=True)
logo_transparent_32.save("public/favicon.ico", "ICO")
logo_transparent_32.save("public/favicon.png", "PNG")
print("Saved favicons (ico, png)")

# ---------------------------------------------------------
# Asset 3: Apple Touch Icon / App Icon (Squircle / Rounded Dark Card)
# 180x180 & 512x512
# ---------------------------------------------------------
app_icon_512 = Image.new("RGBA", (512, 512), (13, 18, 22, 255))
# Soft inner glow background
draw = ImageDraw.Draw(app_icon_512)
for radius, alpha in [(240, 15), (200, 25), (150, 35)]:
    glow_color = (0, 160, 220, alpha)
    draw.ellipse((256 - radius, 256 - radius, 256 + radius, 256 + radius), fill=glow_color)

# Scale emblem slightly inside (440x440) so it has elegant padding
emblem_padded = cropped_emblem.resize((440, 440), Image.Resampling.LANCZOS)
app_icon_512.paste(emblem_padded, (36, 36), emblem_padded)

# Rounded corners mask for squircle
corner_radius = 90
squircle_mask = Image.new("L", (512, 512), 0)
sq_draw = ImageDraw.Draw(squircle_mask)
sq_draw.rounded_rectangle((0, 0, 512, 512), radius=corner_radius, fill=255)

app_icon_512_rounded = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
app_icon_512_rounded.paste(app_icon_512, (0, 0), squircle_mask)
app_icon_512_rounded.save("public/app-icon.png", "PNG", optimize=True)

app_icon_180 = app_icon_512_rounded.resize((180, 180), Image.Resampling.LANCZOS)
app_icon_180.save("public/apple-touch-icon.png", "PNG", optimize=True)
print("Saved public/app-icon.png and public/apple-touch-icon.png")

print("All logo assets created successfully!")
