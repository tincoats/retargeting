import * as BABYLON from "@babylonjs/core";
import "@babylonjs/loaders";

export class Playground {
  public static async CreateScene(engine: BABYLON.Engine, canvas: HTMLCanvasElement): Promise<BABYLON.Scene> {
    const avatarPath = "https://assets.babylonjs.com/mixamo/Characters/Ch14_nonPBR.glb";
    const animationPath = "https://assets.babylonjs.com/mixamo/Animations/Hip Hop Dancing.glb";

    const scene = new BABYLON.Scene(engine);

    const hemiLight = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0, 1, 0), scene);

    // helper to split a full URL into rootUrl + filename for SceneLoader
    const splitUrl = (url: string) => {
      const u = new URL(url);
      const path = u.pathname;
      const idx = path.lastIndexOf("/");
      const root = u.origin + path.substring(0, idx + 1);
      const file = path.substring(idx + 1);
      return { root, file };
    };

    // Load the avatar
    const { root: avatarRoot, file: avatarFile } = splitUrl(avatarPath);
    const result = await BABYLON.SceneLoader.ImportMeshAsync("", avatarRoot, avatarFile, scene);

    const avatarRootNode = result.meshes[0];
    avatarRootNode.name = "avatar";

    const numAnimations = scene.animationGroups.length;

    // Load the animation
    const { root: animRoot, file: animFile } = splitUrl(animationPath);
    await BABYLON.SceneLoader.AppendAsync(animRoot, animFile, scene);

    const animRootNode = scene.getMeshByName("__root__");
    if (animRootNode) {
      animRootNode.name = "reference";
    }

    const sourceAnimationGroup = scene.animationGroups[numAnimations];

    scene.stopAllAnimations();

    // Create the camera
    scene.createDefaultCamera(true, true, true);

    const camera = scene.activeCamera as BABYLON.ArcRotateCamera;

    if (camera) {
      camera.alpha += Math.PI;
    }

    // Retarget the animation
    const retargetOptions: any = {
      animationGroupName: "avatar",
      fixAnimations: false,
      checkHierarchy: false,
      retargetAnimationKeys: true,
      fixRootPosition: true,
      fixGroundReference: false,
      rootNodeName: "",
      groundReferenceNodeName: "mixamorig:LeftToe_End",
      groundReferenceVerticalAxis: ""
    };

    const avatar = new (BABYLON as any).AnimatorAvatar("avatar", avatarRootNode, false);

    const retargetedAnimation = avatar.retargetAnimationGroup(sourceAnimationGroup, retargetOptions);

    avatar.dispose();

    // We don't need the source animation anymore
    sourceAnimationGroup.dispose();
    if (animRootNode) animRootNode.dispose(false);

    // Play the retargeted animation
    retargetedAnimation.start(true);

    return scene;
  }
}
