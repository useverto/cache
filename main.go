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

	"github.com/mileusna/crontab"
)

func main() {
	// cache communities and add cronjob to do it every 10 minutes
	cacheCommunities()

	// get all communities
	http.HandleFunc("/communities", func(w http.ResponseWriter, r *http.Request) {
		addCors(&w)
		communities, err := fetchCommunities()

		if err == nil {
			json.NewEncoder(w).Encode(communities)
		} else {
			w.WriteHeader(http.StatusNoContent)
			fmt.Fprint(w, "No cache found")
		}
	})
	// get all contract ids
	http.HandleFunc("/ids", func(w http.ResponseWriter, r *http.Request) {
		addCors(&w)
		ids, err := getIDs()

		if err == nil {
			json.NewEncoder(w).Encode(ids)
		} else {
			w.WriteHeader(http.StatusNoContent)
			fmt.Fprint(w, "No cache found")
		}
	})
	// get a contract
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		addCors(&w)
		if matched, _ := regexp.MatchString("(?i)/[a-z0-9_-]{43}", r.URL.String()); matched {
			contractID := strings.Replace(r.URL.String(), "/", "", 1)

			syncContractCmd := exec.Command("node", "dist/contract.js")
			syncContractCmd.Env = append(os.Environ(), "CONTRACT_ID="+contractID)
			syncContractCmd.Run()

			contract, err := fetchContract(contractID)

			if err != nil {
				w.WriteHeader(http.StatusNoContent)
				fmt.Fprint(w, "No cache found")
				return
			}

			json.NewEncoder(w).Encode(contract)
			return
		}
		w.WriteHeader(http.StatusNotFound)
		fmt.Fprint(w, "Not Found")
	})

	port := os.Getenv("PORT")
	if len(port) == 0 {
		port = "3000"
	}
	http.ListenAndServe(":"+port, nil)
}

func addCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
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
		contractCache, err := fetchContract(id)
		if err == nil {
			result := make(map[string]interface{})
			result["id"] = id

			for key, val := range contractCache.(map[string]interface{}) {
				result[key] = val
			}

			communities = append(communities, result)
		}
	}

	return communities, nil
}

func fetchContract(contract string) (cache interface{}, err error) {
	res, err := os.Open("./cache/" + contract + ".json")
	var contractCache map[string]interface{}

	if err != nil {
		return nil, err
	}
	defer res.Close()
	byteValue, _ := ioutil.ReadAll(res)

	json.Unmarshal([]byte(byteValue), &contractCache)

	if _, hasCache := contractCache["res"]; !hasCache {
		return nil, errors.New("No data cached in cache file")
	}

	return contractCache["res"], nil
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

func cacheCommunities() {
	job := func() {
		syncCommunitiesCmd := exec.Command("node", "dist/communities.js")
		syncCommunitiesCmd.Start()
	}
	ctab := crontab.New()

	job()
	ctab.MustAddJob("*/10 * * * *", job)
}
