
import {RenderEngine, states} from "./RenderEngine";
import {EventEmitter} from "events";
import {isMobile} from "react-device-detect";
import { CarModelCameraInfo, CarModelCameraList, CarModelConfig, CarModelController } from "./CarModelController";
import { AnimationController } from "./AnimationController";
import { AssetInfoTypes } from "threngine";
import { hexToRGB } from "../ulti";
import {trackVisualFeature} from "../Tracking";

export class Controller3D{
    private _engine:RenderEngine;
    private carModelConfig:CarModelConfig;
    private _animationController:AnimationController;

    public static event = new EventEmitter();

    public get engine():RenderEngine { return this._engine; }
    public get animationController():AnimationController { return this._animationController; }

    public constructor(engine:RenderEngine) {
        this._engine = engine;

        CarModelController.event.addListener(CarModelController.STATUS_LOADED, (config:CarModelConfig) => {
            this.carModelConfig = config;

            // Invalidate the cached camera name
            this._camName = "";

            // Reset open/closed state
            this._doorFrontLeftOpen = false;
            this._doorFrontRightOpen = false;
            this._doorRearLeftOpen = false;
            this._doorRearRightOpen = false;
            this._trunkLidOpen = false;
            this._cupHolderOpen = false;
            this._airbagOpen = false;

            // Let the UI know that the open/close state changed...
            Controller3D.event.emit("animation");
        });
    }

    public initialize():void {
        this._animationController = new AnimationController(this.engine);
    }

    public changeModel(groupID, id){
        this._engine.configurator.setVisibilitySet(groupID, id)
    }

    public changeMaterial(groupID, id){
        this._engine.configurator.setMaterialGroup(groupID, id)
    }

    public changeBacground(id){
        this._engine.configurator.setEnvironment(id)
    }

    public changeState(id):Promise<void>{
        return this._engine.configurator.setTransform(id);
    }

    public changeStateByName(name):Promise<void>{
        let state = states.find(e => e.name === name);
        if(state){
            return this._engine.configurator.setTransform(state.id);
        }
        else{
            return new Promise((res, rej)=>{
                res()
            })
        }
    }

    public changeMaterialColor(materialID:string, color:string):void {
        const engine = this.engine.engine;
        const assets = this.engine.assetProvider.getAssets();

        const material = assets.find(a => a.infoType === AssetInfoTypes.Material && a.id === materialID);
        console.log(material.info.data)
        if (material.info.data.color === undefined) {
            throw "Ambilight: material is missing property 'color'";
        }
        material.info.data.color = hexToRGB(color).map(x => x * x);
        engine.services.material.updateMaterial(materialID);
    }

    private _doorFrontLeftOpen = false;
    private _doorFrontRightOpen = false;
    private _doorRearLeftOpen = false;
    private _doorRearRightOpen = false;
    private _trunkLidOpen = false;
    private _cupHolderOpen = false;
    private _airbagOpen = false;
    private _sunroofOpen = false;

    get carOpen(): boolean {
        return this._doorFrontLeftOpen ||
               this._doorFrontRightOpen ||
               this._doorRearLeftOpen ||
               this._doorRearRightOpen ||
               this._trunkLidOpen;
    }

    get doorFrontLeftOpen():boolean { return this._doorFrontLeftOpen };
    get doorFrontRightOpen():boolean { return this._doorFrontRightOpen };
    get doorRearLeftOpen():boolean { return this._doorRearLeftOpen };
    get doorRearRightOpen():boolean { return this._doorRearRightOpen };
    get trunkLidOpen():boolean { return this._trunkLidOpen; }
    get cupHolderOpen():boolean { return this._cupHolderOpen; }
    get airbagOpen():boolean { return this._airbagOpen; }

    private currentPosition = "out";

    public toogleInOut(){
        let inside = this._engine.configurator.config.transforms.find(e => e.name === ("Driver Seat"));
        let outside = this._engine.configurator.config.transforms.find(e => e.name === ("Exterior"));
        if(this.currentPosition === "out"){
            this._engine.configurator.setTransform(inside.id);
            this.currentPosition = "in"
        }
        else{
            this._engine.configurator.setTransform(outside.id);
            this.currentPosition = "out"
        }
    }

