import os
from dotenv import load_dotenv
from scrapegraphai.graphs import SmartScraperGraph

load_dotenv()

api_key = os.getenv("ANTHROPIC_API_KEY")
if not api_key:
    print("ERROR: ANTHROPIC_API_KEY not set in .env")
    exit(1)

print("API key found (first 12 chars):", api_key[:12] + "...")

# Configure Claude as the LLM
graph_config = {
    "llm": {
        "api_key": api_key,
        "model": "anthropic/claude-haiku-4-5",
    },
    "verbose": True,
    "headless": True,
}

# Scrape a simple page
scraper = SmartScraperGraph(
    prompt="Extract the page title and first heading",
    source="https://scrapegraphai.com/",
    config=graph_config,
)

print("\nRunning scrape...")
result = scraper.run()
print("\nResult:")
print(result)