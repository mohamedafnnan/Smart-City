/**
 * Environment.js
 * -----------------------------------------------------------------------------
 * Procedural sky dome + ground plane + optional water.
 *
 * We render the sky as a big inverted sphere with a vertex-color gradient.
 * This is dramatically cheaper than an HDRI and keeps the app zero-asset.
 * Fog handles distance haze naturally.
 */
import * as THREE from 'three';
import { CityConfig } from '../config/CityConfig.js';

export class Environment {
  constructor(scene, group) {
    this.scene = scene;
    this.group = group;

    // -------------- Sky Dome (gradient shader) --------------
    const skyGeom = new THREE.SphereGeometry(600, 32, 24);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop:    { value: new THREE.Color(CityConfig.COLORS.skyDay) },
        uBottom: { value: new THREE.Color(0xd9e6f0) },
        uOffset: { value: 0.0 },
      },
      vertexShader: /* glsl */`
        varying float vY;
        void main(){
          vY = normalize(position).y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        varying float vY;
        uniform vec3 uTop;
        uniform vec3 uBottom;
        uniform float uOffset;
        void main(){
          float t = smoothstep(-0.15 + uOffset, 0.75 + uOffset, vY);
          gl_FragColor = vec4(mix(uBottom, uTop, t), 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeom, this.skyMat);
    this.sky.renderOrder = -1;
    group.add(this.sky);

    // -------------- Ground Plane --------------
    const size = CityConfig.CITY_SIZE * 4;
    const groundGeom = new THREE.PlaneGeometry(size, size, 1, 1);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: CityConfig.COLORS.ground,
      roughness: 0.95,
      metalness: 0.0,
    });
    this.ground = new THREE.Mesh(groundGeom, groundMat);
    this.ground.receiveShadow = true;
    this.ground.position.y = -0.02;
    group.add(this.ground);
  }

  /** Update sky colours to reflect hour of day. */
  setHour(hour) {
    const isNight = hour < 6 || hour > 20;
    const dawn = (hour > 5 && hour < 7) || (hour > 19 && hour < 21);

    let top, bottom, fog;
    if (isNight) {
      top = new THREE.Color(0x02040a);
      bottom = new THREE.Color(0x0b1832);
      fog = new THREE.Color(0x04060c);
    } else if (dawn) {
      top = new THREE.Color(0x3a5a94);
      bottom = new THREE.Color(0xff9a55);
      fog = new THREE.Color(0xd7a074);
    } else {
      top = new THREE.Color(CityConfig.COLORS.skyDay);
      bottom = new THREE.Color(0xd9e6f0);
      fog = new THREE.Color(CityConfig.COLORS.fogDay);
    }

    this.skyMat.uniforms.uTop.value.copy(top);
    this.skyMat.uniforms.uBottom.value.copy(bottom);
    if (this.scene.fog) this.scene.fog.color.copy(fog);
    this.scene.background = fog.clone().lerp(top, 0.5);
  }
}
