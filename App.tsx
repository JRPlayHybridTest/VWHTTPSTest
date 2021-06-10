///<reference path="../../node_modules/@types/react-dom/index.d.ts"/>
import * as React from "react";
import {backgrounds, materialGroup, RenderEngine, renderSettings, visibilitySet} from "../Controller/3DController/RenderEngine";
import './App.css'
import './MenuButton.css'
import {isMobile, isIOS} from "react-device-detect";
import { SelectionController } from "../Controller/3DController/SelectionController";
import { ARController } from "../Controller/ARController/ARController";
import {MenuMobile} from "./MenuMobile/MenuMobile";
import {Controller3D} from "../Controller/3DController/3DController";
import {ConfiguratorModel} from "../Controller/3DController/ConfiguratorModel";
import { HotspotController } from "../Controller/3DController/HotspotController";
import {Menu} from "./Menu/Menu";
import {string} from "prop-types";
import MediaQuery from 'react-responsive';
import { DeviceOrientationCameraController } from "../Controller/3DController/DeviceOrientationCameraController";
import { CarModelCameraList, CarModelController } from "../Controller/3DController/CarModelController";
import {
    crosssport, jetta,
    taos,
    tiguan, tcross
} from "../Controller/hotspotData";
import {Tutorial} from "./tutorial/Tutorial";
import {Transition, TransitionGroup, CSSTransition} from "react-transition-group"
import {MenuMain} from "./MenuMain/MenuMain";
import {timeout} from "q";
const QRCode = require("qrcode");
import thumb from '../../background/Slider_thumb.svg'
import { Disclaimer } from "./Disclaimer/Disclaimer";
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { getCookie } from "../Controller/ulti";
import { Simulate } from "react-dom/test-utils";
import { ScreenshotController } from "../Controller/3DController/ScreenshotController";
import { WebShareController } from "../Controller/3DController/WebShareController";
import { Screenshot } from "./screenshot/Screenshot";
import { ModelChange } from "./ModelChange/ModelChange";
import { setTrackConfiguratorModel, trackDriving, trackLoad, trackModelChange} from "../Controller/Tracking";
import { TrunkLoadingController } from "../Controller/3DController/TrunkLoadingController";
import { TrunkLoading } from "./TrunkLoading/TrunkLoading";
import { GenericPassenger } from "./GenericPassenger/GenericPassenger";
import { GenericPassengerController } from "../Controller/3DController/GenericPassengerController";
import { XRayController } from "../Controller/3DController/XRayController";
import { XRay } from "./XRay/XRay";

//export const landing = "https://clients.viscircle.com/volkswagen-landing/";
export const landing = "https://clients.viscircle.com/volkswagen-landing-dev/";

interface Props{

}

interface State{
    engine: RenderEngine,
    selectionController:SelectionController,
    arController:ARController,
    controller3D:Controller3D,
    modelController:ConfiguratorModel,
    hotspotController:HotspotController,
    deviceOrientationCameraController:DeviceOrientationCameraController,
    screenshotController:ScreenshotController,
    webShareController:WebShareController,
    trunkLoadingController:TrunkLoadingController,
    genericPassengerController:GenericPassengerController,
    xRayController:XRayController,
    materialGroup: any[],
    backgrounds: any[],
    visibilitySet: any[],
    renderSetting:any[],
    menuOn:boolean,
    presentation:boolean,
    presentext:string,
    endlogo:boolean,
    video:any,
    QRlink:string,
    highlightAR:boolean,
    warning:boolean,
    content:number,
    groundHotspot:boolean,
    loading:boolean,
    loadingAnim:boolean,
    disclaimer:boolean,
    mediaQueryIpad:boolean,
    maxHeight:string,
    test:number,
    textHide:boolean,
    fadein:boolean,
    loadProgress:number,
    hotspotAnim:boolean,
    driving:boolean,
    screenshot:boolean,
    modelSelect:boolean,
    trunkLoading:boolean,
    genericPassenger: boolean,
    xRay: boolean
}

