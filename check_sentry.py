
import re

with open('/server.ts', 'r') as f:
    content = f.read()

# Find all catch blocks
# This is a simple regex and might not catch everything, but it's a good start
catch_blocks = re.finditer(r'catch\s*\(([^)]+)\)\s*\{([^}]+)\}', content)

missing_sentry = []
for match in catch_blocks:
    error_var = match.group(1).strip()
    block_content = match.group(2)
    
    if 'console.error' in block_content and 'Sentry.captureException' not in block_content:
        # Get line number
        line_no = content.count('\n', 0, match.start()) + 1
        missing_sentry.append((line_no, match.group(0)))

if missing_sentry:
    print(f"Found {len(missing_sentry)} catch blocks missing Sentry.captureException:")
    for line_no, block in missing_sentry:
        print(f"Line {line_no}: {block[:100]}...")
else:
    print("All catch blocks with console.error have Sentry.captureException.")
