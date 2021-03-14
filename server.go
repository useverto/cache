package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

func main() {
	// get all communities
	http.HandleFunc("/communities", func(w http.ResponseWriter, r *http.Request) {
		communities, err := fetchCommunities()
		syncCommunitiesCmd := exec.Command("node", "dist/communities.js")

		syncCommunitiesCmd.Start()

		if err == nil {
			json.NewEncoder(w).Encode(communities)
		} else {
			w.WriteHeader(http.StatusNoContent)
			fmt.Fprint(w, "No cache found")
		}
	})
	// get all community ids
	http.HandleFunc("/ids", func(w http.ResponseWriter, r *http.Request) {
		ids, err := getIDs()

		if err == nil {
			json.NewEncoder(w).Encode(ids)
		} else {
			w.WriteHeader(http.StatusNoContent)
			fmt.Fprint(w, "No cache found")
		}
	})
	// get a community
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if matched, _ := regexp.MatchString("(?i)/[a-z0-9_-]{43}", r.URL.String()); matched {
			contractID := strings.Replace(r.URL.String(), "/", "", 1)
			community, err := fetchCommunity(contractID)
			syncCommunityCmd := exec.Command("node", "dist/community.js")

			syncCommunityCmd.Env = append(os.Environ(), "COMMUNITY_ID="+contractID)
			syncCommunityCmd.Start()

			if err != nil {
				w.WriteHeader(http.StatusNoContent)
				fmt.Fprint(w, "No cache found")
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

func fetchCommunities() (res []interface{}, err error) {
	communitiesCache, err := os.Open("./cache/communities.json")
	var communityIDs []string
	var communities []interface{}

	if err != nil {
		return nil, errors.New("Could not read communities cache")
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

	return communities, nil
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

func getIDs() (ids []string, err error) {
	err = filepath.Walk("./cache", func(path string, info os.FileInfo, err error) error {
		regex := regexp.MustCompile(`cache\/|\.json`)
		contractID := string(regex.ReplaceAll([]byte(path), []byte("")))

		if matched, _ := regexp.MatchString("(?i)[a-z0-9_-]{43}", contractID); matched {
			ids = append(ids, contractID)
		}

		return nil
	})

	return ids, nil
}