export class App extends React.Component<Props,State> {
    constructor(props:Props){
        super(props);
        const engine: RenderEngine = new RenderEngine();
        const selectionController = new SelectionController(engine, isMobile);
        const controller3D = new Controller3D(engine);
        const arController = new ARController(engine);
        const webShareController = new WebShareController();
        const genericPassengerController = new GenericPassengerController(controller3D);

        let vh = window.innerHeight.toString();
        this.originalSize = window.innerHeight;
        this.state = {
            engine: engine,
            selectionController: selectionController,
            arController: arController,
            controller3D: controller3D,
            modelController:null,
            hotspotController:null,
            deviceOrientationCameraController: null,
            screenshotController: null,
            trunkLoadingController:null,
            webShareController: webShareController,
            // TODO12 might chage to null, wait for init engine
            genericPassengerController: genericPassengerController,
            xRayController: null,
            materialGroup: [],
            backgrounds: [],
            visibilitySet:[],
            renderSetting:[],
            menuOn:true,
            presentation:false,
            presentext:"",
            endlogo:false,
            video:null,
            QRlink:"",
            highlightAR:false,
            warning:false,
            content:0,
            groundHotspot:false,
            loading:true,
            disclaimer:!(getCookie("disclaimer") === "true"),
            loadingAnim:true,
            mediaQueryIpad: window.matchMedia('(min-aspect-ratio: 1/1)').matches,
            maxHeight:"100vh",
            test:0,
            textHide:false,
            fadein:false,
            loadProgress:0,
            hotspotAnim:false,
            driving:false,
            screenshot:false,
            modelSelect:false,
            trunkLoading:false,
            genericPassenger: false,
            xRay: false
        }
        window.onresize = this.fullScreen.bind(this)
    }

    private originalSize;

    private timeoutfullscreen;

    private initial = true;

    private getHotspots():any[]{
        let hotspots = [];
        let name = this.state.modelController.carModelController.getModelName();
        if(name.toLowerCase() === "taos"){
            hotspots = taos;
        }
        else if(name.toLowerCase() === "cross sport"){
            hotspots = crosssport;
        }
        else if(name.toLowerCase() === "tiguan"){
            hotspots = tiguan;
        }
        else if(name.toLowerCase() === "jetta"){
            hotspots = jetta;
        }
        else if(name.toLocaleLowerCase() === 't-cross'){
            hotspots = tcross;
        }
        return hotspots;
    }

    private fullScreen(){
        let vhnew = window.innerHeight;
        if(!isMobile){
            this.setState({
                maxHeight:vhnew+"px"
            })
            return;
        }
        if(vhnew > this.originalSize){
            this.setState({
                maxHeight:"100vh"
            })
            return;
        }
        this.setState({
            maxHeight:vhnew.toString()+"px"
        })
    }

    componentDidMount() {
        let vh = window.innerHeight.toString();
        this.setState({
            maxHeight:vh+"px"
        })
        let el = document.getElementById("main-holder");
        el.addEventListener("wheel", (e)=>{
            e.preventDefault();
        }, {passive:false})
        document.addEventListener('mousedown', this.handleClickOutside.bind(this));
        setTimeout(()=>{
            this.setState({
                fadein: true

            })}, 500);
        setTimeout(()=>{
            this.setState({
                textHide: true

            })}, 5000);
        if(!this.state.disclaimer){
            this.load()
        }
    }

