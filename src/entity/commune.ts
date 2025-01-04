import { Field, Float, ID, Int, InterfaceType, ObjectType } from 'type-graphql'
import { communes } from '../../prisma/generated/deps'
import { Email, PhoneNumber, WebsiteUrl } from '../scalars'
import { GeomSelect, getGeom } from '../utils/gis'
import { MultiPolygon } from 'graphql-geojson-scalar-types'
import { MultiPolygon as MultiPolygonType } from 'geojson'

@ObjectType()
export class Commune {
  prismaObj: communes

  @Field((type) => Int)
  gid: number

  @Field((type) => String)
  insee_com?: string

  @Field((type) => String)
  nom?: string

  @Field((type) => String)
  full_name?: string

  @Field((type) => String, { nullable: true })
  postal_code?: string

  @Field((type) => Float)
  population?: number

  @Field((type) => PhoneNumber, { nullable: true })
  numero?: string

  @Field((type) => Email, { nullable: true })
  email?: string

  @Field((type) => WebsiteUrl, { nullable: true })
  site?: string

  @Field((type) => MultiPolygon)
  geom?: MultiPolygonType

  @Field((type) => String)
  dep: string

  constructor(dep: string, c: communes, geom?: GeomSelect<MultiPolygonType>) {
    this.prismaObj = c
    this.gid = c.gid
    this.insee_com = c.insee_com ?? undefined
    this.nom = c.nom ?? undefined
    this.population = Number(c.population) ?? undefined
    this.numero = c.numero ?? undefined
    this.email = c.email ?? undefined
    this.site = c.site ?? undefined
    this.postal_code = c.postal_code ?? undefined
    this.full_name = this.postal_code + ' ' + this.nom
    this.geom = geom?.geom ?? undefined
    this.dep = dep
  }

  static async build(dep: string, c: communes): Promise<Commune> {
    return new Commune(dep, c)
  }
}
