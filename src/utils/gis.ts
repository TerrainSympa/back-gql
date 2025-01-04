import { Geometry, Point } from 'geojson'
import {prisma, prismas, deps as availableDeps} from "../prisma";
import {Circle, CommuneInput, LatLng, Polygon} from "./inputs";
import { Prisma } from '../../prisma/generated/deps';

export type GeomSelect<T extends Geometry> = { geom: T; center?: Point }

export function getGeom<T extends Geometry>(
  dep: string | null,
  tableName: string,
  gids: { [name: string]: number },
  options?: {
    geomColumn?: string
    center?: boolean
    twkb?: boolean
    toMultiPolygon?: boolean
  }
): Promise<GeomSelect<T> | undefined>
export function getGeom<T extends Geometry>(
  dep: string | null,
  tableName: string,
  gids: { [name: string]: number[] },
  options?: {
    geomColumn?: string
    center?: boolean
    twkb?: boolean
    toMultiPolygon?: boolean
  }
): Promise<(GeomSelect<T> | undefined)[]>
export function getGeom<T extends Geometry>(
  dep: string | null,
  tableName: string,
  gids: { [name: string]: number[] | number },
  options?: {
    geomColumn?: string
    center?: boolean
    twkb?: boolean
    toMultiPolygon?: boolean
  }
): Promise<(GeomSelect<T> | undefined)[] | (GeomSelect<T> | undefined)> {
  let retEmpty = false
  let singleGid = true
  let badLength = false
  let length: number | undefined = undefined
  const geomColumn = options?.geomColumn ?? 'geom'
  Object.entries(gids).forEach(([, value]) => {
    if (Array.isArray(value)) {
      if (!length) {
        length = value.length
      } else if (value.length != length) {
        badLength = true
      }
      singleGid = false
      if (!value.length) {
        retEmpty = true
      }
    }
  })
  if (retEmpty || badLength) {
    if (badLength) {
      console.log('Bad length')
    }
    return Promise.resolve([])
  }

  // console.log('query:', `
  // SELECT ${Object.keys(gids).join(', ')}, ST_AsGeoJSON(ST_Transform(${geomColumn},4326)) as geom
  // FROM ${tableName}
  // WHERE ${Object.entries(gids).map(([key, value]) => `${key} IN (${singleGid ? value : (value as number[]).join(',')})`).join(' AND ')}
  // `);

  const geomSelect = `ST_AsGeoJSON(ST_Transform(${geomColumn},4326))`
    const vall = `
        SELECT ${Object.keys(gids).join(', ')}, ${
        options?.twkb
            ? `ST_AsGeoJSON(ST_Transform(ST_SetSRID(${
                options.toMultiPolygon ? 'ST_Multi(' : ''
            }ST_GeomFromTWKB(${geomColumn})${
                options.toMultiPolygon ? ')' : ''
            }, 2154), 4326))`
            : geomSelect
    } as geom ${
        options?.center
            ? ', ST_AsGeoJSON(ST_Transform(center,4326)) as center'
            : ''
    }
        FROM ${tableName}
        WHERE ${Object.entries(gids)
        .map(
            ([key, value]) =>
                `${key} IN (${singleGid ? value : (value as number[]).join(',')})`
        )
        .join(' AND ')}
        `
  return (dep ? prismas[dep] : prisma)
    .$queryRaw<
      {
        geom: string
        center?: string
        [name: string]: string | undefined
      }[]
    >(
      Prisma.sql([
        `
        SELECT ${Object.keys(gids).join(', ')}, ${
          options?.twkb
            ? `ST_AsGeoJSON(ST_Transform(ST_SetSRID(${
                options.toMultiPolygon ? 'ST_CollectionExtract(ST_Multi(' : ''
              }ST_GeomFromTWKB(${geomColumn})${
                options.toMultiPolygon ? '))' : ''
              }, 2154), 4326))`
            : geomSelect
        } as geom ${
          options?.center
            ? ', ST_AsGeoJSON(ST_Transform(center,4326)) as center'
            : ''
        }
        FROM ${tableName}
        WHERE ${Object.entries(gids)
          .map(
            ([key, value]) =>
              `${key} IN (${singleGid ? value : (value as number[]).join(',')})`
          )
          .join(' AND ')}
        `,
      ])
    )
    .then((results) => {
      // console.log('results:', results);
      return singleGid
        ? {
            geom: JSON.parse(results[0].geom) as T,
            center:
              results[0].center !== undefined
                ? (JSON.parse(results[0].center) as Point | undefined)
                : undefined,
          }
        : [...Array(length).keys()]
            .map((idx) =>
              results.find((r) =>
                Object.keys(gids).every(
                  (key) => Number(r[key]) === (gids[key] as number[])[idx]
                )
              )
            )
            .map((r) => ({
              geom: JSON.parse(r!.geom) as T,
              center:
                r?.center !== undefined
                  ? (JSON.parse(r.center) as Point | undefined)
                  : undefined,
            }))
    })
}