    private load(){
        this.fakeLoading = setInterval(()=>{
            let i = this.state.loadProgress + 0.05;
            if (i >= 0.5){
                clearInterval(this.fakeLoading);
                return;
            }
            this.setState({
                loadProgress: i
            })
        }, 200)
        this.state.engine.initEngine().then(() => {
            const deviceOrientationCameraController = new DeviceOrientationCameraController(
                this.state.engine.engine,
                this.state.controller3D);
            const modelController = new ConfiguratorModel(this.state.engine, this.state.controller3D, deviceOrientationCameraController);
            const hotspotController = new HotspotController(this.state.engine, this.state.controller3D, this.state.selectionController);
            const screenshotController = new ScreenshotController(this.state.engine, modelController.carModelController);
            const trunkLoadingController = new TrunkLoadingController(this.state.controller3D);
            const xrayController = new XRayController(this.state.controller3D, modelController);

            setTrackConfiguratorModel(modelController, this.state.controller3D);

            this.state.controller3D.initialize();
            this.state.selectionController.initialize(
                modelController,
                this.state.controller3D,
                trunkLoadingController,
                this.state.genericPassengerController,
                xrayController);
            this.state.arController.initialize(modelController);

            this.setState({
                modelController: modelController,
                hotspotController: hotspotController,
                deviceOrientationCameraController: deviceOrientationCameraController,
                screenshotController: screenshotController,
                trunkLoadingController:trunkLoadingController,
                xRayController: xrayController,
                materialGroup: materialGroup,
                backgrounds: backgrounds,
                visibilitySet: visibilitySet,
                renderSetting: renderSettings
            }, ()=>{
                let urlParams = new URLSearchParams(window.location.search);

                let config = {model: "taos", options: {}, ambilightIntensity: 0 };

                let urlConfig = urlParams.get("config");
                if (urlConfig) {
                    config = JSON.parse(atob(urlConfig));
                } else {
                    // TODO: verify that the model name is valid
                    const defaultModel = window.location.hash.replace('#', '');                
                    if (defaultModel.length != 0) {
                        config.model = defaultModel;
                        window.location.hash = "";
                    }
                }

                CarModelController.event.on("loading", (e)=>{
                    if(e <= this.state.loadProgress){
                        return
                    }
                    this.setState({
                        loadProgress:e
                    })
                })

                CarModelController.event.on("loaded", (e)=>{
                    hotspotController.clearBindings();
                    this.getHotspots().forEach((h)=>{
                        hotspotController.bindHotspot(h.hotspotName, ()=>{
                            this.toogleInfo(h.name)
                        })
                        h.content.forEach((c)=>{
                            this.preloadImage(c.picture)
                        })
                    })

                    if(this.initial){
                        trackLoad();
                        this.initial = false;
                    }
                    else {
                        trackModelChange()
                    }

                })

                this.state.selectionController.setShowDisclaimerCallback(()=>{
                    this.setState({disclaimer:true})
                })
                const promise:Promise<void> = modelController.setConfig(config);

                // Wait for the car to fully load before doing things like highlighting the AR button.
                promise.then(() => {
                    if (urlParams.has("highlight-ar")) {
                        this.setState({
                            highlightAR:true
                        })
                    }
                    this.setState({
                        loadingAnim: false
                    })
                })
            })

            this.setState({warning: this.state.modelController.checkUnavailable()});
            ConfiguratorModel.event.on('selection', () => {
                this.setState({warning: this.state.modelController.checkUnavailable()})
            });
            Controller3D.event.on('changedCam', ()=>{
                let b = this.state.controller3D.isGroundHotspot();
                this.setState({
                    groundHotspot: b
                })
            })
        });
    }

    private fakeLoading;

    private preloadImage(url)
    {
        var img=new Image();
        img.src=url;
    }

    handleClickOutside(event) {
        let inside = false;
        if(!event){
            return;
        }
        if(!event.path){
            if(!event.target && !event.target.parentNode){
                return;
            }
            if(event.target.parentNode.className === "hotspot-text-holder" || event.target.parentNode.className === "hotspot-panel" || event.target.parentNode.className === "pop-up-image-slider"){
                inside = true;
            }
        }
        else {
            for(let i = 0; i < event.path.length; i++){
                if(event.path[i].className === "hotspot-information" || event.path[i].className === "hotspot-panel" || event.path[i].className === "pop-up-image-slider"){
                    inside = true;
                    break;
                }
            }
        }
        if(!inside && this.state.video){
            this.setState({
                hotspotAnim:false
            })
        }
    }

