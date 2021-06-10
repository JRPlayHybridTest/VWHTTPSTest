import * as React from "react";
import {RenderEngine} from "../../Controller/3DController/RenderEngine";
import {ARController} from "../../Controller/ARController/ARController";
import {SelectionController} from "../../Controller/3DController/SelectionController";
import './MenuMobile.css'
import {ConfiguratorModel, SelectionGroup} from "../../Controller/3DController/ConfiguratorModel";
import {Controller3D} from "../../Controller/3DController/3DController";
import {HotspotController} from "../../Controller/3DController/HotspotController";
import {Transition, TransitionGroup, CSSTransition} from "react-transition-group"
import { CarModelCameraList } from "../../Controller/3DController/CarModelController";
import {landing} from "../App";
import { DeviceOrientationCameraController } from "../../Controller/3DController/DeviceOrientationCameraController";
import {translate} from "../../Controller/3DController/translateController";
import {isMobile} from "react-device-detect";

interface Props{
    toggleMenu:()=>void,
    presentation:()=>void,
    appendHotspot:()=>void,
    ARQR:()=>void,
    warning:boolean,
    menuActive:boolean,
    menuActiveAnimation:boolean,
    interior:boolean,
    hotSpot:boolean,
    toogleHotspot:()=>void,
    toogleInterior:()=>void,
    checkMenuActive:(s:string)=>boolean,
    doorOpen:boolean,
    turnOnSubMenu:(s:string)=>boolean,
    controller3D:Controller3D,
    modelController:ConfiguratorModel,
    engine:RenderEngine,
    deviceOrientationCameraController:DeviceOrientationCameraController,
    currentMenu:any,
    lightOn:boolean,
    closeMenu:()=>void,
    highlightAR:boolean,
    gyroEnabled:boolean,
    exporting:boolean,
    onEnterAR:()=>void,
    mediaQueryIpad:boolean,
    intensity:number,
    drive:()=>void,
    screenshotMode:()=>void,
    airbag:boolean,
    sharing:boolean,
    toogleSharing:()=>void,

    changeMenu:(boolean)=>void,
    menuInteraction:boolean,
    menuConfig:boolean,
    switchingModel:()=>void,
    trunkLoadingMode:()=>void,
    genericPassengerMode:()=>void,
    xRayMode:()=>void,
    modelName:string
}

interface State{
    currentScroll:number
}

export class MenuMobile extends React.Component<Props,State> {

    constructor(props:Props){
        super(props);
        this.state={currentScroll:0};
    }

    componentDidMount(){
    }

    /*in case he want it again, lightness slider
    <div className={"mobile-slider-wrapper"}>
                            <input type="range" min="0" max="255" className="slider-intensity" value={this.props.intensity} onChange={(e)=>{this.props.modelController.setAmbilightIntensity(parseInt(e.target.value)/255); console.log("intensity", parseInt(e.target.value)/255)}}/>
                            <div className={"mobile-slider-thumb"} style={{"left":(this.props.intensity/255*100)+"%", transform: "translateY(-50%) translateX(-" + (this.props.intensity/255*100) + "%)"}}>
                                <span className={"thumb-background"}></span>
                                <span></span>
                            </div>
                            <img className={"mobile-slider-image mobile-sun-left"} src={`./${HASH}/Icons_Png/Sun.svg`}/>
                            <img className={"mobile-slider-image mobile-sun-right"} src={`./${HASH}/Icons_Png/Sun_a.svg`}/>
     </div>*/


