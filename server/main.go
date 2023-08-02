package main

import (
	"context"
	fiber "github.com/gofiber/fiber/v2"
	cors "github.com/gofiber/fiber/v2/middleware/cors"
	openai "github.com/sashabaranov/go-openai"
	"log"
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
		log.Printf("/ai POST")
		var reqBody CompletionRequest
		if err := c.BodyParser(&reqBody); err != nil {
			return err
		}
		log.Print(reqBody)
		client := openai.NewClient(reqBody.ApiKey)
		resp := getCompletion(client, reqBody.Messages)
		return c.JSON(resp)
	})

	app.Listen(":3000")
}
func getCompletion(client *openai.Client, messages []openai.ChatCompletionMessage) openai.ChatCompletionResponse {
	resp, err := client.CreateChatCompletion(
		context.Background(),
		openai.ChatCompletionRequest{
			Model:    openai.GPT3Dot5Turbo,
			Messages: messages,
		},
	)
	if err != nil {
		log.Printf("Error: getCompletion()\n%v\n", err)
	}
	return resp
}
