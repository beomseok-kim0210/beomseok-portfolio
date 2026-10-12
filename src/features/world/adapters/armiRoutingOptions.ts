import { Color, PerspectiveCamera, Vector3, Vector4, Scene, OrthographicCamera, Mesh, PlaneGeometry, MeshBasicMaterial, WebGLRenderTarget, HalfFloatType } from "three";
import { docentOverlayPx } from "@/features/docent/docentOverlay";
import type { WebGLRenderer } from "three";
import type { ArmiProductionAsset } from "./armiV015";
import { armiOptionsWindow } from "./armiChoreography";

export const armiOptionNames = ["TEXT ANSWER", "MEMORY RETRIEVAL", "TAVILY SEARCH", "ROBOT ACTION"] as const;
export const isArmiOptionsVisible = (p: number) => p >= armiOptionsWindow.start && p < armiOptionsWindow.end;

/** Four inspection cameras share the scene; they never write the World camera transform. */
export function createArmiRoutingOptions() {
  const cameras = Array.from({ length: 4 }, () => new PerspectiveCamera(65, 1, .08, 1000));
  const target = new WebGLRenderTarget(1,1,{type:HalfFloatType});
  target.samples=4;
  const overlay = new Scene(), overlayCamera = new OrthographicCamera(-1,1,1,-1,0,1);
  const material = new MeshBasicMaterial({map:target.texture,transparent:true,depthTest:false,depthWrite:false});
  const plane = new Mesh(new PlaneGeometry(2,2),material);
  overlay.add(plane);
  return {
    dispose() { target.dispose(); material.dispose(); plane.geometry.dispose(); },
    render(gl: WebGLRenderer, scene: Scene, asset: ArmiProductionAsset, p: number, width: number, height: number, blend = 1) {
      const previousTarget = gl.getRenderTarget();
      if(target.width!==width || target.height!==height) target.setSize(width,height);
      const priorScissor = gl.getScissorTest(), viewport = gl.getViewport(new Vector4());
      const oldScissor = gl.getScissor(new Vector4());
      const previousAutoClear = gl.autoClear;
      const clearColor = gl.getClearColor(new Color()), clearAlpha = gl.getClearAlpha();
      const core = asset.groups.get("Core"), request = scene.getObjectByName("ARMI_RequestFlow");
      const coreVisible = core?.visible, requestVisible = request?.visible;
      if (core) core.visible = false;
      if (request) request.visible = false;
      try {
        gl.setRenderTarget(target);
        gl.autoClear = true; gl.setScissorTest(false); gl.setViewport(0,0,width,height);
        gl.setClearColor(0x060e16,1); gl.clear(); gl.setScissorTest(true);
        cameras.forEach((camera, i) => {
          const name = ["TextAnswer", "MemoryRetrieval", "TavilySearch", "RobotAction"][i];
          const ref = asset.root.getObjectByName(`CAM-WEB-Reference-${name}`) as PerspectiveCamera;
          if (i === 1) {
            camera.position.set(37.8, 98, -22); camera.up.set(0, 1, 0); camera.lookAt(new Vector3(36, 99, -74)); camera.fov = 65;
          } else if (i === 2) {
            camera.position.set(31, 40, -18); camera.up.set(0, 1, 0); camera.lookAt(new Vector3(31, 36, -49)); camera.fov = 68;
          } else if (ref) {
            ref.updateWorldMatrix(true, false); ref.getWorldPosition(camera.position); ref.getWorldQuaternion(camera.quaternion); camera.fov = ref.fov;
          }
          const stage = Math.round(width * (1 - docentOverlayPx() / Math.max(1, window.innerWidth))); // visible part beside the floating docent
          const tileWidth = Math.floor(stage / 2), tileHeight = Math.floor(height / 2);
          const x = (i % 2) * tileWidth, y = i < 2 ? tileHeight : 0;
          camera.aspect = tileWidth / tileHeight;
          if (camera.aspect < 1) camera.fov = 2 * Math.atan(Math.tan(camera.fov * Math.PI / 360) / camera.aspect) * 180 / Math.PI;
          camera.updateProjectionMatrix(); camera.layers.set(0);
          const inset = 6, w = tileWidth - inset * 2, h = tileHeight - inset * 2;
          gl.setViewport(x + inset, y + inset, w, h);
          gl.setScissor(x + inset, y + inset, w, h);
          gl.render(scene, camera);
        });
        gl.setRenderTarget(previousTarget); gl.setScissorTest(false); gl.setViewport(0,0,width,height);
        gl.autoClear=false; material.opacity=blend; gl.render(overlay,overlayCamera);
      } finally {
        gl.setRenderTarget(previousTarget);
        if (core) core.visible = coreVisible!;
        if (request) request.visible = requestVisible!;
        gl.setClearColor(clearColor,clearAlpha); gl.setViewport(viewport); gl.setScissor(oldScissor); gl.setScissorTest(priorScissor); gl.autoClear = previousAutoClear;
      }
    },
  };
}
