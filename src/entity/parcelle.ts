import { parcelle } from '../../prisma/generated/dep'
import { Field, Float, ID, InterfaceType, ObjectType } from 'type-graphql'
import { GeomSelect, getGeom } from '../utils/gis'
import { Commune } from './commune'
import { MultiPolygon, Point } from 'graphql-geojson-scalar-types'
import { MultiPolygon as MultiPolygonType, Point as PointType } from 'geojson'

@ObjectType()
export class Parcelle {
  prismaObj: parcelle

  @Field((type) => ID)
  gid: number

  @Field((type) => MultiPolygon)
  geom?: MultiPolygonType

  @Field((type) => Point)
  center?: PointType

  @Field((type) => Float)
  area?: number

  @Field((type) => [IInParcelle])
  inside: IInParcelle[]

  @Field((type) => Commune)
  commune: Commune

  @Field((type) => String)
  idu: string

  @Field((type) => Float)
  areaBuilding: number | null
  _areaBuilding: number | null
  _areaBuildingPercentage: number | null

  @Field((type) => Float)
  areaForest: number | null
  _areaForest: number | null
  _areaForestPercentage: number | null

  @Field((type) => Float)
  areaPlu: number | null
  _areaPlu: number | null
  _areaPluPercentage: number | null

  @Field((type) => Float)
  riverLength: number | null

  @Field((type) => String)
  dep: string

  constructor(
    dep: string,
    p: parcelle & { geom?: MultiPolygonType; center?: PointType },
    geom?: GeomSelect<MultiPolygonType>
  ) {
    this.prismaObj = p
    this.gid = p.gid
    this.area = p.area ?? undefined
    this.geom = p?.geom ?? geom?.geom
    this.center = p?.center ??
      geom?.center ?? {
        type: 'Point',
        coordinates: [5.344876417, 46.055278878],
      }
    this._areaBuilding = p.building_area
    this._areaBuildingPercentage = p.building_area_percentage
    this._areaForest = p.forest_area
    this._areaForestPercentage = p.forest_area_percentage
    this._areaPlu = p.plu_area
    this._areaPluPercentage = p.plu_area_percentage
    this.riverLength = p.river_length
    this.idu = p.idu ?? ''
    this.dep = dep
  }

  static async build(
    dep: string,
    p: parcelle & { geom?: MultiPolygonType; center?: PointType }
  ): Promise<Parcelle> {
    return new Parcelle(
      dep,
      p,
      await getGeom(dep, 'parcelle', { gid: p.gid }, { center: true, twkb: true })
    )
  }
}

@InterfaceType()
export abstract class IInParcelle {
  @Field((type) => ID)
  parcelleGid: number
  @Field((type) => ID)
  gid: number
}
