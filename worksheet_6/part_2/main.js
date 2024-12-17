/**
 * @param {Element} canvas. The canvas element to create a context from.
 * @return {WebGLRenderingContext} The created context.
 */
function setupWebGL(canvas) {
    return WebGLUtils.setupWebGL(canvas);
}

var canvas = document.getElementById("gl-canvas");

canvas.width = 512;
canvas.height = 512;
const gl = setupWebGL(canvas);
gl.clearColor(0.0, 0.0, 1.0, 1.0);
gl.clear(gl.COLOR_BUFFER_BIT);

window.onload = function init() {
    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    const vertices = [
        vec4(-4, -1, -1, 1.0),
        vec4(4, -1, -1, 1.0),
        vec4(4, -1, -21, 1.0),
        vec4(-4, -1, -21, 1.0)
    ];

    const texCoords = [
        vec2(-1.5, 0.0),
        vec2(2.5, 0.0),
        vec2(2.5, 10.0),
        vec2(-1.5, 10.0)
    ];

    const projectionMatrix = perspective(90.0, canvas.width / canvas.height, 1.0, 100.0);
    const modelViewMatrix = mat4();

    function createBuffer(attribute, size, data) {
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, flatten(data), gl.STATIC_DRAW);
        const location = gl.getAttribLocation(program, attribute);
        gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(location);
    }

    createBuffer("vPosition", 4, vertices);
    createBuffer("vTexCoord", 2, texCoords);

    const uProjectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    const uModelViewMatrix = gl.getUniformLocation(program, "modelViewMatrix");
    gl.uniformMatrix4fv(uProjectionMatrix, false, flatten(projectionMatrix));
    gl.uniformMatrix4fv(uModelViewMatrix, false, flatten(modelViewMatrix));

    const texSize = 64;
    const image = new Uint8Array(texSize * texSize * 4);
    for (let i = 0; i < texSize; ++i) {
        for (let j = 0; j < texSize; ++j) {
            const patchX = Math.floor(i / (texSize / 8));
            const patchY = Math.floor(j / (texSize / 8));
            const isWhite = (patchX + patchY) % 2 === 0;
            const color = isWhite ? 255 : 0;
            const idx = 4 * (i * texSize + j);
            image[idx] = image[idx + 1] = image[idx + 2] = color;
            image[idx + 3] = 255;
        }
    }

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);

    const wrapModes = {
        REPEAT: gl.REPEAT,
        CLAMP_TO_EDGE: gl.CLAMP_TO_EDGE,
    };

    const filterModes = {
        NEAREST: gl.NEAREST,
        LINEAR: gl.LINEAR,
        NEAREST_MIPMAP_NEAREST: gl.NEAREST_MIPMAP_NEAREST,
        LINEAR_MIPMAP_NEAREST: gl.LINEAR_MIPMAP_NEAREST,
        NEAREST_MIPMAP_LINEAR: gl.NEAREST_MIPMAP_LINEAR,
        LINEAR_MIPMAP_LINEAR: gl.LINEAR_MIPMAP_LINEAR,
    };

    const wrapModeSelect = document.getElementById("wrapMode");
    const filterModeSelect = document.getElementById("filterMode");

    wrapModeSelect.addEventListener("change", () => {
        const wrapMode = wrapModes[wrapModeSelect.value];
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapMode);
        render();
    });

    filterModeSelect.addEventListener("change", () => {
        const filterMode = filterModes[filterModeSelect.value];
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filterMode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filterMode);
        render();
    });

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    gl.generateMipmap(gl.TEXTURE_2D);

    const uTexture = gl.getUniformLocation(program, "texture");
    gl.uniform1i(uTexture, 0);

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length);
    }

    render();
};
