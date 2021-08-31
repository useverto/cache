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

This cache version is in beta right now, and is accessible from [v2.cache.verto.exchange](https://v2.cache.verto.exchange). It will be available for production soon.

### Interactions

#### `/fetch/:id`

Fetch a contract and cache its state and validity.

#### `/ping`

Ping the cache server to check if it is online and connected to the database.

### Requesting data

#### `/:contract_id`

A valid (43 chars) contract id route returns the state and the validity of the requested contract, if cached. Use the [fetch](#fetchid) route to cache a new contract.

#### `/tokens`

Return all tokens cached from Arweave. To only return listed tokens, add the query param `listed` to the request URI and set it to true.

#### `/all`

Return all listed contracts' state and validity.

#### `/stats`

Return statistics about the cache

#### `/balance/:addr`

Return the balances of Arweave tokens for an address.

#### `/posts`

Return all trading posts.

#### `/posts/:addr`

Return data for a trading post.

#### `/posts/:addr/orders`

Return all orders for a trading post.

#### `/posts/:addr/stats`

Return the quantity and the result of orders for each day for a trading post.

#### `/latest-activity`

Return the latest activity on the exchange.

#### `/order/:id`

Return data for an order.

#### `/token/:id/orders`

Return orders for a token.

#### `/token/:id/price`

Return the price of a token.

#### `/token/:id/priceHistory`

Return the price history for a token.

#### `/token/:id/volume`

Return the volume of a token.

#### `/token/:id/volumeHistory`

Return the volume history for a token.

#### `/users`

Return the users with Verto ID set up.

#### `/user/:input`

Return a user (input can be an address or a username).

#### `/user/:input/balances`

Return the owned tokens for the user.

#### `/user/:input/orders`

Return all orders made by the user.

#### `/user/:input/creations`

Return collectibles listed by the user.

#### `/user/:input/owns`

Return owned collectibles for a user.

#### `/notification`

```
WIP / TODO: maybe use GUN.js
```

#### `/site/artwork`

Return a random artwork / collectible.

#### `/site/artwork/:id`

Return a collectible by ID.

#### `/site/artworks/random`

Return random artworks / collectibles.

#### `/site/collection/:id`

Return a collection of tokens.

#### `/site/communities/top`

Get the highest ranked communities (communities with the most holders) listed on Verto.

#### `/site/communities/random`

Get random communities.

#### `/site/tokens/:after?`

Return all listed tokens paginated (the after param will skip the submitted amount of tokens).

#### `/site/search/:query?/:page?`

Search for a user / token.

#### `/site/type/:id`

Get the type of a token.