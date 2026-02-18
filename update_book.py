import os

base_path = r"C:\Users\shlgr\.gemini\antigravity\scratch\tenant-rating"
draft_path = r"C:\Users\shlgr\.gemini\antigravity\brain\b73fb847-0e81-4659-9200-e662ad1382c1\appendices_draft.html"
target_path = os.path.join(base_path, "ProjectBook.html")

print(f"Updating {target_path}...")

try:
    # Read original file
    with open(target_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # We want to keep everything UP TO the appendices comment line.
    # Line 1036 (1-based) is "    <!-- CODE APPENDICES - FULL PAGE EXAMPLES -->"
    # This corresponds to index 1035.
    
    # Find the exact line index if possible to be safe
    split_index = -1
    for i, line in enumerate(lines):
        if "<!-- CODE APPENDICES - FULL PAGE EXAMPLES -->" in line:
            split_index = i
            break
            
    if split_index == -1:
        # Fallback to hardcoded index if comment modified
        split_index = 1035
        print("Warning: Start marker not found, using line 1035.")
    else:
        print(f"Found split point at line {split_index + 1}")

    # Read new content
    with open(draft_path, 'r', encoding='utf-8') as f:
        new_content = f.read()

    # Construct final content
    # Header: lines before the split
    header = "".join(lines[:split_index])
    
    # Footer: Just the closing tags standard for this file
    footer = "\n</body>\n</html>"

    final_content = header + new_content + footer

    # Write back
    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(final_content)

    print("Successfully updated ProjectBook.html")

except Exception as e:
    print(f"Error: {e}")
