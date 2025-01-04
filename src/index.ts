import dotenv from 'dotenv'
import { PrismaClient as PrismaClientDeps } from '../prisma/generated/deps'
import { PrismaClient as PrismaClientDep } from '../prisma/generated/dep'
import { buildSchema } from 'type-graphql'
import './native.extension'
import 'reflect-metadata'
import mock from './utils/mock'
import { addMocksToSchema } from '@graphql-tools/mock'
import { ApolloServer } from '@apollo/server'
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled'
import express from 'express'
import { json } from 'body-parser'
import { expressMiddleware } from '@apollo/server/express4'
import cors from 'cors'
import http from 'http'
import {ParcelleResolvers} from "./resolvers/parcelle.resolvers";
import {QueryResolvers} from "./resolvers/query.resolvers";
import type {ApolloServerPlugin} from "@apollo/server";
import loggingPlugin from "./utils/loggerApolloPlugin";
import logger from "./utils/logger";

dotenv.config({ path: `.env.${process.env.DE_STAGE ?? 'dev'}` })

let mocks: any | boolean = false
if (process.env.MOCKS === 'TRUE') {
  mocks = mock
}

async function main() {
  const schema = await buildSchema({
    resolvers: [
        ParcelleResolvers,
        QueryResolvers
    ],
    validate: { forbidUnknownValues: false },
  })
  const app = express()
  const httpServer = http.createServer(app)
  const embededSchema =
    mocks === false
      ? schema
      : addMocksToSchema({
          schema,
          mocks,
        })

  const plugins: ApolloServerPlugin[] = [loggingPlugin]
    if(process.env.NODE_ENV === 'prod') {
        plugins.push(ApolloServerPluginLandingPageDisabled())
    }

    const server = new ApolloServer({
    schema: embededSchema,
    csrfPrevention: false,
    introspection: process.env.NODE_ENV !== 'prod',
    includeStacktraceInErrorResponses: process.env.NODE_ENV !== 'prod',
    plugins,
  })
  await server.start()

  app.use(
    '/',
    process.env.NODE_ENV === 'prod'
      ? cors<cors.CorsRequest>({
          origin: [
            `https://${process.env.HOST}`,
            `https://www.${process.env.HOST}`,
            `https://front.${process.env.HOST}`,
          ],
        })
      : cors<cors.CorsRequest>(),
    json(),
    expressMiddleware(server, { context: async ({ req }) => ({ req }) })
  )

  await new Promise<void>((resolve) =>
    httpServer.listen({ port: Number(process.env.PORT) ?? 4000 }, resolve)
  )

  console.log(
    `🚀 Server ready at http://${process.env.HOST}:${process.env.PORT}/`
  )
}

main()