    getMenu(){
        if(this.state.disclaimer){
            return "";
        }
        if(this.state.driving){
            return(
                <div className={"ground-off-holder"}>
                    <div className={"ground-off"} onClick={()=>{this.state.modelController.drivingAnimationController.rotateCamLeft()}}><img src={`./${HASH}/Icons_Png/Arrow_Left.svg`}/></div>
                    <div className={"ground-off"} onClick={()=>{
                        this.state.modelController.drivingAnimationController.stop();
                        this.setState({
                            driving:this.state.modelController.drivingAnimationController.enabled
                        })
                    }
                    }><img src={`./${HASH}/Icons_Png/Exit_a.svg`}/></div>
                    <div className={"ground-off"} onClick={()=>{this.state.modelController.drivingAnimationController.rotateCamRight()}}><img src={`./${HASH}/Icons_Png/Arrow_Right.svg`}/></div>
                </div>
            )
        }
        if(this.state.groundHotspot){
            return(
                <div className={"ground-off-holder"}>
                    <div className={"ground-off"} onClick={()=>{this.state.selectionController.groundHotspotRotateLeft()}}><img src={`./${HASH}/Icons_Png/Arrow_Left.svg`}/></div>
                    <div className={"ground-off"} onClick={()=>{this.state.selectionController.exitGroundHotspot()}}><img src={`./${HASH}/Icons_Png/Exit_a.svg`}/></div>
                    <div className={"ground-off"} onClick={()=>{this.state.selectionController.groundHotspotRotateRight()}}><img src={`./${HASH}/Icons_Png/Arrow_Right.svg`}/></div>
                </div>
            )
        }
        if(this.state.screenshot){
            return(
                <Screenshot screenshotService={this.state.screenshotController} shareService={this.state.webShareController} modelController={this.state.modelController} closeScreenshot={()=>{this.setState({screenshot:false})}}/>
            )
        }
        if(this.state.modelSelect){
            return(
                <ModelChange close={()=>{this.setState({modelSelect:false})}} configuratorModel={this.state.modelController}/>
            )
        }
        if(this.state.trunkLoading){
            return(
                <TrunkLoading trunkLoadingController={this.state.trunkLoadingController} exit={()=>{this.state.trunkLoadingController.leave(); this.setState({trunkLoading:false})}}/>
            )
        }
        if(this.state.genericPassenger){
            return(
                <GenericPassenger
                    genericPassengerController={this.state.genericPassengerController}
                    exit={() => {
                        this.state.genericPassengerController.leave();
                        this.setState({genericPassenger: this.state.genericPassengerController.active})
                    }}/>
            )
        }
        if(this.state.xRay){
            return(
                <XRay xRayController={this.state.xRayController} exit={()=>{this.state.xRayController.leave(); this.setState({xRay:false})}}></XRay>
            )
        }
        else {return ("")}
    }

    getLogo(){
      if(this.state.endlogo){
          return(
              <div className="presentation logo">
                  <img src={require('./vwlogo2.png')} style={{"margin-right":"0.5em"}}/>
                  <img src={require('./vwlogo.png')}/>
              </div>
          )
      }
      else {
          return"";
      }
    }

    toogleMenu(){
      let b = !this.state.menuOn;
      this.setState({
          menuOn: b
      },()=>{this.state.engine.resize()})
    }

    toogleInfo(info:string){
        let content = this.getHotspots().find(e => e.name === info);
        if(!content){
            return;
        }
        if(!this.state.video){
            this.setState({
                video: content
            },()=>{
                this.setState({
                    hotspotAnim:true
                })
            })
        }
        else if(this.state.video != content){
            this.setState({
                video: null,
                hotspotAnim:false
            },()=>{
                this.setState({
                    video: content
                }, ()=>{
                    this.setState({
                        hotspotAnim:true
                    })
                })
            })
        }
        else {
            this.setState({
                hotspotAnim:false,
                video:null
            })
        }
    }

