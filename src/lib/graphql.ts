import { ApolloClient } from "@apollo/client/core";
import { HttpLink, InMemoryCache, split } from '@apollo/client/core';
import fetch from 'cross-fetch';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import Websocket from 'ws';

export function graphQLClient(uri: string) {
  const httpLink = new HttpLink({
    uri: `http://${uri}`,
    fetch,
  });

  const wsLink = new GraphQLWsLink(createClient({
    url: `ws://${uri}`,
    webSocketImpl: Websocket,
    connectionParams: {
      authToken: '123'
    }
  }));

  const splitLink = split(
    ({ query }) => {
      const definition = getMainDefinition(query);
      return (
        definition.kind === 'OperationDefinition' &&
        definition.operation === 'subscription'
      );
    },
    wsLink,
    httpLink,
  );  
  
  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
  });
}
