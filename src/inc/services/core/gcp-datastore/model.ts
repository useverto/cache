import {entity} from "@google-cloud/datastore/build/src/entity";
import {Operator} from "@google-cloud/datastore/build/src/query";

export enum DatastoreKinds {
    CONTRACTS = "CONTRACTS",
    COMMUNITY_TOKENS = "COMMUNITY_TOKENS",
    COMMUNITY_PEOPLE = "COMMUNITY_PEOPLE",
    CONTRACTS_VS_ADDRESS = "CONTRACTS_VS_ADDRESS",
    RECOVERABLE_CONTRACTS = "RECOVERABLE_CONTRACTS",
    CONTRACT_STATUS = "CONTRACT_STATUS"
}

export type DatastoreEntities = entity.Key | Array<entity.Key>;

export interface DatastoreEntity<T = any> {
    key: entity.Key;
    data: T;
}

export interface EntityBuilder<T = any> {
    kind: DatastoreKinds,
    id: string,
    data: T;
}

export interface QueryableFilter {
    property: string;
    operator: Operator;
    value: any;
}

export interface QueryableBase {
    limit?: number;
    offset?: number;
    filters?: Array<QueryableFilter>;
}

export interface Queryable extends QueryableBase {
    kind: DatastoreKinds;
}

export interface QueryResultBase<T = any> {
    entities: Array<T>;
    resultsStatus: string;
}

export interface QueryResult<T = any> extends QueryResultBase<T> {
    isEmpty: () => boolean
}
