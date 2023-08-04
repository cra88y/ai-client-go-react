Under Development
# AI Client+Server

This project implements a multi-layer AI answer flow allowing confirgurable "layers" that adapt the way the language model will respond to your prompt. 
Layers:
- Web Search
   - Scrapes DuckDuckGo search results page
     - Options
       - Generate Search Term - An AI completion request is made that creates a search query based on the user's prompt
       - Process Search Results - An AI completion request is made using the scraped web results
       - Search Results Count - Limits how many search results are used (max depends on how many are returned)
- Specify Prompt
   - An AI completion request is made to extrapolate and determine an approach to respond to the user's prompt


Web client (TypeScript):
- Preact framework

Server (Go):
- Go Fiber for web server
- Go OpenAi API (by sashabaranov)
- GoQuery for webscraping
