import csv
from collections import Counter

file_path = r'C:\Users\Administrator\Downloads\jobs_rows.csv'

def analyze_locations():
    location_counts = Counter()
    total_rows = 0
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                total_rows += 1
                loc = row.get('location', '').strip()
                if not loc:
                    loc = '(Empty)'
                location_counts[loc] += 1
                
        with open('location_stats.txt', 'w', encoding='utf-8') as out:
            out.write(f"Total Rows Processed: {total_rows}\n")
            out.write("-" * 35 + "\n")
            out.write(f"{'Location':<20} | {'Count':<5} | {'Percent':<7}\n")
            out.write("-" * 35 + "\n")
            
            for loc, count in location_counts.most_common():
                percentage = (count / total_rows) * 100
                out.write(f"{loc:<20} | {count:<5} | {percentage:.1f}%\n")
                
        print("Analysis complete. Check location_stats.txt")

    except Exception as e:
        print(f"Error processing file: {e}")

if __name__ == '__main__':
    analyze_locations()
