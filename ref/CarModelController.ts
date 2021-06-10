
import Axios, { AxiosResponse } from "axios";
import { EventEmitter } from "events";
import { AssetInfoTypes } from "threngine";
import { IRenderService } from "threngine/dist/types/src/core/render/IRenderService";
import { Controller3D } from "./3DController";
import { ConfiguratorModel } from "./ConfiguratorModel";
import { FileLoadProgress } from "./fileLoadProgress";
import { RenderEngine } from "./RenderEngine";
import {number} from "prop-types";

export interface CarModelGroupings {
  carpaint:string;
  background:string;
  wheels:string;
  lights:string;
  welcomeScreen:string;
}

export enum CarModelCameraList {
  Orbit = "orbit",
  Wheel = "wheel",
  IntermediateSeatFrontLeft = "intermediateSeatFL",
  IntermediateSeatFrontRight = "intermediateSeatFR",
  IntermediateSeatRearLeft = "intermediateSeatRL",
  IntermediateSeatRearRight = "intermediateSeatRR",
  ExitInteriorLeft = "exitInteriorL",
  ExitInteriorRight = "exitInteriorR",
  SeatFL = "seatFL",
  SeatFR = "seatFR",
  SeatRL = "seatRL",
  SeatRR = "seatRR",
  GroundHotspotLights = "ghLights",
  GroundHotspotDoorsLeft = "ghDoorsLeft",
  GroundHotspotDoorsRight = "ghDoorsRight",
  GroundHotspotTrunk = "ghTrunk",
  TrunkLoading = "trunkLoading",
  PassengerStanding = "passengerStanding",
  PassengerIntDriver = "passengerIntDriver",
  PassengerIntDriverInOut = "passengerIntDriverInOut",
  PassengerIntFL = "passengerIntFL",
  PassengerIntRL = "passengerIntRL",
  PassengerIntRR = "passengerIntRR",
  PassengerIntFR = "passengerIntFR",
  XRayCar = "xrayCar",
  XRaySeat = "xraySeat",
  XRayTrunk = "xrayTrunk"
}

export interface CarModelCameraInfo {
  state:boolean;
  desktop:string;
  mobile?:string;
  time?:number;
}

export interface CarModelCameras {
  orbit:CarModelCameraInfo;
  wheel:CarModelCameraInfo;
  enterInteriorFL:CarModelCameraInfo;
  enterInteriorFR:CarModelCameraInfo;
  enterInteriorRL:CarModelCameraInfo;
  enterInteriorRR:CarModelCameraInfo;
  exitInteriorL:CarModelCameraInfo;
  exitInteriorRL:CarModelCameraInfo;
  seatFL:CarModelCameraInfo;
  seatFR:CarModelCameraInfo;
  seatRL:CarModelCameraInfo;
  seatRR:CarModelCameraInfo;
  ghLights:CarModelCameraInfo;
  ghDoorsLeft:CarModelCameraInfo;
  ghDoorsRight:CarModelCameraInfo;
  ghTrunk:CarModelCameraInfo;
  trunkLoading:CarModelCameraInfo;
}

export interface CarModelAnimations {
  doorFL:string[];
  doorFR:string[];
  doorRL:string[];
  doorRR:string[];
  trunkLid:string[];
  sunRoof:string[];
  cupHolder:string[];
  airbags:string[];
}

export interface CarModelGroundHotspotTrigger {
  trigger:string;
  object:string;
}

export interface CarModelTriggers {
  carpaint:string[];
  interiorColor:string[];
  lights:string[];
  wheels:string[];
  doorFL:string[];
  doorFR:string[];
  doorRL:string[];
  doorRR:string[];
  trunkLid:string[];
  seatFL:string[];
  seatFR:string[];
  seatRL:string[];
  seatRR:string[];
  sunRoof:string[];
  welcomeScreen:string;
  cupHolder:string;
  exitInterior:string[];
  ghLights:CarModelGroundHotspotTrigger;
  ghDoorsLeft:CarModelGroundHotspotTrigger;
  ghDoorsRight:CarModelGroundHotspotTrigger;
  ghTrunk:CarModelGroundHotspotTrigger;
  plate:string[];
}

export interface CarModelHeadlineHotspotInfo {
  name:string;
  label:string;
  description?:string;
}

export interface CarModelInteractionHotspotInfo {
  name:string;
}

export interface CarModelHotspots {
  exterior:string[];
  interior:string[];
  visibility:any;
  headline:CarModelHeadlineHotspotInfo[];
  interaction:CarModelInteractionHotspotInfo[];
}

