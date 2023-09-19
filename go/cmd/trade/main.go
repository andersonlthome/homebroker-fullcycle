package main

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/andersonlthome/homebroker-go/internal/infra/kafka"
	"github.com/andersonlthome/homebroker-go/internal/market/dto"
	"github.com/andersonlthome/homebroker-go/internal/market/entity"
	"github.com/andersonlthome/homebroker-go/internal/market/transformer"
	ckafka "github.com/confluentinc/confluent-kafka-go/kafka"
)

func main() {
	fmt.Println("starting...")
	ordersIn := make(chan *entity.Order)
	ordersOut := make(chan *entity.Order)
	wg := &sync.WaitGroup{}
	defer wg.Wait()

	kafkaMsgChan := make(chan *ckafka.Message)
	configMap := &ckafka.ConfigMap{
		"bootstrap.servers": "host.docker.internal:9094",
		"group.id":          "myGroup",
		"auto.offset.reset": "latest", // 'earliest' get from the beginning of the topic and 'latest' get the new messages
	}
	producer := kafka.NewProducer(configMap)
	kafka := kafka.NewConsumer(configMap, []string{"input"})

	go kafka.Consume(kafkaMsgChan) // T2

	// recebe do canal do kafka, joga no input, processa joga no output e depois publica no kafka
	book := entity.NewBook(ordersIn, ordersOut, wg)
	go book.Trade() // T3

	go func() {
		for msg := range kafkaMsgChan { // T2
			wg.Add(1) // in each iteration, add 1 to the wait group
			fmt.Println(string(msg.Value))
			tradeInput := dto.TradeInput{}
			err := json.Unmarshal(msg.Value, &tradeInput)
			if err != nil {
				panic(err)
			}
			order := transformer.TransformInput(tradeInput)
			ordersIn <- order // T3
		}
	}()

	for res := range ordersOut { // T3
		output := transformer.TransformOutput(res)
		outputJson, err := json.MarshalIndent(output, "", "  ")
		if err != nil {
			fmt.Println(err)
		}
		producer.Publish(outputJson, []byte(output.OrderID), "output")
	}
}

// kafka ex input-order
// {
// "orderid": "1",
// "investor_id": "Mari",
// "asset_id": "asseit1",
// "current_shares":10,
// "shares": 5,
// "price": 5.0,
// "order_type": "SELL"
// }
