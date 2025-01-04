import {
  Arg,
  Args,
  Query,
  Resolver,
} from 'type-graphql'
import { deps, prisma, prismas, prismasDefault } from '../prisma'
import { Parcelle } from '../entity/parcelle'
import { getGeom, queryAllDeps } from '../utils/gis'
import { Commune } from '../entity/commune'
import { parcelle } from '../../prisma/generated/dep'
import assert from 'assert'
import { MultiPolygon as MultiPolygonType, Point as PointType } from 'geojson'
import {LatLng, SearchArgs, SearchParameters} from "../utils/inputs";
import {Prisma} from "../../prisma/generated/deps";

function objNotEmpty(obj: any) {
  return Object.keys(obj).length
}

@Resolver()
export class QueryResolvers {
  @Query(() => Parcelle, { nullable: true })
  async parcelle(
    @Arg('idu', (type) => String) idu: string
  ): Promise<Parcelle | null> {
    const dep = 'd' + idu.substring(0, 2)
    if (!deps.includes(dep)) {
      return null
    }
    const parcelle = await prismas[dep].parcelle.findMany({
      where: { idu },
    })
    if (!parcelle.length) {
      return null
    }
    return Parcelle.build(dep, parcelle[0])
  }

  @Query(() => Parcelle, { nullable: true })
  async pick(
    @Arg('coords', (type) => LatLng) coords: LatLng
  ): Promise<Parcelle | null> {
    const geom = `ST_Transform(ST_SetSRID(ST_MakePoint(${coords.lng}, ${coords.lat}), 4326), 2154)`
    let r = await queryAllDeps<{ gid: number }[]>(
      coords,
      Prisma.sql([
        `
        WITH closest_parcelles AS (
          SELECT p.gid, p.geom, ST_Distance(p.center, q.point) AS dist
          FROM parcelle p, (SELECT ${geom} AS point) q
          ORDER BY p.center <-> q.point
          LIMIT 20
        ),
        decoded_parcelles AS (
            SELECT gid, ST_Transform(ST_SetSRID(ST_GeomFromTWKB(geom), 2154), 2154) AS geometry, dist
            FROM closest_parcelles
        )
        SELECT gid
        FROM decoded_parcelles
        WHERE ST_Contains(geometry, ${geom})
      `,
      ]).sql
    ).then((res) => (res.length ? res[0] : null))
    if (r) {
      const parcelle = await prismas[r.dep].parcelle.findUnique({
        where: { gid: r.data[0].gid },
      })
      if (!parcelle) {
        return null
      }
      return Parcelle.build(r.dep, parcelle)
    }
    const communes = await prisma.$queryRawUnsafe<{insee_com: string; insee_dep: string}[]>(Prisma.sql([
      `
        SELECT insee_com, insee_dep
        FROM communes
        WHERE ST_Intersects(${geom}, geom)
      `,
    ]).sql)
    if(communes.length) {
      const dep = 'd' + communes[0].insee_dep
      const res = await prismas[dep].$queryRawUnsafe<{gid: number}[]>(Prisma.sql([
        `
        SELECT gid
        FROM parcelle
        WHERE commune_insee_com = '${communes[0].insee_com}' AND ST_Intersects(${geom}, ST_Transform(ST_SetSRID(ST_GeomFromTWKB(geom), 2154), 2154))
      `,
      ]).sql)
      if(res.length) {
        const parcelle = await prismas[dep].parcelle.findUnique({
          where: { gid: res[0].gid },
        })
        if (!parcelle) {
          return null
        }
        return Parcelle.build(dep, parcelle)
      }
    }
    return null
  }

