package main

import (
	"context"
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/sashabaranov/go-openai"
	"io"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"time"
)

type LayerOptions struct {
	SpecifyPrompt        bool `json:"specifyPrompt"`
	GenerateSearchTerm   bool `json:"generateSearchTerm"`
	Search               bool `json:"search"`
	SearchResultsCount   int  `json:"searchResultsCount"`
	ProcessSearchResults bool `json:"processSearchResults"`
	MaxResponseTokens    int  `json:"maxResponseTokens"`
}

type CompletionRequest struct {
	ApiKey       string                         `json:"apiKey"`
	Messages     []openai.ChatCompletionMessage `json:"messages"`
	LayerOptions LayerOptions                   `json:"layerOptions"`
}

func main() {
	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
	}))
	app.Post("/ai", func(c *fiber.Ctx) error {
		log.Print(c)
		var reqBody CompletionRequest
		if err := c.BodyParser(&reqBody); err != nil {
			return err
		}
		client := openai.NewClient(reqBody.ApiKey)
		layerOptions := reqBody.LayerOptions
		log.Println("Layer Options: ", layerOptions)
		msgsCount := len(reqBody.Messages)
		userLastMsg := openai.ChatCompletionMessage{}
		userLastMsgIdx := -1
		userPrevMsg := openai.ChatCompletionMessage{}
		for i := msgsCount - 1; i >= 0; i-- {
			msg := reqBody.Messages[i]
			if userLastMsg == (openai.ChatCompletionMessage{}) {
				if msg.Role == openai.ChatMessageRoleUser {
					userLastMsg = msg
					userLastMsgIdx = i
					log.Println("User Last Message:", userLastMsg.Content)
				}
			} else {
				if msg.Role == openai.ChatMessageRoleUser {
					userPrevMsg = msg
					log.Println("User Prev Message:", userPrevMsg.Content)
					break
				}
			}
		}
		newUserMsg := userLastMsg
		//specify prompt layer
		if layerOptions.SpecifyPrompt == true {
			newUserMsg = specifyPrompt(client, userLastMsg, userLastMsg)
			log.Println("specified user prompt: ", newUserMsg.Content)
		}

		searchTerm := newUserMsg.Content
		//search query string layer
		if layerOptions.Search && layerOptions.GenerateSearchTerm == true {
			searchTerm = getSearchQueryString(newUserMsg.Content, client)
			log.Println("search term: ", searchTerm)
		}

		searchResults := "search results disabled for this request, respond as if you didn't have them"
		//search results layer
		if layerOptions.Search == true {
			searchResultsRet, _ := duckScrape(searchTerm, layerOptions.SearchResultsCount)
			searchResults = searchResultsRet
			log.Println("search results: ", searchResults)
		}
		//process search results layer
		if layerOptions.Search == true && layerOptions.ProcessSearchResults == true {
			searchResults = processSearchResults(searchResults, newUserMsg.Content, client)
			log.Println("processed search results: ", searchResults)
		}

		//answering layer
		systemMsg := fmt.Sprintf(`You are the final layer in an AI workflow.
		Current time: %s
		Max response tokens: %d
		Your layer finally addresses and responds to the user's input utilizing the workflow's search results provided and other valuable insight as your own. Your response is the only response the user sees. If answering a question, back your response up with search results sources. The search results provided are from your own real-time web browsing.
		guidelines:
		- weave in the search results provided to back up your claims
		- respond with citation syntax (+ full url): search result's list # in brackets, then search result's full url in parentheses. example: '[resultListIndex](resultURL).' because the user can't see your search results, you must help them.
		- Use markdown syntax for styling
		never do these:
		- Do not mention the ai workflow, it is not important to the user.
		You do not have to apologize, as the user is unaware of the workflow.
		The search results are the most accurate data you have, they are part of the workflow.
		Your knowledge cut off is not an excuse due to your ability to utilize the workflow's search results.
		Response Format: paragraphs
		Search Results:\n%s`, time.Now(), layerOptions.MaxResponseTokens-50, searchResults)

		modifiedMessages := reqBody.Messages
		//add initial prompting
		modifiedMessages = append(modifiedMessages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: fmt.Sprintf(`This message describes the interaction between you, a multi layer workflow enbaled LLM, and a user. This means that the input is transformed and an AI assisted web search is performed to research the topic. You have the ability to provide real time, up to date results based on the web browsing data collected in the workflow. The current time and date is: %s. Your knowledge cutoff: %s`, time.Now(), time.Now()),
		})
		modifiedMessages = append(modifiedMessages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: systemMsg,
		})
		if userLastMsgIdx != -1 {
			modifiedMessages[userLastMsgIdx] = newUserMsg
		}
		resp := getChatCompletion(modifiedMessages, client, openai.GPT3Dot5Turbo, layerOptions.MaxResponseTokens)
		return c.JSON(resp)
	})
	err := app.Listen(":3000")
	if err != nil {
		log.Println(err)
	}
}

