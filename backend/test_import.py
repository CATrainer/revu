import os
import chardet  # You might need to install this with: pip install chardet

files_to_fix = [
    "app/models/location.py",
    "app/models/organization.py",
    "app/models/review.py",
    "app/models/user.py",
]

def detect_encoding(filepath):
    with open(filepath, 'rb') as f:
        rawdata = f.read()
    result = chardet.detect(rawdata)
    return result['encoding']

def convert_to_utf8(filepath, src_encoding):
    try:
        with open(filepath, 'r', encoding=src_encoding) as f:
            text = f.read()
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(text)
        print(f"Converted {filepath} from {src_encoding} to UTF-8.")
    except Exception as e:
        print(f"Failed to convert {filepath}: {e}")

if __name__ == "__main__":
    for file in files_to_fix:
        if os.path.exists(file):
            encoding = detect_encoding(file)
            if encoding is None:
                print(f"Could not detect encoding for {file}. Skipping.")
                continue
            if encoding.lower() != 'utf-8':
                convert_to_utf8(file, encoding)
            else:
                print(f"{file} already UTF-8 encoded.")
        else:
            print(f"File not found: {file}")
