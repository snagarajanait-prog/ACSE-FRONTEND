/**
 * The assistant orb, rendered in 3D.
 *
 * A single fragment shader on a fullscreen triangle. There is no scene graph and
 * no geometry: the sphere is found analytically per pixel (given the distance
 * from centre, the surface normal of a unit sphere is exact), and its surface is
 * lit with domain-warped fbm noise — noise sampled at coordinates displaced by
 * more noise, which is what produces churning filaments instead of the static
 * cloud a plain fbm gives. On top sit a key light, a specular highlight, a
 * fresnel rim and an exponential outer bloom.
 *
 * Why raw WebGL and not three.js: three.js is ~170kB gzipped, and this app's
 * entire bundle is ~104kB. For one decorative sphere with no scene, no camera
 * and no meshes, the library would be sixty times the size of the thing it
 * draws. The whole shader is below and costs nothing at install time.
 *
 * Falls back to the CSS `AssistantOrb` when WebGL is unavailable (older devices,
 * blocked contexts, software-rendering blocklists) — so the hero always has an
 * orb, never a hole.
 *
 * Cost control: the loop is paused whenever the orb is scrolled out of view or
 * the tab is hidden, and reduced-motion draws exactly one frame and stops. An
 * infinite rAF on a decorative element is otherwise a permanent battery tax.
 */

import { useEffect, useRef, useState } from 'react'
import AssistantOrb from '@/components/AssistantOrb'
import { cn } from '@/utils/cn'

const VERTEX_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/**
 * Brand colours are baked in as linear-ish vec3 literals rather than passed as
 * uniforms: they are fixed brand hexes in both themes (see `--color-brand-*`),
 * and a uniform would imply they vary.
 *   deep #0a1e35 · cyan #2ca5d9 · lite #7fd3f2
 */
