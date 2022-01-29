import Worker from "web-worker";
import path from "path";

export class ProcessSearchExecution {

    public static startWorker() {
        return new Worker(
            path.join(__dirname, "./scripts/worker-process-search-execution.js"),
            {
                type: 'module'
            }
        );
    }

    private static async genericFetch(contractId: string, cmd: "fetch-state" | "fetch-token-metadata") {
        const startWorker = this.startWorker();

        startWorker.postMessage({
            command: cmd,
            contractId
        });

        return new Promise((resolve, reject) => {
            startWorker.onmessage = (msg) => {
                const data = msg.data;
                if(data === "ERROR") {
                    startWorker.terminate();
                    reject("Unknown");
                } else {
                    resolve(data);
                }
            }
        });
    }

    public static async fetchState(contractId: string) {
        return this.genericFetch(contractId, "fetch-state");
    }

    public static async fetchTokenMetadata(contractId: string) {
        return this.genericFetch(contractId, "fetch-token-metadata");
    }
}
