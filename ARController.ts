import { RenderEngine } from "../3DController/RenderEngine";
import { Scene, Mesh, Material, MeshPhysicalMaterial, Color, AnimationMixer, ShaderMaterial } from "three";
import { AssetInfoTypes, MeshPhysicalShaderMaterial } from "threngine";
import { GLTFExporter } from "./GLTFExporter";
import { USDZExporter } from "./USDZExporter";
import { ConfiguratorModel } from "../3DController/ConfiguratorModel";
import { CarModelConfig, CarModelController } from "../3DController/CarModelController";
import { iOS } from "../ulti";

export class ARCannotActivateError extends Error {
  constructor() {
    super("Failed to engage WebXR. The browser does not support WebXR or Play services for AR are missing.");
  }
}

/**
 * A controller that takes care of AR functionality such as generating an AR scene,
 * exporting it to GLB or USDZ and initiating an AR session.
 */
export class ARController {
  private engine:RenderEngine;
  private element:Element;
  private modelController:ConfiguratorModel;
  private carModelConfig:CarModelConfig;
  private androidBlobURL:string|null = null;

  public constructor(engine:RenderEngine) {
    this.engine = engine;

    // Stupid workaround for stupid web technologies.
    const script = document.createElement("script");
    script.type = "module";
    script.src = "https://unpkg.com/@google/model-viewer@1.6.0/dist/model-viewer.min.js";//`./${HASH}/model-viewer.min.js`;
    this.element = document.createElement("model-viewer");
    this.element.setAttribute("style", "width: 0; height: 0;");
    this.element.setAttribute("ar", "");
    this.element.setAttribute("ar-modes", "webxr");
    document.head.appendChild(script);
    // Prepend instead of append so that the shitty, broken template HTML
    // cannot mess with the modelviewer. Yay.
    document.body.prepend(this.element);
  }

  public initialize(modelController:ConfiguratorModel):void {
    this.modelController = modelController;

    CarModelController.event.addListener(CarModelController.STATUS_LOADED, (config:CarModelConfig) => {
      this.carModelConfig = config;
    });
  }

  public async enterAR():Promise<void> {
    const _iOS = iOS();
    const scene = await this.generateScene(this.engine.scene, _iOS);

    if (_iOS) {
      return new USDZExporter().exportScene(scene, {scale: 100, rotation: [0, Math.PI, 0]}).then((blob:Blob) => {
        // This makes Safari not reload the website when we return from AR.
        history.pushState({}, "");
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.rel = "ar";
        link.href = url;
        // https://cwervo.com/writing/quicklook-web/#launching-without-a-preview-image-using-javascript
        link.appendChild(document.createElement("img"));
        link.click();
      });
    } else {
      const arCallback = (event:CustomEvent) => {
        if (event.detail.status === "not-presenting") {
          // TODO: could possibly free the blob after it was loaded already.
          if (this.androidBlobURL) {
            URL.revokeObjectURL(this.androidBlobURL);
            this.androidBlobURL = null;
          }

          this.engine.engine.start();
          this.element.removeEventListener('ar-status', arCallback);
        }
      };
      this.element.addEventListener('ar-status', arCallback);

      // There is a bug in Google Chrome 87 which causes the browser to crash
      // when activating an AR session with a DOM overlay in some cases.
      // It seems to be related to the scrolling content of the website.
      // I don't know why exactly, but setting 'overflow' to 'hidden' circumvents this bug.
      // Sources:
      // - https://github.com/google/model-viewer/issues/1694
      // - https://bugs.chromium.org/p/chromium/issues/detail?id=1149708#c6
      const originalOverflowProp = document.body.style.overflow;
      document.body.style.overflow = "hidden";

      this.element.setAttribute("environment-image", `./${HASH}/android_ar.hdr`);
      this.element.setAttribute("src", `./${HASH}/ar_dummy.gltf`);
      return (this.element as any).activateAR().then(() => {
        // Restore original overflow style.
        document.body.style.overflow = originalOverflowProp;

        this.engine.engine.stop();
        return this.generateGLTF(scene, true).then((arrayBuffer:ArrayBuffer) => {

          // At this point 'canActivateAR' hopefully should contain the real value.
          // If we were to check it right after the 'activateAR' promise resolved,
          // then the value would somehow always be false...
          const canActivateAR = (this.element as any).canActivateAR;
          if (canActivateAR === false) {
            this.engine.engine.start();
            throw new ARCannotActivateError();
          } else if (canActivateAR !== true) {
            this.engine.engine.start();
            throw new TypeError("canActivateAR is not a boolean.");
          }

          this.androidBlobURL = URL.createObjectURL(new Blob([arrayBuffer]));
          this.element.setAttribute("src", this.androidBlobURL);
        });
      });
    }
  }

