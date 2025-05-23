#!/usr/bin/env python3
"""
HackerEarth Recruiter Portal Scraper with Cookie Authentication

This script is designed to scrape programming questions, problem descriptions,
and test cases from the HackerEarth recruiter portal using pre-existing cookies.

Requirements:
- Python 3.6+
- Selenium WebDriver
- Chrome WebDriver
- BeautifulSoup4
- Requests

Usage:
1. Install dependencies: pip install selenium beautifulsoup4 requests webdriver-manager
2. Run the script: python hackerearth_cookie_scraper.py
3. The script will use pre-existing cookies to authenticate and extract all programming questions
"""

import os
import time
import json
import logging
import datetime
import calendar
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

# Third-party imports
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import (
    TimeoutException, 
    NoSuchElementException, 
    StaleElementReferenceException
)
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("HackerEarthScraper")

def to_unix_timestamp(date_str):
    """Convert ISO date string to Unix timestamp"""
    try:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%S.%fZ")
    except ValueError:
        dt = datetime.datetime.strptime(date_str, "%Y-%m-%dT%H:%M:%SZ")
    return calendar.timegm(dt.utctimetuple())

# Pre-existing cookies for authentication
your_cookies = [
    {'name': '_gid', 'value': 'GA1.2.1714024027.1748005668', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-05-24T21:41:19.000Z'), 'secure': False, 'httpOnly': False},
    {'name': '_hjSessionUser_1237681', 'value': 'eyJpZCI6ImFjMDJmNjMxLThjMjEtNWU4ZC04NDc0LWJmNzBhODUxZDllYyIsImNyZWF0ZWQiOjE3NDU3NzgyMjU4MDEsImV4aXN0aW5nIjp0cnVlfQ==', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-04-27T18:24:00.000Z'), 'secure': False, 'httpOnly': True},
    {'name': '_hp2_id.4007000943', 'value': '%7B%22userId%22%3A%22908733186093619%22%2C%22pageviewId%22%3A%227434798601609175%22%2C%22sessionId%22%3A%226664386869910830%22%2C%22identity%22%3Anull%2C%22trackerVersion%22%3A%224.0%22%7D', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-05-27T04:24:00.000Z'), 'secure': False, 'httpOnly': True},
    {'name': '_rdt_uuid', 'value': '1742380392338.1c66b20b-9378-43be-bafb-ea4b1f924c41', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-08-21T21:35:55.000Z'), 'secure': False, 'httpOnly': True},
    {'name': '_uetsid', 'value': 'ecf4365037d611f0b5a8776d988768d1', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-05-24T21:35:54.000Z'), 'secure': False, 'httpOnly': False},
    {'name': '_uetvid', 'value': '3a11312006ff11ef875fcf6f55bf0ab0', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-06-17T21:35:54.000Z'), 'secure': False, 'httpOnly': False},
    {'name': '_ugeuid', 'value': 'placement@bmsit.in', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-08-23T21:41:06.000Z'), 'secure': False, 'httpOnly': False},
    {'name': '_vwo_uuid_v2', 'value': 'D1271A2B97732AAB65C454DADBAFFBE3B|c6312a9920a06128afe56c9168e093f8', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-05-21T17:01:24.000Z'), 'secure': False, 'httpOnly': False},
    {'name': 'challengesUTM', 'value': '"event=2026-cse-cv-ete-14052025-test&"', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-06-04T08:45:01.947Z'), 'secure': False, 'httpOnly': False},
    {'name': 'COMMUNITY_ONBOARDING_DONE_10309543', 'value': 'True', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-05-12T14:15:19.408Z'), 'secure': False, 'httpOnly': False},
    {'name': 'csrfToken', 'value': '5rBI2uXUvkFlTA8bw1SIfN6SKHMeURDrnZN4Uvs3wfNjwhx8qwaUbCs9hZYQe57z', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-05-22T21:41:21.670Z'), 'secure': False, 'httpOnly': True},
    {'name': 'HE_IDENTIFIER', 'value': '952148', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-06-02T21:41:21.670Z'), 'secure': False, 'httpOnly': False},
    {'name': 'HE_USER_EXISTS', 'value': 'True', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-05-27T18:23:20.653Z'), 'secure': False, 'httpOnly': False},
    {'name': 'HE_UTS_ID', 'value': '1cc0a75df1324936b846acd73aabafa1b2b194b4c48d4ca2952bb13fe3269236', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-05-23T21:47:10.864Z'), 'secure': True, 'httpOnly': False},
    {'name': 'HE_UTS_ID_CL', 'value': 'b66ad4f2b60048cdba7ef211ad6877f990fd9ef7aeb34cc8ae8e165d002197b8', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-06-27T13:07:48.063Z'), 'secure': True, 'httpOnly': False},
    {'name': 'HE_UTS_ID_LP', 'value': '"/recruiters/login/"', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-05-24T13:07:48.063Z'), 'secure': True, 'httpOnly': False},
    {'name': 'lordoftherings', 'value': 'cfe03b21d5765209b44cc1a0acc1a83c:qe7567at6p58q2ivjo3nr85vzxcz8lr5', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-06-02T21:41:21.670Z'), 'secure': True, 'httpOnly': True},
    {'name': 'mp_0967d717dcd4c97fbe8869ff8851ea86_mixpanel', 'value': '%7B%22distinct_id%22%3A%22placement%40bmsit.in%22%2C%22%24device_id%22%3A%22b629d90a-7822-4d6a-80a0-ce7e9e762ff8%22%2C%22%24initial_referrer%22%3A%22https%3A%2F%2Fapp.hackerearth.com%2Frecruiters%2Flogin%2F%22%2C%22%24initial_referring_domain%22%3A%22app.hackerearth.com%22%2C%22__mps%22%3A%7B%7D%2C%22__mpso%22%3A%7B%22%24initial_referrer%22%3A%22https%3A%2F%2Fapp.hackerearth.com%2Frecruiters%2Flogin%2F%22%2C%22%24initial_referring_domain%22%3A%22app.hackerearth.com%22%7D%2C%22__mpus%22%3A%7B%7D%2C%22__mpa%22%3A%7B%7D%2C%22__mpu%22%3A%7B%7D%2C%22__mpr%22%3A%5B%5D%2C%22__mpap%22%3A%5B%5D%2C%22%24user_id%22%3A%22placement%40bmsit.in%22%7D', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-05-23T21:41:05.000Z'), 'secure': False, 'httpOnly': False},
    {'name': 'mp_4c30b8635363027dfb780d5a61785112_mixpanel', 'value': '%7B%22distinct_id%22%3A%22%24device%3A195adf6de44130-093aa4e3097b65-26011d51-144000-195adf6de44130%22%2C%22%24device_id%22%3A%22195adf6de44130-093aa4e3097b65-26011d51-144000-195adf6de44130%22%2C%22url_path%22%3A%22%2Frecruiters%2Flogin%2F%22%2C%22%24initial_referrer%22%3A%22https%3A%2F%2Fassessment.hackerearth.com%2Fchallenges%2Ftest%2F2026-batch-cse-19032025-test%2Ffeedback%2F%22%2C%22%24initial_referring_domain%22%3A%22assessment.hackerearth.com%22%2C%22__mps%22%3A%7B%7D%2C%22__mpso%22%3A%7B%22%24initial_referrer%22%3A%22https%3A%2F%2Fassessment.hackerearth.com%2Fchallenges%2Ftest%2F2026-batch-cse-19032025-test%2Ffeedback%2F%22%2C%22%24initial_referring_domain%22%3A%22assessment.hackerearth.com%22%7D%2C%22__mpus%22%3A%7B%7D%2C%22__mpa%22%3A%7B%7D%2C%22__mpu%22%3A%7B%7D%2C%22__mpr%22%3A%5B%5D%2C%22__mpap%22%3A%5B%5D%2C%22%24search_engine%22%3A%22google%22%7D', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-05-23T21:35:54.000Z'), 'secure': False, 'httpOnly': False},
    {'name': 'ulang', 'value': '"ZW4tdXM="', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2026-03-19T09:01:05.289Z'), 'secure': False, 'httpOnly': False},
    {'name': 'user_tz', 'value': 'Asia/Kolkata', 'domain': 'app.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-05-24T21:41:19.000Z'), 'secure': False, 'httpOnly': False},
    {'name': 'x-guardian-access', 'value': 'yVdGdFlXtJfJm1j2yLdWeQ', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-06-02T21:41:21.670Z'), 'secure': True, 'httpOnly': True},
    {'name': 'zeus', 'value': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiIsImN0eSI6IkpXUyJ9.eyJpc3MiOiJIYWNrZXJFYXJ0aCIsInN1YiI6OTUyMTQ4LCJleHAiOjE3NDg5MDA0NTUsImlhdCI6MTc0ODAzNjQ1NSwianRpIjoiMzk4ZmIxYTNlMTFlNGVlMjg4ODhmYTM1YTRjM2M0ZGQiLCJjbGllbnRfaWQiOiJteWNhcmVlcnN0YWNrIn0.nNmI32mKpbtnGLw47twEEZ2vf1WNO1KxTlc4QoZjB3U', 'domain': '.hackerearth.com', 'path': '/', 'expiry': to_unix_timestamp('2025-06-02T21:40:55.607Z'), 'secure': True, 'httpOnly': True},
]

class HackerEarthScraper:
    """
    A class to scrape questions from HackerEarth questions library using cookies.
    Goes directly to the questions library and processes questions one by one.
    """
    
    BASE_URL = "https://www.hackerearth.com"
    APP_BASE_URL = "https://app.hackerearth.com"
    QUESTIONS_URL = f"{APP_BASE_URL}/recruiter/library/questions/?library=mylibrary"
    
    def __init__(self, headless: bool = False, output_dir: str = "hackerearth_questions"):
        """
        Initialize the scraper with browser settings and output directory.
        
        Args:
            headless: Whether to run the browser in headless mode
            output_dir: Directory to save scraped questions
        """
        self.headless = headless
        self.output_dir = Path(output_dir)
        self.driver = None
        
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def setup_driver(self) -> None:
        """Set up the Selenium WebDriver with appropriate options."""
        chrome_options = Options()
        if self.headless:
            chrome_options.add_argument("--headless")
        
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument("--start-maximized")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        
        # Install and set up Chrome WebDriver
        service = Service(ChromeDriverManager().install())
        self.driver = webdriver.Chrome(service=service, options=chrome_options)
        self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        self.driver.implicitly_wait(10)
        
    def set_cookies(self) -> bool:
        """
        Set all necessary cookies for authentication.
        
        Returns:
            bool: True if cookies set successfully, False otherwise
        """
        try:
            logger.info("Setting authentication cookies...")
            
            # STEP 1: Open a page under the base domain to set relevant cookies
            self.driver.get("https://hackerearth.com")
            time.sleep(2)

            # Add cookies for .hackerearth.com
            for cookie in your_cookies:
                if ".hackerearth.com" in cookie["domain"]:
                    try:
                        self.driver.add_cookie(cookie)
                    except Exception as e:
                        logger.warning(f"Error setting cookie for .hackerearth.com: {cookie['name']} - {e}")

            # STEP 2: Open the subdomain (app.hackerearth.com)
            self.driver.get("https://app.hackerearth.com")
            time.sleep(2)

            # Add cookies for app.hackerearth.com
            for cookie in your_cookies:
                if "app.hackerearth.com" in cookie["domain"]:
                    try:
                        self.driver.add_cookie(cookie)
                    except Exception as e:
                        logger.warning(f"Error setting cookie for app.hackerearth.com: {cookie['name']} - {e}")
            
            logger.info("Cookies set successfully!")
            return True
            
        except Exception as e:
            logger.error(f"Failed to set cookies: {str(e)}")
            return False
    

    
    def scrape_question_preview_data(self, question_element) -> Dict:
        """
        Scrape data from the question preview card.
        
        Args:
            question_element: Selenium WebElement for the question card
            
        Returns:
            Dict: Preview data for the question
        """
        question_data = {}
        
        try:
            # Question description
            try:
                description_elem = question_element.find_element(By.CSS_SELECTOR, ".ql-card-description")
                question_data['preview_description'] = description_elem.text.strip()
            except NoSuchElementException:
                pass
            
            # Difficulty level
            try:
                difficulty_elem = question_element.find_element(By.CSS_SELECTOR, ".ql-difficulty-level")
                question_data['difficulty'] = difficulty_elem.text.strip()
            except NoSuchElementException:
                pass
            
            # Score
            try:
                score_elem = question_element.find_element(By.XPATH, ".//span[contains(text(), 'Score')]")
                question_data['score'] = score_elem.text.strip()
            except NoSuchElementException:
                pass
            
            # Recommended time
            try:
                time_elem = question_element.find_element(By.XPATH, ".//span[contains(text(), 'Recommended time')]")
                question_data['recommended_time'] = time_elem.text.strip()
            except NoSuchElementException:
                pass
            
            # Section
            try:
                section_elem = question_element.find_element(By.XPATH, ".//span[contains(text(), 'Section:')]")
                question_data['section'] = section_elem.text.strip()
            except NoSuchElementException:
                pass
            
            # Question type
            try:
                type_elem = question_element.find_element(By.XPATH, ".//span[contains(text(), 'Multiple Choice Questions') or contains(text(), 'Programming') or contains(text(), 'Subjective')]")
                question_data['question_type'] = type_elem.text.strip()
            except NoSuchElementException:
                pass
                
        except Exception as e:
            logger.warning(f"Error extracting preview data: {e}")
        
        return question_data
    
    def extract_detailed_question_data(self) -> Dict:
        """
        Extract detailed data from the current question detail page.
        
        Returns:
            Dict: Detailed question data
        """
        question_details = {}
        
        try:
            logger.info("Extracting detailed question data...")
            
            # Wait for the question detail page to load
            wait = WebDriverWait(self.driver, 10)
            
            # Try to find different possible selectors for question content
            possible_selectors = [
                ".question-content",
                ".question-description", 
                ".ql-question-detail",
                ".question-body",
                "[class*='question']",
                ".problem-statement"
            ]
            
            question_content = None
            for selector in possible_selectors:
                try:
                    question_content = self.driver.find_element(By.CSS_SELECTOR, selector)
                    break
                except NoSuchElementException:
                    continue
            
            if question_content:
                question_details['full_question'] = question_content.text.strip()
            
            # Try to find answer options for MCQ
            try:
                options = self.driver.find_elements(By.CSS_SELECTOR, ".option, .choice, [class*='option'], [class*='choice']")
                if options:
                    question_details['options'] = [option.text.strip() for option in options]
            except NoSuchElementException:
                pass
            
            # Try to find correct answer
            try:
                correct_answer = self.driver.find_element(By.CSS_SELECTOR, ".correct-answer, .solution, [class*='correct'], [class*='answer']")
                question_details['correct_answer'] = correct_answer.text.strip()
            except NoSuchElementException:
                pass
            
            # Try to find explanation
            try:
                explanation = self.driver.find_element(By.CSS_SELECTOR, ".explanation, .solution-explanation, [class*='explanation']")
                question_details['explanation'] = explanation.text.strip()
            except NoSuchElementException:
                pass
            
            # Get page title
            question_details['page_title'] = self.driver.title
            
            # Get current URL
            question_details['url'] = self.driver.current_url
            
            # Get all text content as fallback
            try:
                body_text = self.driver.find_element(By.TAG_NAME, "body").text
                question_details['full_page_text'] = body_text
            except:
                pass
                
        except Exception as e:
            logger.error(f"Error scraping detailed question data: {e}")
            question_details['error'] = str(e)
        
        return question_details
    
    def save_question(self, question_data: Dict) -> None:
        """
        Save question data to a JSON file.
        
        Args:
            question_data: Question details to save
        """
        # Create a safe filename from the question title or description
        title = question_data.get('page_title', question_data.get('preview_description', f"question_{question_data.get('question_index', 'unknown')}"))
        safe_title = "".join(c if c.isalnum() else "_" for c in title)[:50]  # Limit filename length
        filename = self.output_dir / f"{safe_title}.json"
        
        # Ensure unique filename
        counter = 1
        while filename.exists():
            filename = self.output_dir / f"{safe_title}_{counter}.json"
            counter += 1
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(question_data, f, indent=2, ensure_ascii=False)
            
        logger.info(f"Saved question data to {filename}")
    
    def run(self) -> None:
        """
        Run the scraper to extract all programming questions using cookies.
        """
        all_questions_data = []
        
        try:
            # Setup WebDriver
            self.setup_driver()
            
            # Set cookies for authentication
            if not self.set_cookies():
                logger.error("Failed to set cookies. Exiting...")
                return
            
            # Navigate directly to questions library and stay there
            logger.info("Navigating to questions library...")
            self.driver.get(self.QUESTIONS_URL)
            
            # Wait for the questions container to be present
            wait = WebDriverWait(self.driver, 20)
            questions_container = wait.until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".margin-right-32.margin-left-32[role='presentation']"))
            )
            
            logger.info("Questions container found. Looking for question buttons...")
            
            # Find all question buttons
            question_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button.ql-card.ql-question-card.relative")
            logger.info(f"Found {len(question_buttons)} question buttons")
            
            # Process each question
            for i, button in enumerate(question_buttons):
                logger.info(f"Processing question {i+1}/{len(question_buttons)}")
                
                question_data = {
                    'question_index': i,
                    'preview_data': {},
                    'detailed_data': {}
                }
                
                try:
                    # Scroll the button into view
                    self.driver.execute_script("arguments[0].scrollIntoView(true);", button)
                    time.sleep(1)
                    
                    # Scrape preview data before clicking
                    question_data['preview_data'] = self.scrape_question_preview_data(button)
                    
                    # Click the button to get detailed view
                    self.driver.execute_script("arguments[0].click();", button)
                    time.sleep(3)  # Wait for navigation
                    
                    # Extract detailed data
                    question_data['detailed_data'] = self.extract_detailed_question_data()
                    
                    # Save question data
                    self.save_question(question_data)
                    
                    # Go back to the questions list
                    self.driver.back()
                    time.sleep(3)  # Wait for the list to reload
                    
                    # Re-find the question buttons as the DOM might have changed
                    question_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button.ql-card.ql-question-card.relative")
                    
                except Exception as e:
                    logger.error(f"Error processing question {i+1}: {e}")
                    question_data['error'] = str(e)
                    
                    # Try to go back to the list if we're on a different page
                    try:
                        self.driver.get(self.QUESTIONS_URL)
                        time.sleep(3)
                        question_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button.ql-card.ql-question-card.relative")
                    except:
                        pass
                
                all_questions_data.append(question_data)
                
                # Optional: Save data periodically
                if (i + 1) % 5 == 0:
                    backup_file = self.output_dir / f'questions_data_backup_{i+1}.json'
                    with open(backup_file, 'w', encoding='utf-8') as f:
                        json.dump(all_questions_data, f, indent=2, ensure_ascii=False)
                    logger.info(f"Backup saved after {i+1} questions")
            
            # Save final data
            final_file = self.output_dir / 'all_questions_data.json'
            with open(final_file, 'w', encoding='utf-8') as f:
                json.dump(all_questions_data, f, indent=2, ensure_ascii=False)
            
            logger.info(f"Scraping completed successfully! Saved data for {len(all_questions_data)} questions")
            
        except Exception as e:
            logger.error(f"An error occurred: {str(e)}")
            
        finally:
            # Close the browser
            if self.driver:
                self.driver.quit()

def main():
    """Main entry point for the script."""
    print("=" * 80)
    print("HackerEarth Questions Library Scraper (Cookie Authentication)")
    print("=" * 80)
    print("This script will scrape questions directly from the HackerEarth")
    print("questions library using pre-existing cookies.")
    print("\nNo login required - uses cookie authentication to stay logged in.")
    print("=" * 80)
    
    # Create and run the scraper
    scraper = HackerEarthScraper(headless=False, output_dir="hackerearth_questions")
    scraper.run()

if __name__ == "__main__":
    main()