export interface CarModelDrivingCamera {
  desktop:string;
  mobile?:string;
  time:number;
  easing:string;
}

export interface CarModelDrivingAnimation {
  accelerationTime:number;
  maxVelocity:number;
  brakeDecay:number;
  wheels:string[];
  initialCameraTime:number;
  userCameras:CarModelDrivingCamera[];
  presentationCameras:CarModelDrivingCamera[];
}

export interface CarModelAR {
  excludedMeshes:string[];
  disclaimerMesh:string;
  materialOverrideMeshes:string[];
}

export interface CarModelAmbilight {
  materials:string[];
  colors:string[];
}

export interface CarDefaultState {
  interior:string[];
}

export interface CarTrunkLoading {
  boxes: {
    visibilityGroup:string;
    animationRoot:string;
    boxRootS:string;
    boxRootM:string;
    boxRootL:string;
    trigger:string;
  },
  shopping: {
    visibilityGroup:string;
    animationRoot:string;
    bottleRoot:string;
    bagRoot:string;
    trigger:string;
  },
  travelling: {
    visibilityGroup:string;
    animationRoot:string;
    loadRoot:string;
    trigger:string;
  }
  unloadTrigger:string;
}

export interface CarModelConfig {
  scene:string;
  groupings:CarModelGroupings;
  defaultState:CarDefaultState;
  ambilight:CarModelAmbilight;
  cameras:{[key: string]:CarModelCameraInfo};
  animations:CarModelAnimations;
  trigger:CarModelTriggers;
  hotspots:CarModelHotspots;
  driving:CarModelDrivingAnimation;
  trunkLoading:CarTrunkLoading;
  ar:CarModelAR;
};

export const nameMap = [
    {
      name:"Taos",
      car:"taos",
      disclaimer:"La versión del vehículo mostrado es un Taos Highline año modelo 2021. Para consultar las versiones, precios, equipamiento y colores de tu vehículo deberás consultar a un distribuidor autorizado Volkswagen.",
      link:"https://www.vw.com.mx/app/autos-registro/vw-mx/contactanos/es/Selecciona%20una%20Concesionaria/31110/30475/highline/CL14LY/2021/1/+/V7SCY45T/+/+/+/23.9108313666701/-101.82614999999998/4?sourceID=ihdcc",
        exception: [
        { ex:"84d1f2b5", int:"Interior Accent Brown"}, { ex:"5eb98a5f1f1d8000160fbc76", int:"Interior Accent Brown"}, { ex:"5eb911231f1d8000160fbc3e", int:"Interior Accent Grey"}, { ex:"cea81834", int:"Interior Accent Grey"}, { ex:"5eb9112a1f1d8000160fbc40", int:"Interior Accent Grey"}, { ex:"5eb911011f1d8000160fbc36", int:"Interior Accent Grey"}
      ]
    },
    {
      name:"Cross Sport",
      car:"crosssport",
      disclaimer:"La versión del vehículo mostrado es un Nuevo Cross Sport R-Line año modelo 2021. Para consultar las versiones, precios, equipamiento y colores de tu vehículo deberás consultar a un distribuidor autorizado Volkswagen.",
        link:"https://www.vw.com.mx/app/autos-registro/vw-mx/contactanos/es/VSK3U4X4?sourceID=ihdcc",
        exception:[{ex:"dbdef5fa", int:"Interior Accent Dark Burgundy and Titan Black"}]
    },
    {
      name:"Tiguan",
      car:"tiguan",
      disclaimer:"La versión del vehículo mostrado es un Tiguan Highline año modelo 2021. Para consultar las versiones, precios, equipamiento y colores de tu vehículo deberás consultar a un distribuidor autorizado Volkswagen.",
        link:"https://www.vw.com.mx/app/autos-registro/vw-mx/contactanos/es/Selecciona%20una%20Concesionaria/31120/30489/highline/BW24LT/2021/1/+/VODPM6E3/+/+/+/23.9108313666701/-101.82614999999998/5?sourceID=ihdcc",
        exception:[
        {ex:"7854a873", int:"Interior Accent Saffrano and Black"}
      ]
    },
    {
        name:"Jetta",
        car:"jetta",
        disclaimer:"La versión del vehículo mostrado es un Jetta Highline año modelo 2021. Para consultar las versiones, precios, equipamiento y colores de tu vehículo deberás consultar a un distribuidor autorizado Volkswagen.",
        link:"https://www.vw.com.mx/app/autos-registro/vw-mx/contactanos/es/Selecciona%20un%20Modelo/30904/+/+/+/+/+/carline/+/+/+/+/+/+/+",
        exception:[
        ]
    },
    {
      name: "T-Cross",
      car: "tcross",
      disclaimer:"La versión del vehículo mostrado es un T-Cross Highline año modelo 2021. Para consultar las versiones, precios, equipamiento y colores de tu vehículo deberás consultar a un distribuidor autorizado Volkswagen.",
      link:"https://www.vw.com.mx/app/autos-registro/vw-mx/contactanos/es/Selecciona%20una%20Concesionaria/30252/30417/highline/BF14T3-MSNRSM9/2021/2/+/VUWSXMOL/+/+/+/23.9108313666701/-101.82614999999998/5?sourceID=ihdcc",
      exception: [
      ]
    }
]

