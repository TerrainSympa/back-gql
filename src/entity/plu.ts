import { plu_in_parcelle, plu } from '../../prisma/generated/dep'
import { Field, Float, ID, ObjectType } from 'type-graphql'
import { IInParcelle } from './parcelle'
import { MultiPolygon } from 'graphql-geojson-scalar-types'
import { MultiPolygon as MultiPolygonType } from 'geojson'

@ObjectType()
export class Plu {
  @Field((type) => ID)
  gid: number

  @Field((type) => ID)
  gidPart: number

  @Field((type) => String, { nullable: true })
  libelle: string | null

  @Field((type) => String, { nullable: true })
  libelong: string | null

  @Field((type) => MultiPolygon, { nullable: true })
  geom?: MultiPolygonType

  constructor(plu: plu | null, geom?: MultiPolygonType) {
    this.gid = plu?.gid ?? -1
    this.gidPart = plu?.gid_part ?? -1
    this.geom = geom
    this.libelle = plu?.libelle ?? null
    this.libelong = plu?.libelong ?? null
  }
}

@ObjectType('PluInParcelle', { implements: IInParcelle })
export class PluInParcelle extends Plu {
  @Field((type) => ID)
  parcelleGid: number

  @Field((type) => Float, { nullable: true })
  area?: number

  constructor(plu: plu | null, bip: plu_in_parcelle, geom?: MultiPolygonType) {
    super(plu, geom)

    this.parcelleGid = bip.parcelle_gid
    this.gid = bip.plu_gid
    this.gidPart = bip.plu_gid_part
    this.area = bip.area ?? 0
  }
}
