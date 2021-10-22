<p align="center">
  <a href="https://verto.exchange">
    <img src="https://www.verto.exchange/logo_light.svg" alt="Verto logo (dark version)" width="110">
  </a>

<h3 align="center">Verto Cache</h3>

  <p align="center">
    Caching solution for The Verto Protocol
  </p>
</p>

## Cache routes
This cache solution is responsible for handling weighted loads of Data inside Verto. It's development is not fully complete although production ready.

### Interactions

#### `/ping`
Verifies the server is up & running

#### `/users/metadata/:username`
Fetches the metadata of a registered user given a `username`.

```typescript
interface {
    username: string;
    addresses: Array<string>
}
```

-----

#### `/users/contracts/:addressId`
Fetches all the contracts (such as tokens) that an address is part of, given an `addressId`.

```typescript
Array<string> // Contract IDs
```

-----

#### `/users/creations/:username`
Fetches all creations (tokens where type is 'art') for a registered user, given a `username`.

```typescript
Array<string> // Contract IDs
```

-----

#### `/token/metadata/:tokenId`
Fetches the metadata for a token, given a `tokenId`. Returns empty object if nothing was found.

```typescript
interface {
    contractId: string;
    type: string;
    lister: string;
}
```

-----

#### `/token/artwork/random?limit=$limit`
Fetches random art work (tokens with type 'art' or 'collection') from the cache system. If `$limit` is not passed, default will be set to 4.

```typescript
interface {
    contractId: string;
    type: string;
    lister: string;
}
```

-----

#### `/contracts/save/:contractId`
Sends a contract to the worker pool. This contract will then be processed in a different thread and pool.

```typescript
interface {
    state: 'CURRENTLY_PROCESSING' | 'ADDED_TO_QUEUE' | 'CONTRACT_SENT';
}
```
