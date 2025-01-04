import { river, river_in_parcelle } from '../../prisma/generated/dep'
import { Field, Float, ID, Int, ObjectType } from 'type-graphql'
import { IInParcelle } from './parcelle'
import { MultiLineString } from 'graphql-geojson-scalar-types'
import { MultiLineString as MultiLineStringType } from 'geojson'

@ObjectType()
export class River {
  @Field((type) => ID)
  gid: number

  @Field((type) => String, { nullable: true })
  toponyme: string | null

  @Field((type) => Int, { nullable: true })
  importance: number | null

  @Field((type) => MultiLineString, { nullable: true })
  geom?: MultiLineStringType

  constructor(river: river | null, geom?: MultiLineStringType) {
    this.gid = river?.gid ?? -1
    this.toponyme = river?.toponyme ?? null
    this.importance = Number(river?.importance) ?? null
    this.geom = geom
  }
}

@ObjectType('RiverInParcelle', { implements: IInParcelle })
export class RiverInParcelle extends River {
  @Field((type) => ID)
  parcelleGid: number

  @Field((type) => Float, { nullable: true })
  length?: number

  constructor(
    river: river | null,
    rip: river_in_parcelle,
    geom?: MultiLineStringType
  ) {
    super(river, geom)

    this.parcelleGid = rip?.parcelle_gid
    this.gid = rip?.river_gid
    this.length = rip?.river_length ?? 0
  }
}