  @Query(() => [Parcelle])
  async search(@Args() args?: SearchArgs): Promise<Parcelle[]> {
    assert(Number.isInteger(args?.pagination?.skip ?? 0), 'Invalid input')
    assert(Number.isInteger(args?.pagination?.take ?? 20), 'Invalid input')
    const offset = `OFFSET ${args?.pagination?.skip ?? 0}`
    const limit = `LIMIT ${Math.min(100, args?.pagination?.take ?? 20)}`
    const orderBy = `ORDER BY pa.gid ASC`
    let where = `WHERE 1=1 `
    let joins = ''
    if (args?.parcelle?.area && objNotEmpty(args?.parcelle?.area)) {
      if (Number.isInteger(args.parcelle.area.min)) {
        where += ` AND pa.area >= ${args.parcelle.area.min} `
      }
      if (Number.isInteger(args.parcelle.area.max)) {
        where += ` AND pa.area <= ${args.parcelle.area.max} `
      }
    }
    if (args?.parcelle?.type?.length) {
      assert(args.parcelle.type.every((it) => typeof it === 'number'))
      joins += ' JOIN plu_in_parcelle pip ON (pip.parcelle_gid) = (pa.gid)'
      joins +=
        ' JOIN plu ON (plu.gid, plu.gid_part) = (pip.plu_gid, pip.plu_gid_part)'
      where += ` AND plu.type_id IN (${args.parcelle.type.join(',')}) `
    }
    if (args?.forest?.lookFor) {
      joins += ' JOIN forest_in_parcelle fip ON (fip.parcelle_gid) = (pa.gid)'
      if (args?.forest.area && objNotEmpty(args?.forest.area)) {
        if (Number.isInteger(args.forest.area.min)) {
          where += ` AND pa.forest_area >= ${args.forest.area.min} `
        }
        if (Number.isInteger(args.forest.area.max)) {
          where += ` AND pa.forest_area <= ${args.forest.area.max} `
        }
      }
      if (args?.forest?.type?.length || args?.forest?.essence?.length) {
        assert(args.forest.type.every((it) => typeof it === 'number'))
        joins += ' JOIN forest ON (forest.gid) = (fip.forest_gid)'
        if(args?.forest?.type?.length) {
          where += ` AND forest.type_id IN (${args.forest.type.join(',')}) `
        }
        if(args?.forest?.essence?.length) {
          where += ` AND forest.essence_id IN (${args.forest.essence.join(',')}) `
        }
      }
    } else if (args?.forest?.lookFor === false) {
      joins +=
        ' LEFT OUTER JOIN forest_in_parcelle fip ON (fip.parcelle_gid) = (pa.gid)'
      where += ' AND fip.parcelle_gid IS NULL'
    }

    if (args?.building?.lookFor) {
      joins += ' JOIN building_in_parcelle bip ON (bip.parcelle_gid) = (pa.gid)'
      if (args?.building.area && objNotEmpty(args?.building.area)) {
        if (Number.isInteger(args.building.area.min)) {
          where += ` AND pa.building_area >= ${args.building.area.min} `
        }
        if (Number.isInteger(args.building.area.max)) {
          where += ` AND pa.building_area <= ${args.building.area.max} `
        }
      }
      if (
        args?.building.type?.length ||
        args?.building.usage?.length ||
        args?.building.condition?.length
      ) {
        joins += ' JOIN building ON (building.gid) = (bip.building_gid)'
        if (args?.building.type?.length) {
          assert(args.building.type.every((it) => typeof it === 'number'))
          where += ` AND building.nature_id IN (${args.building.type.join(
            ','
          )}) `
        }
        if (args?.building.usage?.length) {
          assert(args.building.usage.every((it) => typeof it === 'number'))
          where += ` AND (building.usage1_id IN (${args.building.usage.join(
            ','
          )}) OR building.usage2_id IN (${args.building.usage.join(',')})) `
        }
        if (args?.building.condition?.length) {
          assert(args.building.condition.every((it) => typeof it === 'number'))
          where += ` AND building.etat_id IN (${args.building.condition.join(
            ','
          )})`
        }
      }
    } else if (args?.building?.lookFor === false) {
      joins +=
        ' LEFT OUTER JOIN building_in_parcelle bip ON (bip.parcelle_gid) = (pa.gid)'
      where += ' AND bip.parcelle_gid IS NULL'
    }
    if (args?.river?.lookFor) {
      if (args?.river.length && objNotEmpty(args?.river.length)) {
        if (Number.isInteger(args.river.length.min)) {
          where += ` AND pa.river_length >= ${args.river.length.min} `
        }
        if (Number.isInteger(args.river.length.max)) {
          where += ` AND pa.river_length <= ${args.river.length.max} `
        }
      } else {
        where += ` AND pa.river_length > 0 `
      }
    } else if (args?.river?.lookFor === false) {
      where += ` AND pa.river_length = 0 `
    }
    if (args?.searchingArea) {
      if (args.searchingArea.communes) {
        assert(args.searchingArea.communes.every((it) => !isNaN(Number(it))))
        where += ` AND pa.commune_insee_com IN (${args.searchingArea.communes
          .map((p) => `'${p}'`)
          .join(',')})`
      } else if (
        args.searchingArea.commune &&
        Number.isInteger(args.searchingArea.commune.radius) &&
        Number.isInteger(args.searchingArea.commune.commune)
      ) {
        const commune_insee_com = []
        where += ` AND commune_insee_com IN (${commune_insee_com
          .map((p) => `'${p}'`)
          .join(',')})`
        // where += ` AND ST_intersects(commune.geom,
        //         ST_Buffer(
        //           (SELECT ST_Centroid(geom) as center FROM commune WHERE gid = ${args.searchingArea.commune.commune} LIMIT 1)::geometry,
        //           ${args.searchingArea.commune.radius} * 1000
        //         )::geometry
        //     )`
      }
      // TODO: check if subdivide is faster than normal intersects
      else if (args.searchingArea.polygon) {
        const coords = args.searchingArea.polygon.coordinates
        assert(
          coords.every(
            (coord) =>
              typeof coord.lng === 'number' && typeof coord.lat === 'number'
          )
        )
        if (coords.length < 3) {
          throw new Error('Polygon not enough coordinates')
        }
        const geom = `ST_Transform(ST_SetSRID(ST_MakePolygon( ST_GeomFromText('LINESTRING(${coords
          .map((c) => `${c.lng} ${c.lat}`)
          .join(',')}, ${coords[0].lng} ${coords[0].lat} )')), 4326), 2154)`
        const geomArea = await prisma
          .$queryRaw<{ area: number }[]>(
            Prisma.sql([`SELECT ST_Area(${geom}) as area`])
          )
          .then((res) => res[0].area)
        let intersectWith = 'pa.center'
        if (geomArea > 100000000) {
          // Communes is computed in queryAllDeps
          where += " AND commune_insee_com IN('', __COMMUNES__)"
        } else {
          where += ` AND ST_intersects(${intersectWith}, ST_Transform(ST_SetSRID(ST_MakePolygon( ST_GeomFromText('LINESTRING(${coords
            .map((c) => `${c.lng} ${c.lat}`)
            .join(',')}, ${coords[0].lng} ${coords[0].lat} )')), 4326), 2154))`
        }
      } else if (args.searchingArea.circle) {
        const { radius, center } = args.searchingArea.circle
        let intersectWith = 'pa.center'
        if (radius > 50000) {
          joins += ' JOIN commune ON (commune.gid) = (pa.commune_gid)'
          intersectWith = 'commune.geom'
        }
        where += ` AND ST_intersects(${intersectWith}, ST_Transform( 
              ST_Buffer( 
                ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography, 
                ${radius})::geometry, 
              2154)
            )`
      }
    }
    const defaultSelect = `
    pa.gid, 
    pa.idu, 
    pa.area, 
    pa.forest_area, 
    pa.forest_area_percentage, 
    pa.building_area, 
    pa.building_area_percentage, 
    pa.plu_area, 
    pa.plu_area_percentage, 
    pa.river_length,
    pa.commune_insee_com
    `
    const finalQuery = `SELECT DISTINCT ${defaultSelect}, 
                        ST_AsGeoJSON(ST_Transform(ST_SetSRID(ST_GeomFromTWKB(pa.geom),2154),4326)) as geom,
                        ST_AsGeoJSON(ST_Transform(center,4326)) as center
                        FROM parcelle pa
                        ${joins}
                        ${where}
                        ${orderBy}
                        ${offset}
                        ${limit};`
    console.log('finalQuery:', finalQuery)
    const searchingArea =
      args?.searchingArea.polygon ??
      args?.searchingArea.circle ??
      args?.searchingArea.communes ??
      args?.searchingArea.commune
    assert(searchingArea, 'No searching area provided')
    const parcelles = await queryAllDeps<
      (parcelle & { geom: string; center: string })[]
    >(searchingArea, finalQuery)
    return Promise.all(
      parcelles.map(({ dep, data }) =>
        Promise.all(
          data.map((p) =>
            Parcelle.build(dep, {
              gid: p.gid,
              idu: p.idu,
              area: p.area,
              forest_area: p.forest_area,
              forest_area_percentage: p.forest_area_percentage,
              building_area: p.building_area,
              building_area_percentage: p.building_area_percentage,
              plu_area: p.plu_area,
              plu_area_percentage: p.plu_area_percentage,
              river_length: p.river_length,
              commune_insee_com: p.commune_insee_com,
              geom: JSON.parse(p.geom) as MultiPolygonType,
              center: JSON.parse(p.center) as PointType,
            } as any)
          )
        )
      )
    ).then((res) => res.flat())
  }