    getSubmenu(){
        if (!this.props.currentMenu){
            return(
                <div></div>
            )
        }
        if(this.props.currentMenu.type === "colorPicker"){
            let color = "linear-gradient(to right";
            this.props.modelController.ambilightColorCodes.forEach((ar, i)=>{
                let arMap = ar.map(e => (e*255).toString())
                color += ",rgb(" + arMap.join(",")+")";
            })
            color += ")";
            return(
                <div className={"mobile-sub-menu-slider"}>
                    <div className="mobile-slider-holder">
                        <div className={"mobile-slider-wrapper"}>
                            <input type="range" min="0"
                                   style={{"background-image":color}}
                                   max={this.props.currentMenu.selections.length-1} value={this.props.currentMenu.currentSelection} onChange={(e)=>{this.props.modelController.changeSelectionByIndex(this.props.currentMenu.groupID, e.target.value)}}/>
                            <div className={"mobile-slider-thumb"} style={{"left":(this.props.currentMenu.currentSelection/(this.props.currentMenu.selections.length-1)*100)+"%", transform: "translateY(-50%) translateX(-" + (this.props.currentMenu.currentSelection/(this.props.currentMenu.selections.length-1)*100) + "%)"}}>
                                <span className={"thumb-background"}></span>
                                <span></span>
                            </div>
                        </div>
                        <div className={"mobile-slider-on-off" + (this.props.intensity === 0?"":" mobile-slider-on-off-active")} onClick={()=>{
                            if(this.props.intensity === 0){
                                this.props.modelController.setAmbilightIntensity(1, true);
                            }
                            else{
                                this.props.modelController.setAmbilightIntensity(0, true);
                            }
                        }}>
                            <img src={this.props.intensity === 0?`./${HASH}/Icons_Png/Off.svg`:`./${HASH}/Icons_Png/Off_a.svg`}/>
                        </div>
                    </div>
                </div>
            )
        }
        else{
            return(
                <div>
                    <div className={"mobile-menu-text"}>
                        {translate(this.props.currentMenu.selections[this.props.currentMenu.currentSelection].name)}
                    </div>
                    <div className="menu-mobile-header menu-mobile-header-sub">
                        <div className="mobile-main-menu sub-menu">
                            {this.getSubMenuItem()}
                        </div>
                    </div>
                </div>
            )
        }
    }

    getSubMenuItem(){
        let except = 0;
        this.props.currentMenu.selections.forEach((e)=>{
            if(this.props.modelController.disable.includes(e.id)){
                except ++;
            }
        })
        let amount = this.props.currentMenu.selections.length - except;
        return this.props.currentMenu.selections.map((e,i) => {
            let img = `./${HASH}/options/${e.id}.png`;
            if(this.props.currentMenu.type === "material"){
                img = this.props.engine.getMaterialImagePath(e.id);
            }
            else if(this.props.currentMenu.type === "seat"){
                img = `./${HASH}/Icons_Png/${e.id}.svg`;
            }
            return(
                <div className={"mobile-main-menu-button sub-menu-button" + (this.props.currentMenu.currentSelection === i?" sub-menu-button-active":"")+ (amount < 2?" sub-menu-button-unique":"") + (this.props.modelController.disable.includes(e.id)?" disable-icon":"")} onClick={()=>{this.props.modelController.changeSelection(this.props.currentMenu.groupID, e.id, true)}}>
                    <img className={"sub-menu-img"} src={img}></img>
                </div>
            )
        })
    }

    buttonScroll(direction:string, max:number){
        let index = this.state.currentScroll;
        if(direction === "left"){
            index -= 1;
        }
        else {
            index += 1;
        }
        if(index < 0){
            index = 0;
        }
        if(index > max){
            index = max
        }
        this.setState({currentScroll:index})
    }
    private x = -200;
    private onDown (e) {
        this.x = e.touches[0].pageX;
    }

    private onMove (e, max:number) {
        let distance = e.touches[0].pageX;
        let delta = distance - this.x;
        let index = this.state.currentScroll;
        index -= Math.floor(delta/10);
        if(index < 0){
            index = 0;
        }
        else if(index > max){
            index = max
        }
        this.setState({currentScroll:index})
    }

    private onScroll(e, max:number){
        let margin = e.deltaY >0?1:-1
        let index = this.state.currentScroll+margin;
        if(index < 0){
            index = 0;
        }
        else if(index > max){
            index = max;
        }

        this.setState({
            currentScroll: index
        })

    }

    /*
    */

