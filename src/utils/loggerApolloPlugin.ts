import {
    ApolloServerPlugin,
    BaseContext,
    GraphQLRequestContext,
    GraphQLServerContext,
    GraphQLServerListener
} from '@apollo/server';
import logger from './logger';
import {Error} from "@apollo/server/src/plugin/schemaReporting/generated/operations";

const loggingPlugin: ApolloServerPlugin = {
    async requestDidStart(requestContext) {
        logger.info('GraphQL request started', {
            // @ts-ignore
            ip: requestContext.contextValue.req.ip,
            query: requestContext.request.operationName,
            variables: requestContext.request.variables,
        });

        return {
            async willSendResponse(responseContext) {
                logger.info('GraphQL response sent', {
                    // @ts-ignore
                    ip: requestContext.contextValue.req.ip,
                    query: requestContext.request.operationName,
                    variables: requestContext.request.variables,
                    errors: responseContext.errors,
                });
            }
        };
    },
    async serverWillStart(service: GraphQLServerContext): Promise<GraphQLServerListener | void> {
        logger.info(
            `GraphQL server ready at http://${process.env.HOST}:${process.env.PORT}/`
        )
        return {
            async serverWillStop() {
                logger.info('GraphQL server will stop');
            }
        }
    },
    async invalidRequestWasReceived({error}: { error: Error }): Promise<void> {
        logger.error(
            `GraphQL invalid request received`, {error: JSON.stringify(error)}
        )
    },
    async startupDidFail({error}: { error: Error }): Promise<void> {
        logger.error(
            `GraphQL fail on startup`, {error: JSON.stringify(error)}
        )
    },
    async unexpectedErrorProcessingRequest({requestContext, error,}: {
        requestContext: GraphQLRequestContext<BaseContext>;
        error: Error
    }): Promise<void> {
        logger.error(
            `GraphQL unexpected error processing request`, {error: JSON.stringify(error)}
        )
    },
    async contextCreationDidFail({error}: { error: Error }): Promise<void> {
        logger.error(
            `GraphQL context creation failed`, {error: JSON.stringify(error)}
        )
    }
};

export default loggingPlugin;
