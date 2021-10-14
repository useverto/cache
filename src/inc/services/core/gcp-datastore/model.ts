import {entity} from "@google-cloud/datastore/build/src/entity";

export enum DatastoreKinds {
    CONTRACTS = "CONTRACTS",
    COMMUNITY_TOKENS = "COMMUNITY_TOKENS",
    COMMUNITY_PEOPLE = "COMMUNITY_PEOPLE",
    CONTRACTS_VS_ADDRESS = "CONTRACTS_VS_ADDRESS"
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