    isMenu():boolean{
      return (this.state.menuOn && !this.state.presentation);
    }

    appendHotspot(){
        let div = document.createElement("div");
        const newContent = document.createTextNode("Tap on the car to change color.");
        div.appendChild(newContent);
        this.state.hotspotController.addContentDiv("Test", div)
    }

    //-------------------------------------------------------------------
    private dragging = false;
    private x = -200;
    private onMouseDown (e) {
        if(!this.state.video){
            return;
        }
        this.x = e.clientX?e.clientX:e.touches[0].pageX;
        this.dragging = true;
    }

    private onMouseMove (e) {
        if(!this.state.video){
            return;
        }
        let distance = e.clientX?e.clientX:e.touches[0].pageX;
        if (!this.dragging) {
            return;
        }
        if(((distance- this.x) <= -10) && ((distance - this.x) >= -50)){
            this.dragging = false;
            this.x = -200;
            let index = this.state.content + 1;
            if(index > this.state.video.content.length-1){
                index = 0;
            }
            this.setState({content:index})
        }
        else if(((distance- this.x) >= 10) && ((distance - this.x) <= 50)){
            this.dragging = false;
            this.x = -200;
            let index = this.state.content - 1;
            if(index < 0){
                index = this.state.video.content.length-1;
            }
            this.setState({content:index})
        }
    }

    private onMouseUp (e) {
        if(!this.state.video){
            return;
        }
        this.dragging = false;
        this.x = -200;
        // do your end of dragging stuff
    }

    //-------------------------------------------------------------------

    generateQR(){
        if(this.state.video === "QR"){
            return;
        }
        const url = `${this.state.modelController.getConfigURL()}&highlight-ar`;
        QRCode.toDataURL(url).then((url:string) => {
            this.setState({
                QRlink: url,
                video:"QR"
            }, ()=>{
                this.setState({
                    hotspotAnim:true
                })
            })
        });
    }

    setText(s:string){
      this.setState({presentext:s});
    }
    turnOnLogo(){
        this.setState({endlogo:true});
    }

    endPresentation(){
        this.setState({presentation:false, endlogo:false}, ()=>{
            this.state.modelController.reset3D()
            if(isMobile){
                this.state.engine.changeRenderSetting(this.state.renderSetting[0].id)
            }
            else{
                this.state.engine.changeRenderSetting(this.state.renderSetting[1].id)
            }
        })
    }

    presentation(){
        // this.setState({presentation:true})
        // this.state.controller3D.presentation();
    }


    getLoading(){
        if(isMobile){
            return(
                <div className={"loading-screen"}>
                    <div className={"loading-logo"}>
                        <img src={`./${HASH}/vwlogo.png`}/>
                    </div>
                    <span className={"loading-rail"}></span>
                    <CircularProgressbar className={"outer-ring"} value={this.state.loadProgress} maxValue={1} strokeWidth={2}/>
                    <CircularProgressbar className={"outer-ring outer-blur"} value={this.state.loadProgress} maxValue={1} strokeWidth={8}/>
                    <CircularProgressbar value={this.state.loadProgress} maxValue={1} strokeWidth={2}/>
                    <i className="loading-headline">Virtual Studio</i>
                </div>
            )
        }
        else{
            return(
                <React.Fragment>
                    <MediaQuery minWidth={950}>
                        <div className={"loading-screen"}>
                            <div className={"loading-logo"}>
                                <img src={`./${HASH}/vwlogo.png`}/>
                            </div>
                            <span className={"loading-rail"}></span>
                            <CircularProgressbar className={"outer-ring"} value={this.state.loadProgress} maxValue={1} strokeWidth={2}/>
                            <CircularProgressbar className={"outer-ring outer-blur"} value={this.state.loadProgress} maxValue={1} strokeWidth={8}/>
                            <CircularProgressbar value={this.state.loadProgress} maxValue={1} strokeWidth={1}/>
                            <i className="loading-headline">Virtual Studio</i>
                        </div>
                    </MediaQuery>
                    <MediaQuery maxWidth={950}>
                        <div className={"loading-screen"}>
                            <div className={"loading-logo"}>
                                <img src={`./${HASH}/vwlogo.png`}/>
                            </div>
                            <span className={"loading-rail"}></span>
                            <CircularProgressbar className={"outer-ring"} value={this.state.loadProgress} maxValue={1} strokeWidth={2}/>
                            <CircularProgressbar className={"outer-ring outer-blur"} value={this.state.loadProgress} maxValue={1} strokeWidth={8}/>
                            <CircularProgressbar value={this.state.loadProgress} maxValue={1} strokeWidth={2}/>
                            <i className="loading-headline">Virtual Studio</i>
                        </div>
                    </MediaQuery>
                </React.Fragment>
            )
        }
    }