function getDeps(
  position: LatLng | Circle | Polygon | string[] | CommuneInput
) {
  if ('lat' in position) {
    const geom = `ST_Transform(ST_SetSRID(ST_MakePoint(${position.lng}, ${position.lat}), 4326), 2154)`
    return prisma.$queryRaw<{ dep_no: string }[]>(
      Prisma.sql([
        `
        SELECT insee_dep as dep_no
        FROM departements
        WHERE ST_intersects(departements.geom, ${geom})
        `,
      ])
    )
  } else if ('radius' in position && 'center' in position) {
    const { radius, center } = position
    return prisma.$queryRaw<{ dep_no: string }[]>(
      Prisma.sql([
        `
        SELECT insee_dep as dep_no
        FROM departements
        WHERE ST_intersects(departements.geom, ST_Transform( 
              ST_Buffer( 
                ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography, 
                ${radius})::geometry, 
              2154)
            )
        `,
      ])
    )
  } else if ('coordinates' in position) {
    const coords = position.coordinates
    return prisma.$queryRaw<{ dep_no: string }[]>(
      Prisma.sql([
        `
        SELECT insee_dep as dep_no
        FROM departements
        WHERE ST_intersects(departements.geom, ST_Transform(ST_SetSRID(ST_MakePolygon( ST_GeomFromText('LINESTRING(${coords
          .map((c) => `${c.lng} ${c.lat}`)
          .join(',')}, ${coords[0].lng} ${coords[0].lat} )')), 4326), 2154))
        `,
      ])
    )
  } else if ('commune' in position) {
    return prisma.$queryRaw<{ dep_no: string }[]>(
      Prisma.sql([
        `
        SELECT insee_dep as dep_no
        FROM departements d
        JOIN communes c USING(insee_dep)
        WHERE ST_intersects(c.geom,
                ST_Buffer(
                  (SELECT ST_Centroid(geom) as center FROM communes WHERE insee_com = '${position.commune}' LIMIT 1)::geometry,
                  ${position.radius} * 1000
                )::geometry
            )
        GROUP BY 1
        `,
      ])
    )
  }
  return prisma.$queryRaw<{ dep_no: string }[]>(
    Prisma.sql([
      `
        SELECT insee_dep as dep_no
        FROM communes
        WHERE insee_com IN(${position.map((p) => `'${p}'`).join(',')})
        GROUP BY 1
        `,
    ])
  )
}

function getCommunes(
  position: LatLng | Circle | Polygon | string[] | CommuneInput,
  dep?: string
) {
  if ('lat' in position) {
    const geom = `ST_Transform(ST_SetSRID(ST_MakePoint(${position.lng}, ${position.lat}), 4326), 2154)`
    return prisma.$queryRaw<{ insee_com: string }[]>(
      Prisma.sql([
        `
        SELECT insee_com as insee_com
        FROM communes c
        WHERE ${
          dep ? `insee_dep = ${dep} AND ` : ''
        } ST_intersects(c.geom, ${geom})
        `,
      ])
    )
  } else if ('radius' in position && 'center' in position) {
    const { radius, center } = position
    return prisma.$queryRaw<{ insee_com: string }[]>(
      Prisma.sql([
        `
        SELECT insee_com as insee_com
        FROM communes c
        WHERE ST_intersects(c.geom, ST_Transform( 
              ST_Buffer( 
                ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography, 
                ${radius})::geometry, 
              2154)
            )
        `,
      ])
    )
  } else if ('coordinates' in position) {
    const coords = position.coordinates
    return prisma.$queryRaw<{ insee_com: string }[]>(
      Prisma.sql([
        `
        SELECT insee_com as insee_com
        FROM communes c
        WHERE ST_intersects(c.geom, ST_Transform(ST_SetSRID(ST_MakePolygon( ST_GeomFromText('LINESTRING(${coords
          .map((c) => `${c.lng} ${c.lat}`)
          .join(',')}, ${coords[0].lng} ${coords[0].lat} )')), 4326), 2154))
        `,
      ])
    )
  }
  return [] as { insee_com: string }[]
}

export async function queryAllDeps<T>(
  position: LatLng | Circle | Polygon | string[] | CommuneInput,
  query: string
) {
  const deps = await getDeps(position)
  return Promise.all(
    deps
      .map((dep) => `d${dep.dep_no}`)
      .filter((dep) => availableDeps.includes(dep))
      .map(async (dep) => {
        const p = prismas[dep]
        let final_query = query
        if (query.includes('__COMMUNES__')) {
          const communes = await getCommunes(position, dep.substring(1))
          final_query = final_query.replace(
            '__COMMUNES__',
            communes.map((c) => `'${c.insee_com}'`).join(',')
          )
        }
        return { data: await p.$queryRawUnsafe<T>(final_query), dep: dep }
      })
  ).then((res) => res.flat())
}
