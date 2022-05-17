import {GcpDatastoreService, DatastoreKinds} from "verto-internals/services/gcp";
import {clearInterval} from "timers";
import {randomString} from "../../utils/commons";

export enum MetricType {
    SCALED_WORKERS = "SCALED_WORKERS",
    ADDRESS_RELATIONSHIP = "ADDRESS_RELATIONSHIP",
    NEW_CONTRACTS = "NEW_CONTRACTS",
    FAILED_CONTRACTS = "FAILED_CONTRACTS",
    BLACKLISTED_CONTRACTS = "BLACKLISTED_CONTRACTS",
    FAILURES = "FAILURES",
    NEW_PEOPLE = "NEW_PEOPLE"
}


export class WorkerPoolMetrics {
    public static metrics: Map<MetricType, number> = new Map<MetricType, number>();
    public static timers: Array<ReturnType<typeof setInterval>> = new Array<ReturnType<typeof setInterval>>();

    public static addMetric(metric: MetricType, adder: (data: number) => number) {
        let currentMetric = this.getMetric(metric);
        let newNumber = adder(currentMetric);
        this.metrics.set(metric, newNumber);
    }

    public static getMetric(metric: MetricType): number {
        return this.metrics.get(metric) || 0;
    }

    public static async process(saverService: GcpDatastoreService, metric: MetricType) {
        const currentDate = new Date();
        let response = await saverService.saveFull({
            kind: DatastoreKinds.METRICS,
            id: `${currentDate.getTime()}-${metric}-${randomString(5)}`,
            data: {
                metricId: metric,
                value: this.getMetric(metric),
                date: currentDate.getTime(),
                year: currentDate.getFullYear(),
                month: currentDate.getMonth() + 1,
                day: currentDate.getDate(),
                hour: currentDate.getHours(),
                minutes: currentDate.getMinutes()
            }
        });
        this.metrics.delete(metric);
        return response;
    }

    public static async processAll(saverService: GcpDatastoreService) {
        if(process.env.NO_WARMUP === 'true') { return; }
        return await Promise.allSettled([
            await this.process(saverService, MetricType.SCALED_WORKERS),
            await this.process(saverService, MetricType.NEW_CONTRACTS),
            await this.process(saverService, MetricType.FAILED_CONTRACTS),
            await this.process(saverService, MetricType.ADDRESS_RELATIONSHIP),
            await this.process(saverService, MetricType.BLACKLISTED_CONTRACTS),
            await this.process(saverService, MetricType.NEW_PEOPLE),
            await this.process(saverService, MetricType.FAILURES)
        ]);
    }

    public static initializeTimers(saverService: GcpDatastoreService) {
        this.timers.push(setInterval(async () => {
            await this.process(saverService, MetricType.SCALED_WORKERS);
        }, (1000 * 60) * 15));
        this.timers.push(setInterval(async () => {
            await this.process(saverService, MetricType.NEW_CONTRACTS);
        }, (1000 * 60) * 15));
        this.timers.push(setInterval(async () => {
            await this.process(saverService, MetricType.FAILED_CONTRACTS);
        }, (1000 * 60) * 60));
        this.timers.push(setInterval(async () => {
            await this.process(saverService, MetricType.ADDRESS_RELATIONSHIP);
        }, 86400000));
        this.timers.push(setInterval(async () => {
            await this.process(saverService, MetricType.BLACKLISTED_CONTRACTS);
        }, 86400000));
        this.timers.push(setInterval(async () => {
            await this.process(saverService, MetricType.NEW_PEOPLE);
        }, 86400000));
    }

    public static cleanTimers() {
        this.timers.forEach((timer) => clearInterval(timer));
    }
}
