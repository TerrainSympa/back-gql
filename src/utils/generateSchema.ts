import { printSchema } from "graphql";
import { buildSchema } from "type-graphql";
import { QueryResolvers } from "../resolvers/query.resolvers";
import { ParcelleResolvers } from "../resolvers/parcelle.resolvers";
import * as fs from 'fs';

(async () => {
    const schema = await buildSchema({
        resolvers: [ParcelleResolvers, QueryResolvers]
      })
    const sdl = printSchema(schema);
    await fs.writeFile(__dirname + '/schema.graphql', sdl, () => {});
  })();
