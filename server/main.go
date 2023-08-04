package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"regexp"
	"time"

	goquery "github.com/PuerkitoBio/goquery"
	fiber "github.com/gofiber/fiber/v2"
	cors "github.com/gofiber/fiber/v2/middleware/cors"
	openai "github.com/sashabaranov/go-openai"
)

type CompletionRequest struct {
	ApiKey   string                         `json:"apiKey"`
	Messages []openai.ChatCompletionMessage `json:"messages"`
}

type CompletionResponse struct {
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

		//simplify question
		userLastMessage := reqBody.Messages[len(reqBody.Messages)-1]
		log.Println("User Last Message:", userLastMessage)
		specifyPrompt := fmt.Sprintf(`
		You are a custodial layer of a larger AI workflow. You do not answer or address the user's prompt. Your following response should clarify, translate, and transcribe a user's input to then be used to prompt an LLM.
		Your response's goal:
		- evaluate the user's input and transcribe the user's input into a specified version optimized to be answewred by another LLM (the last workflow layer)
		- mirror and immitate the user's intent to reciece a useful answer
		- be concise as possible with your response
		Your job: 
		- include any information needed on your role in the workflow
		- isolate out main topic and user's intent
		- present the steps an LLM with ability to browse the internet might take to address the user input prompt's needs. 
		- include a call to action for an LLM to optimally respond to the user
		- be concise
		- use second person to refer to the next LLM (ex: you should xyz)
		- use third person to refer to the user (ex: the user wants to know x)
		Your response should never:
		- answer the question
		- respond to the user
		- address the user (they will never see your response)
		- add conversational commentary
		- make the user's input confusing for the next layer`)

		specifyHistory := []openai.ChatCompletionMessage{}
		if len(reqBody.Messages) > 1 {
			log.Println("appending userLastMessage")
			specifyHistory = append(specifyHistory, userLastMessage)
		}
		specifyHistory = append(specifyHistory,
			openai.ChatCompletionMessage{Role: openai.ChatMessageRoleSystem,
				Content: specifyPrompt,
			},
			openai.ChatCompletionMessage{Role: openai.ChatMessageRoleUser,
				Content: userLastMessage.Content,
			})
		specifiedMsgResponse := getChatCompletion(specifyHistory, client, openai.GPT3Dot5Turbo, 500)
		specifiedMsgContent := fmt.Sprintf("%s The user's real input: \nUser Input: %s", specifiedMsgResponse.Choices[0].Message.Content, userLastMessage.Content)
		userNewMessage := openai.ChatCompletionMessage{
			Role:    userLastMessage.Role,
			Content: specifiedMsgContent,
		}
		log.Println("specified user prompt: ", specifiedMsgContent)

		//search results
		searchQueryReqContent := fmt.Sprintf(`You are one layer of an AI workflow. 
			Your job:
			- create a search query to help gather research that will aid responding to the user's prompt
			- only respond with a search engine ready query phrase
			Do not:
			- use quotes
			- make your search too convoluted
			- respond with anything but the query itself
			- add any extra commentary
			Your whole response will be passed to the next layer which expects a query. \nUser's Prompt: %s`, specifiedMsgContent)
		searchQueryResponse := getChatCompletion([]openai.ChatCompletionMessage{{
			Role:    openai.ChatMessageRoleUser,
			Content: searchQueryReqContent,
		}}, client, openai.GPT3Dot5Turbo, 20)
		searchQuery := searchQueryResponse.Choices[0].Message.Content
		log.Println("search query: ", searchQuery)
		searchResults, _ := getSearchContents(searchQuery)
		searchResultsCleanupResponse := getChatCompletion([]openai.ChatCompletionMessage{{
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
				%s`, specifiedMsgContent),
		},
			{
				Role:    openai.ChatMessageRoleUser,
				Content: searchResults,
			},
		}, client, openai.GPT3Dot5Turbo, 500)
		searchResults = fmt.Sprintf(`You are the final layer in an AI workflow.
		Your job is to finally address and respond to the user's prompt utilizing the workflow's search results and other valuable insight. Your response is the only part shown to the end user. You should attempt to utilize the search results.
		Do not mention the ai workflow, it is not important to the user.
		There has been no misunderstandings, use the search results.
		You do not have to apologize, as the user is unaware of the workflow.
		The search results are the most accurate data you have.
		The workflow provides you these search results to assist the user.
		Your knowledge cut off is not an excuse due to your ability to utilize the workflow's search results.
		These results represent and reflect your own real-time web browsing from a previous layer.
		Do not apologize for anything.  
		The following data is real-time search results collected during the workflow in a previous layer
		Attempt to incorporate the findings to successfully respond to the user's prompt.
		Search Results:\n%s`, searchResultsCleanupResponse.Choices[0].Message.Content)
		log.Println("search results: ", searchResults)

		modifiedMessages := reqBody.Messages
		//add initial prompting
		modifiedMessages = append(modifiedMessages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: fmt.Sprintf(`This message describes the interaction between you, the LLM, and a user. Essentially every user input is processed by an AI workflow. This means that the input is transformed and an AI assisted web search is performed to research the topic. You have the ability to provide real time, up to date results based on the web browsing you perform in the workflow. The web data will be injected into the message context. The current time and date is: %s`, time.Now()),
		})
		modifiedMessages = append(modifiedMessages, openai.ChatCompletionMessage{
			Role:    openai.ChatMessageRoleSystem,
			Content: searchResults,
		})
		modifiedMessages = append(modifiedMessages, userNewMessage)

		resp := getChatCompletion(modifiedMessages, client, openai.GPT3Dot5Turbo, 500)
		return c.JSON(resp)
	})
	app.Listen(":3000")
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
func getCompletion(prompt string, client *openai.Client, model string, maxTokens int) openai.CompletionResponse {
	resp, err := client.CreateCompletion(
		context.Background(),
		openai.CompletionRequest{
			Model:     model,
			Prompt:    prompt,
			MaxTokens: maxTokens,
		},
	)
	if err != nil {
		log.Printf("Error: getCompletion()\n%v\n", err)
	}
	return resp
}

func getSearchContents(query string) (string, error) {
	sourceUrl := fmt.Sprintf("https://www.google.com/search?q=%s", url.QueryEscape(query))
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
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		log.Println("Error getSearchContents() status code: ", resp.StatusCode)
		return "", err
	}
	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		log.Println("Error getSearchContents() parsing HTML", err)
		return "", err
	}
	pageContent := doc.Text()
	// regex to trim content down to mostly its text information
	startPhrase := "All resultsVerbatim"
	endPhrase := "SettingsPrivacyTermsDark"
	escapedStartPhrase := regexp.QuoteMeta(startPhrase)
	escapedEndPhrase := regexp.QuoteMeta(endPhrase)
	regexPattern := fmt.Sprintf(`%s([\s\S]*?)%s`, escapedStartPhrase, escapedEndPhrase)
	regex := regexp.MustCompile(regexPattern)
	pageContent = regex.FindStringSubmatch(pageContent)[0]
	//
	// regexPattern = `\.[^{}]*\}|\([^()]*\)`
	// regex = regexp.MustCompile(regexPattern)
	// pageContent = regex.ReplaceAllString(result[0], "")
	// remove .XASTESA{color: red;} type information
	re := regexp.MustCompile(`\.[^{]*\{[^}]*\}`)
	pageContent = re.ReplaceAllString(pageContent, "")
	// " > " between url parts to slashes
	re = regexp.MustCompile(` › `)
	pageContent = re.ReplaceAllString(pageContent, "/")
	// replace cramped urls
	re = regexp.MustCompile(`www`)
	pageContent = re.ReplaceAllString(pageContent, " www")
	// pageContentTrimmed := pageContent[750:]
	// pageContentTrimmed := pageContent[:int(math.Round(float64(len(pageContent))*float64(0.8)))]
	return pageContent, nil
}
