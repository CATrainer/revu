import os

def clean_null_bytes_text_mode(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if '\x00' in content:
            print(f"Cleaning: {file_path}")
            content = content.replace('\x00', '')
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
    except UnicodeDecodeError:
        print(f"Skipped (encoding issue): {file_path}")

# Set your root directory here
project_root = 'C:/Users/caleb/OneDrive/Desktop/Repos/Revu/backend/app'

for root, _, files in os.walk(project_root):
    for file in files:
        if file.endswith('.py'):
            clean_null_bytes_text_mode(os.path.join(root, file))
