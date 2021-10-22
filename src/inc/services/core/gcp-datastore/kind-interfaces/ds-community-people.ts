import {UnionConcat} from "../../types";

export interface CommunityPeopleDatastore {
    username: string;
    addresses: UnionConcat<string, ",">
}