    public playAnimation(track?:boolean, interact3D?:boolean):Promise<any[]> {
        const promises = [];

        // If any door is open, only trigger doors which are opened.
        // This way the opened doors will be closed and the closed doors remain closed.
        if (this.carOpen) {
            if (this._doorFrontLeftOpen) {
                promises.push(this.playFrontLeftDoorAnimation());
            }
            
            if (this._doorFrontRightOpen) {
                promises.push(this.playFrontRightDoorAnimation());
            }

            if (this._doorRearLeftOpen) {
                promises.push(this.playRearLeftDoorAnimation());
            }
            
            if (this._doorRearRightOpen) {
                promises.push(this.playRearRightDoorAnimation());
            }

            if (this._trunkLidOpen) {
                promises.push(this.playTrunkLidAnimation());
            }
            if(track){
                trackVisualFeature("all doors close", interact3D)
            }

        } else {
            promises.push(this.playFrontLeftDoorAnimation());
            promises.push(this.playFrontRightDoorAnimation());
            promises.push(this.playRearLeftDoorAnimation());
            promises.push(this.playRearRightDoorAnimation());
            promises.push(this.playTrunkLidAnimation());
            if(track){
                trackVisualFeature("all doors open", interact3D)
            }
        }

        return Promise.all(promises);
    }

    public async playFrontLeftDoorAnimation(track?:boolean, interact3D?:boolean) {
        this._doorFrontLeftOpen = !this._doorFrontLeftOpen;
        Controller3D.event.emit("animation");

        // for interaction hotspot visibility
        Controller3D.event.emit("animationDoorFLStart");
        await this._animationController.playAnimationsByName(this.carModelConfig.animations.doorFL);
        Controller3D.event.emit("animationDoorFLEnd");
        if(!track){
            return
        }
        if(this._doorFrontLeftOpen){
            trackVisualFeature("front left door open", interact3D)
        }
        else{
            trackVisualFeature("front left door close", interact3D)
        }
    }

    public async playFrontRightDoorAnimation(track?:boolean, interact3D?:boolean) {
        this._doorFrontRightOpen = !this._doorFrontRightOpen;
        Controller3D.event.emit("animation");

        // for interaction hotspot visibility
        Controller3D.event.emit("animationDoorFRStart");
        await this._animationController.playAnimationsByName(this.carModelConfig.animations.doorFR);
        Controller3D.event.emit("animationDoorFREnd");
        if(!track){
            return
        }
        if(this._doorFrontRightOpen){
            trackVisualFeature("front right door open", interact3D)
        }
        else{
            trackVisualFeature("front right door close", interact3D)
        }
    }

    public async playRearLeftDoorAnimation(track?:boolean, interact3D?:boolean) {
        this._doorRearLeftOpen = !this._doorRearLeftOpen;
        Controller3D.event.emit("animation");

        // for interaction hotspot visibility
        Controller3D.event.emit("animationDoorRLStart");
        await this._animationController.playAnimationsByName(this.carModelConfig.animations.doorRL);
        Controller3D.event.emit("animationDoorRLEnd");
        if(!track){
            return
        }
        if(this._doorRearLeftOpen){
            trackVisualFeature("rear left door open", interact3D)
        }
        else{
            trackVisualFeature("rear left door close", interact3D)
        }
    }

    public async playRearRightDoorAnimation(track?:boolean, interact3D?:boolean) {
        this._doorRearRightOpen = !this._doorRearRightOpen;
        Controller3D.event.emit("animation");

        // for interaction hotspot visibility
        Controller3D.event.emit("animationDoorRRStart");
        await this._animationController.playAnimationsByName(this.carModelConfig.animations.doorRR);
        Controller3D.event.emit("animationDoorRREnd");
        if(!track){
            return
        }
        if(this._doorRearRightOpen){
            trackVisualFeature("rear right door open", interact3D)
        }
        else{
            trackVisualFeature("rear right door close", interact3D)
        }
    }

    public async playTrunkLidAnimation(track?:boolean, interact3D?:boolean) {
        this._trunkLidOpen = !this._trunkLidOpen;
        Controller3D.event.emit("animation");

        // for interaction hotspot visibility
        Controller3D.event.emit("animationTrunkLidStart");
        await this._animationController.playAnimationsByName(this.carModelConfig.animations.trunkLid);
        Controller3D.event.emit("animationTrunkLidEnd");
        if(!track){
            return
        }
        if(this._trunkLidOpen){
            trackVisualFeature("trunk open", interact3D)
        }
        else{
            trackVisualFeature("trunk close", interact3D)
        }
    }

    public playSunRoofAnimation(track?:boolean, interact3D?:boolean) {
        this._animationController.playAnimationsByName(this.carModelConfig.animations.sunRoof);
        this._sunroofOpen = !this._sunroofOpen;
        Controller3D.event.emit("animation");
        if(!track){
            return
        }
        if(this._sunroofOpen){
            trackVisualFeature("sunroof open", interact3D)
        }
        else{
            trackVisualFeature("sunroof close", interact3D)
        }
    }

    public async playCupHolderAnimation(track?:boolean, interact3D?:boolean) {
        this._cupHolderOpen = !this._cupHolderOpen
        Controller3D.event.emit("animation");

        // for interaction hotspot visibility
        Controller3D.event.emit("animationCupHolderStart");
        await this._animationController.playAnimationsByName(this.carModelConfig.animations.cupHolder);
        Controller3D.event.emit("animationCupHolderEnd");
        if(!track){
            return
        }
        if(this._cupHolderOpen){
            trackVisualFeature("cup holder open", interact3D)
        }
        else{
            trackVisualFeature("cup holder close", interact3D)
        }
    }

