// import * as THREE from 'https://cdn.skypack.dev/three@0.129.0';
// import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';
// import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
// import { GLTFExporter } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/exporters/GLTFExporter.js';
import { USDZExporter } from "./USDZExporter.js";

let camera, scene, renderer;

const script = document.createElement("script");
script.type = "module";
script.src = "https://unpkg.com/@google/model-viewer@1.6.0/dist/model-viewer.min.js";
let modelviewer;

const originalOverflowProp = document.body.style.overflow;
document.body.style.overflow = "hidden";
let arButton = document.getElementById('arButton');
arButton.onclick = function()
{    
    modelviewer.setAttribute("src", `https://jrplayhybridtest.github.io/aframe-test/AnimatedMorphCube.glb`);
    modelviewer.activateAR().then(() => {
      // Restore original overflow style.
      document.body.style.overflow = originalOverflowProp;
      new GLTFExporter().parse(scene, function (res) {
          // At this point 'canActivateAR' hopefully should contain the real value.
          // If we were to check it right after the 'activateAR' promise resolved,
          // then the value would somehow always be false...
          const canActivateAR = modelviewer.canActivateAR;

          if (canActivateAR === false) {
            console.log("Error: Can't activate AR");
          } else if (canActivateAR !== true) {
            console.log("canActivateAR is not a boolean.");
          }

          const url = URL.createObjectURL(new Blob([res]));
          modelviewer.setAttribute("src", url);
      });
    }); 
}

init();

function init() {

    modelviewer = document.createElement("model-viewer");
    modelviewer.setAttribute("style", "width: 0; height: 0;");
    modelviewer.setAttribute("ar", "");
    modelviewer.setAttribute("ar-modes", "webxr");
    document.head.appendChild(script);
    // Prepend instead of append so that the shitty, broken template HTML
    // cannot mess with the modelviewer. Yay.
    document.body.prepend(modelviewer);

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xa0a0a0 );
    scene.fog = new THREE.Fog( 0xa0a0a0, 10, 500 );

    camera = new THREE.PerspectiveCamera( 35, window.innerWidth / window.innerHeight, 1, 500 );
    camera.position.set( - 30, 20, 80 );
    scene.add( camera );

    //

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 100, 0 );
    scene.add( hemiLight );

    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( - 0, 40, 50 );
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = - 25;
    dirLight.shadow.camera.left = - 25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 200;
    dirLight.shadow.mapSize.set( 1024, 1024 );
    scene.add( dirLight );

    // scene.add( new THREE.CameraHelper( dirLight.shadow.camera ) );

    //

    const manager = new THREE.LoadingManager();

    const loader = new GLTFLoader(manager);
    loader.load(
        // resource URL
        'https://jrplayhybridtest.github.io/aframe-test/AnimatedMorphCube.glb',
        // called when the resource is loaded
        function ( gltf ) {
            gltf.scene.scale.set(1,1,1);
    
            scene.add( gltf.scene );
    
            gltf.animations; // Array<THREE.AnimationClip>
            gltf.scene; // THREE.Group
            gltf.scenes; // Array<THREE.Group>
            gltf.cameras; // Array<THREE.Camera>
            
            // new GLTFExporter().parse(scene, function(res) {
            //     let blob;
            //     let filename = "scene";
            //     if ( res instanceof ArrayBuffer ) {

            //         blob = new Blob([res], {type: 'application/octet-stream'});
            //         filename += ".glb";

            //     } else {

            //         const output = JSON.stringify( res, null, 2 );
            //         console.log( output );
            //         blob = new Blob([output], {type: 'text/plain'});
            //         filename += ".gltf";
            //     }

            //     const link = document.createElement("a");
            //     link.href = URL.createObjectURL(blob);
            //     link.download = filename;
            //     link.click();

            // }, {binary: true});

            // new USDZExporter().exportScene(scene, {scale: 100, rotation: [0, Math.PI, 0]}).then((blob) => {
            //     // This makes Safari not reload the website when we return from AR.
            //     history.pushState({}, "");
                
            //     const url = URL.createObjectURL(blob);
            //     const link = document.createElement("a");

            //     link.rel = "ar";
            //     link.href = url;
            //     // https://cwervo.com/writing/quicklook-web/#launching-without-a-preview-image-using-javascript
            //     link.appendChild(document.createElement("img"));
            //     link.click();
            //     console.log(blob);
            // });    
        },
        // called while loading is progressing
        function ( xhr ) {
    
            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    
        },
        // called when loading has errors
        function ( error ) {
    
            console.log( 'An error happened' );
    
        }
    );

    manager.onLoad = function () {

        render();

    };

    //

    const ground = new THREE.Mesh( new THREE.PlaneGeometry( 1000, 1000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
    ground.rotation.x = - Math.PI / 2;
    ground.position.y = 11;
    ground.receiveShadow = true;
    scene.add( ground );

    //

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild( renderer.domElement );

    //

    const controls = new OrbitControls( camera, renderer.domElement );
    controls.addEventListener( 'change', render );
    controls.minDistance = 50;
    controls.maxDistance = 200;
    controls.enablePan = false;
    controls.target.set( 0, 20, 0 );
    controls.update();

    window.addEventListener( 'resize', onWindowResize );

    render();
}

function save( blob, filename ) {

    link.href = URL.createObjectURL( blob );
    link.download = filename;
    link.click();

    // URL.revokeObjectURL( url ); breaks Firefox...

}

function saveString( text, filename ) {

    save( new Blob( [ text ], { type: 'text/plain' } ), filename );

}


function saveArrayBuffer( buffer, filename ) {

    save( new Blob( [ buffer ], { type: 'application/octet-stream' } ), filename );

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

    render();

}

function render() {

    renderer.render( scene, camera );

}