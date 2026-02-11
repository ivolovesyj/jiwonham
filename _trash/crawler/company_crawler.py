import time
import pandas as pd
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from datetime import datetime

# ==========================================
# 설정
# ==========================================
URL = "https://zighang.com/company"
OUTPUT_FILE = f"company_list_{datetime.now().strftime('%Y%m%d_%H%M')}.csv"

# ==========================================
# 크롤러 클래스
# ==========================================
class CompanyCrawler:
    def __init__(self):
        chrome_options = Options()
        # chrome_options.add_argument("--headless")  # 속도 위해 화면 띄움 (상태 확인용)
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        
        # 봇 탐지 우회
        chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        self.driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        self.data = []

    def extract_and_save(self, scroll_count):
        """현재 화면에 로딩된 데이터 추출 및 저장"""
        # print(f"   💾 중간 저장 시도 (스크롤 {scroll_count}회)...")
        
        script = """
        const items = Array.from(document.querySelectorAll('div.hidden.lg\\\\:contents > a'));
        return items.map(item => {
            try {
                const name = item.querySelector('div.typo-body-sm-medium span')?.innerText?.trim() || 'N/A';
                let type = 'N/A';
                const divs = item.querySelectorAll(':scope > div');
                if (divs.length >= 3) {
                    type = divs[2].innerText.trim();
                }
                return {
                    corporate_name: name,
                    industry: type,
                    source_url: item.href
                };
            } catch (e) { return null; }
        }).filter(item => item !== null);
        """
        
        try:
            extracted_data = self.driver.execute_script(script)
        except:
            return

        # 중복 제거 (URL 기준)
        current_urls = {d['source_url'] for d in self.data}
        new_count = 0
        for item in extracted_data:
            if item['source_url'] not in current_urls:
                item['crawled_at'] = datetime.now().isoformat()
                self.data.append(item)
                current_urls.add(item['source_url'])
                new_count += 1
        
        if new_count > 0:
            print(f"   ✨ {len(self.data)}개 수집 중...")
            self.save_csv()

    def scroll_to_bottom(self):
        """페이지 끝까지 스크롤하여 모든 데이터 로딩 (초고속 모드)"""
        print("📜 스크롤 다운 시작 (초고속 모드)...")
        last_height = self.driver.execute_script("return document.body.scrollHeight")
        scroll_count = 0
        
        while True:
            self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(1.0) # 1초 고정 대기 (빠르게)
            
            new_height = self.driver.execute_script("return document.body.scrollHeight")
            
            scroll_count += 1
            if scroll_count % 20 == 0: # 20번마다 저장 (빈도 낮춤)
                print(f"   - 스크롤 {scroll_count}회")
                self.extract_and_save(scroll_count)
            
            if new_height == last_height:
                time.sleep(2)
                new_height = self.driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height:
                    print(f"✅ 스크롤 완료 (총 {scroll_count}회)")
                    self.extract_and_save(scroll_count)
                    break
            
            last_height = new_height

    def crawl(self):
        print(f"🚀 크롤링 시작: {URL}")
        self.driver.get(URL)
        
        try:
            WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "div.hidden.lg\\:contents"))
            )
            print("✅ 페이지 로딩 완료")
        except:
            print("❌ 로딩 실패")
            self.driver.quit()
            return

        self.scroll_to_bottom()
        self.driver.quit()
        print("✨ 크롤링 종료")

    def save_csv(self):
        if not self.data:
            print("⚠️ 저장할 데이터가 없습니다.")
            return
            
        df = pd.DataFrame(self.data)
        df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8-sig")
        print(f"💾 파일 저장 완료: {OUTPUT_FILE}")
        print(df.head())

# ==========================================
# 실행
# ==========================================
if __name__ == "__main__":
    crawler = CompanyCrawler()
    crawler.crawl()
    crawler.save_csv()