  private async generateScene(sourceScene:Scene, iOS:boolean):Promise<Scene> {
    const scene = sourceScene.clone();
    const overrides = await this.getARmaterialOverrides();
    const overrideMeshes = this.carModelConfig.ar.materialOverrideMeshes;
    const hiddenMeshes = this.carModelConfig.ar.excludedMeshes;

    scene.traverse(c => {
      const legacyIsHidden = c.name.indexOf("Shadow") > -1 || c.name.indexOf("T-Cross Lights") > -1 || c.name.indexOf("BG_Color_Dome") > -1;
      if (legacyIsHidden || hiddenMeshes.indexOf(c.name) != -1) {
        c.visible = false;
      } else if (c instanceof Mesh) {
        c.material = this.getARcompatibleMaterial(c.material, iOS, overrideMeshes.indexOf(c.name) != -1 && overrides);
      }
    });
    
    // Reset all animations
    const mixer = new AnimationMixer(scene);
    // const clips = this.engine.engine.services.geometry.getAnimations();
    const clips = this.modelController.controller.animationController.getActiveAnimationClips();
    for (const clip of clips) {
      mixer.clipAction(clip).play();
    }
    mixer.update(0);
    
    return scene;
  }

  private generateGLTF(scene:Scene, binary:boolean):Promise<any> {
    return new Promise<any>((resolve, reject) => {
      new GLTFExporter().parse(scene, resolve, {binary: binary});
    });
  }

  private async getARmaterialOverrides():Promise<Map<number, Material>> {
    const arMaterialMap = {
      "Material Atlas": "Material Atlas Taillight AR",
      "Reflector White": "Reflector White AR",
      "Chrome Lines": "Chrome Lines AR",
      "Chrome Squares": "Chrome Squares AR"
    };
    const map = new Map<number, Material>();
    const assets = this.engine.assetProvider.getAssets();
    const materialService = this.engine.engine.services.material as any;
    const materialCache = materialService._materialCache as any[];

    for (const [originalName, replacementName] of Object.entries(arMaterialMap)) {
      const originalId = assets.find(
        asset => asset.infoType === AssetInfoTypes.Material &&
        asset.info.name === originalName).id;

      const replacementId = assets.find(
        asset => asset.infoType === AssetInfoTypes.Material &&
        asset.info.name === replacementName).id;

      if (!originalId) {
        console.error(`ARController: could not find material with name '${originalName}'`);
        continue;
      }

      if (!replacementId) {
        console.error(`ARController: could not find material with name '${replacementName}'`);
        continue;
      }

      for (const materialEntry of materialCache) {
        // We do not care about the AO map id at the moment.        
        if (materialEntry.matId !== originalId)
          continue;
        
        const original = materialEntry.material.getMaterials() as Material[];
        if (original.length != 1) {
          console.error("ARController: bad number of THREE materials in threngine material");
          continue;
        }

        const replacement:Material[] = (await materialService._getMaterial(replacementId, materialEntry.aoId)).getMaterials();
        if (replacement.length != 1) {
          console.error("ARController: bad number of THREE materials in threngine material");
          continue;
        }

        // Wait for the replacement material to actually be loaded, including textures.
        // FIXME: threngine does not currently expose a way to do this cleanly,
        // therefore we have to fallback to our dirty tricks :^)
        for (const loadingMaterial of materialService._loadingMaterials) {
          await loadingMaterial.promise;
        }

        map.set(original[0].id, replacement[0]);
      }
    }

    return map;
  }

  private getARcompatibleMaterial(material:Material|Material[], iOS:boolean, overrides?:Map<number, Material>):Material {
    if (overrides && !Array.isArray(material)) {
      const replacement = overrides.get(material.id);
      // Replacement material still needs to go through the conversion process,
      // as it isn't necessarily a standard PBR material.
      if (replacement) {
        material = replacement;
      }
    }

    const converted = new MeshPhysicalMaterial({});

    // Standard PBR material with clear coat
    if (material instanceof MeshPhysicalShaderMaterial) {
      if (iOS && material.metalness > 0) {
        converted.color = this.getGammaAdjustedColor(material.color);
      } else {
        converted.color = material.color;
      }
      converted.roughness = material.roughness;
      converted.metalness = material.metalness;
      converted.map = material.map;
      converted.normalMap = material.normalMap;
      converted.roughnessMap = material.roughnessMap;
      converted.metalnessMap = material.metalnessMap;
      // TODO: the USDZExporter doesn't seem to use the reflectivity... how to handle?
      // We probably need to convert the reflectivity value to an IOR value!
      converted.reflectivity = material.reflectivity;
      converted.clearcoat = material.clearcoat;
      converted.clearcoatRoughness = material.clearcoatRoughness;
      return converted;
    } 
    
    // Glass material
    if (Array.isArray(material)) {
      const converted = new MeshPhysicalMaterial({});
      const color = (material[0] as ShaderMaterial).uniforms["diffuse"].value;
      // const luma = color.x * 0.2126 + color.y * 0.7152 + color.z * 0.0722;
      const luma = Math.max(color.x, color.y, color.z);
      converted.color.set(0);
      converted.opacity = 1.0 - luma;
      if (!iOS) {
        // Android uses opacity for the reflection too.
        // Thus if we make the glass completely transparent it'd look pretty bad.
        converted.opacity = Math.max(0.3, converted.opacity);
      } else {
        // Apply curve so that the glass becomes opaque faster
        // We do this because on iOS the glass is a bit too transparent compared to Android..
        converted.opacity = Math.sqrt(converted.opacity);
      }
      converted.roughness = 0.0;
      converted.metalness = 0.0;
      converted.transparent = true;
      return converted;
    }

    return converted;
  }

  private getGammaAdjustedColor(color:Color):Color {
    const gamma:number = 1.0/2.2;
    return new Color(Math.pow(color.r, gamma), Math.pow(color.g, gamma), Math.pow(color.b, gamma));
  }
}