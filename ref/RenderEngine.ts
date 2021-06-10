/**
 * A class that captules all the direct interaction with the underlaying engine.
 * Responsible for loading, effects and lower level tasks.
 */

import {Configuration, Engine, IConfigurator, Configurator, AssetProvider, IAssetProviderConfig, AssetInfoTypes} from "threngine";
import {LoopOnce, AnimationClip} from "three";
import Axios from "axios";
import { isMobile } from "react-device-detect";

export let modelSet = new Map();
export let materialSet = new Map();
export let materialGroup = [];
export let states = [];
export let backgrounds = [];
export let visibilitySet = [];
export let renderSettings = [];

export interface IRenderEngine {
  settings: any,
  configurator: IConfigurator,

  initEngine(mount: HTMLDivElement): Promise<any>,
}

export class RenderEngine implements IRenderEngine {
  private _sceneConfig: Configuration;
  private _config: any;
  private _engine: Engine;
  private _assetProvider: AssetProvider;
  private _configurator: IConfigurator;

  get settings() { return this._engine.services.render.settings };
  get assetProvider():AssetProvider { return this._assetProvider; }
  get configurator(): IConfigurator { return this._configurator; }
  get engine(){return this._engine}
  get scene(){return this._engine.services.render.scene}
  get camera(){return this._engine.services.render.camera}
  get outlinePass(){return this._engine.services.render.renderController.composer.outlinepass}
  get onBeforeRender(){return this._engine.services.render.onBeforeRender;}

  initEngine = (): Promise<any> => {
    try {
      return Axios.get("config/appConfig.json").then(res => {
        this._config = res.data;
        return this._intialize();
      })
    } catch {
      this._config = { mode: "dev", project_id: "5f6ef9dcc03a933e9c47ece4", server: "https://prod.threed.studio" };
      return this._intialize();
    }
  }

  getMaterialImagePath = (id:string) => {
    // HACK: Directly access image files through internal variable
    const path = (this._assetProvider as any)._assetUrl;
    
    if (!path) {
      console.warn("Could not retrieve material image.")
      return "";
    }

    return `${path}/${id}/preview.png`;
  }

  get release(){return this._config.endpoint}

  private _intialize = async (): Promise<any> => {
    const mount = document.getElementById("scene-canvas") as HTMLDivElement;

    this._assetProvider = new AssetProvider(this._config);

    this._engine = new Engine(this._assetProvider);
    return this._engine.initialize(mount)
    .then(() => {
      this._engine.services.render.enableAdaptiveQuality = true;
      this._patchTAA();
    });
  }

  private _patchTAA():void {
    const sceneRenderer = (this._engine.services.render.renderController.composer as any).sceneRenderer;
    const taaCoalesceMaterial = sceneRenderer.taaCoalesceMaterial as THREE.ShaderMaterial;

    // Reduce anti-flicker transition time at the cost of slightly more flickering.
    taaCoalesceMaterial.fragmentShader = taaCoalesceMaterial.fragmentShader.replace(
      "float weight",
      "float weight = clamp(mix(0.1, 0.8, subpixelCorrection), 0.0, 1.0); //"
    );
  }

  public loadConfigByName(name:string):Promise<void> {
    const sceneAsset = this._assetProvider.getAssets().find(
      a => a.infoType === AssetInfoTypes.Scene &&
      a.info.name === name);
    if (!sceneAsset) {
      throw `Failed to locate scene asset: ${name}`;
    }
    this._sceneConfig = sceneAsset.info.data;
      
    // HACK: adjust camera zoom speed on mobile devices.
    if (isMobile) {
      this.assetProvider.getAssets().filter(asset => asset.infoType === AssetInfoTypes.Camera).forEach(asset => {
        asset.info.data.speed_zoom = 0.15;
      })
    }

    this._configurator = new Configurator(this._sceneConfig, this._engine);
    return (this._configurator as Configurator).initialize().then((scene:THREE.Scene) => {
      this._engine.services.render.setScene(scene);
      this._parseConfigAndAssets();
      if(isMobile){
        this.changeRenderSettingMobile();
      }
    });
  }

  private _parseConfigAndAssets():void {
    // TODO: can we get rid of this method as a whole?
    // Not sure what the purpose of all the preprocessing really is.
    modelSet.clear();
    materialSet.clear();
    materialGroup.length = 0;
    states.length = 0;
    backgrounds.length = 0;
    visibilitySet.length = 0;
    renderSettings.length = 0;

    this._assetProvider.getAssets().forEach((e)=>{
      if(e.infoType === "MATERIAL"){
        materialSet.set(e.id, e.info.name);
      }
    });

    console.log("materialset", materialSet)

    this._configurator.config.visibility_groups.forEach((e)=>{
        modelSet.set(e.id, e.name);
    });

    //console.log("modelset", modelSet)

    this._configurator.config.material_groups.forEach(group => {
      let mats = group.material_ids.map((e)=>{
        return {
          id: e,
          name: materialSet.get(e)
        }
      });

      let current = this._configurator.state.material_groups.find(e => e.id === group.id);
      if (current) {
        mats.forEach((m, i)=>{
          if(m.id === current.material_id){
            let temp = mats[0];
            mats[0] = m;
            mats[i] = temp;
            return;
          }
        })
      }

      materialGroup.push({"id":group.id, "name":group.name, "mats":mats})
    });

    const backgroundAssets = this._assetProvider.getAssets().filter(a => a.infoType == AssetInfoTypes.Background); 
    backgroundAssets.forEach(asset => {
      backgrounds.push({
        id: asset.id,
        name: asset.info.name
      });
    });

    this._configurator.config.visibility_sets.forEach((e)=>{
      let group = e.visibility_group_ids;
      let current = this._configurator.state.visibility_sets.find(e => e.id === e.id);
        group.forEach((m, i)=>{
          if(m === current.visibility_group_id){
            let temp = group[0];
            group[0] = m;
            group[i] = temp;
            return;
          }
        })

      visibilitySet.push({"id":e.id, "name":e.name, "group":e.visibility_group_ids});
    });

    this._assetProvider.getAssets().filter(asset => asset.infoType === AssetInfoTypes.Settings).forEach(asset => {
      renderSettings.push({
        id: asset.id,
        name: asset.info.name}
      );
    });

    if(this.configurator.config.transforms){
      states = this.configurator.config.transforms.map(e => {
        return {
          id: e.id,
          name: e.name,
          state: e.state
        }
      })
    }

    console.log("state", states)
  }

  public changeRenderSettingMobile():void {
    this.changeRenderSetting("id_0.09543252901210941");
  }

  public resize(){
    (this._engine as any)._onResize();
  }

  public changeRenderSetting(id:string){
    const renderSetting = this.assetProvider.getAssets()
      .find(asset => asset.infoType === AssetInfoTypes.Settings && asset.id === id);

    if (renderSetting) {
      this._engine.services.render.settings.setSettings(renderSetting.info.data);
    } else {
      throw `Cannot find render setting: ${id}`;
    }
  }

  private materialInfo=[];

  getMaterialImage = (id: string) => {
    const img = this.materialInfo.find(e => e.materialId === id);

    if (img) {
      return img.imageUrl;
    }

    const promise = this._assetProvider.getFile(id, "preview.png", "blob").then(data => {
      const b = new Blob([data], { type: "image/png" });
      return URL.createObjectURL(b);
    }).catch(()=>{
      return null;
    })

    return promise;
  }

  // getCamera(name:string):string{
  //   return this._configurator.config.cameras.find(e=>e.name===name).id;
  // }
}