export class CarModelController {
  public static STATUS_LOADING:string = "loading";
  public static STATUS_LOADED:string = "loaded";
  public static STATUS_FAILED:string = "failed";

  public static event:EventEmitter = new EventEmitter();

  private _currentModelName:string = "";
  private renderService:IRenderService;
  private engine:RenderEngine;
  private modelController:ConfiguratorModel;
  private controller3D:Controller3D;
  private firstLoad:boolean = true;
  private fileLoadProgress:FileLoadProgress

  get modelList(): string[] {
    return nameMap.map(e => e.car);
  }

  public get currentModelName():string { return this._currentModelName; }

  public constructor(engine:RenderEngine, modelController:ConfiguratorModel, controller3D:Controller3D) {
    this.engine = engine;
    this.renderService = engine.engine.services.render;
    this.modelController = modelController;
    this.controller3D = controller3D;
    this.fileLoadProgress = new FileLoadProgress(engine.assetProvider);
  }

  public getModelName():string{
    let s = "";
    let car = nameMap.find(e => e.car === this._currentModelName);
    if(car){
      s = car.name;
    }
    return s;
  }

  public getModel():any {
   let c = null;
   let car = nameMap.find(e => e.car === this._currentModelName);
   if (car) {
     c = car;
   }
   return c;
  }

  public getModelByIndex(index):any {
    let c = null;
    let car = nameMap.find(e => e.car === this.modelList[index]);
    if (car) {
      c = car;
    }
    return c;
  }

  public getModelByCode(code:string):any{
    let c = null;
    let i = -1;
    let car = nameMap.find(e => e.car === code);
    if(car){
      c = car;
    }
    return c;
  }

  public getModelIndex():number{
    let i = -1;
    this.modelList.forEach((e, index)=>{
      if(e.toLowerCase() === this._currentModelName){
        i = index
      }
    });

    return i;
  }

  public checkModelActive(index):boolean{
    if(this._currentModelName === this.modelList[index]){
      return true;
    }
    return false;
  }

  public async loadModel(modelName:string):Promise<void> {
    if (modelName == this._currentModelName)
      return Promise.resolve();
    this._currentModelName = modelName;

    if (!this.firstLoad) {
      await this.renderService.fadeOut(1000, "#1d1b1b");
    } else {
      await this.renderService.fadeOut(0, "#1d1b1b");
      this.firstLoad = false;
    }

    return Axios.get(`./${HASH}/cars/${modelName}.json`).then((response:AxiosResponse) => {
      const config:CarModelConfig = response.data as CarModelConfig;

      // FIXME: just return progress callback from loadConfigByName
      const sceneConfig = this.engine.assetProvider.getAssets().find(asset => asset.infoType === AssetInfoTypes.Scene && asset.info.name === config.scene).info.data;
      this.fileLoadProgress.getProgressForConfig(sceneConfig, (p) => {
        CarModelController.event.emit(CarModelController.STATUS_LOADING, p);
      })

      return this.engine.loadConfigByName(config.scene).then(() => {
        // The selection groups NEED to be rebuild before emitting the event.
        this.modelController.buildSelectionGroups(config);
        this.modelController.setAmbilightIntensity(0);
        CarModelController.event.emit(CarModelController.STATUS_LOADED, config);
        return this.renderService.fadeIn(1000, "#1d1b1b").then(() => {
          this.controller3D.setCamera(CarModelCameraList.Orbit, 500);
        });
      });
    }).catch((error) => {
      console.error("Error while loading car:", error)
      CarModelController.event.emit(CarModelController.STATUS_FAILED);
    });
  }
}