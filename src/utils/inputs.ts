import {ArgsType, Field, Float, InputType, Int, ObjectType} from "type-graphql";

@ObjectType()
export class SearchParam {
    @Field((type) => Int)
    id: number
    @Field((type) => String)
    label: string
    @Field((type) => String, { nullable: true })
    description?: string
}

@ObjectType()
export class SearchParameters {
    @Field((type) => [SearchParam])
    forestType: SearchParam[]
    @Field((type) => [SearchParam])
    forestEssence: SearchParam[]
    @Field((type) => [SearchParam])
    buildingType: SearchParam[]
    @Field((type) => [SearchParam])
    buildingUsage: SearchParam[]
    @Field((type) => [SearchParam])
    buildingCondition: SearchParam[]
    @Field((type) => [SearchParam])
    pluType: SearchParam[]
}

@InputType({ description: 'Min max inputs' })
export class MinMax {
    @Field((type) => Float, { nullable: true })
    min: number

    @Field((type) => Float, { nullable: true })
    max: number
}

@InputType({ description: 'LatLng input' })
export class LatLng {
    @Field((type) => Float)
    lat: number

    @Field((type) => Float)
    lng: number
}

@InputType({ description: 'Polygon input' })
export class Polygon {
    @Field((type) => [LatLng])
    coordinates: LatLng[]
}

@InputType({ description: 'Circle input' })
export class Circle {
    @Field((type) => LatLng)
    center: LatLng
    @Field((type) => Float)
    radius: number
}

@InputType({ description: 'Commune input' })
export class CommuneInput {
    @Field((type) => String)
    commune: string
    @Field((type) => Float)
    radius: number
}

@InputType({ description: 'Area input' })
export class AreaInput {
    @Field((type) => Circle, { nullable: true })
    circle: Circle
    @Field((type) => Polygon, { nullable: true })
    polygon: Polygon
    @Field((type) => [String], { nullable: true })
    communes: string[]
    @Field((type) => CommuneInput, { nullable: true })
    commune: CommuneInput
}

@InputType({ description: 'Base search args' })
export class BaseSearchArgs {
    @Field((type) => Boolean, { nullable: true })
    lookFor: boolean
    @Field((type) => MinMax, { nullable: true })
    area: MinMax
    @Field((type) => [Int], { nullable: true })
    type: number[]
}

@InputType({ description: 'Forest search args' })
export class ParcelleSearchArgs extends BaseSearchArgs {}

@InputType({ description: 'Forest search args' })
export class ForestSearchArgs extends BaseSearchArgs {
    @Field((type) => [Int], { nullable: true })
    essence: number[]
}

@InputType({ description: 'Building search args' })
export class BuildingSearchArgs extends BaseSearchArgs {
    @Field((type) => [Int], { nullable: true })
    condition: number[]
    @Field((type) => [Int], { nullable: true })
    usage: number[]
}

@InputType({ description: 'Forest search args' })
export class RiverSearchArgs {
    @Field((type) => Boolean, { nullable: true })
    lookFor: boolean
    @Field((type) => MinMax, { nullable: true })
    length: MinMax
}

@InputType({ description: 'Pagination arguments' })
export class PaginationArgs {
    @Field((type) => Int, { nullable: true })
    take: number
    @Field((type) => Int, { nullable: true })
    skip: number
}

@ArgsType()
export class SearchArgs {
    @Field((type) => ParcelleSearchArgs, { nullable: true })
    parcelle: ParcelleSearchArgs
    @Field((type) => ForestSearchArgs, { nullable: true })
    forest: ForestSearchArgs
    @Field((type) => BuildingSearchArgs, { nullable: true })
    building: BuildingSearchArgs
    @Field((type) => RiverSearchArgs, { nullable: true })
    river: RiverSearchArgs
    @Field((type) => AreaInput, { nullable: true })
    searchingArea: AreaInput
    @Field((type) => PaginationArgs, { nullable: true })
    pagination: PaginationArgs
}
