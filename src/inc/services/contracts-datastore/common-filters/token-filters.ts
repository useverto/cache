import {QueryableFilter} from "../../core/gcp-datastore/model";

export const ArtFilter: QueryableFilter = {
    property: 'type',
    operator: '=',
    value: 'art'
};

export const CollectionsFilter: QueryableFilter = {
    property: 'type',
    operator: '=',
    value: 'collection'
};

