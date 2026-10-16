from PIL import Image
import math

src_path = r"C:\Users\flean\.gemini\antigravity-ide\brain\f97ee201-6f4a-4858-8621-b61b03236231\.user_uploaded\media_1791984555914.jpg"
img = Image.open(src_path)
w, h = img.size
pix = img.load()

# Let's find the circle center (cx, cy) and radius r
# The circle outline has a bright bluish glow (e.g. R ~ 70-150, G ~ 100-240, B ~ 120-255)
# Let's check horizontal line across y=450
print("Horizontal slice at y=450:")
for x in range(180, 850, 10):
    p = pix[x, 450]
    if p[2] > 60:
        pass
# Find leftmost and rightmost x with high brightness for the circle at y=450
bright_xs = [x for x in range(180, 845) if pix[x, 450][2] > 70]
print(f"At y=450, bright x range: {min(bright_xs)} to {max(bright_xs)}, center={(min(bright_xs)+max(bright_xs))/2}")

# Find topmost and bottommost y with high brightness for the circle at x=512
bright_ys = [y for y in range(100, 750) if pix[512, y][2] > 60]
print(f"At x=512, bright y range: {min(bright_ys)} to {max(bright_ys)}, center={(min(bright_ys)+max(bright_ys))/2}")

# Check AEGIS text bounds
text_xs = [x for x in range(180, 845) for y in range(790, 880) if pix[x, y][0] > 100]
text_ys = [y for x in range(180, 845) for y in range(790, 880) if pix[x, y][0] > 100]
print(f"AEGIS text: x in [{min(text_xs)}, {max(text_xs)}], y in [{min(text_ys)}, {max(text_ys)}]")

# Check EARTHQUAKE GUIDANCE text bounds
sub_xs = [x for x in range(180, 845) for y in range(880, 940) if pix[x, y][0] > 80]
sub_ys = [y for x in range(180, 845) for y in range(880, 940) if pix[x, y][0] > 80]
print(f"Subtext: x in [{min(sub_xs)}, {max(sub_xs)}], y in [{min(sub_ys)}, {max(sub_ys)}]")
