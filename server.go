package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
)

func main() {
	http.HandleFunc("/communities", func(w http.ResponseWriter, r *http.Request) {
		communities := fetchCommunities()
		json.NewEncoder(w).Encode(communities)
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Println(r.URL)
	})

	http.ListenAndServe(":3000", nil)
}

func fetchCommunities() []map[string]interface{} {
	communitiesCache, err := os.Open("./cache/communities.json")
	var communityIDs []string
	var communities []map[string]interface{}

	if err != nil {
		fmt.Printf("Could not read communities cacha: %s", err)
	}

	defer communitiesCache.Close()
	byteValue, _ := ioutil.ReadAll(communitiesCache)

	json.Unmarshal([]byte(byteValue), &communityIDs)

	for _, id := range communityIDs {
		res, err := os.Open("./cache/" + id + ".json")
		var communityCache map[string]interface{}

		if err != nil {
			fmt.Printf("Could not read community %s\n%s", id, err)
		}
		defer res.Close()
		byteValue, _ := ioutil.ReadAll(res)

		json.Unmarshal([]byte(byteValue), &communityCache)
		communities = append(communities, communityCache)
	}

	return communities
}