    getVideo(){
        if(this.state.video === "none"){
            return"";
        }
        return this.getInforContent()
    }
    getInforContent(){
        if(!this.state.video){
            return;
        }
        if(this.state.video.type === "test"){
            return(
                <div className={"video-pc youtube video"}>
                    <div className="video-close" onClick={()=>{this.setState({video:"none"})}}>&times;</div>
                    <div className="info-popup">
                        <iframe src="https://www.youtube.com/embed/wEYAytYeOdQ" frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen></iframe>
                    </div>
                </div>

            )
        }
        else if(this.state.video.type === "video"){
            const hotspotText = this.state.video.content[this.state.content].text;

            return(
                <CSSTransition in={this.state.hotspotAnim} classNames="hotspot" timeout={1} onExited={()=>{setTimeout(()=>{this.setState({video:null})},500)}}>
                    <div className={"hotspot-panel"} onMouseDown={(e)=>{this.onMouseDown(e)}} onMouseMove={(e)=>{this.onMouseMove(e)}} onMouseUp={(e)=>{this.onMouseUp(e)}} onTouchStart={(e)=>{this.onMouseDown(e)}} onTouchMove={(e)=>{this.onMouseMove(e)}} onTouchEnd={(e)=>{this.onMouseUp(e)}}>
                        <div className="pop-up-image-see-through">
                            <div className="pop-up-image-slider" style={{"transform":"translateX(-" + this.state.content*100 + "%)"}}>
                                {this.state.video.content.map((e)=>{
                                    return(
                                        <iframe src={e.picture} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                    )
                                })}
                            </div>
                            {this.state.video.content.length > 1?<div className="page-indicator">
                                {this.state.video.content.map((e, i)=>{
                                    return(
                                        <span className={"dot" + (this.state.content === i?" dot-active":"")}></span>
                                    )
                                })}
                            </div>:""}
                        </div>
                        <div className={"hotspot-information"}>
                            <div className={"hotspot-close"}  onClick={()=>{this.setState({hotspotAnim:false})}}>&times;</div>
                            <div className={"hotspot-text-holder"}>
                                <span className="hotspot-header">{this.state.video.content[this.state.content].header}</span>
                                {
                                    Array.isArray(hotspotText) ? (
                                        hotspotText.map(text => [
                                            <span className="hotspot-text">{text}</span>, <br/>
                                        ])
                                    ) : (
                                        <span className="hotspot-text">{hotspotText}</span>
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </CSSTransition>
            )
        }
        else if(this.state.video.type === "picture"){
            const hotspotText = this.state.video.content[this.state.content].text;

            return(
                <CSSTransition in={this.state.hotspotAnim} classNames="hotspot" timeout={1} onExited={()=>{setTimeout(()=>{this.setState({video:null})},500)}}>
                    <div className={"hotspot-panel"} onMouseDown={(e)=>{this.onMouseDown(e)}} onMouseMove={(e)=>{this.onMouseMove(e)}} onMouseUp={(e)=>{this.onMouseUp(e)}} onTouchStart={(e)=>{this.onMouseDown(e)}} onTouchMove={(e)=>{this.onMouseMove(e)}} onTouchEnd={(e)=>{this.onMouseUp(e)}}>
                        <div className="pop-up-image-see-through">
                            <div className="pop-up-image-slider" style={{"transform":"translateX(-" + this.state.content*100 + "%)"}}>
                                {this.state.video.content.map((e)=>{
                                    return(
                                        <img src={e.picture} draggable={false}/>
                                    )
                                })}
                            </div>
                            {this.state.video.content.length > 1?<div className="page-indicator">
                                {this.state.video.content.map((e, i)=>{
                                    return(
                                        <span className={"dot" + (this.state.content === i?" dot-active":"")}></span>
                                    )
                                })}
                            </div>:""}
                        </div>
                        <div className={"hotspot-information"}>
                            <div className={"hotspot-close"}  onClick={()=>{this.setState({hotspotAnim:false})}}>&times;</div>
                            <div className={"hotspot-text-holder"}>
                                <span className="hotspot-header">{this.state.video.content[this.state.content].header}</span>
                                {
                                    Array.isArray(hotspotText) ? (
                                        hotspotText.map(text => [
                                            <span className="hotspot-text">{text}</span>, <br/>
                                        ])
                                    ) : (
                                        <span className="hotspot-text">{hotspotText}</span>
                                    )
                                }
                            </div>
                        </div>
                    </div>
                </CSSTransition>
            )
        }
        else if(this.state.video.type === "text"){
            const hotspotText = this.state.video.content[this.state.content].text;

            return(
                <div className={"hotspot-panel hotspot-panel-text"} onMouseDown={(e)=>{this.onMouseDown(e)}} onMouseMove={(e)=>{this.onMouseMove(e)}} onMouseUp={(e)=>{this.onMouseUp(e)}} onTouchStart={(e)=>{this.onMouseDown(e)}} onTouchMove={(e)=>{this.onMouseMove(e)}} onTouchEnd={(e)=>{this.onMouseUp(e)}}>
                    <div className={"hotspot-information hotspot-information-text"}>
                        <div className={"hotspot-close"}  onClick={()=>{this.setState({video:null})}}>&times;</div>
                        <div className={"hotspot-text-holder"}>
                            <span className="hotspot-header">{this.state.video.content[this.state.content].header}</span>
                            {
                                Array.isArray(hotspotText) ? (
                                    hotspotText.map(text => [
                                        <span className="hotspot-text">{text}</span>, <br/>
                                    ])
                                ) : (
                                    <span className="hotspot-text">{hotspotText}</span>
                                )
                            }
                        </div>
                    </div>
                    {this.state.video.content.length > 1?<div className="page-indicator">
                        {this.state.video.content.map((e, i)=>{
                            return(
                                <span className={"dot" + (this.state.content === i?" dot-active":"")}></span>
                            )
                        })}
                    </div>:""}
                </div>
            )
        }
        else if(this.state.video === "QR"){
            return(
                <CSSTransition in={this.state.hotspotAnim} classNames="hotspot" timeout={1} onExited={()=>{setTimeout(()=>{this.setState({video:null})},500)}}>
                    <div className={"hotspot-panel hotspot-panel-QR"}>
                        <div className="pop-up-image-see-through">
                            <div className="pop-up-image-slider" style={{"transform":"translateX(-" + this.state.content*100 + "%)"}}>
                                <img src={this.state.QRlink} draggable={false}/>
                            </div>
                        </div>
                        <div className={"hotspot-information"}>
                            <div className={"hotspot-close"}  onClick={()=>{this.setState({hotspotAnim:false})}}>&times;</div>
                            <div className={"hotspot-text-holder"}>
                                <span className="hotspot-header">Realidad Aumentada</span>
                                <span className="hotspot-text">Escanea el código QR con tu celular para experimentar el Nuevo {this.state.modelController?this.state.modelController.carModelController.getModelName():"Taos"} en Realidad Aumentada.</span>
                            </div>
                        </div>
                    </div>
                </CSSTransition>
                )
        }
    }

  render(){
        return(
            <div className="main-holder" id={"main-holder"} style={{"max-height":this.state.maxHeight}}>
                {(this.state.loading && !this.state.disclaimer)?
                    <CSSTransition in={this.state.loadingAnim} classNames="loadingAnim" onExited={()=>{setTimeout(()=>{this.setState({loading:false})}, 800)}}>
                        {this.getLoading()}
                    </CSSTransition>:""}
                <div className="presentation">{this.state.presentext}</div>
                <div id="scene-canvas"
                     className="scene-canvas"
                     style={{"height":"100%", "width":"100vw"}}
                     onClick={this.state.selectionController.onClick}
                     onMouseDown={this.state.selectionController.onMouseDown}
                     onMouseMove={this.state.selectionController.onMouseMove}></div>
                {this.getMenu()}
                <MenuMain
                    presentation={this.presentation.bind(this)}
                    toggleMenu={this.toogleMenu.bind(this)}
                    engine={this.state.engine}
                    selectionController={this.state.selectionController}
                    deviceOrientationCameraController={this.state.deviceOrientationCameraController}
                    arController={this.state.arController}
                    controller3D={this.state.controller3D}
                    modelController={this.state.modelController}
                    hotSpotController={this.state.hotspotController}
                    appendHotspot={this.appendHotspot.bind(this)}
                    highlightAR={this.state.highlightAR}
                    warning={this.state.warning}
                    ARQR={this.generateQR.bind(this)}
                    mediaQueryIpad={this.state.mediaQueryIpad}
                    drive={()=>{
                        if(this.state.hotspotController && this.state.hotspotController.visible){
                            this.state.hotspotController.toggleHotspots();
                        }
                        this.state.modelController.drivingAnimationController.start();
                        trackDriving();
                        this.setState({
                            driving:this.state.modelController.drivingAnimationController.enabled
                        })
                    }}
                    hideMenu={(this.state.driving || this.state.disclaimer || this.state.groundHotspot || this.state.screenshot || this.state.modelSelect || this.state.trunkLoading || this.state.genericPassenger || this.state.xRay)}
                    screenshotMode={()=>{
                        if(this.state.hotspotController && this.state.hotspotController.visible){
                            this.state.hotspotController.toggleHotspots();
                        }
                        this.setState({
                            screenshot:true
                        })
                    }}
                    shareService={this.state.webShareController}
                    switchingModel={()=>{this.setState({modelSelect:true})}}
                    trunkLoadingMode={()=>{
                        if(this.state.hotspotController && this.state.hotspotController.visible){
                            this.state.hotspotController.toggleHotspots();
                        }
                        this.state.trunkLoadingController.enter();
                        this.setState({
                            trunkLoading:true
                        })
                    }}
                    genericPassengerMode={async ()=>{
                        if(this.state.hotspotController && this.state.hotspotController.visible){
                            this.state.hotspotController.toggleHotspots();
                        }
                        await this.state.genericPassengerController.enter()
                        .then(_ => {
                            this.setState({
                                genericPassenger:true
                            })
                        })
                    }}
                    xRayMode={async ()=>{
                        if(this.state.hotspotController && this.state.hotspotController.visible){
                            this.state.hotspotController.toggleHotspots();
                        }
                        await this.state.xRayController.enter()
                        .then(_ => {
                            this.setState({
                                xRay:true
                            })
                        })
                    }}
                >
                </MenuMain>
                {this.getLogo()}
                {this.getVideo()}
                {this.state.disclaimer?<Disclaimer
                    configuratorModel={this.state.modelController}
                    close={()=>{
                    this.setState({disclaimer:false})
                    if(this.state.loading){
                        this.load();
                    }
                }}
                preload={this.state.loading}
                />:""}

            </div>
        )
  }

}