    public playAirbagsAnimation(track?:boolean, interact3D?:boolean) {
        this._animationController.playAnimationsByName(this.carModelConfig.animations.airbags);
        this._airbagOpen = !this._airbagOpen;
        Controller3D.event.emit("animation");
        if(!track){
            return
        }
        if(this.airbagOpen){
            trackVisualFeature("airbag release", interact3D)
        }
        else{
            trackVisualFeature("airbag close", interact3D)
        }
    }

    private _camName:string = "";

    public get camName():string { return this._camName; }

    public getCamNameFromKey(key:string):string {
        const camera:CarModelCameraInfo = this.carModelConfig.cameras[key];

        if (!camera) {
            console.error(`Cannot find camera key in car model: ${key}`);
            return;
        }

        const name = isMobile && camera.mobile ? camera.mobile : camera.desktop;

        if (camera.state) {
            const transform = this._engine.configurator.config.transforms.find(t => t.name === name);
            const realCamera = this._engine.configurator.config.cameras.find(cam => cam.id === transform.state.camera);
            return realCamera.name;
        }

        return name;
    }

    public currentCamMatchesKey(key:string):boolean {
        return this.getCamNameFromKey(key) === this.camName;
    }

    public async setCamera(key:string, time?:number):Promise<void> {
        const camera:CarModelCameraInfo = this.carModelConfig.cameras[key];

        if (!camera) {
            console.error(`Cannot find camera key in car model: ${key}`);
            return;
        }

        const name = isMobile && camera.mobile ? camera.mobile : camera.desktop;
        if (camera.state) {
            const transform = this._engine.configurator.config.transforms.find(t => t.name === name);
            const realCamera = this._engine.assetProvider.getAssets()
                .find(asset => asset.infoType === AssetInfoTypes.Camera && asset.id === transform.state.camera);
            if (realCamera.info.name == this.camName)
                return;
            this._camName = realCamera.info.name;
            Controller3D.event.emit("changedCam");
            await this.changeState(transform.id).then(
                () => Controller3D.event.emit("changedCamFinish"));
        } else {
            // TODO: this is a bit ugly but we need the name and id.
            const realCamera = this._engine.assetProvider.getAssets()
                .find(asset => asset.infoType === AssetInfoTypes.Camera && asset.info.name === name);
            if (realCamera.info.name == this.camName)
                return;
            this._camName = realCamera.info.name;
            Controller3D.event.emit("changedCam");
            return new Promise<void>((resolve) => {
                this._engine.configurator.setCamera(realCamera.id, {
                    time: time || camera.time || 1000,
                    easing: "quadratic",
                    onFinished: () => {
                        Controller3D.event.emit("changedCamFinish");
                        resolve();
                    }
                })
            });
        }
    }

    public setCameraDirect(name:string, time:number, easing:string):Promise<boolean> {
        if (name === this._camName) {
            return;
        }
        this._camName = name;

        const id = this.getCamera(name);

        return new Promise((resolve) => {
            this._engine.configurator.setCamera(id, {
                time: time, 
                easing: easing,
                onFinished: (status:string) => resolve(status === 'finished')
            });
        });

    }

    public exitWheel():void {
        if (this.currentCamMatchesKey(CarModelCameraList.Wheel)) {
            this.setCamera(CarModelCameraList.Orbit);
        }
    }

    public isInterior():boolean{
        const interiorCams:string[] = [
            CarModelCameraList.IntermediateSeatFrontLeft,
            CarModelCameraList.IntermediateSeatFrontRight,
            CarModelCameraList.IntermediateSeatRearLeft,
            CarModelCameraList.IntermediateSeatRearRight,
            CarModelCameraList.SeatFL,
            CarModelCameraList.SeatFR,
            CarModelCameraList.SeatRL,
            CarModelCameraList.SeatRR
        ].map(key => this.getCamNameFromKey(key));

        return interiorCams.indexOf(this.camName) !== -1;
    }

    public isGroundHotspot():boolean {
        const groundHotspotCams:string[] = [
            CarModelCameraList.GroundHotspotDoorsLeft,
            CarModelCameraList.GroundHotspotDoorsRight,
            CarModelCameraList.GroundHotspotLights,
            CarModelCameraList.GroundHotspotTrunk
        ].map(key => this.getCamNameFromKey(key));

        return groundHotspotCams.indexOf(this.camName) !== -1;
    }

    getCamera(name:string):string{
        return this._engine.assetProvider.getAssets()
            .find(asset => asset.infoType === AssetInfoTypes.Camera && asset.info.name === name).id;
    }
}