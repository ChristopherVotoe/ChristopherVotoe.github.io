import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { smileShape, type SmileShape } from "./SmileShape";

const vertex = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
const fragment = `precision highp float;
uniform sampler2D camera;
uniform vec2 size;
uniform vec2 center;
uniform vec2 axis;
uniform float mouthWidth;
uniform float strength;
void main() {
  vec2 pixel = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y);
  vec2 down = vec2(-axis.y, axis.x);
  vec2 relative = pixel - center;
  vec2 local = vec2(dot(relative, axis), dot(relative, down)) / max(mouthWidth, 1.0);
  float corners = exp(-2.0 * pow((abs(local.x) - 0.5) / 0.3, 2.0) - 2.0 * pow(local.y / 0.32, 2.0));
  // Inverse texture mapping lifts and gently spreads the mouth corners.
  vec2 samplePixel = pixel + down * mouthWidth * 0.085 * corners * strength
    - axis * sign(local.x) * mouthWidth * 0.015 * corners * strength;
  gl_FragColor = texture2D(camera, clamp(samplePixel / size, vec2(0.0), vec2(1.0)));
}`;

export class SmileFilter {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private buffer: WebGLBuffer;
  private tracker: FaceLandmarker | null = null;
  private shape: SmileShape | null = null;
  private lastDetection = -Infinity;
  private lastFrameTime = -1;

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { alpha: false, preserveDrawingBuffer: true });
    if (!gl) throw new Error("Smile effect is unavailable in this browser.");
    this.gl = gl;
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source); gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error("Unable to prepare the smile effect."); }
      return shader;
    };
    this.program = gl.createProgram()!;
    const v = compile(gl.VERTEX_SHADER, vertex), f = compile(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(this.program, v); gl.attachShader(this.program, f); gl.linkProgram(this.program);
    gl.deleteShader(v); gl.deleteShader(f);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error("Unable to prepare the smile effect.");
    gl.useProgram(this.program);
    this.buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(this.program, "position");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    this.texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  async initialize() {
    const files = await FilesetResolver.forVisionTasks("/mediapipe/wasm");
    const options = { baseOptions: { modelAssetPath: "/mediapipe/face_landmarker.task" }, runningMode: "VIDEO" as const, numFaces: 1, outputFaceBlendshapes: true, minFaceDetectionConfidence: .65, minFacePresenceConfidence: .65, minTrackingConfidence: .65 };
    try { this.tracker = await FaceLandmarker.createFromOptions(files, { ...options, baseOptions: { ...options.baseOptions, delegate: "GPU" } }); }
    catch { this.tracker = await FaceLandmarker.createFromOptions(files, options); }
  }

  draw(video: HTMLVideoElement, now: number, enabled: boolean): boolean {
    const gl = this.gl;
    if (gl.isContextLost()) throw new Error("Smile effect lost graphics access. Continue without it or restart the camera.");
    if (this.canvas.width !== video.videoWidth || this.canvas.height !== video.videoHeight) {
      this.canvas.width = video.videoWidth; this.canvas.height = video.videoHeight;
    }
    if (!enabled) this.shape = null;
    else if (this.tracker && now - this.lastDetection >= 80 && video.currentTime !== this.lastFrameTime) {
      this.lastDetection = now; this.lastFrameTime = video.currentTime;
      const result = this.tracker.detectForVideo(video, now);
      const next = smileShape(result.faceLandmarks[0], result.faceBlendshapes[0]?.categories ?? [], video.videoWidth, video.videoHeight);
      // Missing/unsafe faces are cleared immediately; only strength is smoothed.
      if (next && this.shape) next.strength = this.shape.strength * .6 + next.strength * .4;
      this.shape = next;
    }
    const shape = this.shape;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.program); gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
    gl.uniform2f(gl.getUniformLocation(this.program, "size"), this.canvas.width, this.canvas.height);
    gl.uniform2f(gl.getUniformLocation(this.program, "center"), ...(shape?.center ?? [0, 0] as [number, number]));
    gl.uniform2f(gl.getUniformLocation(this.program, "axis"), ...(shape?.axis ?? [1, 0] as [number, number]));
    gl.uniform1f(gl.getUniformLocation(this.program, "mouthWidth"), shape?.width ?? 1);
    gl.uniform1f(gl.getUniformLocation(this.program, "strength"), shape?.strength ?? 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return Boolean(shape && shape.strength > .05);
  }

  close() {
    this.tracker?.close(); this.tracker = null;
    this.gl.deleteTexture(this.texture); this.gl.deleteBuffer(this.buffer); this.gl.deleteProgram(this.program);
  }
}
