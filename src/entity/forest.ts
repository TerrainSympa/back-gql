import { Field, Float, ID, ObjectType } from 'type-graphql'
import { forest, forest_in_parcelle } from '../../prisma/generated/dep'
import { IInParcelle } from './parcelle'
import { prisma, prismas } from '../prisma'
import { MultiPolygon } from 'graphql-geojson-scalar-types'
import { MultiPolygon as MultiPolygonType } from 'geojson'

@ObjectType()
export class Forest {
  @Field((type) => ID)
  gid: number

  typeId?: number | null
  @Field((type) => String, { nullable: true })
  async type() {
    if (this.typeId) {
      return prismas[this.dep].forest_type
        .findUnique({ where: { id: this.typeId } })
        .then((res) => res?.description)
    }
    return null
  }

  essenceId?: number | null
  @Field((type) => String, { nullable: true })
  async essence() {
    if (this.essenceId) {
      return prismas[this.dep].forest_essence
        .findUnique({ where: { id: this.essenceId } })
        .then((res) => res?.description)
    }
    return null
  }

  essence1Id?: number | null
  @Field((type) => String, { nullable: true })
  async essence1() {
    if (this.essence1Id) {
      return prismas[this.dep].forest_essence
        .findUnique({ where: { id: this.essence1Id } })
        .then((res) => res?.description)
    }
    return null
  }

  essence2Id?: number | null
  @Field((type) => String, { nullable: true })
  async essence2() {
    if (this.essence2Id) {
      return prismas[this.dep].forest_essence
        .findUnique({ where: { id: this.essence2Id } })
        .then((res) => res?.description)
    }
    return null
  }

  compositionId?: number | null
  @Field((type) => String, { nullable: true })
  async composition() {
    if (this.compositionId) {
      return prismas[this.dep].forest_composition
        .findUnique({ where: { id: this.compositionId } })
        .then((res) => res?.description)
    }

    return null
  }

  @Field((type) => MultiPolygon, { nullable: true })
  geom?: MultiPolygonType

  @Field((type) => String)
  dep: string

  constructor(dep: string, forest: forest | null, geom?: MultiPolygonType) {
    this.gid = forest?.gid ?? -1
    this.typeId = forest?.type_id
    this.essence1Id = forest?.essence_1_id
    this.essence2Id = forest?.essence_2_id
    this.essenceId = forest?.essence_id
    this.compositionId = forest?.composition_id
    this.geom = geom
    this.dep = dep
  }
}

@ObjectType('ForestInParcelle', { implements: IInParcelle })
export class ForestInParcelle extends Forest {
  @Field((type) => ID)
  parcelleGid: number

  @Field((type) => Float, { nullable: true })
  area?: number

  constructor(
    dep: string,
    forest: forest | null,
    fip: forest_in_parcelle,
    geom?: MultiPolygonType
  ) {
    super(dep, forest, geom)
    this.gid = fip.forest_gid
    this.parcelleGid = fip.parcelle_gid
    this.area = fip.area ?? 0
  }
}
