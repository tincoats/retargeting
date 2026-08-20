import './style.css'

import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";
import tinMan1Url from './assets/Ybot5.glb?url';
import jogSkinUrl from './assets/jogSkin.glb?url';

// Local avatar and animation files in /src/assets
const AVATAR_GLB = tinMan1Url;
const ANIMATION_GLB = jogSkinUrl;

// Create or reuse a full-window canvas
let canvas = document.getElementById('renderCanvas') as HTMLCanvasElement | null;
if (!canvas) {
  const app = document.getElementById('app');
  if (app) app.remove();
  canvas = document.createElement('canvas');
  canvas.id = 'renderCanvas';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.style.touchAction = 'none';
  document.body.appendChild(canvas);
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  document.body.style.margin = '0';
}

const engine = new BABYLON.Engine(canvas, true);

async function createRetargetScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> {
  const scene = new BABYLON.Scene(engine);

  // simple light and camera
  new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);

  // Load avatar by passing the full imported URL directly
  const importResult = await BABYLON.SceneLoader.ImportMeshAsync('', '', AVATAR_GLB, scene);
  const avatarRootNode = importResult.meshes[0];
  avatarRootNode.name = 'avatar';

  // remember current animation groups count, so we can pick the newly added animation later
  const numAnimationsBefore = scene.animationGroups.length;

  // Load source animation into the same scene (pass the full URL directly)
  await BABYLON.SceneLoader.AppendAsync('', ANIMATION_GLB, scene);

  // sometimes the appended scene creates a __root__ mesh
  const animRootNode = scene.getMeshByName('__root__');
  if (animRootNode) {
    animRootNode.name = 'reference';
  }

  // the source animation group is the group added at the saved index
  const sourceAnimationGroup = scene.animationGroups[numAnimationsBefore];
  if (!sourceAnimationGroup) {
    throw new Error('Source animation group not found');
  }

  scene.stopAllAnimations();

  // create a default camera and orient it
  scene.createDefaultCamera(true, true, true);
  const cam = scene.activeCamera as BABYLON.ArcRotateCamera | null;
  if (cam) cam.alpha += Math.PI;

  // Retarget options (minimal)
  const retargetOptions: any = {
    animationGroupName: 'avatar',
    fixAnimations: false,
    checkHierarchy: false,
    retargetAnimationKeys: true,
    fixRootPosition: true,
    fixGroundReference: false,
    rootNodeName: '',
    groundReferenceNodeName: 'mixamorig:LeftToe_End',
    groundReferenceVerticalAxis: ''
  };

  // AnimatorAvatar is not strongly typed in @babylonjs/core typing sets here, access via any
  const AnimatorAvatar: any = (BABYLON as any).AnimatorAvatar || (BABYLON as any).AvatarRetargeting?.AnimatorAvatar;
  if (!AnimatorAvatar) {
    throw new Error('AnimatorAvatar is not available. Ensure the runtime provides the AnimatorAvatar class.');
  }

  const avatar = new AnimatorAvatar('avatar', avatarRootNode, false);
  const retargeted = avatar.retargetAnimationGroup(sourceAnimationGroup, retargetOptions);
  avatar.dispose();

  // cleanup source assets we no longer need
  sourceAnimationGroup.dispose();
  if (animRootNode) animRootNode.dispose(false);

  // play retargeted animation
  retargeted.start(true);

  return scene;
}

(async () => {
  try {
    const scene = await createRetargetScene(engine, canvas as HTMLCanvasElement);
    engine.runRenderLoop(() => scene.render());
    window.addEventListener('resize', () => engine.resize());
  } catch (err) {
    console.error(err);
  }
})();

export {};

