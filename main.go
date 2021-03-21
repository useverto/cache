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
	// start up main script
	cmd := exec.Command("node", "dist/index.js")
	cmd.Start()

	// get all contracts
	http.HandleFunc("/communities", func(w http.ResponseWriter, r *http.Request) {
		addCors(&w)
		contracts, err := fetchAll()

		if err == nil {
			json.NewEncoder(w).Encode(contracts)
		} else {
			w.WriteHeader(http.StatusNoContent)
			fmt.Fprint(w, "No cache found")
		}
	})
	// get all contracts
	http.HandleFunc("/all", func(w http.ResponseWriter, r *http.Request) {
		addCors(&w)
		contracts, err := fetchAll()

		if err == nil {
			json.NewEncoder(w).Encode(contracts)
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
		if matched, _ := regexp.MatchString("(?i)/balance/[a-z0-9_-]{43}", r.URL.String()); matched {
			address := strings.Split(r.URL.String(), "/")[2]
			balances, _ := fetchBalances(address)

			json.NewEncoder(w).Encode(balances)
			return
		}
		if matched, _ := regexp.MatchString("(?i)/fetch/[a-z0-9_-]{43}", r.URL.String()); matched {
			contract := strings.Split(r.URL.String(), "/")[2]

			contractCmd := exec.Command("node", "dist/contract.js")
			contractCmd.Env = append(os.Environ(), "CONTRACT_ID="+contract)
			contractCmd.Run()

			w.WriteHeader(http.StatusOK)
			fmt.Fprint(w, "Fetched!")
			return
		}
		if matched, _ := regexp.MatchString("(?i)/[a-z0-9_-]{43}", r.URL.String()); matched {
			contractID := strings.Replace(r.URL.String(), "/", "", 1)
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

func fetchAll() (res []interface{}, err error) {
	ids, _ := getIDs()
	var communities []interface{}

	for _, id := range ids {
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

func fetchBalances(address string) (balances []interface{}, err error) {
	communities, _ := getIDs()
	var res []interface{}

	for _, id := range communities {
		cache, _ := fetchContract(id)

		state := cache.(map[string]interface{})["state"].(map[string]interface{})
		stateBalances := state["balances"].(map[string]interface{})
		balancesMap := make(map[string]int)
		for k, v := range stateBalances {
			balancesMap[k] = int(v.(float64))
		}

		if balancesMap[address] != 0 {
			item := make(map[string]interface{})

			item["id"] = id
			item["ticker"] = state["ticker"]
			item["name"] = state["name"]
			item["balance"] = balancesMap[address]
			item["state"] = state

			res = append(res, item)
		}
	}

	return res, nil
}