    getMenuInteraction(){
        let maxEx = this.props.mediaQueryIpad?0:0;
        let maxIn = this.props.mediaQueryIpad?0:0;
        if(!this.props.menuInteraction){
            return(<div></div>);
        }
        if(this.props.interior){
            return(
                <div>
                    <CSSTransition in={this.props.currentMenu != null} classNames="sub-menu-animation" timeout={100}>
                        {this.getSubmenu()}
                    </CSSTransition>
                    <div className={"menu-mobile-header-holder"}>
                        {this.state.currentScroll === 0?"":<div className={"mobile-arrow mobile-arrow-left"} onClick={()=>{this.buttonScroll("left", maxIn)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Left.svg`}></img></div>}
                        {this.state.currentScroll === maxIn?"":<div className={"mobile-arrow mobile-arrow-right"} onClick={()=>{this.buttonScroll("right", maxIn)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Right.svg`}></img></div>}
                        <div className="menu-mobile-header" onTouchStart={(e)=>{this.onDown(e)}} onTouchMove={(e)=>{this.onMove(e, maxIn)}} onWheel={(e)=>{this.onScroll(e, maxIn)}}>
                            <div className={"mobile-main-menu" + (maxIn>0?" mobile-main-menu-scroll":"")} style={{"transform":"translateX(calc("+ (this.state.currentScroll*-18)+"vw))"}}>
                                <div className={("mobile-main-menu-button") + (this.props.hotSpot?" mobile-main-menu-button-active":"")} onClick={this.props.toogleHotspot.bind(this)}>
                                    <img className="img" src={this.props.hotSpot?`./${HASH}/Icons_Png/Info_a.svg`:`./${HASH}/Icons_Png/Info.svg`}></img>
                                </div>
                                <div className={("mobile-main-menu-button")} onClick={()=>{this.props.toogleInterior()}}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Car_Outside.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.airbag?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.controller3D.playAirbagsAnimation(true)}}>
                                    <img className="img" src={this.props.airbag?`./${HASH}/Icons_Png/Airbag_a.svg`:`./${HASH}/Icons_Png/Airbag.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.doorOpen?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.controller3D.playAnimation(true)}}>
                                    <img className="img" src={this.props.doorOpen?`./${HASH}/Icons_Png/Car_a.svg`:`./${HASH}/Icons_Png/Car.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("seat")?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.turnOnSubMenu("seat")}}>
                                    <img className="img" src={this.props.checkMenuActive("seat")?`./${HASH}/Icons_Png/Seat_a.svg`:`./${HASH}/Icons_Png/Seat.svg`}></img>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
        else {
            return(
                <div>
                    <CSSTransition in={this.props.currentMenu != null} classNames="sub-menu-animation" timeout={100}>
                        {this.getSubmenu()}
                    </CSSTransition>

                    <div className={"menu-mobile-header-holder"}>
                        {this.state.currentScroll === 0?"":<div className={"mobile-arrow mobile-arrow-left"} onClick={()=>{this.buttonScroll("left", maxEx)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Left.svg`}></img></div>}
                        {this.state.currentScroll === maxEx?"":<div className={"mobile-arrow mobile-arrow-right"} onClick={()=>{this.buttonScroll("right", maxEx)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Right.svg`}></img></div>}
                        <div className="menu-mobile-header" onTouchStart={(e)=>{this.onDown(e)}} onTouchMove={(e)=>{this.onMove(e, maxEx)}} onWheel={(e)=>{this.onScroll(e, maxEx)}}>
                            <div className={"mobile-main-menu" + (maxEx>0?" mobile-main-menu-scroll":"")} style={{"transform":"translateX(calc("+ (this.state.currentScroll*-18)+"vw))"}}>
                                <div className={("mobile-main-menu-button") +(this.props.hotSpot?" mobile-main-menu-button-active":"")} onClick={this.props.toogleHotspot.bind(this)}>
                                    <img className="img" src={this.props.hotSpot?`./${HASH}/Icons_Png/Info_a.svg`:`./${HASH}/Icons_Png/Info.svg`}></img>
                                </div>
                                <div className={("mobile-main-menu-button")} onClick={()=>{this.props.toogleInterior()}}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Car_Inside.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"} onClick={this.props.drive}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Driving.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"} onClick={this.props.trunkLoadingMode}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Trunkloading.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"} onClick={this.props.xRayMode}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Xray.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"} onClick={this.props.genericPassengerMode}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Dummy.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.doorOpen?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.controller3D.playAnimation(true)}}>
                                    <img className="img" src={this.props.doorOpen?`./${HASH}/Icons_Png/Car_a.svg`:`./${HASH}/Icons_Png/Car.svg`}></img>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    }

    getMenuConfig(){
        let maxEx = this.props.mediaQueryIpad?0:0;
        let maxIn = this.props.mediaQueryIpad?0:0;
        if(!this.props.menuConfig){
            return(<div></div>);
        }
        if(this.props.interior){
            return(
                <div>
                    <CSSTransition in={this.props.currentMenu != null} classNames="sub-menu-animation" timeout={100}>
                        {this.getSubmenu()}
                    </CSSTransition>
                    <div className={"menu-mobile-header-holder"}>
                        {this.state.currentScroll === 0?"":<div className={"mobile-arrow mobile-arrow-left"} onClick={()=>{this.buttonScroll("left", maxIn)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Left.svg`}></img></div>}
                        {this.state.currentScroll === maxIn?"":<div className={"mobile-arrow mobile-arrow-right"} onClick={()=>{this.buttonScroll("right", maxIn)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Right.svg`}></img></div>}
                        <div className="menu-mobile-header" onTouchStart={(e)=>{this.onDown(e)}} onTouchMove={(e)=>{this.onMove(e, maxIn)}} onWheel={(e)=>{this.onScroll(e, maxIn)}}>
                            <div className={"mobile-main-menu" + (maxIn>0?" mobile-main-menu-scroll":"")} style={{"transform":"translateX(calc("+ (this.state.currentScroll*-18)+"vw))"}}>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("interior")?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.turnOnSubMenu("interior")}}>
                                    <img className="img" src={this.props.checkMenuActive("interior")?`./${HASH}/Icons_Png/Color_Interior_a.svg`:`./${HASH}/Icons_Png/Color_Interior.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("Environment")?" mobile-main-menu-button-active":"")}  onClick={()=>{this.props.turnOnSubMenu("Environment")}}>
                                    <img className="img" src={this.props.checkMenuActive("Environment")?`./${HASH}/Icons_Png/Enviorment_a.svg`:`./${HASH}/Icons_Png/Enviorment.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("Ambilight Color")?" mobile-main-menu-button-active":"")} onClick={()=>{
                                    if(!this.props.checkMenuActive("Ambilight Color")){
                                        this.props.modelController.setAmbilightIntensity(1, true);
                                    }
                                    this.props.turnOnSubMenu("Ambilight Color");
                                }}>
                                    <img className="img" src={this.props.checkMenuActive("Ambilight Color")?`./${HASH}/Icons_Png/Envy_Light_a.svg`:`./${HASH}/Icons_Png/Envy_Light.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"} onClick={()=>{this.props.screenshotMode()}}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Share.svg`}></img>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
        else {
            return(
                <div>
                    <CSSTransition in={this.props.currentMenu != null} classNames="sub-menu-animation" timeout={100}>
                        {this.getSubmenu()}
                    </CSSTransition>

                    <div className={"menu-mobile-header-holder"}>
                        {this.state.currentScroll === 0?"":<div className={"mobile-arrow mobile-arrow-left"} onClick={()=>{this.buttonScroll("left", maxEx)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Left.svg`}></img></div>}
                        {this.state.currentScroll === maxEx?"":<div className={"mobile-arrow mobile-arrow-right"} onClick={()=>{this.buttonScroll("right", maxEx)}}><img className="img" src={`./${HASH}/Icons_Png/Arrow_Right.svg`}></img></div>}
                        <div className="menu-mobile-header" onTouchStart={(e)=>{this.onDown(e)}} onTouchMove={(e)=>{this.onMove(e, maxEx)}} onWheel={(e)=>{this.onScroll(e, maxEx)}}>
                            <div className={"mobile-main-menu" + (maxEx>0?" mobile-main-menu-scroll":"")} style={{"transform":"translateX(calc("+ (this.state.currentScroll*-18)+"vw))"}}>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("Car paint")?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.turnOnSubMenu("Car paint")}}>
                                    <img className="img" src={this.props.checkMenuActive("Car paint")?`./${HASH}/Icons_Png/Color_a.svg`:`./${HASH}/Icons_Png/Color.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("Wheels")?" mobile-main-menu-button-active":"")}  onClick={()=>{this.props.turnOnSubMenu("Wheels")}}>
                                    <img className="img" src={this.props.checkMenuActive("Wheels")?`./${HASH}/Icons_Png/Settings_a.svg`:`./${HASH}/Icons_Png/Settings.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.lightOn?" mobile-main-menu-button-active":"")} onClick={()=>{this.props.modelController.turnLight(true)}}>
                                    <img className="img" src={this.props.lightOn?`./${HASH}/Icons_Png/Light_Off_a.svg`:`./${HASH}/Icons_Png/Light_On.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"+(this.props.checkMenuActive("Environment")?" mobile-main-menu-button-active":"")}  onClick={()=>{this.props.turnOnSubMenu("Environment")}}>
                                    <img className="img" src={this.props.checkMenuActive("Environment")?`./${HASH}/Icons_Png/Enviorment_a.svg`:`./${HASH}/Icons_Png/Enviorment.svg`}></img>
                                </div>
                                <div className={"mobile-main-menu-button"} onClick={()=>{this.props.screenshotMode()}}>
                                    <img className="img" src={`./${HASH}/Icons_Png/Share.svg`}></img>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    }

    //onClick={()=>{window.open("https://www.vw.com.mx/app/autos-registro/vw-mx/contactanos/es/Selecciona%20una%20Concesionaria/31110/30475/highline/CL14LY/2021/1/+/V7SCY45T/+/+/+/23.9108313666701/-101.82614999999998/4?sourceID=ihdcc", "_blank")}}

    renderARButton(){
        if(this.props.exporting){
            /*return(
                <button className={"ar-loading"}>
                    AR
                    <span className={"ar1"}></span>
                    <span className={"ar2"}></span>
                    <span className={"ar3"}></span>
                    <span className={"ar4"}></span>
                    <span className={"ar5"}></span>
                </button>
            )*/
            return(
                <div className={"mobile-ar-button ar-loading-2"}>
                    <img src={`./${HASH}/Icons_Png/AR.svg`}/>
                    <span className={"ar6"}></span>
                </div>
            )
        }
        else {
            return(
                <div className={"mobile-ar-button"+(this.props.highlightAR?" mobile-ar":"")} onClick={()=>{
                    if(isMobile){
                        this.props.onEnterAR()
                    }
                    else {
                        this.props.ARQR()
                    }
                }}>
                    <img src={`./${HASH}/Icons_Png/AR_a.svg`}/>
                    <span className={"ar-border"}></span>
                </div>
            )
        }
    }

    render(){
        return(
            <div>
                {(this.props.menuConfig || this.props.menuInteraction)&&!this.props.interior?
                    <div className={"mobile-burger-holder"}>
                        <div className={"mobile-car-name"}>{this.props.modelName}
                            <div className={"mobile-burger"} onClick={this.props.switchingModel}><img src={`./${HASH}/Icons_Png/Vehicle_Selection_rounded.svg`}/></div>
                        </div>

                    </div>:""
                }
                {this.props.interior&&isMobile?<div className={"gyro-button"} onClick={() => {this.props.deviceOrientationCameraController.toggle()}}>
                    <img className="img" src={`./${HASH}/Icons_Png/${this.props.gyroEnabled ? 'Sphere_a' : 'Sphere'}.svg`}></img>
                </div>:""
                }
                <div className="menu-mobile">
                    <CSSTransition in={this.props.menuActiveAnimation} classNames="example" timeout={100} >
                        {this.getMenuConfig()}
                    </CSSTransition>
                    <CSSTransition in={this.props.menuActiveAnimation} classNames="example" timeout={100} >
                        {this.getMenuInteraction()}
                    </CSSTransition>
                    <div className={"menu-mobile-button-holder"}>
                        <button className={this.props.menuInteraction?"menu-mobile-button-active":""} onClick={()=>{this.props.changeMenu(false)}}>Experiméntalo</button>
                        {this.renderARButton()}
                        <button className={this.props.menuConfig?"menu-mobile-button-active":""} onClick={()=>{this.props.changeMenu(true)}}>Personalízalo</button>
                    </div>
                    {
                        this.props.warning?
                            <div className="not-available-mobile">
                                <span>*Model is not available in this configuration.</span>
                            </div>:""
                    }
                </div>
            </div>
        )
    }
}
