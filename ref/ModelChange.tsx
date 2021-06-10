import './ModelChange.css'
import * as React from "react";
import {ConfiguratorModel} from "../../Controller/3DController/ConfiguratorModel";

interface Props{
    close:()=>void,
    configuratorModel:ConfiguratorModel
}

interface State{
    currentScroll:number,
    slide:any,
    hideLeft:any,
    hideRight:any,
    order:any[],
    loading:boolean,
    style0:any,
    style1:any,
    style2:any,
    style3:any,
    style4:any,
    textStyle1:any,
    textStyle2:any,
    textStyle3:any,
}

export class ModelChange extends React.Component<Props,State> {

    constructor(props:Props){
        super(props);
        let currentScroll = this.props.configuratorModel.carModelController.getModelIndex();
        let order = this.getOrder(currentScroll, this.props.configuratorModel.carModelController.modelList)
        this.state={
            currentScroll:currentScroll,
            slide:{},
            hideLeft:{},
            hideRight:{},
            order:order,
            loading:false,
            style0:{"opacity":"0"},
            style1:{"opacity":"0.5"},
            style2:{"opacity":"1"},
            style3:{"opacity":"0.5"},
            style4:{"opacity":"0"},
            textStyle1:{"opacity":"0"},
            textStyle2:{"opacity":"1"},
            textStyle3:{"opacity":"0"}
        }
    }

    private oldscroll = 0;

    private getOrder(scroll:number, models:any[]):any[]{
        let result = [];

        let i = scroll - 2;
        while(i < 0){
            i = models.length + i;
        }
        result.push(models[i])
        i = scroll - 1;
        while(i < 0){
            i = models.length + i;
        }
        result.push(models[i])
        result.push(models[scroll])
        i = scroll + 1;
        while(i > models.length-1){
            i = i - models.length;
        }
        result.push(models[i])
        i = scroll + 2;
        while(i > models.length-1){
            i = i - models.length;
        }
        result.push(models[i])
        return result;
    }

    buttonScroll(direction:string){
        if(this.state.loading){
            return;
        }
        if (this.changing){
            return;
        }
        this.changing = true;
        this.change(direction)
    }

    private y = 0;
    private up = false;
    private changing = false;
    private onDown (e) {
        this.y = e.touches[0].pageX;
        this.up = true;
    }

    private onMove (e) {
        if(this.state.loading){
            return;
        }
        if(!this.up){
            return;
        }
        if (this.changing){
            return;
        }
        let distance = e.touches[0].pageX;
        let delta = distance - this.y;

        if(Math.abs(delta) < 100){
            return
        }

        this.changing = true;
        this.up = false;

        let direction = "left";
        if(delta < 0){
            direction = "right";
        }
        this.change(direction)
    }

    private change(direction:string){
        let index = this.state.currentScroll;
        if(direction === "left"){
            index -= 1;
        }
        else {
            index += 1;
        }
        if(index < 0){
            index = this.props.configuratorModel.carModelController.modelList.length-1;
        }
        if(index > this.props.configuratorModel.carModelController.modelList.length-1){
            index = 0
        }
        this.oldscroll = this.state.currentScroll;

        let style = {};
        let style0 = {"opacity":"0"};
        let style1 = {"opacity":"0.5"};
        let style2 = {"opacity":"1"};
        let style3 = {"opacity":"0.5"};
        let style4 = {"opacity":"0"};

        let textStyle1 = {}
        let textStyle2 = {}
        let textStyle3 = {}
        if(direction === "left"){
            style = {'transform':'rotateY(-280deg)'}
            style0 = {"opacity":"0"};
            style1 = {"opacity":"0"};
            style2 = {"opacity":"0.5"};
            style3 = {"opacity":"1"};
            style4 = {"opacity":"0.5"};

            textStyle1 = {"opacity":"0"}
            textStyle2 = {"opacity":"0"}
            textStyle3 = {"opacity":"1"}
        }
        else{
            style = {'transform':'rotateY(-260deg)'}
            style0 = {"opacity":"0.5"};
            style1 = {"opacity":"1"};
            style2 = {"opacity":"0.5"};
            style3 = {"opacity":"0"};
            style4 = {"opacity":"0"};

            textStyle1 = {"opacity":"1"}
            textStyle2 = {"opacity":"0"}
            textStyle3 = {"opacity":"0"}
        }
        this.setState({
            currentScroll:index,
            order: this.getOrder(index, this.props.configuratorModel.carModelController.modelList),
            slide: style,
            style0:style0,
            style1:style1,
            style2:style2,
            style3:style3,
            style4:style4,
            textStyle1:textStyle1,
            textStyle2:textStyle2,
            textStyle3:textStyle3
        }, ()=>{
            setTimeout(()=>{
                this.setState({
                    slide: {'transition':'transform 500ms'},
                    style0:{"opacity":"0", 'transition':'opacity 500ms'},
                    style1:{"opacity":"0.5", 'transition':'opacity 500ms'},
                    style2:{"opacity":"1", 'transition':'opacity 500ms'},
                    style3:{"opacity":"0.5", 'transition':'opacity 500ms'},
                    style4:{"opacity":"0", 'transition':'opacity 500ms'},
                    textStyle1:{"opacity":"0", 'transition':'opacity 500ms'},
                    textStyle2:{"opacity":"1", 'transition':'opacity 500ms'},
                    textStyle3:{"opacity":"0", 'transition':'opacity 500ms'}
                })
                this.changing = false;
            }, 20)
        })
    }

