from PIL import Image

src_path = r"C:\Users\flean\.gemini\antigravity-ide\brain\f97ee201-6f4a-4858-8621-b61b03236231\.user_uploaded\media_1791984555914.jpg"
img = Image.open(src_path)
w, h = img.size
pix = img.load()

# Let's inspect along center vertical line x=512
print("Vertical profile along x=512:")
for y in range(0, h, 20):
    p = pix[512, y]
    if max(p) > 20:
        print(f"y={y}: {p}")
