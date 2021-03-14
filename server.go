package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"regexp"
	"strings"
)

func main() {
	http.HandleFunc("/communities", func(w http.ResponseWriter, r *http.Request) {
		communities := fetchCommunities()
		json.NewEncoder(w).Encode(communities)
	})
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if matched, _ := regexp.MatchString("(?i)/[a-z0-9_-]{43}", r.URL.String()); matched {
			community, err := fetchCommunity(strings.Replace(r.URL.String(), "/", "", 1))

			if err != nil {
				w.WriteHeader(http.StatusInternalServerError)
				fmt.Fprint(w, "Server error")
				return
			}

			json.NewEncoder(w).Encode(community)
			return
		}
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, "Not Found")
	})

	http.ListenAndServe(":3000", nil)
}

func fetchCommunities() []interface{} {
	communitiesCache, err := os.Open("./cache/communities.json")
	var communityIDs []string
	var communities []interface{}

	if err != nil {
		fmt.Printf("Could not read communities cacha: %s", err)
	}

	defer communitiesCache.Close()
	byteValue, _ := ioutil.ReadAll(communitiesCache)

	json.Unmarshal([]byte(byteValue), &communityIDs)

	for _, id := range communityIDs {
		communityCache, err := fetchCommunity(id)
		if err == nil {
			result := make(map[string]interface{})
			result["id"] = id

			for key, val := range communityCache.(map[string]interface{}) {
				result[key] = val
			}

			communities = append(communities, result)
		}
	}

	return communities
}

func fetchCommunity(contract string) (community interface{}, err error) {
	res, err := os.Open("./cache/" + contract + ".json")
	var communityCache map[string]interface{}

	if err != nil {
		return nil, err
	}
	defer res.Close()
	byteValue, _ := ioutil.ReadAll(res)

	json.Unmarshal([]byte(byteValue), &communityCache)

	if _, hasCache := communityCache["res"]; !hasCache {
		return nil, errors.New("No data cached in cache file")
	}

	return communityCache["res"], nil
}