  @Query(() => [String])
  async test(): Promise<string | string[]> {
    return ['Hello', 'World']
    //return getGeom('d01', 'forest_in_parcelle', {parcelle_gid: [137, 134], forest_gid: [3898, 24]});
    // return getGeom('d01', 'forest_in_parcelle', {parcelle_gid: 137, forest_gid:24});
  }

  @Query(() => SearchParameters)
  async searchParameters(): Promise<SearchParameters> {
    const [
      parametersForestEssence,
      parametersForestType,
      parametersBuildingEtat,
      parametersBuildingType,
      parametersBuildingUsage,
      parametersPluType,
    ] = await Promise.all([
      prismasDefault.forest_essence.findMany({}),
      prismasDefault.forest_type.findMany({}),
      prismasDefault.building_etat.findMany({}),
      prismasDefault.building_nature.findMany({}),
      prismasDefault.building_usage.findMany({}),
      prismasDefault.plu_type.findMany({}),
    ])
    return {
      forestEssence: parametersForestEssence
        .filter((param) => (param.description?.length ?? 0) < 30)
        .map((x) => ({ id: x.id, label: x.description ?? '' })),
      forestType: parametersForestType.map((x) => ({
        id: x.id,
        label: x.description?.replace(/\s\((.*)\)/g, '') ?? '',
        description: new RegExp(/\s\((.*)\)/g).exec(x.description ?? '')?.[1],
      })),
      buildingCondition: parametersBuildingEtat.map((x) => ({
        id: x.id,
        label: x.etat ?? '',
      })),
      buildingType: parametersBuildingType.map((x) => ({
        id: x.id,
        label: x.nature ?? '',
      })),
      buildingUsage: parametersBuildingUsage.map((x) => ({
        id: x.id,
        label: x.busage ?? '',
      })),
      pluType: parametersPluType.map((x) => ({
        id: x.id,
        label: x.type1_desc ?? '',
      })),
    }
  }

  @Query(() => [Commune])
  async communesList(): Promise<Commune[]> {
    return prisma.communes
      .findMany({
        where: { insee_dep: { in: deps.map((d) => d.substring(1)) } },
        orderBy: [{ postal_code: 'asc' }, { nom: 'asc' }],
      })
      .then((communes) => {
        return Promise.all(
          communes.map((c) => Commune.build('d' + c.insee_dep, c))
        )
      })
  }
}