const FRAGMENT_SHADER = `
precision highp float;

uniform vec2  u_resolution;
uniform float u_time;

const float RADIUS = 0.72;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
    mix(mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x),
        mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y),
    f.z);
}

// 2.02 rather than 2.0 per octave: an exact doubling lines every octave's grid
// up on the same lattice and the noise develops visible axis-aligned seams.
float fbm(vec3 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution) / min(u_resolution.x, u_resolution.y);
  float r = length(uv);
  float t = u_time;

  vec3 deep = vec3(0.039, 0.118, 0.208);
  vec3 cyan = vec3(0.173, 0.647, 0.851);
  vec3 lite = vec3(0.498, 0.827, 0.949);
  vec3 hot  = vec3(0.878, 0.973, 1.0);

  vec3  col   = vec3(0.0);
  float alpha = 0.0;

  if (r < RADIUS) {
    // Exact normal of a unit sphere at this pixel — no raymarching needed for
    // a shape whose silhouette is known.
    float z = sqrt(max(0.0, RADIUS * RADIUS - r * r)) / RADIUS;
    vec3 n = normalize(vec3(uv / RADIUS, z));

    // Two warp passes. The second samples at coordinates pushed around by the
    // first, which is what turns blobs into filaments. Low base frequency:
    // sampling too finely gives marbled "continents" and the orb reads as a
    // planet rather than as light held in a sphere.
    vec3 q = n * 1.45;
    float w1 = fbm(q + vec3(0.0, 0.0, t * 0.20));
    float w2 = fbm(q * 1.6 + vec3(w1 * 2.1) + vec3(t * 0.15, -t * 0.10, 0.0));
    float energy = fbm(q * 1.9 + vec3(w2 * 2.4) + vec3(0.0, t * 0.24, 0.0));

    // Lift and compress the field before it reaches colour. Raw fbm spends much
    // of its range near the floor, which is what produced the dark blotches;
    // this keeps the orb reading as lit everywhere and merely *brighter* in the
    // filaments.
    energy = smoothstep(0.28, 0.82, energy);
    energy = 0.32 + 0.68 * energy;

    // Key light, deliberately shallow — it shapes the form without carving a
    // hard dark side into something that is supposed to be glowing.
    vec3 L = normalize(vec3(-0.42, 0.55, 0.78));
    float diff = clamp(dot(n, L), 0.0, 1.0);

    // Base: a smooth, self-lit sphere shaded by depth alone. Shading must not
    // come from the noise field — letting noise drive darkness is what grows
    // "continents" and turns the orb into a planet.
    col = mix(deep, cyan, pow(z, 0.75));
    col *= 0.72 + 0.45 * diff;

    // Energy filaments, strictly additive: light is only ever ADDED where the
    // field is hot, never subtracted, so the surface stays unbroken.
    float fil = pow(energy, 2.6);
    col += mix(cyan, hot, fil) * fil * 1.15;

    // Emissive centre — the orb reads as a light source rather than a lit ball.
    col += cyan * pow(z, 2.5) * 0.30;

    float spec = pow(clamp(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0, 1.0), 30.0);
    col += vec3(0.92, 0.98, 1.0) * spec * 0.40;

    // Rim light. Grazing angles are where a sphere reads as a sphere.
    col += lite * pow(1.0 - z, 2.6) * 0.95;

    // Antialias the silhouette against the halo.
    alpha = smoothstep(RADIUS, RADIUS - 0.015, r);
  }

  // Outer bloom, breathing slowly so a still page still feels live. The falloff
  // is gentle on purpose: a tight halo reads as a hard-edged disc at hero size,
  // where the glow is most of what gives the orb presence.
  float glow = exp(-max(0.0, r - RADIUS) * 4.6) * 0.62;
  glow *= 0.86 + 0.14 * sin(t * 0.7);
  col += cyan * glow * (1.0 - alpha);
  alpha = max(alpha, glow * 0.85);

  gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export interface AssistantOrb3DProps {
  /**
   * Size of the canvas box in px. The lit sphere fills ~72% of it and the
   * remainder carries the glow, so a 96px box reads as a ~69px orb.
   */
  size?: number
  className?: string
}

export default function AssistantOrb3D({ size = 96, className }: AssistantOrb3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [unsupported, setUnsupported] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // `antialias: false` is deliberate — nothing here is an edge the MSAA
    // resolve could help with; the silhouette is smoothstep'd in the shader.
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
    })
    if (!gl) {
      setUnsupported(true)
      return
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = vs && fs ? gl.createProgram() : null
    if (!vs || !fs || !program) {
      setUnsupported(true)
      return
    }

    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setUnsupported(true)
      return
    }
    gl.useProgram(program)

    // One triangle large enough to cover the viewport, not two forming a quad:
    // it avoids the diagonal seam where a quad's triangles meet.
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'u_resolution')
    const uTime = gl.getUniformLocation(program, 'u_time')

    // Cap DPR at 2: past that the extra pixels are invisible on a sub-100px
    // element and the fragment cost keeps climbing.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const pixels = Math.round(size * dpr)
    canvas.width = pixels
    canvas.height = pixels
    gl.viewport(0, 0, pixels, pixels)
    gl.uniform2f(uResolution, pixels, pixels)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let frame = 0
    // Clock accumulates only while visible, so the animation resumes where it
    // paused instead of jumping forward by however long the tab was hidden.
    let clock = 0
    let last = 0

    const draw = (elapsed: number) => {
      gl.uniform1f(uTime, elapsed)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (still) {
      // A single frame at a non-zero time: t=0 lands on a flat, uninteresting
      // slice of the noise field.
      draw(12)
      return () => {
        gl.deleteProgram(program)
        gl.deleteShader(vs)
        gl.deleteShader(fs)
        gl.deleteBuffer(buffer)
      }
    }

    const tick = (now: number) => {
      if (last) clock += (now - last) / 1000
      last = now
      draw(clock)
      frame = requestAnimationFrame(tick)
    }

    const start = () => {
      if (frame) return
      last = 0
      frame = requestAnimationFrame(tick)
    }

    const stop = () => {
      if (!frame) return
      cancelAnimationFrame(frame)
      frame = 0
    }

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting && !document.hidden ? start() : stop()),
      { threshold: 0 },
    )
    observer.observe(canvas)

    const onVisibility = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
      /*
       * Deliberately NOT calling `WEBGL_lose_context.loseContext()` here.
       *
       * StrictMode mounts, cleans up, and mounts again against the SAME canvas.
       * Force-losing the context on that first teardown leaves the second mount
       * calling getContext() on a dead context, where createShader() returns
       * null — which this component reads as "WebGL unsupported" and answers
       * with the CSS fallback. The result is that the orb silently never renders
       * in development, which is exactly what happened.
       *
       * The context is released with the canvas at GC; the deletes above are
       * what actually matter.
       */
    }
  }, [size])

  // Sized to the sphere, not the canvas, so swapping renderers doesn't shift
  // the layout around it.
  if (unsupported) return <AssistantOrb size={Math.round(size * 0.72)} className={className} />

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn('block', className)}
      style={{ width: size, height: size }}
    />
  )
}
