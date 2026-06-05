const _vert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const ThresholdShader = {
  uniforms: {
    tDiffuse:       { value: null },
    resolution:     { value: null },
    threshold:      { value: 0.15 },
    ditherStrength: { value: 0.05 },
    colorMix:       { value: 1.0 },
    aboveColor:     { value: null },
    belowColor:     { value: null },
  },
  vertexShader: _vert,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2      resolution;
    uniform float     threshold;
    uniform float     ditherStrength;
    uniform float     colorMix;
    uniform vec4      aboveColor;
    uniform vec4      belowColor;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4  texel = texture2D(tDiffuse, vUv);
      float lum   = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
      vec2  px    = floor(vUv * resolution);
      float dith  = (rand(px) - 0.5) * ditherStrength;
      if ((lum + dith) >= threshold) {
        vec3 color = mix(texel.rgb, aboveColor.rgb, colorMix);
        gl_FragColor = vec4(color, aboveColor.a);
      } else {
        gl_FragColor = belowColor;
      }
    }
  `,
};

export const PixelationShader = {
  uniforms: {
    tDiffuse:   { value: null },
    resolution: { value: null },
    pixelSize:  { value: 3.0 },
  },
  vertexShader: _vert,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2      resolution;
    uniform float     pixelSize;
    varying vec2 vUv;

    void main() {
      vec2 dxy = pixelSize / resolution;
      vec2 uv  = dxy * floor(vUv / dxy) + dxy * 0.5;
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `,
};
