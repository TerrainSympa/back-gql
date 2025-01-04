import { building_in_parcelle, building } from '../../prisma/generated/dep'
import {Field, Float, Int, ID, ObjectType, Resolver, Root} from "type-graphql";
import { IInParcelle } from "./parcelle";
import {prisma, prismas} from "../prisma";
import {MultiPolygon} from "graphql-geojson-scalar-types";
import {MultiPolygon as MultiPolygonType} from "geojson";

@ObjectType()
export class Building {
    @Field(type => ID)
    gid: number;

    usage1Id?: number | null;
    @Field(type => String, {nullable: true})
    async usage1() {
        if(this.usage1Id) {
            return prismas[this.dep].building_usage.findUnique({where: {id: this.usage1Id}}).then((res) => res?.busage);
        }
        return null;
    }

    usage2Id?: number | null;
    @Field(type => String, {nullable: true})
    async usage2() {
        if(this.usage2Id) {
            return prismas[this.dep].building_usage.findUnique({where: {id: this.usage2Id}}).then((res) => res?.busage);
        }
        return null;
    }

    @Field(type => Date, {nullable: true})
    dateConstruction?: Date | null;

    @Field(type => Boolean, {nullable: true})
    leger?: boolean | null;

    etatId?: number | null;
    @Field(type => String, {nullable: true})
    async etat() {
        if(this.etatId) {
            return prismas[this.dep].building_etat.findUnique({where: {id: this.etatId}}).then((res) => res?.etat);
        }
        return null;
    }

    natureId?: number | null;
    @Field(type => String, {nullable: true})
    async nature() {
        if(this.natureId) {
            return prismas[this.dep].building_nature.findUnique({where: {id: this.natureId}}).then((res) => res?.nature);
        }
        return null;
    }

    matRoofId?: number | null;
    @Field(type => String, {nullable: true})
    async materialRoof() {
        if(this.matRoofId) {
            return prismas[this.dep].building_mat_roof.findUnique({where: {id: this.matRoofId}}).then((res) => res?.description);
        }
        return null;
    }

    matWallId?: number | null;
    @Field(type => String, {nullable: true})
    async materialWall() {
        if(this.matWallId) {
            return prismas[this.dep].building_mat_wall.findUnique({where: {id: this.matWallId}}).then((res) => res?.description);
        }
        return null;
    }

    originId?: number | null;
    @Field(type => String, {nullable: true})
    async origin() {
        if(this.originId) {
            return prismas[this.dep].building_origin.findUnique({where: {id: this.originId}}).then((res) => res?.label);
        }
        return null;
    }

    @Field(type => Int, {nullable: true})
    nbFloor?: number | null;

    @Field(type => Int, {nullable: true})
    nbHousing?: number | null;

    @Field(type => Float, {nullable: true})
    height?: number | null;

    @Field(type => MultiPolygon, {nullable: true})
    geom?: MultiPolygonType;

    @Field(type => String)
    dep: string;

    constructor(dep: string, building: building | null, geom?: MultiPolygonType){
        this.gid = building?.gid ?? -1;
        this.usage1Id = building?.usage1_id;
        this.usage2Id = building?.usage2_id;
        this.etatId = building?.etat_id;
        this.dateConstruction = building?.date_app;
        this.leger = building?.lightweight;
        this.matRoofId = building?.mat_roof_id;
        this.matWallId = building?.mat_wall_id;
        this.natureId = building?.nature_id;
        this.nbFloor = Number(building?.nb_etages);
        this.nbHousing = Number(building?.nb_logts);
        this.height = Number(building?.hauteur);
        this.originId = Number(building?.origin_id);
        this.geom = geom;
        this.dep = dep;
    }
}


@ObjectType('BuildingInParcelle', {implements: IInParcelle})
export class BuildingInParcelle extends Building {
    @Field(type => ID)
    parcelleGid: number;

    @Field(type => Float, {nullable: true})
    area?: number;

    constructor(dep: string, building: building | null, bip: building_in_parcelle, geom?: MultiPolygonType){
        super(dep, building, geom);
        
        this.parcelleGid = bip.parcelle_gid;
        this.gid = bip.building_gid;
        this.area = bip.area ?? 0;
    }
}