import {
  Arg,
  FieldResolver,
  registerEnumType,
  Resolver,
  ResolverInterface,
  Root,
} from 'type-graphql'
import { prisma, prismas } from '../prisma'
import { BuildingInParcelle } from '../entity/building'
import { ForestInParcelle } from '../entity/forest'
import { IInParcelle, Parcelle } from '../entity/parcelle'
import { PluInParcelle } from '../entity/plu'
import { RiverInParcelle } from '../entity/river'
import { getGeom } from '../utils/gis'
import { Commune } from '../entity/commune'
import {
  MultiLineString as MultiLineStringType,
  MultiPolygon as MultiPolygonType,
} from 'geojson'

enum InParcelleFilter {
  Forest = 'Forest',
  Building = 'Building',
  River = 'River',
  Plu = 'Plu',
}

registerEnumType(InParcelleFilter, {
  name: 'InParcelleFilter',
  description: 'Filter by type in parcelle',
})

enum AreaType {
  Metric = 'Metric',
  Percentage = 'Percentage',
}

registerEnumType(AreaType, {
  name: 'AreaType',
  description:
    'Tell whether you want area as metric or percentage of the parcel',
})

@Resolver((of) => Parcelle)
export class ParcelleResolvers implements ResolverInterface<Parcelle> {
  @FieldResolver()
  async commune(@Root() parcelle: Parcelle) {
    const com = await prisma.communes.findMany({
      where: { insee_com: parcelle.prismaObj.commune_insee_com ?? '' },
    })
    if (!com.length) {
      throw new Error('Could not find commune')
    }
    return Commune.build(parcelle.dep, com[0])
  }

  @FieldResolver()
  async areaBuilding(
    @Root() parcelle: Parcelle,
    @Arg('type', (type) => AreaType, {
      nullable: true,
      defaultValue: AreaType.Metric,
    })
    type: AreaType
  ) {
    if (type === AreaType.Metric) {
      return parcelle._areaBuilding
    }
    return parcelle._areaBuildingPercentage
  }

  @FieldResolver()
  async areaForest(
    @Root() parcelle: Parcelle,
    @Arg('type', (type) => AreaType, {
      nullable: true,
      defaultValue: AreaType.Metric,
    })
    type: AreaType
  ) {
    if (type === AreaType.Metric) {
      return parcelle._areaForest
    }
    return parcelle._areaForestPercentage
  }

  @FieldResolver()
  async areaPlu(
    @Root() parcelle: Parcelle,
    @Arg('type', (type) => AreaType, {
      nullable: true,
      defaultValue: AreaType.Metric,
    })
    type: AreaType
  ) {
    if (type === AreaType.Metric) {
      return parcelle._areaPlu
    }
    return parcelle._areaPluPercentage
  }

  @FieldResolver()
  async inside(
    @Root() parcelle: Parcelle,
    @Arg('filter', (type) => [InParcelleFilter], { nullable: true })
    filter: InParcelleFilter[]
  ): Promise<IInParcelle[]> {
    let itemInside: IInParcelle[] = []
    console.log('filter:', filter)
    if (!filter || filter.includes(InParcelleFilter.Forest)) {
      console.log('Adding forest')
      const inParcelle = await prismas[
        parcelle.dep
      ].forest_in_parcelle.findMany({ where: { parcelle_gid: parcelle.gid } })
      const geoms = await getGeom<MultiPolygonType>(
        parcelle.dep,
        'forest_in_parcelle',
        {
          parcelle_gid: inParcelle.map((item) => item.parcelle_gid),
          forest_gid: inParcelle.map((item) => item.forest_gid),
        },
        { twkb: true, toMultiPolygon: true }
      )
      itemInside.push(
        ...(await Promise.all(
          inParcelle.map(async (fip, idx) => ({
            forest: await prismas[parcelle.dep].forest.findUnique({
              where: { gid: fip.forest_gid },
            }),
            fip,
            geom: geoms[idx],
          }))
        ).then((res) =>
          res.map(
            (r) =>
              new ForestInParcelle(parcelle.dep, r.forest, r.fip, r.geom?.geom)
          )
        ))
      )
    }
    if (!filter || filter.includes(InParcelleFilter.Building)) {
      console.log('Adding building')
      const inParcelle = await prismas[
        parcelle.dep
      ].building_in_parcelle.findMany({ where: { parcelle_gid: parcelle.gid } })
      const geoms = await getGeom<MultiPolygonType>(
        parcelle.dep,
        'building_in_parcelle',
        {
          parcelle_gid: inParcelle.map((item) => item.parcelle_gid),
          building_gid: inParcelle.map((item) => item.building_gid),
        },
        { twkb: true, toMultiPolygon: true }
      )
      itemInside.push(
        ...(await Promise.all(
          inParcelle.map(async (bip, idx) => ({
            building: await prismas[parcelle.dep].building.findUnique({
              where: { gid: bip.building_gid },
            }),
            bip,
            geom: geoms[idx],
          }))
        ).then((res) =>
          res.map(
            (r) =>
              new BuildingInParcelle(
                parcelle.dep,
                r.building as any,
                r.bip,
                r.geom?.geom
              )
          )
        ))
      )
    }
    if (!filter || filter.includes(InParcelleFilter.River)) {
      console.log('Adding river')
      const inParcelle = await prismas[parcelle.dep].river_in_parcelle.findMany(
        { where: { parcelle_gid: parcelle.gid } }
      )
      const geoms = await getGeom<MultiLineStringType>(
        parcelle.dep,
        'river_in_parcelle',
        {
          parcelle_gid: inParcelle.map((item) => item.parcelle_gid),
          river_gid: inParcelle.map((item) => item.river_gid),
        },
        { twkb: true }
      )
      itemInside.push(
        ...(await Promise.all(
          inParcelle.map(async (bip, idx) => ({
            river: await prismas[parcelle.dep].river.findUnique({
              where: { gid: bip.river_gid },
            }),
            bip,
            geom: geoms[idx],
          }))
        ).then((res) =>
          res.map((r) => new RiverInParcelle(r.river, r.bip, r.geom?.geom))
        ))
      )
    }
    if (!filter || filter.includes(InParcelleFilter.Plu)) {
      console.log('Adding plu')
      const inParcelle = await prismas[parcelle.dep].plu_in_parcelle.findMany({
        where: { parcelle_gid: parcelle.gid },
      })
      const geoms = await getGeom<MultiPolygonType>(
        parcelle.dep,
        'plu_in_parcelle',
        {
          parcelle_gid: inParcelle.map((item) => item.parcelle_gid),
          plu_gid: inParcelle.map((item) => item.plu_gid),
          plu_gid_part: inParcelle.map((item) => item.plu_gid_part),
        },
        { twkb: true, toMultiPolygon: true }
      )
      itemInside.push(
        ...(await Promise.all(
          inParcelle.map(async (pip, idx) => ({
            plu: await prismas[parcelle.dep].plu.findUnique({
              where: {
                gid_gid_part: { gid: pip.plu_gid, gid_part: pip.plu_gid_part },
              },
            }),
            pip,
            geom: geoms[idx],
          }))
        ).then((res) =>
          res.map((r) => new PluInParcelle(r.plu, r.pip, r.geom?.geom))
        ))
      )
    }
    return itemInside
  }
}
