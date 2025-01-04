import { GraphQLScalarType, Kind } from "graphql";

function stringBasedScalar(name: string) {
    return new GraphQLScalarType({
        name,
        description: `String of ${name}`,
        serialize(value: unknown): string {
            // check the type of received value
            if (typeof value !== 'string') {
                throw new Error(`${name} can only serialize string values`);
            }
            return value; // value sent to the client
        },
        parseValue(value: unknown): string {
            // check the type of received value
            if (typeof value !== "string") {
                throw new Error(`${name} can only parse string values`);
            }
            return value; // value from the client input variables
        },
        parseLiteral(ast): string {
            // check the type of received value
            if (ast.kind !== Kind.STRING) {
                throw new Error(`${name} can only parse string values`);
            }
            return ast.value; // value from the client query
        },
    })
}

export const WebsiteUrl = stringBasedScalar('WebsiteUrl');
export const PhoneNumber = stringBasedScalar('PhoneNumber');
export const Email = stringBasedScalar('Email');
