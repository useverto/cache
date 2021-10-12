import {entity} from "@google-cloud/datastore/build/src/entity";

export enum DatastoreKinds {
    CONTRACTS = "CONTRACTS"
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
