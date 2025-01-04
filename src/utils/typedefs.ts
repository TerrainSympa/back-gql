import { printSchemaWithDirectives } from "@graphql-tools/utils";
import { GraphQLSchema, stripIgnoredCharacters } from "graphql";

const print = (schema: string) => `
  import { gql } from "apollo-server"
  export const typeDefs = gql\`${schema}\`;
`;

export const plugin = (schema: GraphQLSchema) =>
  print(stripIgnoredCharacters(printSchemaWithDirectives(schema)));