func specifyPrompt(
	client *openai.Client,
	userMsg openai.ChatCompletionMessage,
	prevUserMsg openai.ChatCompletionMessage,
) openai.ChatCompletionMessage {
	//simplify question
	prompt := fmt.Sprintf(`
		You are a custodial layer of a larger AI workflow. 
		Current time: %s 
		Max Response Tokens: 50
		You do not answer or address the user's prompt. Your following response should clarify, translate, and transcribe a user's input to then be used to prompt an LLM.
		Your response's goal:
		- evaluate the user's input and transcribe the user's input into a specified version optimized to be answered by another LLM (the last workflow layer)
		Your job: 
		- include any information needed on your role in the workflow
		- isolate out main topic and user's intent
		- understand whether the request is an exclamation or question or otherwise, and what kind of response is warranted
		- present the steps an LLM with ability to browse the internet might take to address the user input prompt's needs. 
		- include a call to action for an LLM to optimally respond to the user
		- use second person to refer to the next LLM (ex: you should xyz)
		- use third person to refer to the user (ex: the user wants to know x)
		Your response should never:
		- address the user at all (they will never see your response)
		- add conversational commentary
		- make the user's input confusing for the next layer`, time.Now())

	var specifyHistory []openai.ChatCompletionMessage
	if prevUserMsg != (openai.ChatCompletionMessage{}) {
		log.Println("appending prevUserMsg")
		specifyHistory = append(specifyHistory, prevUserMsg)
	}
	specifyHistory = append(specifyHistory,
		openai.ChatCompletionMessage{Role: openai.ChatMessageRoleSystem,
			Content: prompt,
		},
		openai.ChatCompletionMessage{Role: openai.ChatMessageRoleUser,
			Content: userMsg.Content,
		})
	specifiedMsgResponse := getChatCompletion(specifyHistory, client, openai.GPT3Dot5Turbo, 50)
	specifiedMsgContent := fmt.Sprintf("%s The user's real input: \nUser Input: %s", specifiedMsgResponse.Choices[0].Message.Content, userMsg.Content)
	newUserMsg := openai.ChatCompletionMessage{
		Role:    userMsg.Role,
		Content: specifiedMsgContent,
	}

	return newUserMsg
}

func getSearchQueryString(input string, client *openai.Client) string {
	searchQueryReqContent := fmt.Sprintf(`You are one layer of an AI workflow. 
		Your job:
		- create a search query to help gather research that will aid responding to the user's prompt
		- only respond with a search engine ready query phrase
		- be abstract and prefer to create a query that will match results
		- be broad, adjectives are specific 
		Do not:
		- use "site:" parameter
		- use quotes
		- make your search too convoluted
		- respond with anything but the query itself
		- add any extra commentary
		Your whole response will be passed to the next layer which expects a query.
		User's Prompt: %s`, input)
	searchQueryResponse := getChatCompletion([]openai.ChatCompletionMessage{{
		Role:    openai.ChatMessageRoleUser,
		Content: searchQueryReqContent,
	}}, client, openai.GPT3Dot5Turbo, 20)
	searchQuery := searchQueryResponse.Choices[0].Message.Content
	return searchQuery
}

func processSearchResults(results string, userInput string, client *openai.Client) string {
	processedResults := getChatCompletion([]openai.ChatCompletionMessage{{
		Role: openai.ChatMessageRoleSystem,
		Content: fmt.Sprintf(`You are one layer of an AI workflow. 
			Your job:
			- take in trimmed but raw search page content and organize it into: each piece of information availible paired with it's source.
			- if no information seems relevant be creative with what is availible 
			- Please label and categorize relevant information so an LLM can recognize it as useful to the user's prompt.
			- Be as concise as possible.
			- identify your role in the workflow and give a score out of 100 on how related the search results are
			Do not:
			- no duplicate information
			- no meta information, examples: info on the source itself, or details of how you analyzed the data.
			- no sources that didn't provide anything that helps address the user's LLM input.
			User's Prompt:
			%s`, userInput),
	},
		{
			Role:    openai.ChatMessageRoleUser,
			Content: results,
		},
	}, client, openai.GPT3Dot5Turbo, 500)
	return processedResults.Choices[0].Message.Content
}