    private close(){
        if(this.state.loading){
            return;
        }
        this.props.close();
    }

    private loadNewCar(){
        if(this.props.configuratorModel.carModelController.checkModelActive(this.state.currentScroll)){
            return;
        }
        this.setState({
            loading:true
        })
        let model = this.props.configuratorModel.carModelController.modelList[this.state.currentScroll];
        this.props.configuratorModel.carModelController.loadModel(model).then(()=>{
            this.setState({
                loading:false
            },()=>{
                this.close();
            })
        })
            .catch(()=>{
                this.setState({
                    loading:false
                })
            })
    }



    /*
    <div className={"model-change-slider-window"} onTouchStart={(e)=>{this.onDown(e)}} onWheel={(e)=>{this.onScroll(e)}} onTouchMove={(e)=>{this.onMove(e)}}>
                        <div className={"model-change-slider"}>
                            {this.state.order.map((e, index)=>{
                                let picture = `./${HASH}/options/test.jpg`;
                                let i = this.models.indexOf(e)
                                if(i%2 === 0){
                                    picture = `./${HASH}/options/test2.jpg`;
                                }
                                let style = {'transform':'rotateY(0deg)'}
                                if(index < 2){
                                    style = {'transform':'rotateY(-30deg)', 'transform-origin': 'right center'}
                                }
                                else if(index > 2){
                                    style = {'transform':'rotateY(30deg)', 'transform-origin': 'left center'}
                                }
                                return(
                                    <div className={"model-picture"}><img src={picture}></img></div>
                                )
                            })}
                        </div>
                    </div>
    */

    private getStyle(index:number):any{

        if(index === 1){
            return this.state.style1
        }
        else if(index === 2){
            return this.state.style2
        }
        else if(index === 3){
            return this.state.style3
        }
        else if(index === 4){
            return this.state.style4
        }
        else {
            return this.state.style0
        }
    }

    render(){
        return(
            <div className={"model-change-holder"}>
                <div className={"model-change-slider-holder"} onTouchStart={(e)=>{this.onDown(e)}} onTouchMove={(e)=>{this.onMove(e)}}>
                    <div id="gallery">
                        <div id="spinner" style={this.state.slide}>
                            {this.state.order.map((e, index)=>{
                                let picture = `./${HASH}/options/` + e + `.jpg`;
                                let textStyle = this.state.textStyle2
                                if(index === 0 || index === 4){
                                    textStyle = {"opacity":"0"}
                                }
                                else if(index === 1){
                                    textStyle = this.state.textStyle1
                                }
                                else if(index ===3){
                                    textStyle = this.state.textStyle3
                                }
                                return(
                                    <div className={"card-holder"}>
                                        <img src={picture} style={this.getStyle(index)} onClick={()=>{
                                            if(index === 1){
                                                this.buttonScroll("left")
                                            }
                                            else if(index === 3){
                                                this.buttonScroll("right")
                                            }
                                        }}></img>
                                        <div className={"model-change-name"} style={textStyle}><span>{this.props.configuratorModel.carModelController.getModelByCode(e).name}</span></div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
                {this.state.loading?<div className={"model-change-button model-change-loading"}><span>Seleccionar</span></div>:
                    <div className={"model-change-button" + (this.props.configuratorModel.carModelController.checkModelActive(this.state.currentScroll)?" model-change-button-disable":"")} onClick={()=>{
                    this.loadNewCar()
                }}><span>{this.props.configuratorModel.carModelController.checkModelActive(this.state.currentScroll)?"Seleccionado":"Seleccionar"}</span></div>}
                <div className={"model-change-disclaimer"}>{this.props.configuratorModel.carModelController.getModelByIndex(this.state.currentScroll).disclaimer}</div>
                <div className={"model-change-close-holder"}>
                    <div className={"model-change-close"} onClick={()=>{this.buttonScroll("left")}}><img src={`./${HASH}/Icons_Png/Arrow_Left.svg`}/></div>
                    <div className={"model-change-close"} onClick={this.close.bind(this)}><img src={`./${HASH}/Icons_Png/Exit_a.svg`}/></div>
                    <div className={"model-change-close"} onClick={()=>{this.buttonScroll("right")}}><img src={`./${HASH}/Icons_Png/Arrow_Right.svg`}/></div>
                </div>
            </div>
        )
    }
}