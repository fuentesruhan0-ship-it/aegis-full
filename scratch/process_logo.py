from PIL import Image

src_path = r"C:\Users\flean\.gemini\antigravity-ide\brain\f97ee201-6f4a-4858-8621-b61b03236231\.user_uploaded\media_1791984555914.jpg"
img = Image.open(src_path)
w, h = img.size
print(f"Dimensions: {w}x{h}")

# The image is 1024x1024.
# Let's inspect brightness across columns at y=512 (middle)
pix = img.load()
row = [pix[x, 512] for x in range(w)]
# Find where the phone bezels end
for x in range(0, 300, 10):
    print(f"x={x}: {pix[x, 512]}")
print("--- right side ---")
for x in range(w-1, w-300, -10):
    print(f"x={x}: {pix[x, 512]}")