func getChatCompletion(messages []openai.ChatCompletionMessage, client *openai.Client, model string, maxTokens int) openai.ChatCompletionResponse {
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model:     model,
			Messages:  messages,
			MaxTokens: maxTokens,
		},
	)
	if err != nil {
		log.Printf("Error: getCompletion()\n%v\n", err)
	}
	return resp
}

// duckduckgo scraping
func duckScrape(query string, numResults int) (string, error) {
	sourceUrl := fmt.Sprintf("https://html.duckduckgo.com/html?q=%s", url.QueryEscape(query))
	client := &http.Client{}
	req, err := http.NewRequest("GET", sourceUrl, nil)
	if err != nil {
		fmt.Println("Error creating HTTP request:", err)
		return "", err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("Error sending HTTP request:", err)
		return "", err
	}
	defer func(Body io.ReadCloser) {
		err := Body.Close()
		if err != nil {
			log.Println(err)
		}
	}(resp.Body)
	if resp.StatusCode != http.StatusOK {
		log.Println("Error getSearchContents() status code: ", resp.StatusCode)
		return "", err
	}
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("Error getSearchContents() parsing HTML", err)
		return "", err
	}
	resultsSelect := doc.Find(".result")
	if numResults > len(resultsSelect.Nodes) {
		numResults = len(resultsSelect.Nodes)
	}
	resultsSelect.Nodes = resultsSelect.Nodes[:numResults-1]

	pageContent := ""
	resultsSelect.Each(func(i int, s *goquery.Selection) {
		if i == numResults {
			return
		}
		pageContent += fmt.Sprintf("\n%d. %s\n", i+1, s.Text())
	})
	re := regexp.MustCompile(`(\s)+`)
	pageContent = re.ReplaceAllString(pageContent, " ")
	return pageContent, nil
}

//func getCompletion(prompt string, client *openai.Client, model string, maxTokens int) openai.CompletionResponse {
//	resp, err := client.CreateCompletion(
//		context.Background(),
//		openai.CompletionRequest{
//			Model:     model,
//			Prompt:    prompt,
//			MaxTokens: maxTokens,
//		},
//	)
//	if err != nil {
//		log.Printf("Error: getCompletion()\n%v\n", err)
//	}
//	return resp
//}

// dirty google scraping with goquery
// func getSearchContents(query string) (string, error) {
// 	sourceUrl := fmt.Sprintf("https://www.google.com/search?q=%s", url.QueryEscape(query))
// 	client := &http.Client{}
// 	req, err := http.NewRequest("GET", sourceUrl, nil)
// 	if err != nil {
// 		fmt.Println("Error creating HTTP request:", err)
// 		return "", err
// 	}
// 	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36")
// 	resp, err := client.Do(req)
// 	if err != nil {
// 		fmt.Println("Error sending HTTP request:", err)
// 		return "", err
// 	}
// 	defer resp.Body.Close()
// 	if resp.StatusCode != http.StatusOK {
// 		log.Println("Error getSearchContents() status code: ", resp.StatusCode)
// 		return "", err
// 	}
// 	doc, err := goquery.NewDocumentFromReader(resp.Body)
// 	if err != nil {
// 		log.Println("Error getSearchContents() parsing HTML", err)
// 		return "", err
// 	}
// 	pageContent := doc.Text()
// 	// regex to trim content down to mostly its text information
// 	startPhrase := "All resultsVerbatim"
// 	endPhrase := "SettingsPrivacyTermsDark"
// 	escapedStartPhrase := regexp.QuoteMeta(startPhrase)
// 	escapedEndPhrase := regexp.QuoteMeta(endPhrase)
// 	regexPattern := fmt.Sprintf(`%s([\s\S]*?)%s`, escapedStartPhrase, escapedEndPhrase)
// 	regex := regexp.MustCompile(regexPattern)
// 	pageContent = regex.FindStringSubmatch(pageContent)[0]
// 	re := regexp.MustCompile(`\.[^{]*\{[^}]*\}`)
// 	pageContent = re.ReplaceAllString(pageContent, "")
// 	// " > " between url parts to slashes
// 	re = regexp.MustCompile(` › `)
// 	pageContent = re.ReplaceAllString(pageContent, "/")
// 	// replace cramped urls
// 	re = regexp.MustCompile(`www`)
// 	pageContent = re.ReplaceAllString(pageContent, " www")
// 	// pageContentTrimmed := pageContent[750:]
// 	// pageContentTrimmed := pageContent[:int(math.Round(float64(len(pageContent))*float64(0.8)))]
// 	return pageContent, nil
// }
