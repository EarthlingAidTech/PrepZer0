import os

# Set the root directory of your project
ROOT_DIR = r"C:\Users\debis\Downloads\Projects\Prep0\codingplatform"
  # Replace this with your actual project path

# File types you want to count (adjust as needed)
included_extensions = ['.js', '.ts', '.py', '.jsx', '.tsx' ,".ejs"]

# Directories and files to exclude
excluded_dirs = {'node_modules' }
excluded_files = {'package.json', 'package-lock.json'}

def count_lines_of_code(root_dir):
    total_lines = 0
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Remove excluded directories from traversal
        dirnames[:] = [d for d in dirnames if d not in excluded_dirs]
        
        for file in filenames:
            if file in excluded_files:
                continue
            if any(file.endswith(ext) for ext in included_extensions):
                file_path = os.path.join(dirpath, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        line_count = sum(1 for _ in f)
                        total_lines += line_count
                except Exception as e:
                    print(f"Could not read {file_path}: {e}")
    return total_lines

if __name__ == "__main__":
    loc = count_lines_of_code(ROOT_DIR)
    print(f"Total lines of code: {loc}")
