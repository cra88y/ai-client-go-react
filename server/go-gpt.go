package gogpt

import (
	"bufio"
	"context"
	"fmt"
	openai "github.com/sashabaranov/go-openai"
	"log"
	"os"
)

func gogpt() {
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		fmt.Println("Error: OPENAI_API_KEY environment variable is not set")
	}
	client := openai.NewClient(apiKey)
	fmt.Println("AI: How can I assist you?")
	for {
		reader := bufio.NewReader(os.Stdin)
		fmt.Print("You: ")
		inp, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("Error: Failed to read input: %v", err)
		}
		resp := getCompletionn(client, inp)
		fmt.Println("AI: ", resp.Choices[0].Message.Content, "\n")
	}
}

func getCompletionn(client *openai.Client, inp string) openai.ChatCompletionResponse {
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model: openai.GPT3Dot5Turbo,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleUser,
					Content: inp,
				},
			},
		},
	)
	if err != nil {
		log.Fatalf("Error: getCompletion()\n%v\n", err)
	}
	return resp
}
