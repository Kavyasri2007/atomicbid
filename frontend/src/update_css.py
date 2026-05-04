import re
import os

css_path = r"C:\Users\kavya\Desktop\Atomicbid\frontend\src\index.css"

with open(css_path, "r", encoding="utf-8") as f:
    css = f.read()

# 1. :root variables
root_replacement = """:root {
  --ink: #111111;
  --ink-strong: #000000;
  --surface: #ffffff;
  --surface-soft: #f9f9f9;
  --surface-warm: #f4f5f5;
  --border: rgba(0, 0, 0, 0.1);
  --border-strong: rgba(0, 0, 0, 0.16);
  --primary: #9fe870;
  --primary-hover: #8ed261;
  --accent: #9fe870;
  --accent-strong: #8ed261;
  --accent-soft: #e1ffd4;
  --success: #10b981;
  --success-soft: #d1fae5;
  --danger: #d90429;
  --danger-soft: #ffccd5;
  --text-main: #111111;
  --text-muted: #5e6b73;
  --text-inverse: #ffffff;
  --glass-bg: rgba(255, 255, 255, 0.98);
  --glass-border: rgba(0, 0, 0, 0.08);
  --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.12);
  --focus: 0 0 0 4px rgba(159, 232, 112, 0.4);
}"""
css = re.sub(r":root\s*\{[^}]+\}", root_replacement, css, flags=re.MULTILINE)

# 2. body background
body_bg = """body {
  position: relative;
  min-height: 100vh;
  background: var(--surface);
  color: var(--text-main);
  font-family: Manrope, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.5;
}"""
css = re.sub(r"body\s*\{[^}]+\}", body_bg, css, count=1, flags=re.MULTILINE)

# 3. remove body::before, body::after, .app-container::before pseudo elements content
css = re.sub(r"body::before,\s*body::after\s*\{[^}]+\}", "body::before, body::after { display: none; }", css)
css = re.sub(r"body::before\s*\{[^}]+\}", "", css)
css = re.sub(r"body::after\s*\{[^}]+\}", "", css)
css = re.sub(r"\.app-container::before\s*\{[^}]+\}", ".app-container::before { display: none; }", css)

# 4. page-header text inverse to normal
css = css.replace(".page-header h1 {\n  color: var(--text-inverse);\n}", ".page-header h1 {\n  color: var(--ink);\n}")
css = css.replace(".page-header .section-copy {\n  color: rgba(248, 250, 252, 0.72);\n}", ".page-header .section-copy {\n  color: var(--text-muted);\n}")

# 5. navbar
css = css.replace("background: rgba(9, 9, 11, 0.72);", "background: rgba(255, 255, 255, 0.95);")
css = css.replace("border-bottom: 1px solid rgba(255, 255, 255, 0.12);", "border-bottom: 1px solid rgba(0, 0, 0, 0.08);")

# 6. nav links
css = css.replace("color: var(--text-inverse);", "color: var(--ink);") # general nav-brand, etc
css = css.replace("color: rgba(248, 250, 252, 0.88);", "color: var(--text-main);") # nav-link
css = css.replace("background: rgba(255, 255, 255, 0.1);", "background: rgba(0, 0, 0, 0.04);") # nav-link hover
css = css.replace("color: rgba(248, 250, 252, 0.64);", "color: var(--text-muted);") # nav-user

# 7. glass-card / panel-card background
css = re.sub(r"\.glass-card,\s*\.panel-card\s*\{[^}]+\}", """.glass-card,
.panel-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}""", css)

# 8. market-hero background
css = re.sub(r"\.market-hero\s*\{[^}]+\}", """.market-hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 1.5rem;
  padding: clamp(1.25rem, 3vw, 2rem);
  background: var(--surface-warm);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--ink);
}""", css)
css = re.sub(r"\.market-hero::before\s*\{[^}]+\}", ".market-hero::before { display: none; }", css)
css = re.sub(r"\.market-hero::after\s*\{[^}]+\}", ".market-hero::after { display: none; }", css)
css = re.sub(r"\.market-hero h1,\s*\.market-hero \.section-copy\s*\{[^}]+\}", """.market-hero h1,
.market-hero .section-copy {
  color: var(--ink);
}""", css)

# 9. auction-card background
css = re.sub(r"\.auction-card\s*\{[^}]+\}", """.auction-card {
  position: relative;
  display: flex;
  min-height: 100%;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: var(--shadow-sm);
}""", css)
css = re.sub(r"\.auction-card::before\s*\{[^}]+\}", ".auction-card::before { display: none; }", css)
css = css.replace("border-color: rgba(245, 158, 11, 0.5);", "border-color: var(--accent);")

# 10. bid-strip
css = re.sub(r"\.bid-strip\s*\{[^}]+\}", """.bid-strip {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1.1rem;
  background: var(--surface-warm);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--ink);
}""", css)
css = re.sub(r"\.bid-strip \.price,\s*\.bid-strip \.meta-row\s*\{[^}]+\}", """.bid-strip .price,
.bid-strip .meta-row {
  color: var(--ink);
}""", css)

# 11. profile-banner
css = re.sub(r"\.profile-banner\s*\{[^}]+\}", """.profile-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.5rem;
  background: var(--surface-warm);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--ink);
}""", css)

# 12. Ticker rail
css = css.replace("background: rgba(255, 255, 255, 0.08);", "background: var(--surface);")
css = css.replace("border: 1px solid rgba(255, 255, 255, 0.12);", "border: 1px solid var(--border);")
css = css.replace("color: #fef3c7;", "color: var(--ink);")

# 13. Buttons text color for btn-accent
css = css.replace("color: #18181b;", "color: #000000;")
css = css.replace("color: #ffffff;", "color: #000000;")

with open(css_path, "w", encoding="utf-8") as f:
    f.write(css)

print("CSS updated successfully.")
